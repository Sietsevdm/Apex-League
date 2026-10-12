import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import {
  mergeCalendar,
  recordCalendarSync,
  IncomingEvent,
} from "../lib/calendar-sync";
import { calendarEvents } from "../lib/provider";
import { cutoff, locked } from "../lib/model";
const now = Date.parse("2026-10-11T12:00:00Z");
function setup() {
  const s = seed(false);
  s.seasons.push({
    id: "2027",
    year: 2027,
    name: "2027 season",
    drivers: [],
    constructors: [],
    cutoff: "2027-12-01T00:00:00Z",
    archived: false,
    calendarSync: { enabled: true },
  });
  return s;
}
function race(round = 1): IncomingEvent {
  return {
    id: `2027-${round}`,
    providerRound: round,
    providerCircuitId: "albert_park",
    name: "Australian Grand Prix",
    circuit: "Albert Park",
    country: "Melbourne",
    practice: "2027-03-12T00:00:00Z",
    qualifying: "2027-03-13T05:00:00Z",
    race: "2027-03-14T05:00:00Z",
    raceDate: "2027-03-14",
    hasSprint: false,
    practiceRound: false,
    length: "",
    laps: 0,
    photo: "",
    credit: "",
    focal: 50,
  };
}
test("early calendar stores dates without fabricating session times or opening predictions", () => {
  const mapped = calendarEvents(
    [
      {
        round: "1",
        raceName: "Australian Grand Prix",
        date: "2027-03-14",
        Circuit: {
          circuitId: "albert_park",
          circuitName: "Albert Park",
          Location: { locality: "Melbourne" },
        },
      },
    ],
    2027,
  );
  const s = setup();
  mergeCalendar(s, s.seasons[0], mapped, now);
  assert.equal(s.events[0].raceDate, "2027-03-14");
  assert.equal(cutoff(s.events[0], "gp"), "");
  assert.equal(locked(s.events[0], "gp", now), true);
});
test("known times later open entries; repeated sync is idempotent", () => {
  const s = setup(),
    r = race();
  mergeCalendar(
    s,
    s.seasons[0],
    [{ ...r, practice: "", qualifying: "", race: "" }],
    now,
  );
  mergeCalendar(s, s.seasons[0], [r], now);
  assert.equal(locked(s.events[0], "gp", now), false);
  assert.equal(s.seasons[0].cutoff, "2027-03-13T04:00:00.000Z");
  assert.equal(mergeCalendar(s, s.seasons[0], [r], now).length, 0);
  assert.equal(s.events.length, 1);
});
test("open deadlines move, locked deadlines never reopen after schedule delays", () => {
  const s = setup(),
    r = race();
  mergeCalendar(s, s.seasons[0], [r], now);
  mergeCalendar(
    s,
    s.seasons[0],
    [{ ...r, qualifying: "2027-03-13T08:00:00Z" }],
    now,
  );
  assert.equal(cutoff(s.events[0], "gp"), "2027-03-13T07:00:00.000Z");
  mergeCalendar(
    s,
    s.seasons[0],
    [{ ...r, qualifying: "2027-03-14T08:00:00Z" }],
    Date.parse("2027-03-13T07:00:00Z"),
  );
  assert.equal(cutoff(s.events[0], "gp"), "2027-03-13T07:00:00.000Z");
  assert.equal(s.events[0].lockedGp, true);
});
test("round renumbering preserves identity, predictions, photos and published results", () => {
  const s = setup(),
    r = race();
  mergeCalendar(s, s.seasons[0], [r], now);
  s.events[0].photo = "owned-photo";
  s.events[0].gp = {
    order: [],
    pole: "x",
    fastest: "",
    retirements: [],
    dotd: "",
    voids: [],
    published: true,
  };
  mergeCalendar(
    s,
    s.seasons[0],
    [{ ...r, id: "2027-2", providerRound: 2 }],
    now,
  );
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].id, "2027-1");
  assert.equal(s.events[0].providerRound, 2);
  assert.equal(s.events[0].photo, "owned-photo");
  assert.equal(s.events[0].gp?.published, true);
});
test("manual schedule overrides stay intact; missing races are flagged and retained", () => {
  const s = setup(),
    r = race();
  mergeCalendar(s, s.seasons[0], [r], now);
  s.events[0].calendarOverride = true;
  mergeCalendar(
    s,
    s.seasons[0],
    [{ ...r, qualifying: "2027-03-20T05:00:00Z" }],
    now,
  );
  assert.equal(s.events[0].qualifying, r.qualifying);
  mergeCalendar(
    s,
    s.seasons[0],
    [
      {
        ...race(2),
        providerCircuitId: "monza",
        circuit: "Monza",
        name: "Italian Grand Prix",
      },
    ],
    now,
  );
  assert.equal(s.events.length, 2);
  assert.match(s.events[0].calendarReview!, /Missing/);
});
test("empty calendar waits without treating existing races as cancelled", () => {
  const s = setup();
  mergeCalendar(s, s.seasons[0], [race()], now);
  recordCalendarSync(s, s.seasons[0], [], "Test", now);
  assert.equal(s.seasons[0].calendarSync?.status, "waiting");
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].calendarReview, undefined);
});
test("only material changes generate announcements", () => {
  const s = setup();
  recordCalendarSync(s, s.seasons[0], [race()], "Test", now);
  const count = s.settings.announcements.length;
  recordCalendarSync(s, s.seasons[0], [race()], "Test", now);
  assert.equal(s.settings.announcements.length, count);
  assert.ok(s.seasons[0].calendarSync?.lastSuccess);
});
