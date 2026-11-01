import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { againstTheGrid, personalBests, weekendRival } from "../lib/player-insights";

test("majority highlights exclude own vote, drafts and foreign members and stay private", () => {
  const s = seed(true), e = s.events[0], me = s.users[0].id;
  const entries = s.entries.filter(p => p.eventId === e.id).slice(0, 4);
  s.entries = entries;
  entries.forEach(p => { p.picks.pole = "VER"; });
  entries[0].picks.pole = "NOR";
  const pole = () => againstTheGrid(s, e, "gp", me).find(p => p.label === "Pole position");
  assert.equal(pole()?.majority, "VER");
  assert.equal(pole()?.total, entries.length - 1);
  entries[1].submitted = false;
  s.users.find(u => u.id === entries[2].userId)!.seasonIds = [];
  assert.equal(pole(), undefined); // Fewer than two other submitted members.
  e.gp = undefined; e.qualifying = new Date(Date.now() + 3600000).toISOString();
  assert.deepEqual(againstTheGrid(s, e, "gp", me), []);
});

test("no strict majority or missing own submission produces no highlights", () => {
  const s = seed(true), e = s.events[0], me = s.users[0].id;
  const entries = s.entries.filter(p => p.eventId === e.id);
  s.entries = entries.slice(0, 3);
  entries[1].picks.pole = "VER"; entries[2].picks.pole = "LEC";
  assert.equal(againstTheGrid(s, e, "gp", me).some(p => p.label === "Pole position"), false);
  entries[0].submitted = false;
  assert.deepEqual(againstTheGrid(s, e, "gp", me), []);
});

test("rivals use the smallest points gap and deterministic ties without requiring prediction access", () => {
  const s = seed(true), me = s.users[0].id;
  const rival = weekendRival(s, s.seasons[0].id, me)!;
  assert.notEqual(rival.id, me);
  assert.ok(rival.gap >= 0);
  s.entries = []; s.championPicks = [];
  const first = weekendRival(s, s.seasons[0].id, me);
  s.users.reverse();
  assert.equal(weekendRival(s, s.seasons[0].id, me)?.id, first?.id);
  assert.equal(weekendRival(s, "missing", me), undefined);
});

test("personal records use complete published weekends and do not change the source state", () => {
  const s = seed(true), me = s.users[0].id, seasonId = s.seasons[0].id;
  s.events[0].race = "2026-01-01T12:00:00Z"; s.events[1].race = "2026-02-01T12:00:00Z";
  const original = JSON.stringify(s);
  let best = personalBests(s, seasonId, me);
  assert.equal(best.weekends, 2);
  assert.equal(best.weekend.value, 23);
  assert.equal(best.exact.value, 10);
  assert.equal(best.weekend.isNew, false); // Equal scores are not a new record.
  assert.equal(best.streak.value, 2);
  assert.equal(best.streak.isNew, true);
  assert.equal(JSON.stringify(s), original);
  s.events[1].hasSprint = true;
  best = personalBests(s, seasonId, me);
  assert.equal(best.weekends, 1); // Incomplete Sprint weekend remains pending.
  s.events[0].practiceRound = true;
  assert.equal(personalBests(s, seasonId, me).weekends, 0);
});

test("zero-score weekends break streaks; fully void rounds and season bonuses do not count", () => {
  const s = seed(true), me = s.users[0].id, seasonId = s.seasons[0].id;
  s.events[0].race = "2026-01-01T12:00:00Z"; s.events[1].race = "2026-02-01T12:00:00Z";
  s.entries = s.entries.filter(p => !(p.userId === me && p.eventId === s.events[1].id));
  assert.equal(personalBests(s, seasonId, me).streak.current, 0);
  s.events[1].gp!.voids = ["order", "podium", "pole", "fastest", "retirement", "dotd"];
  const before = personalBests(s, seasonId, me);
  assert.equal(before.weekends, 1);
  assert.equal(before.streak.current, 1);
  s.seasons[0].champions = { driver: "VER", constructor: "McLaren" };
  assert.deepEqual(personalBests(s, seasonId, me), before);
});

test("a new personal best requires a strict improvement in the latest complete weekend", () => {
  const s = seed(true), me = s.users[0].id, seasonId = s.seasons[0].id;
  s.events[0].race = "2026-01-01T12:00:00Z"; s.events[1].race = "2026-02-01T12:00:00Z";
  s.entries.find(p => p.userId === me && p.eventId === s.events[0].id)!.submitted = false;
  const best = personalBests(s, seasonId, me);
  assert.equal(best.weekend.isNew, true);
  assert.equal(best.exact.isNew, true);
  assert.equal(best.weekend.value, 23);
});
