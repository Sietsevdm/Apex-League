import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { registrationOpen, migrateRegistration, predictionDrivers, classifyImportedDrivers, seasonNameMatches, mergeImportedLineup } from "../lib/season-controls";
test("Registration preserves upgrade status then changes only through manual state", () => {
  const s = seed(true), season = s.seasons[0];
  season.cutoff = "2000-01-01T00:00:00Z";
  migrateRegistration(s);
  assert.equal(registrationOpen(season), false);
  season.registrationClosed = false;
  assert.equal(registrationOpen(season), true);
  migrateRegistration(s);
  assert.equal(registrationOpen(season), true);
  season.cutoff = "2100-01-01T00:00:00Z";
  season.registrationClosed = true;
  assert.equal(registrationOpen(season), false);
  season.registrationClosed = false; season.archived = true;
  assert.equal(registrationOpen(season), false);
});
test("Replacement drivers appear only in the confirmed race and session", () => {
  const s = seed(true), season = s.seasons[0], event = s.events[0];
  season.drivers.push({ id: "reserve", name: "Reserve", team: "Team", color: "#fff", replacementOnly: true });
  assert.ok(!predictionDrivers(s, season, event, "gp").some(d => d.id === "reserve"));
  event.replacements = [{ from: season.drivers[0].id, to: "reserve", kind: "gp", policy: "keep", note: "Confirmed" }];
  assert.ok(predictionDrivers(s, season, event, "gp").some(d => d.id === "reserve"));
  assert.ok(!predictionDrivers(s, season, event, "sprint").some(d => d.id === "reserve"));
  assert.ok(!predictionDrivers(s, season, s.events[1], "gp").some(d => d.id === "reserve"));
  delete season.drivers.at(-1)!.replacementOnly;
  assert.ok(!predictionDrivers(s, season, s.events[1], "gp").some(d => d.id === "reserve"));
});

test("Calendar imports distinguish opening-round drivers from later substitutes", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const url = String(input);
      const drivers = url.includes("/1/drivers/") ? [{ driverId: "starter", givenName: "Start", familyName: "Driver" }] : [{ driverId: "starter", givenName: "Start", familyName: "Driver" }, { driverId: "sub", givenName: "Sub", familyName: "Driver" }];
      return Response.json({ MRData: { RaceTable: { Races: [] }, DriverTable: { Drivers: drivers }, ConstructorTable: { Constructors: [] } } });
    };
    const { importCalendar } = await import("../lib/provider");
    const result = await importCalendar(2026);
    assert.equal(result.drivers[0].replacementOnly, false);
    assert.equal(result.drivers[1].replacementOnly, true);
  } finally { globalThis.fetch = original; }
});

test("Existing imported lineups hide substitutes without removing saved driver records", () => {
  const s = seed(true), season = s.seasons[0];
  const starters = season.drivers.map(d => d.id);
  season.drivers.push({ id: "legacy-sub", name: "Substitute", team: "Team", color: "#fff" });
  assert.equal(classifyImportedDrivers(season, ["unknown"]), false);
  assert.equal(classifyImportedDrivers(season, starters), true);
  assert.equal(season.drivers.at(-1)!.replacementOnly, true);
  assert.ok(!predictionDrivers(s, season, s.events[0], "gp").some(d => d.id === "legacy-sub"));
  assert.equal(season.drivers.length, starters.length + 1);
});

test("Season confirmation ignores invisible spacing and case but requires the complete name", () => {
  assert.equal(seasonNameMatches("2027 season", "  2027\u00a0  Season  "), true);
  assert.equal(seasonNameMatches("Cafe\u0301 2027", "Café 2027"), true);
  assert.equal(seasonNameMatches("2027", "2027 season"), false);
  assert.equal(seasonNameMatches("", "   "), false);
});

test("An empty lineup imports after the pick deadline while saved IDs and manual choices survive", () => {
  const s = seed(true), season = s.seasons[0];
  const drivers = structuredClone(season.drivers);
  season.cutoff = "2000-01-01T00:00:00Z"; season.drivers = []; season.constructors = [];
  mergeImportedLineup(season, { drivers, constructors: ["McLaren"] });
  assert.equal(season.drivers.length, drivers.length);
  assert.deepEqual(season.constructors, ["McLaren"]);
  season.drivers[0].team = "Manual team"; season.drivers[0].color = "#123456";
  const ids = season.drivers.map(d => d.id);
  mergeImportedLineup(season, { drivers: [{ ...drivers[0], team: "Other", color: "#FFFFFF" }], constructors: ["Other"] });
  assert.deepEqual(season.drivers.map(d => d.id), ids);
  assert.equal(season.drivers[0].team, "Manual team");
  assert.equal(season.drivers[0].color, "#123456");
});
test("Lineup imports attach constructor names and team colors to drivers", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async input => {
      const url = String(input);
      const driver = { driverId: "norris", givenName: "Lando", familyName: "Norris" };
      return Response.json({ MRData: {
        DriverTable: { Drivers: [driver] }, ConstructorTable: { Constructors: [{ name: "McLaren" }] },
        RaceTable: { Races: url.includes("results") ? [{ Results: [{ Driver: driver, Constructor: { constructorId: "mclaren", name: "McLaren" } }] }] : [] }
      } });
    };
    const { fetchLineup } = await import("../lib/provider");
    const imported = await fetchLineup(2026);
    assert.equal(imported.drivers[0].team, "McLaren");
    assert.equal(imported.drivers[0].color, "#FF8700");
  } finally { globalThis.fetch = original; }
});
