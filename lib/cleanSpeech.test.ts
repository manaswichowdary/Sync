import assert from "node:assert/strict";
import { test } from "node:test";
import { stripSpeechFillers } from "./cleanSpeech";

test("removes uh and um and a repeated sentence", () => {
  const cleaned = stripSpeechFillers(
    "Uh I need a ride um home after school. I need a ride home after school."
  );
  assert.equal(cleaned, "I need a ride home after school.");
});

test("keeps a request that has no filler or repeat", () => {
  assert.equal(
    stripSpeechFillers("I can help with a grocery pickup on Saturday."),
    "I can help with a grocery pickup on Saturday."
  );
});

test("does not treat um inside a word as filler", () => {
  assert.equal(stripSpeechFillers("Can I borrow an umbrella?"), "Can I borrow an umbrella?");
});
