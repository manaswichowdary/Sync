import assert from "node:assert/strict";
import { test } from "node:test";
import calendar from "../data/calendar.json";
import { emptyGroupConflictSummary, forecastConflicts } from "./forecast";

const sample = {
  busy: calendar.busy,
  pickups: calendar.pickups,
  offers: calendar.sampleOffers,
};

test("Thursday pickup inside a busy block matches Dana's offer", () => {
  const suggestions = forecastConflicts({
    ...sample,
    now: new Date(2026, 9, 10),
  });
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].summary, "Thursday 3:30 conflict. Dana offered Thursday 3 to 5.");
  assert.equal(suggestions[0].helperName, "Dana");
  assert.equal(suggestions[0].busyLabel, "Team meeting");
});

test("a pickup outside the busy block is not a conflict", () => {
  const suggestions = forecastConflicts({
    busy: sample.busy,
    pickups: [{ weekday: "thursday", time: "17:00", label: "Later pickup" }],
    offers: sample.offers,
    now: new Date(2026, 9, 10),
  });
  assert.equal(suggestions.length, 0);
});

test("a group with no free times does not name a sample neighbor", () => {
  const suggestions = forecastConflicts({
    busy: sample.busy,
    pickups: sample.pickups,
    offers: [],
    now: new Date(2026, 9, 10),
  });
  assert.equal(suggestions[0].helperName, null);
  assert.equal(
    emptyGroupConflictSummary(suggestions[0].summary),
    "Thursday 3:30 conflict. A neighbor can offer to help once they add free times."
  );
});

test("a conflict with no covering offer names no neighbor", () => {
  const suggestions = forecastConflicts({
    busy: sample.busy,
    pickups: sample.pickups,
    offers: [],
    now: new Date(2026, 9, 10),
  });
  assert.equal(suggestions[0].summary, "Thursday 3:30 conflict.");
  assert.equal(suggestions[0].helperName, null);
});

test("weekdays outside the window are skipped", () => {
  const suggestions = forecastConflicts({
    ...sample,
    now: new Date(2026, 9, 10),
    days: 3,
  });
  assert.equal(suggestions.length, 0);
});
