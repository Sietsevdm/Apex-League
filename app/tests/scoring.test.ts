import { test } from "node:test";
import assert from "node:assert/strict";
import {
  score,
  standings,
  locked,
  cutoff,
  bannerEvent,
  emptyResult,
} from "../lib/model";
import { seed } from "../lib/seed";
const order = Array.from({ length: 10 }, (_, i) => `d${i}`);
const picks = {
  order,
  pole: "d0",
  fastest: "d1",
  retirement: "d2",
  dotd: "d3",
};
const result = {
  ...emptyResult(),
  order,
  pole: "d0",
  fastest: "d1",
  retirements: ["d2"],
  dotd: "d3",
  published: true,
};
test("perfect GP awards 23; perfect Sprint awards 12 without podium bonus", () => {
  assert.equal(score(picks, result, "gp").total, 23);
  assert.equal(
    score({ ...picks, order: order.slice(0, 8) }, result, "sprint").total,
    12,
  );
});
test("podium requires exact order and counts each position only once for tie-breaks", () => {
  const swapped = { ...picks, order: [order[1], order[0], ...order.slice(2)] };
  const s = score(swapped, result, "gp");
  assert.equal(s.total, 16);
  assert.equal(s.exact, 8);
});
test("joint first retirements both score; No retirements can score", () => {
  assert.equal(
    score(picks, { ...result, retirements: ["d2", "d4"] }, "gp").total,
    23,
  );
  assert.equal(
    score(
      { ...picks, retirement: "none" },
      { ...result, retirements: ["none"] },
      "gp",
    ).total,
    23,
  );
});
test("draft results are pending, explicit voids never score", () => {
  assert.equal(score(picks, { ...result, published: false }, "gp").total, 0);
  assert.equal(
    score(
      picks,
      {
        ...result,
        voids: ["order", "podium", "fastest", "retirement", "dotd"],
      },
      "gp",
    ).total,
    3,
  );
});
test("a corrected result replaces the calculation rather than accumulating points", () => {
  const state = seed(true),
    event = state.events[0];
  const before = standings(state, "sample-season").find(
    (x) => x.id === "demo-admin",
  )!.total;
  event.gp!.pole = "VER";
  const after = standings(state, "sample-season").find(
    (x) => x.id === "demo-admin",
  )!.total;
  assert.equal(after, before - 3);
  assert.equal(
    standings(state, "sample-season").find((x) => x.id === "demo-admin")!.total,
    after,
  );
});
test("practice entries never affect season points or wins", () => {
  const state = seed(true),
    before = standings(state, "sample-season");
  state.events.find((x) => x.id === "practice")!.gp = result;
  state.entries.push({
    userId: "demo-admin",
    eventId: "practice",
    kind: "gp",
    picks,
    submitted: true,
    updatedAt: new Date().toISOString(),
  });
  assert.deepEqual(standings(state, "sample-season"), before);
});
test("deadline is exactly one hour before qualifying and persisted lock survives a delay", () => {
  const e = seed(true).events[2];
  assert.equal(Date.parse(e.qualifying) - Date.parse(cutoff(e, "gp")), 3600000);
  assert.equal(locked(e, "gp", Date.parse(cutoff(e, "gp"))), true);
  e.lockedGp = true;
  e.qualifying = new Date(Date.now() + 100 * 3600000).toISOString();
  assert.equal(locked(e, "gp"), true);
});
test("Banner switches at Amsterdam Monday midnight after a race, including off weeks", () => {
  const s = seed(true), base = s.events[0];
  s.events = [{ ...base, id: "current", raceDate: "2026-10-11", race: "2026-10-11T14:00:00Z" }, { ...base, id: "next", raceDate: "2026-10-25", race: "2026-10-25T14:00:00Z" }];
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-10-11T21:59:59Z"))?.id, "current");
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-10-11T22:00:00Z"))?.id, "next");
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-10-16T12:00:00Z"))?.id, "next");
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-12-01T12:00:00Z"))?.id, "next");
  s.settings.bannerOverride = "current";
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-10-12T12:00:00Z"))?.id, "current");
});
test("Monday banner switch respects winter time, Saturday races and unconfirmed session times", () => {
  const s = seed(true), base = s.events[0];
  s.events = [{ ...base, id: "current", practice: "", race: "", raceDate: "2026-10-25" }, { ...base, id: "next", practice: "", race: "", raceDate: "2026-11-07" }];
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-10-25T22:59:59Z"))?.id, "current");
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-10-25T23:00:00Z"))?.id, "next");
  s.events.push({ ...base, id: "third", raceDate: "2026-11-15" });
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-11-08T22:59:59Z"))?.id, "next");
  assert.equal(bannerEvent(s, "sample-season", Date.parse("2026-11-08T23:00:00Z"))?.id, "third");
});
test("equal players share place and all-zero weekends give no wins", () => {
  const s = seed(true);
  s.entries = [];
  const rows = standings(s, "sample-season");
  assert.ok(rows.every((r) => r.rank === 1 && r.wins === 0));
});

test("Sprint categories award 2 for pole and 1 each for fastest lap and retirement", () => {
  const sprint = { ...picks, order: order.slice(0, 8) };
  const correct = score(sprint, result, "sprint").total;
  assert.equal(correct - score({ ...sprint, pole: "wrong" }, result, "sprint").total, 2);
  assert.equal(correct - score({ ...sprint, fastest: "wrong" }, result, "sprint").total, 1);
  assert.equal(correct - score({ ...sprint, retirement: "wrong" }, result, "sprint").total, 1);
});
