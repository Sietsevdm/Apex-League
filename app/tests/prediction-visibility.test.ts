import { test } from "node:test";
import assert from "node:assert/strict";
import { predictionsVisible, type Event } from "../lib/model";

test("GP and Sprint reveals follow independent qualifying ends, not the edit lock", () => {
  const now = Date.now();
  const e = { qualifying: new Date(now).toISOString(), sprintQualifying: new Date(now - 7200000).toISOString(), lockedGp: true, lockedSprint: true } as Event;
  assert.equal(predictionsVisible(e, "gp", now + 3599999), false);
  assert.equal(predictionsVisible(e, "gp", now + 3600000), true);
  assert.equal(predictionsVisible(e, "sprint", now), true);
  assert.equal(predictionsVisible({ ...e, qualifying: "" }, "gp", now), false);
  assert.equal(predictionsVisible(undefined, "gp", now), false);
});
