import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import {
  stopInterval,
  firstStop,
  validLaps,
  fetchOpenF1Result,
} from "../lib/openf1-results";
import { openf1, matchDriver, eventSessions } from "../lib/openf1";
import { mergeCalendar } from "../lib/calendar-sync";
import {
  mergeImportedLineup,
  classifyImportedDrivers,
} from "../lib/season-controls";
import { providerFixture } from "./openf1-fixture";

const base = Date.parse("2026-03-01T00:00:00Z");
function telemetry(num: number, stop: number) {
  return Array.from({ length: 90 }, (_, i) => ({
    session_key: 101,
    meeting_key: 1,
    driver_number: num,
    date: new Date(base + i * 500).toISOString(),
    speed: i * 500 < stop ? 60 : 0,
    rpm: i * 500 < stop ? 5000 : 0,
    n_gear: i * 500 < stop ? 3 : 0,
  }));
}

test("stop intervals distinguish the Mexico-style 9.8-second gap and reject sampling uncertainty", () => {
  const a = stopInterval(telemetry(14, 1000)),
    b = stopInterval(telemetry(18, 10800));
  assert.deepEqual(
    firstStop([
      { id: "Alonso", ...a },
      { id: "Stroll", ...b },
    ]),
    ["Alonso"],
  );
  assert.throws(
    () =>
      firstStop([
        { id: "a", from: 1, to: 500 },
        { id: "b", from: 400, to: 900 },
      ]),
    /too close/,
  );
  assert.deepEqual(firstStop([]), ["none"]);
});

test("missing telemetry, gaps, no observed movement and a late restart remain reviewable", () => {
  assert.throws(() => stopInterval([]), /incomplete/);
  assert.throws(() => stopInterval(telemetry(14, 0)), /permanent/);
  const gaps = telemetry(14, 1000).filter((_, i) => i < 3 || i > 15);
  assert.throws(() => stopInterval(gaps), /gaps/);
  const restart = telemetry(14, 1000);
  restart.at(-1)!.speed = 60;
  assert.throws(() => stopInterval(restart), /permanent/);
  const missing = telemetry(14, 1000);
  missing[5].speed = NaN;
  assert.throws(() => stopInterval(missing), /incomplete/);
});

test("driver matching retains saved IDs and does not trust a reused car number", () => {
  const s = structuredClone(seed(true).seasons[0]);
  assert.equal(
    matchDriver(
      { first_name: "Max", last_name: "Verstappen", driver_number: 99 },
      s,
    ).id,
    "VER",
  );
  assert.throws(
    () =>
      matchDriver(
        { first_name: "Unknown", last_name: "Person", driver_number: 1 },
        s,
      ),
    /review/,
  );
  s.drivers.push({ ...s.drivers[0], id: "duplicate" });
  assert.throws(
    () => matchDriver({ first_name: "Max", last_name: "Verstappen" }, s),
    /review/,
  );
});

test("OpenF1 migration keeps event IDs, entries, locked deadlines and manual lineup values", () => {
  const s = seed(true),
    season = s.seasons[0],
    event = s.events[0];
  event.providerCircuitId = "bahrain";
  event.providerRound = 1;
  event.gpDeadline = event.qualifying;
  event.lockedGp = true;
  const before = structuredClone(event),
    entries = structuredClone(s.entries);
  const source = {
    ...event,
    id: "openf1-1",
    openf1MeetingKey: 1,
    providerRound: 2,
    qualifying: "2040-03-01T00:00:00Z",
  };
  mergeCalendar(s, season, [source]);
  const saved = s.events.find((e) => e.id === before.id)!;
  assert.equal(saved.openf1MeetingKey, 1);
  assert.equal(saved.gpDeadline, before.gpDeadline);
  assert.deepEqual(saved.gp, before.gp);
  assert.deepEqual(s.entries, entries);
  assert.equal(s.events.filter((e) => e.openf1MeetingKey === 1).length, 1);
  const id = season.drivers[0].id;
  season.drivers[0].team = "Manual";
  mergeImportedLineup(season, {
    drivers: [
      { ...season.drivers[0], id: "openf1-maxverstappen", team: "Different" },
    ],
    constructors: [],
  });
  assert.equal(season.drivers[0].id, id);
  assert.equal(season.drivers[0].team, "Manual");
  assert.equal(
    classifyImportedDrivers(
      season,
      season.drivers.map(
        (d) => `openf1-${d.name.toLowerCase().replace(/[^a-z]/g, "")}`,
      ),
    ),
    true,
  );
});

test("OpenF1 empty data is distinct from errors and malformed responses", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      (globalThis as any).apexOpenF1Next = 0;
      return Response.json({ detail: "No results found." }, { status: 404 });
    };
    assert.deepEqual(await openf1("car_data"), []);
    globalThis.fetch = async () => {
      (globalThis as any).apexOpenF1Next = 0;
      return Response.json({ detail: "not found" }, { status: 404 });
    };
    await assert.rejects(openf1("sessions"), /404/);
    globalThis.fetch = async () => {
      (globalThis as any).apexOpenF1Next = 0;
      return Response.json({ unexpected: true });
    };
    await assert.rejects(openf1("sessions"), /invalid/);
  } finally {
    globalThis.fetch = original;
  }
});

