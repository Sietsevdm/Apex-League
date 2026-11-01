import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { seed } from "../lib/seed";
import { emptyResult } from "../lib/model";
import { driverCode, predictionColumns, weekendAwards } from "../lib/weekend-social";
import WeekendPredictionGrid from "../components/WeekendPredictionGrid";
import TimingDriver from "../components/TimingDriver";

test("timing chips use provider or stored codes, normalized surnames, team logo and contrast", () => {
  const s = seed(true), season = s.seasons[0];
  assert.equal(driverCode({ ...season.drivers[0], id: "max_verstappen", code: "VER" }), "VER");
  assert.equal(driverCode({ ...season.drivers[0], id: "hulkenberg", name: "Nico Hülkenberg" }), "HUL");
  assert.equal(driverCode({ ...season.drivers[0], id: "de_vries", name: "Nyck de Vries" }), "DEV");
  const html = renderToStaticMarkup(createElement(TimingDriver, { season, id: "NOR" }));
  assert.match(html, />NOR</);
  assert.match(html, /mclaren.webp/);
  assert.match(html, /background-color:#FF8700/);
  assert.match(html, /color:#000000/);
  assert.match(html, /Lando Norris/);
  assert.equal(predictionColumns("gp").length, 14);
  assert.equal(predictionColumns("sprint").length, 11);
});

test("weekend grid hides even locally present picks before reveal and excludes drafts afterwards", () => {
  const s = seed(true), season = s.seasons[0], event = s.events[0];
  event.gp = undefined; event.qualifying = new Date(Date.now() + 3600000).toISOString();
  let html = renderToStaticMarkup(createElement(WeekendPredictionGrid, { s, season, event, kind: "gp", meId: s.users[0].id }));
  assert.match(html, /The grid is still secret/);
  assert.doesNotMatch(html, /timing-driver/);
  event.qualifying = new Date(Date.now() - 7200000).toISOString();
  s.entries = s.entries.filter(p => p.userId === s.users[0].id && p.eventId === event.id);
  s.entries[0].submitted = false;
  html = renderToStaticMarkup(createElement(WeekendPredictionGrid, { s, season, event, kind: "gp", meId: s.users[0].id }));
  assert.match(html, /No submission/);
  assert.doesNotMatch(html, />VER</);
});

test("focused grid shows only the viewer and chosen rival while highlights keep the full league context", () => {
  const s = seed(true), season = s.seasons[0], event = s.events[0];
  const html = renderToStaticMarkup(createElement(WeekendPredictionGrid, { s, season, event, kind: "gp", meId: s.users[0].id, rivalId: s.users[1].id, focused: true }));
  const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
  assert.equal((body.match(/<tr/g) || []).length, 2);
  assert.ok(body.includes(s.users[0].name));
  assert.ok(body.includes(s.users[1].name));
  assert.ok(!body.includes(s.users[2].name));
  assert.match(html, /against-grid-disclosure/);
});

test("awards wait for all sessions, exclude practice and share perfect podiums without mutating scores", () => {
  const s = seed(true), e = s.events[0];
  const first = s.entries.find(p => p.eventId === e.id)!;
  s.entries.filter(p => p.eventId === e.id).forEach(p => { p.picks = structuredClone(first.picks); });
  const snapshot = JSON.stringify(s);
  const awards = weekendAwards(s, e);
  assert.equal(awards.ready, true);
  assert.equal(awards.podiums.length, s.users.length);
  assert.equal(awards.bold.length, 0);
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(weekendAwards(s, { ...e, hasSprint: true }).ready, false);
  assert.equal(weekendAwards(s, { ...e, practiceRound: true }).ready, false);
  e.gp!.voids = ["podium", "order", "pole", "fastest", "retirement", "dotd"];
  assert.equal(weekendAwards(s, e).podiums.length, 0);
  assert.equal(weekendAwards(s, e).bold.length, 0);
});

test("bold correct picks use category rarity, ignore drafts and voids, and tie fairly", () => {
  const s = seed(true), e = s.events[0];
  const entries = s.entries.filter(p => p.eventId === e.id);
  for (const p of entries) { p.picks.pole = "VER"; }
  entries[0].picks.pole = "NOR";
  e.gp!.voids = ["order", "podium", "fastest", "retirement", "dotd"];
  let award = weekendAwards(s, e);
  assert.equal(award.bold.length, 1);
  assert.equal(award.bold[0].name, s.users[0].name);
  assert.equal(award.bold[0].supporters, 1);
  assert.equal(award.bold[0].total, entries.length);
  entries[1].picks.pole = "NOR";
  award = weekendAwards(s, e);
  assert.equal(award.bold.length, 2);
  entries[0].submitted = false;
  assert.equal(weekendAwards(s, e).bold.some(p => p.userId === entries[0].userId), false);
  e.gp!.voids.push("pole");
  assert.equal(weekendAwards(s, e).bold.length, 0);
});

test("comeback ignores future events and championship bonuses, and needs a previous round", () => {
  const s = seed(true), e = s.events[1];
  const first = s.events[0];
  first.race = "2026-01-01T12:00:00Z"; e.race = "2026-02-01T12:00:00Z";
  const baseline = weekendAwards(s, e);
  s.seasons[0].champions = { driver: "VER", constructor: "McLaren" };
  s.events.push({ ...e, id: "future", race: "2026-12-01T12:00:00Z", gp: { ...emptyResult(), published: true } });
  assert.deepEqual(weekendAwards(s, e).comeback, baseline.comeback);
  assert.equal(weekendAwards(s, first).places, 0);
});

test("comeback rewards a real climb and bold picks follow scoring replacements", () => {
  const s = seed(true), first = s.events[0], e = s.events[1];
  first.race = "2026-01-01T12:00:00Z"; e.race = "2026-02-01T12:00:00Z";
  const entries = s.entries.filter(p => p.eventId === e.id);
  const perfect = structuredClone(entries[0].picks);
  entries[0].picks = structuredClone(entries.at(-1)!.picks);
  entries.at(-1)!.picks = perfect;
  assert.ok(weekendAwards(s, e).places > 0);
  assert.ok(weekendAwards(s, e).comeback.includes(s.users.at(-1)!.name));
  // The original prediction remains unchanged while effective replacement picks score.
  e.gp!.pole = "replacement";
  e.gp!.replacements = [{ kind: "gp", from: "NOR", to: "replacement", policy: "carry", note: "Test replacement" }];
  e.gp!.voids = ["order", "podium", "fastest", "retirement", "dotd"];
  const award = weekendAwards(s, e);
  assert.ok(award.bold.length > 0);
  assert.ok(award.bold.every(p => p.driverId === "replacement"));
  assert.equal(entries.at(-1)!.picks.pole, "NOR");
});
