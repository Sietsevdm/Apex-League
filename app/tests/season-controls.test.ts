import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { registrationOpen, migrateRegistration, predictionDrivers } from "../lib/season-controls";
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
