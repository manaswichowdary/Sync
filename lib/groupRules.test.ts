import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CODE_DEFAULT_MAX_USES,
  CODE_EXPIRY_DAYS,
  GROUP_CREATE_COOLDOWN_DAYS,
  GROUP_HARD_CAP,
  GROUP_MID_CAP,
  GROUP_START_CAP,
  INACTIVE_DAYS,
  INACTIVE_WARN_DAYS,
  THIRD_GROUP_AFTER_EXCHANGES,
  WRONG_CODE_LOCKOUT,
} from "./config";
import {
  activityState,
  canAddGroup,
  capStatus,
  codeExpiresAt,
  codeUsable,
  createCooldown,
  daysUntilPause,
  memberCap,
  nextGroupStatus,
  reviewNewGroup,
  shouldSuggestMerge,
  threadVisible,
  wrongCodeLocked,
  type ExistingGroup,
} from "./groupRules";

const NOW = new Date("2026-10-10T15:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function group(overrides: Partial<ExistingGroup>): ExistingGroup {
  return {
    id: "g1",
    name: "Maple Building",
    neighborhood: "North Loop",
    purpose: "building",
    memberCount: 4,
    confirmedExchanges: 0,
    ...overrides,
  };
}

test("similar name and neighborhood suggests joining", () => {
  const review = reviewNewGroup(
    { name: "Maple Building Parents", neighborhood: "north loop", purpose: "building" },
    [group({})]
  );
  assert.equal(review.allowCreateAnyway, false);
  assert.match(review.message, /Maple Building/);
});

test("different neighborhood does not block a new group", () => {
  const review = reviewNewGroup(
    { name: "Maple Building", neighborhood: "South Oak", purpose: "building" },
    [group({})]
  );
  assert.equal(review.similar.length, 0);
  assert.equal(review.allowCreateAnyway, true);
});

test("a full matching group can still be created beside", () => {
  const review = reviewNewGroup(
    { name: "Maple Building", neighborhood: "North Loop", purpose: "building" },
    [group({ memberCount: GROUP_START_CAP, confirmedExchanges: 0 })]
  );
  assert.equal(review.allowCreateAnyway, true);
});

test("a different purpose can still be created beside", () => {
  const review = reviewNewGroup(
    { name: "Maple Building", neighborhood: "North Loop", purpose: "school" },
    [group({ purpose: "building" })]
  );
  assert.equal(review.allowCreateAnyway, true);
});

test("member cap grows at the configured exchange counts", () => {
  assert.equal(memberCap(GROW_BEFORE(3)), GROUP_START_CAP);
  assert.equal(memberCap(2), GROUP_START_CAP);
  assert.equal(memberCap(3), GROUP_MID_CAP);
  assert.equal(memberCap(9), GROUP_MID_CAP);
  assert.equal(memberCap(10), GROUP_HARD_CAP);
  assert.equal(capStatus(GROUP_START_CAP, 0).full, true);
  assert.equal(capStatus(GROUP_START_CAP - 1, 0).full, false);
  assert.equal(capStatus(GROUP_HARD_CAP, 10).suggestSplit, true);
  assert.equal(capStatus(GROUP_HARD_CAP - 1, 10).suggestSplit, false);
});

function GROW_BEFORE(n: number) {
  return n - 1;
}

test("two groups is the usual maximum, and a third unlocks only after both have enough exchanges", () => {
  assert.equal(canAddGroup([{ confirmedExchanges: 0 }]).allowed, true);
  assert.equal(
    canAddGroup([
      { confirmedExchanges: THIRD_GROUP_AFTER_EXCHANGES - 1 },
      { confirmedExchanges: THIRD_GROUP_AFTER_EXCHANGES },
    ]).allowed,
    false
  );
  assert.equal(
    canAddGroup([
      { confirmedExchanges: THIRD_GROUP_AFTER_EXCHANGES },
      { confirmedExchanges: THIRD_GROUP_AFTER_EXCHANGES },
    ]).allowed,
    true
  );
  assert.equal(canAddGroup([{ confirmedExchanges: 9 }, { confirmedExchanges: 9 }, { confirmedExchanges: 9 }]).allowed, false);
});

