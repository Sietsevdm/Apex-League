import { test } from "node:test";
import assert from "node:assert/strict";
import { weekendSessions, weekendProgress } from "../lib/weekend-progress";
import { calendarEvents } from "../lib/provider";
import { mergeCalendar } from "../lib/calendar-sync";
import { seed } from "../lib/seed";
test("session progress fills with elapsed time, stops between sessions and catches up after hidden tabs", () => {
  const e = {
    ...seed(true).events[0],
    gp: undefined,
    sprint: undefined,
    practice: "2026-10-23T10:00:00Z",
    practice2: "2026-10-23T14:00:00Z",
    practice3: "",
    qualifying: "2026-10-24T14:00:00Z",
    race: "2026-10-25T14:00:00Z",
  };
  const at = (t: string) => weekendProgress(e, Date.parse(t));
  assert.equal(at("2026-10-23T09:59:59Z")[0].progress, 0);
  assert.equal(at("2026-10-23T10:30:00Z")[0].progress, 0.5);
  assert.equal(at("2026-10-23T10:30:00Z")[0].running, true);
  assert.equal(at("2026-10-23T12:00:00Z")[0].progress, 1);
  assert.equal(at("2026-10-23T12:00:00Z")[1].progress, 0);
  assert.equal(at("2026-10-23T14:45:00Z")[1].progress, 0.75);
  assert.equal(at("2026-10-23T14:45:00Z")[2].progress, 0);
  assert.equal(at("2026-10-25T15:00:00Z")[4].progress, 0.5);
});
test("normal and Sprint banners show all five correct sessions even without times", () => {
  const e = seed(true).events[0];
  assert.deepEqual(
    weekendSessions(e).map((x) => x.label),
    ["FP1", "FP2", "FP3", "Quali", "Race"],
  );
  assert.equal(weekendSessions(e)[1].time, "");
  assert.deepEqual(
    weekendSessions({ ...e, hasSprint: true }).map((x) => x.label),
    ["FP1", "Sprint Quali", "Sprint Race", "Quali", "Race"],
  );
  assert.equal(
    weekendSessions({ ...e, sprintRace: e.race })[2].label,
    "Sprint Race",
  );
});
test("FP2/FP3 times import and refresh while preserving manual schedule overrides", () => {
  const input = {
    round: "1",
    raceName: "Test GP",
    date: "2027-03-14",
    time: "12:00:00Z",
    Circuit: {
      circuitId: "test",
      circuitName: "Test",
      Location: { locality: "Test" },
    },
    SecondPractice: { date: "2027-03-12", time: "16:00:00Z" },
    ThirdPractice: { date: "2027-03-13", time: "12:00:00Z" },
  };
  const incoming = calendarEvents([input], 2027),
    s = seed(true),
    season = s.seasons[0];
  mergeCalendar(s, season, incoming, 0);
  const e = s.events.find((x) => x.providerCircuitId === "test")!;
  assert.equal(e.practice2, "2027-03-12T16:00:00Z");
  assert.equal(weekendSessions(e)[2].time, "2027-03-13T12:00:00Z");
  incoming[0].practice2 = "2027-03-12T17:00:00Z";
  mergeCalendar(s, season, incoming, 0);
  assert.equal(e.practice2, incoming[0].practice2);
  e.calendarOverride = true;
  incoming[0].practice3 = "2027-03-13T13:00:00Z";
  mergeCalendar(s, season, incoming, 0);
  assert.equal(e.practice3, "2027-03-13T12:00:00Z");
});
