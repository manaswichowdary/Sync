import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPost } from "./guard";

const types = (text: string) => checkPost(text).findings.map((f) => f.type);

test("demo post: removes child name, school, and landmark", () => {
  const r = checkPost(
    "Looking for a playdate for my 6 year old, Saturday morning, we live near Hudson Park, his name is Leo and he goes to Lincoln Elementary."
  );
  assert.equal(r.risky, true);
  assert.ok(!/Leo/.test(r.safeText), r.safeText);
  assert.ok(!/Lincoln/.test(r.safeText), r.safeText);
  assert.ok(!/Hudson/.test(r.safeText), r.safeText);
  assert.ok(/Saturday morning/.test(r.safeText), r.safeText);
  assert.ok(types(r.safeText).length === 0, "safe text should pass the guard again");
});

test("named child after 'my son'", () => {
  const r = checkPost("My son Leo loves trains and needs a friend.");
  assert.ok(!/Leo/.test(r.safeText));
  assert.ok(/my son/i.test(r.safeText));
});

test("weekday after 'my 6 year old' is not treated as a name", () => {
  const r = checkPost("My 6 year old Saturday playdate would be great.");
  assert.equal(r.safeText, "My 6 year old Saturday playdate would be great.");
  assert.equal(r.risky, false);
});

test("street addresses are removed", () => {
  const r = checkPost("Come by 1234 West Main Street after lunch.");
  assert.ok(!/1234/.test(r.safeText), r.safeText);
  assert.ok(types("Come by 1234 West Main Street").includes("address"));
});

test("phone numbers and emails are hidden", () => {
  const r = checkPost("Text me at (480) 555-0142 or mia@example.com");
  assert.ok(!/555/.test(r.safeText));
  assert.ok(!/example\.com/.test(r.safeText));
});

test("daily routines are softened", () => {
  const r = checkPost("I pick him up at 3:15 every day from the bus stop.");
  assert.ok(!/3:15/.test(r.safeText), r.safeText);
  assert.ok(!/every day/.test(r.safeText), r.safeText);
});

test("appearance wording is flagged but needs the parent's edit", () => {
  const r = checkPost("A suspicious guy was near the playground.");
  assert.ok(r.findings.some((f) => f.type === "appearance"));
  assert.equal(r.needsManualEdit, true);
});

test("money requests are flagged", () => {
  const r = checkPost("Can you send me money for a deposit?");
  assert.ok(r.findings.some((f) => f.type === "money"));
  assert.equal(r.needsManualEdit, true);
});

test("an ordinary post passes untouched", () => {
  const text = "Can anyone lend a folding table this weekend?";
  const r = checkPost(text);
  assert.equal(r.risky, false);
  assert.equal(r.safeText, text);
});