test("group creation cooldown uses the configured days", () => {
  assert.equal(createCooldown(null, NOW).allowed, true);
  const tooSoon = createCooldown(new Date(NOW.getTime() - (GROUP_CREATE_COOLDOWN_DAYS - 1) * DAY), NOW);
  assert.equal(tooSoon.allowed, false);
  assert.ok(tooSoon.availableAt);
  const ready = createCooldown(new Date(NOW.getTime() - GROUP_CREATE_COOLDOWN_DAYS * DAY), NOW);
  assert.equal(ready.allowed, true);
});

test("inactivity warns, then pauses, and only new activity reopens a group", () => {
  const recent = new Date(NOW.getTime() - 2 * DAY);
  const warnAt = new Date(NOW.getTime() - (INACTIVE_DAYS - INACTIVE_WARN_DAYS) * DAY);
  const pausedAt = new Date(NOW.getTime() - INACTIVE_DAYS * DAY);
  assert.equal(activityState(recent, NOW), "active");
  assert.equal(activityState(warnAt, NOW), "warn");
  assert.equal(activityState(pausedAt, NOW), "paused");
  assert.equal(daysUntilPause(warnAt, NOW), INACTIVE_WARN_DAYS);
  assert.equal(nextGroupStatus("active", pausedAt, NOW, false), "paused");
  assert.equal(nextGroupStatus("paused", recent, NOW, false), "paused");
  assert.equal(nextGroupStatus("paused", pausedAt, NOW, true), "active");
});

test("overlap suggests a merge only when most members of both groups match", () => {
  assert.equal(shouldSuggestMerge(["a", "b", "c"], ["a", "b", "d"]), true);
  assert.equal(shouldSuggestMerge(["a", "b"], ["a", "c"]), false);
  assert.equal(shouldSuggestMerge(["a", "b", "c", "d"], ["a"]), false);
  assert.equal(shouldSuggestMerge([], ["a"]), false);
});

test("codes expire, hit max uses, and pause with the group", () => {
  const base = {
    uses: 0,
    maxUses: CODE_DEFAULT_MAX_USES,
    expiresAt: codeExpiresAt(NOW, CODE_EXPIRY_DAYS),
    groupStatus: "active" as const,
    held: false,
    now: NOW,
  };
  assert.equal(codeUsable(base).ok, true);
  assert.equal(codeUsable({ ...base, now: codeExpiresAt(NOW, CODE_EXPIRY_DAYS) }).ok, false);
  assert.equal(codeUsable({ ...base, uses: CODE_DEFAULT_MAX_USES }).ok, false);
  assert.equal(codeUsable({ ...base, groupStatus: "paused" }).ok, false);
  assert.equal(codeUsable({ ...base, held: true }).ok, false);
  assert.equal(wrongCodeLocked(WRONG_CODE_LOCKOUT - 1), false);
  assert.equal(wrongCodeLocked(WRONG_CODE_LOCKOUT), true);
});

test("muting and category choices never hide an exchange the person is part of", () => {
  assert.equal(threadVisible({ muted: true, left: false, categoryEnabled: true, userInExchange: false }), false);
  assert.equal(threadVisible({ muted: false, left: true, categoryEnabled: true, userInExchange: false }), false);
  assert.equal(threadVisible({ muted: false, left: false, categoryEnabled: false, userInExchange: false }), false);
  assert.equal(threadVisible({ muted: true, left: true, categoryEnabled: false, userInExchange: true }), true);
  assert.equal(threadVisible({ muted: false, left: false, categoryEnabled: true, userInExchange: false }), true);
});