test("automatic GP resolves same-lap retirements with telemetry and imports keep saved driver IDs", async () => {
  const original = globalThis.fetch;
  const f = providerFixture(2026, new Date(base).toISOString()),
    state = seed(true),
    season = state.seasons[0];
  season.year = 2026;
  const event = {
    ...state.events[0],
    name: "Custom organiser name",
    openf1MeetingKey: 1,
    race: new Date(base).toISOString(),
  };
  f.results[18].dnf = true;
  f.results[18].number_of_laps = 5;
  f.results[18].position = null as any;
  f.results[19].dnf = true;
  f.results[19].number_of_laps = 5;
  f.results[19].position = null as any;
  f.laps[18].lap_number = 6;
  f.laps[19].lap_number = 6;
  let laterMovement = false,
    wrongSession = false;
  globalThis.fetch = async (input) => {
    (globalThis as any).apexOpenF1Next = 0;
    const u = new URL(String(input));
    if (u.hostname === "www.formula1.com")
      return new Response(
        "<table><tr><td>Bahrain</td><td>Max Verstappen</td></tr></table>",
      );
    if (u.pathname.endsWith("/car_data")) {
      assert.ok(!u.searchParams.has("date>="));
      assert.ok(u.searchParams.has("date>"));
      if (u.searchParams.has("speed>"))
        return Response.json(
          laterMovement
            ? [{ session_key: 101, meeting_key: 1, driver_number: 19 }]
            : [],
        );
      const num = Number(u.searchParams.get("driver_number"));
      return Response.json(
        telemetry(num, num === 19 ? 1000 : 10800).map((r) =>
          wrongSession ? { ...r, session_key: 999 } : r,
        ),
      );
    }
    return f.respond(input);
  };
  try {
    const result = await fetchOpenF1Result(season, event, "gp", true);
    assert.equal(result.published, true);
    assert.deepEqual(result.retirements, [season.drivers[18].id]);
    assert.equal(result.dotd, "VER");
    const partial = await fetchOpenF1Result(season, event, "gp", false);
    assert.equal(partial.published, false);
    assert.equal(partial.order[0], season.drivers[0].id);
    const { importResults } = await import("../lib/provider");
    const preview = await importResults(season, event, "gp");
    assert.deepEqual(Object.keys(preview).sort(), ["fastest", "order", "pole"]);
    laterMovement = true;
    await assert.rejects(
      fetchOpenF1Result(season, event, "gp", true),
      /Later car movement/,
    );
    laterMovement = false;
    wrongSession = true;
    await assert.rejects(
      fetchOpenF1Result(season, event, "gp", true),
      /different session/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("unmatched meetings never fall back to a round number", async () => {
  const original = globalThis.fetch,
    f = providerFixture(2026, new Date(base).toISOString()),
    s = seed(true);
  s.seasons[0].year = 2026;
  globalThis.fetch = async (input) => f.respond(input);
  try {
    await assert.rejects(
      eventSessions(
        s.seasons[0],
        { ...s.events[0], openf1MeetingKey: 999, providerRound: 1 },
        "gp",
      ),
      /matching/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("fastest lap excludes deleted laps, handles reinstatement and ignores another session's earlier messages", () => {
  const laps = [
    { driver_number: 14, lap_number: 5 },
    { driver_number: 18, lap_number: 5 },
  ];
  const message = (message: string, date = base + 1000) => ({
    message,
    date: new Date(date).toISOString(),
    lap_number: 6,
  });
  const deleted = message(
    "CAR 14 (ALO) TIME 1:20.123 DELETED - TRACK LIMITS LAP 5",
  );
  assert.deepEqual(validLaps(laps, [deleted], base), [laps[1]]);
  assert.deepEqual(
    validLaps(
      laps,
      [deleted, message("CAR 14 (ALO) LAP 5 REINSTATED", base + 2000)],
      base,
    ),
    laps,
  );
  assert.deepEqual(
    validLaps(
      laps,
      [{ ...deleted, date: new Date(base - 1000).toISOString() }],
      base,
    ),
    laps,
  );
  assert.throws(
    () => validLaps(laps, [message("CAR 14 LAP TIME DELETED")], base),
    /review/,
  );
});

test("Sprint uses Sprint qualifying, eight positions and no Driver of the Day request", async () => {
  const f = providerFixture(2026, new Date(base).toISOString()),
    original = globalThis.fetch,
    state = seed(true);
  const season = { ...state.seasons[0], year: 2026 },
    event = { ...state.events[0], openf1MeetingKey: 1 };
  globalThis.fetch = async (input) => {
    (globalThis as any).apexOpenF1Next = 0;
    const u = new URL(String(input));
    assert.equal(u.hostname, "api.openf1.org");
    if (u.pathname.endsWith("/sessions"))
      return Response.json(
        u.searchParams.get("session_name") === "Race"
          ? [f.race]
          : [
              f.race,
              { ...f.race, session_key: 103, session_name: "Sprint" },
              { ...f.qualifying, session_name: "Sprint Qualifying" },
            ],
      );
    if (u.pathname.endsWith("/drivers"))
      return Response.json(f.drivers.map((r) => ({ ...r, session_key: 103 })));
    if (u.pathname.endsWith("/laps"))
      return Response.json(f.laps.map((r) => ({ ...r, session_key: 103 })));
    if (
      u.pathname.endsWith("/session_result") &&
      u.searchParams.get("session_key") === "103"
    )
      return Response.json(f.results.map((r) => ({ ...r, session_key: 103 })));
    return f.respond(input);
  };
  try {
    const r = await fetchOpenF1Result(season, event, "sprint", true);
    assert.equal(r.order.length, 8);
    assert.equal(r.dotd, "");
    assert.deepEqual(r.retirements, ["none"]);
    assert.equal(r.published, true);
  } finally {
    globalThis.fetch = original;
  }
});
