import assert from "node:assert/strict";
import { test } from "node:test";
import { approvedText } from "./approveText";

test("a risky post is not stored until the safer text is approved", () => {
  const first = approvedText("My son Leo needs a ride on Saturday.");
  assert.equal(first.ok, false);
  if (!first.ok) {
    assert.equal(/Leo/.test(first.safeText), false);
    const second = approvedText(first.safeText);
    assert.equal(second.ok, true);
    if (second.ok) assert.equal(/Leo/.test(second.text), false);
  }
});

test("wording that needs a manual edit is refused", () => {
  const result = approvedText("A suspicious guy was near the playground.");
  assert.equal(result.ok, false);
});

test("ordinary text is kept", () => {
  const result = approvedText("I can help with a grocery pickup on Saturday.");
  assert.equal(result.ok, true);
  if (result.ok) assert.match(result.text, /grocery pickup/);
});
