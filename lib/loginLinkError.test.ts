import assert from "node:assert/strict";
import { test } from "node:test";
import { loginLinkMessage } from "./loginLinkError";

const FALLBACK = "We could not send the login code. Your name and phone were not saved.";
const WAIT = "Please wait a minute, then ask for a new code.";
const MAIL = "Our email service had a problem. Please try again in a few minutes.";

function capture(run: () => string) {
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  try {
    return { message: run(), dumped: JSON.stringify(lines) };
  } finally {
    console.error = original;
  }
}

test("a rate limit asks the person to wait a minute", () => {
  const waited = capture(() =>
    loginLinkMessage({ status: 429, code: "over_email_send_rate_limit", message: "Email rate limit exceeded" }, FALLBACK)
  );
  assert.equal(waited.message, WAIT);
  assert.match(waited.dumped, /LOGIN LINK ERROR:/);

  const timed = capture(() =>
    loginLinkMessage({ status: 429, message: "For security purposes, you can only request this after 60 seconds." }, FALLBACK)
  );
  assert.equal(timed.message, WAIT);
});

test("an email provider or SMTP failure names the email service", () => {
  const provider = capture(() =>
    loginLinkMessage({ status: 500, code: "email_provider_disabled", message: "Email provider is disabled" }, FALLBACK)
  );
  assert.equal(provider.message, MAIL);

  const smtp = capture(() =>
    loginLinkMessage({ status: 500, code: "unexpected_failure", message: "Error sending magic link email" }, FALLBACK)
  );
  assert.equal(smtp.message, MAIL);
});

test("other failures keep the current message and hide contact details", () => {
  const other = capture(() =>
    loginLinkMessage(
      { status: 400, code: "user_not_found", message: "User parent@example.com with phone 4805550142 was not found" },
      FALLBACK
    )
  );
  assert.equal(other.message, FALLBACK);
  assert.equal(other.dumped.includes("parent@example.com"), false);
  assert.equal(other.dumped.includes("4805550142"), false);
  assert.match(other.dumped, /LOGIN LINK ERROR:/);
  assert.match(other.dumped, /user_not_found/);
});
