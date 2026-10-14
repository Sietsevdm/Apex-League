import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { standings, emptyResult } from "../lib/model";
import { pickChanges, seasonProgress } from "../lib/player-history";

test("progress checkpoints match standings, exclude practice/future rounds and isolate title bonuses", () => {
  const s = seed(true);
  const season = s.seasons[0];
  const events = s.events.filter((e) => !e.practiceRound && e.gp?.published);
  s.events.reverse();
  const initial = seasonProgress(s, season.id);
  assert.equal(initial.length, events.length);
  const final = initial.at(-1)!;
  assert.deepEqual(
    final.rows.map((r) => ({ id: r.id, total: r.total, rank: r.rank })),
    standings(s, season.id).map((r) => ({
      id: r.id,
      total: r.total,
      rank: r.rank,
    })),
  );
  assert.ok(
    final.rows.every(
      (r) => r.gap === Math.max(...final.rows.map((p) => p.total)) - r.total,
    ),
  );
  season.champions = {
    driver: season.drivers[0].id,
    constructor: season.constructors[0],
  };
  s.championPicks = [
    { userId: "demo-admin", seasonId: season.id, ...season.champions },
  ];
  const withBonuses = seasonProgress(s, season.id);
  assert.deepEqual(withBonuses.slice(0, -1), initial);
  assert.equal(withBonuses.at(-1)?.id, "title-bonuses");
  assert.equal(
    withBonuses.at(-1)?.rows.find((r) => r.id === "demo-admin")!.total,
    final.rows.find((r) => r.id === "demo-admin")!.total + 25,
  );
  assert.deepEqual(
    withBonuses.at(-1)?.rows.map((r) => r.total),
    standings(s, season.id).map((r) => r.total),
  );
  const oldTotal = final.rows.find((r) => r.id === "demo-admin")!.total;
  events[0].gp!.voids = ["order"];
  const corrected = seasonProgress(s, season.id);
  assert.ok(
    corrected.at(-2)!.rows.find((r) => r.id === "demo-admin")!.total < oldTotal,
  );
});
test("receipt changes retain original picks and identify individual positions/categories", () => {
  const before = {
    order: ["a", "b"],
    pole: "a",
    fastest: "a",
    retirement: "none",
    dotd: "b",
  };
  const after = { ...before, order: ["b", "a"], pole: "b" };
  assert.deepEqual(
    pickChanges(before, after).map((c) => c.label),
    ["P1", "P2", "Pole position"],
  );
  assert.deepEqual(pickChanges(after, after), []);
  assert.deepEqual(before.order, ["a", "b"]);
});

test("partial Sprint checkpoints preserve shared ranks and hide unpublished results", () => {
  const s = seed(true);
  const e = s.events.find((e) => e.id === "singapore")!;
  s.events = [e];
  s.entries = [];
  const order = s.seasons[0].drivers.slice(0, 8).map((d) => d.id);
  e.sprint = {
    ...emptyResult(),
    order,
    pole: order[0],
    fastest: order[0],
    retirements: ["none"],
    published: true,
  };
  for (const userId of ["demo-admin", "demo-1"])
    s.entries.push({
      userId,
      eventId: e.id,
      kind: "sprint",
      submitted: true,
      updatedAt: new Date().toISOString(),
      picks: {
        order,
        pole: order[0],
        fastest: order[0],
        retirement: "none",
        dotd: "",
      },
    });
  const points = seasonProgress(s, s.seasons[0].id);
  assert.equal(points.length, 1);
  assert.equal(points[0].partial, true);
  assert.equal(points[0].rows.find((r) => r.id === "demo-admin")!.rank, 1);
  assert.equal(points[0].rows.find((r) => r.id === "demo-1")!.rank, 1);
  e.sprint.published = false;
  assert.equal(seasonProgress(s, s.seasons[0].id).length, 0);
});
