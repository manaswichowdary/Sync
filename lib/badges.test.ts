import assert from "node:assert/strict";
import { test } from "node:test";
import { badgeLabels, helpCounts, helpGivenThisMonth, recommendationCount } from "./badges";

test("badges are labels only, with a private help count kept separate", () => {
  assert.deepEqual(
    badgeLabels({ invitedByFirstName: "Mina", helpedNeighbors: true, recommendedBy: 2 }),
    ["Invited by Mina", "Helped neighbors", "Recommended by 2 neighbors"]
  );
  assert.deepEqual(badgeLabels({ invitedByFirstName: null, helpedNeighbors: false, recommendedBy: 0 }), []);
  assert.equal(recommendationCount(["a", "a", "b"]), 2);
  assert.deepEqual(
    helpCounts(
      [
        { helperId: "me", requesterId: "a", completed: true },
        { helperId: "b", requesterId: "me", completed: true },
        { helperId: "me", requesterId: "c", completed: false },
      ],
      "me"
    ),
    { given: 1, received: 1 }
  );
});

test("the monthly group counter counts completed exchanges in the current month", () => {
  const now = new Date(2026, 9, 10);
  assert.equal(
    helpGivenThisMonth(["2026-10-02T12:00:00.000Z", "2026-09-30T12:00:00.000Z", null], now),
    1
  );
});
