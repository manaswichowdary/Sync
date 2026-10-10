import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPosts } from "./matching";
import type { Post } from "./types";

const base: Post = {
  id: "x",
  board: "gather",
  text: "",
  authorFirstName: "Sam",
  area: "Test Area",
  lat: 33.42,
  lng: -111.94,
  distanceMiles: 0.4,
  kidsAges: [6],
  times: ["sat-am"],
  publicOnly: true,
  trust: "new",
  metCount: 0,
};

const request = {
  board: "gather" as const,
  kidsAges: [6],
  times: ["sat-am"],
  publicOnly: true,
};

test("gives a plain reason for each match", () => {
  const [m] = matchPosts(request, [base]);
  assert.ok(m);
  assert.ok(m.reasons.some((r) => /close in age/i.test(r)));
  assert.ok(m.reasons.some((r) => /Saturday morning/i.test(r)));
});

test("drops posts beyond the distance limit", () => {
  const far = { ...base, id: "far", distanceMiles: 2.5 };
  assert.equal(matchPosts(request, [far]).length, 0);
});

test("drops posts with nothing in common besides distance", () => {
  const none = { ...base, id: "none", kidsAges: [15], times: ["weekday-eve"], publicOnly: false };
  assert.equal(matchPosts(request, [none]).length, 0);
});

test("never matches street updates or other boards", () => {
  const street = { ...base, id: "s", board: "street" as const };
  const other = { ...base, id: "o", board: "share" as const };
  assert.equal(matchPosts(request, [street, other]).length, 0);
});

test("returns at most three, closest fit first", () => {
  const posts = [1, 2, 3, 4].map((n) => ({ ...base, id: `p${n}`, distanceMiles: n / 10 }));
  const out = matchPosts(request, posts);
  assert.equal(out.length, 3);
  assert.equal(out[0].post.id, "p1");
});
