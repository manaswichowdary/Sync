import assert from "node:assert/strict";
import { test } from "node:test";
import { destinationAfterLogin, emailCodeError, verifyEmailCode } from "./emailCode";

test("a wrong or expired email code has a clear message", () => {
  assert.equal(
    emailCodeError({ code: "otp_expired", message: "Token has expired or is invalid" }),
    "That code is wrong or expired."
  );
  assert.equal(emailCodeError({ code: "otp_expired", message: "Token has expired" }), "That code has expired.");
  assert.equal(emailCodeError({ message: "Token is invalid" }), "That code is not right.");
  assert.equal(emailCodeError({ message: "Something else" }), "That code did not work. Check the email and try again.");
});

test("a new group returns to the start page, and a joined group opens that group", () => {
  assert.equal(destinationAfterLogin("/", true), "/start");
  assert.equal(destinationAfterLogin("/g/maple", true), "/g/maple");
  assert.equal(destinationAfterLogin("/", false), "/");
  assert.equal(destinationAfterLogin("/?notice=finish", true), "/?notice=finish");
});

test("the email code is checked with the same email and type email", async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      verifyOtp: async (args: { email: string; token: string; type: "email" }) => {
        calls.push(args);
        return { error: null };
      },
    },
  };
  const ok = await verifyEmailCode(supabase, "neighbor@example.com", "12345678");
  assert.equal(ok.ok, true);
  assert.deepEqual(calls, [{ email: "neighbor@example.com", token: "12345678", type: "email" }]);

  calls.length = 0;
  const bad = await verifyEmailCode(supabase, "neighbor@example.com", "12");
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.equal(bad.error, "Enter the code from the email.");
    assert.equal(bad.resend, false);
  }
  assert.equal(calls.length, 0);

  const tooLong = await verifyEmailCode(supabase, "neighbor@example.com", "12345678901");
  assert.equal(tooLong.ok, false);

  const expired = await verifyEmailCode(
    {
      auth: {
        verifyOtp: async () => ({ error: { code: "otp_expired", message: "Token has expired or is invalid" } }),
      },
    },
    "neighbor@example.com",
    "000000"
  );
  assert.equal(expired.ok, false);
  if (!expired.ok) {
    assert.equal(expired.error, "That code is wrong or expired.");
    assert.equal(expired.resend, true);
  }
});
