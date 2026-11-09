import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { NextRequest } from "next/server";
import { seed } from "../lib/seed";
import { extractFIAPDF, parseFIAEntryList, type FIAEntryList } from "../lib/fia-entry-list";
import { planOfficialLineup, applyOfficialLineup } from "../lib/driver-lineup";
import { predictionDrivers } from "../lib/season-controls";
import { mappedPicks } from "../lib/enhancements";
import { importSnapshot, validateImportSnapshot } from "../lib/manual-imports";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `driver-lineup-test-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
const source = "https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_entry_list.pdf";
const race = "2026-11-08T17:00:00Z";
const pdf = () => readFile(new URL("./fixtures/fia-2026-brazil-entry-list.pdf", import.meta.url));
async function fixture() {
  const list = parseFIAEntryList(await extractFIAPDF(await pdf()), source, 2026, "São Paulo Grand Prix", race);
  const s = seed(true), season = s.seasons[0], event = s.events[0];
  season.year = 2026;
  season.drivers = list.drivers.map(row => ({ id: row.code === "CAM" ? "OCO" : row.code,
    name: row.code === "CAM" ? "Esteban Ocon" : row.name, team: row.team, color: "#aabbcc", replacementOnly: false, code: row.code === "CAM" ? "OCO" : row.code }));
  Object.assign(event, { name: list.eventName, race, raceGmtOffset: "-03:00", gp: undefined, providerRound: 20 });
  event.gpDraft = { order: [], pole: "", fastest: "", retirements: [], dotd: "", published: false, voids: [] };
  return { s, season, event, list };
}

test("FIA refresh replaces Ocon with Camara only for the selected GP and preserves original picks", async () => {
  const { s, season, event, list } = await fixture();
  s.entries[0].picks.pole = "OCO";
  const entries = structuredClone(s.entries), champions = structuredClone(s.championPicks), other = structuredClone(s.events[1]);
  const plan = planOfficialLineup(s, season, event, "gp", list);
  assert.equal(plan.rules.length, 1);
  assert.equal(plan.rules[0].official!.driverNumber, 51);
  assert.equal(season.drivers.some(d => d.code === "CAM"), false);
  applyOfficialLineup(season, event, "gp", plan);
  const active = predictionDrivers(s, season, event, "gp");
  assert.equal(active.length, 22);
  assert.equal(active.some(d => d.id === "OCO"), false);
  assert.equal(active.some(d => d.code === "CAM"), true);
  assert.equal(predictionDrivers(s, season, event, "sprint").some(d => d.id === "OCO"), true);
  assert.equal(predictionDrivers(s, season, s.events[1], "gp").some(d => d.code === "CAM"), false);
  assert.equal(mappedPicks(s.entries[0].picks, plan.rules).pole, active.find(d => d.code === "CAM")!.id);
  assert.deepEqual(s.entries, entries);
  assert.deepEqual(s.championPicks, champions);
  assert.deepEqual(s.events[1], other);
  assert.equal(event.gpDraft!.replacements!.length, 1);
  assert.equal(planOfficialLineup(s, season, event, "gp", list).rules.length, 0);
});

test("FIA refresh preserves manual policies and refuses wrong weekends, incomplete rosters and conflicting identities", async () => {
  const { s, season, event, list } = await fixture();
  const before = structuredClone(s);
  for (const change of [
    (x: FIAEntryList) => { x.year++; },
    (x: FIAEntryList) => { x.eventName = "Mexican Grand Prix"; },
    (x: FIAEntryList) => { x.endsOn = "2026-11-01"; },
    (x: FIAEntryList) => { x.url = "https://example.com/entry.pdf"; },
    (x: FIAEntryList) => { x.drivers.pop(); },
    (x: FIAEntryList) => { x.drivers[0] = x.drivers[1]; },
    (x: FIAEntryList) => { x.drivers[0].team = "Unknown team"; },
    (x: FIAEntryList) => { x.drivers[0].name = "Another Driver"; x.drivers[1].name = "Other Driver"; },
  ]) {
    const modified = structuredClone(list); change(modified);
    assert.throws(() => planOfficialLineup(s, season, event, "gp", modified));
    assert.deepEqual(s, before);
  }
  const plan = planOfficialLineup(s, season, event, "gp", list);
  season.drivers.push(...plan.additions);
  event.replacements = [{ ...plan.rules[0], source: undefined, policy: "keep" }];
  const manual = structuredClone(event.replacements);
  applyOfficialLineup(season, event, "gp", planOfficialLineup(s, season, event, "gp", list));
  assert.deepEqual(event.replacements, manual);
});

test("FIA refresh validates session scope, publication and concurrent schedule or permission changes", async () => {
  const { s, season, event, list } = await fixture();
  const user = s.users[0];
  const snap = importSnapshot(s, user, { action: "driverLineupRefresh", eventId: event.id, kind: "gp" });
  validateImportSnapshot(s, user, snap);
  event.name = "Changed";
  assert.throws(() => validateImportSnapshot(s, user, snap), /changed while importing/);
  event.name = list.eventName;
  event.gp = { ...event.gpDraft!, published: true };
  assert.throws(() => importSnapshot(s, user, { action: "driverLineupRefresh", eventId: event.id, kind: "gp" }), /Published/);
  assert.throws(() => planOfficialLineup(s, season, event, "gp", list), /unpublished/);
  assert.throws(() => planOfficialLineup(s, season, event, "sprint", list), /Sprint/);
  delete event.gp;
  event.sprintQualifying = "2100-01-01T00:00:00Z";
  const sprint = planOfficialLineup(s, season, event, "sprint", list);
  assert.equal(sprint.rules[0].kind, "sprint");
  applyOfficialLineup(season, event, "sprint", sprint);
  assert.equal(predictionDrivers(s, season, event, "gp").some(d => d.id === "OCO"), true);
  assert.equal(predictionDrivers(s, season, event, "sprint").some(d => d.id === "OCO"), false);
});

test("refresh API authorizes before fetching, imports the real FIA PDF, reports outages and limits repeat checks", async () => {
  const { POST } = await import("../app/api/league/route");
  const { transaction, readState } = await import("../lib/store");
  const f = await fixture(), originalFetch = globalThis.fetch;
  const bytes = await pdf();
  let calls = 0;
  const post = (user = "demo-admin") => POST(new NextRequest("http://127.0.0.1:3000/api/league", {
    method: "POST", headers: { origin: process.env.APP_URL!, cookie: `apex_demo=${user}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "driverLineupRefresh", eventId: f.event.id, kind: "gp" }),
  }));
  try {
    await transaction(s => { s.seasons[0] = f.season; s.events[0] = f.event; });
    globalThis.fetch = async input => {
      calls++;
      const url = String(input);
      if (url.endsWith("/2026")) return new Response('<option value="/documents/championships/110/2026/event/test">São Paulo Grand Prix</option>');
      if (url.endsWith(".pdf")) return new Response(bytes);
      return new Response(`<a href="${source}">Doc 13 - Entry List</a>`);
    };
    assert.equal((await post("demo-1")).status, 403);
    assert.equal(calls, 0);
    const first = await post();
    assert.equal(first.status, 200);
    const state = await readState();
    assert.equal(state.events[0].lineupSync!.status, "updated");
    assert.equal(predictionDrivers(state, state.seasons[0], state.events[0], "gp").some(d => d.id === "OCO"), false);
    const edit = await POST(new NextRequest("http://127.0.0.1:3000/api/league", {
      method: "POST", headers: { origin: process.env.APP_URL!, cookie: "apex_demo=demo-admin", "Content-Type": "application/json" },
      body: JSON.stringify({ ...f.event, action: "event", seasonId: f.season.id, id: f.event.id, laps: 71 }),
    }));
    assert.equal(edit.status, 200);
    assert.equal((await readState()).events[0].replacements!.length, 1);
    assert.equal((await readState()).events[0].driverLineups!.gp!.ids.length, 22);
    assert.equal((await post()).status, 200);
    assert.equal((await readState()).events[0].replacements!.length, 1);
    const saved = structuredClone((await readState()).events[0].driverLineups);
    globalThis.fetch = async () => { throw new Error("FIA connection unavailable"); };
    assert.equal((await post()).status, 200);
    assert.equal((await readState()).events[0].lineupSync!.status, "error");
    assert.deepEqual((await readState()).events[0].driverLineups, saved);
    assert.equal((await post()).status, 429);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(new URL(`../.data/${process.env.DEMO_DATA_FILE}`, import.meta.url), { force: true });
  }
});

test("FIA network waits do not block player reads and concurrent organiser edits reject stale refreshes", async () => {
  const { POST, GET } = await import("../app/api/league/route");
  const { transaction, readState } = await import("../lib/store");
  const f = await fixture(), originalFetch = globalThis.fetch;
  // New isolated test state, including the per-user minute budget.
  (globalThis as any).apexLimits?.clear();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const waiting = new Promise<void>(r => { started = r; });
  const bytes = await pdf();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await transaction(s => { s.seasons[0] = f.season; s.events[0] = f.event; });
    globalThis.fetch = async input => {
      started(); await gate;
      const url = String(input);
      if (url.endsWith("/2026")) return new Response('<option value="/documents/championships/110/2026/event/test">São Paulo Grand Prix</option>');
      if (url.endsWith(".pdf")) return new Response(bytes);
      return new Response(`<a href="${source}">Doc 13 - Entry List</a>`);
    };
    const updating = POST(new NextRequest("http://127.0.0.1:3000/api/league", {
      method: "POST", headers: { origin: process.env.APP_URL!, cookie: "apex_demo=demo-admin", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "driverLineupRefresh", eventId: f.event.id, kind: "gp" }),
    }));
    await waiting;
    const response = await Promise.race([
      GET(new NextRequest("http://127.0.0.1:3000/api/league", { headers: { cookie: "apex_demo=demo-1" } })),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Read blocked by FIA network request")), 2000); }),
    ]);
    clearTimeout(timer);
    assert.equal(response.status, 200);
    await transaction(s => { s.events[0].name = "Edited during FIA refresh"; });
    release();
    assert.equal((await updating).status, 409);
    assert.equal((await readState()).events[0].driverLineups, undefined);
    assert.equal((await readState()).seasons[0].drivers.some(d => d.code === "CAM"), false);
  } finally {
    release(); clearTimeout(timer); globalThis.fetch = originalFetch;
    await rm(new URL(`../.data/${process.env.DEMO_DATA_FILE}`, import.meta.url), { force: true });
  }
});

test("an upcoming Las Vegas refresh reports waiting and preserves every saved lineup and pick", async () => {
  const { POST } = await import("../app/api/league/route");
  const { transaction, readState } = await import("../lib/store");
  const f = await fixture(), originalFetch = globalThis.fetch;
  (globalThis as any).apexLimits?.clear();
  Object.assign(f.event, { name: "Las Vegas Grand Prix", race: "2026-11-22T06:00:00Z", raceGmtOffset: "-08:00" });
  f.event.driverLineups = { gp: { ids: f.season.drivers.map(d => d.id), source: source.replace("sao_paulo", "las_vegas"), refreshedAt: "2026-11-01T00:00:00Z" } };
  try {
    await transaction(s => { s.seasons[0] = f.season; s.events[0] = f.event; });
    const before = await readState();
    let downloads = 0;
    globalThis.fetch = async input => {
      const path = String(input);
      if (path.endsWith(".pdf")) downloads++;
      return new Response(path.endsWith("/2026")
        ? '<option value="/documents/championships/110/2026/event/Las%20Vegas%20Grand%20Prix">Las Vegas Grand Prix</option>'
        : `<a href="${source}">Doc 13 - Entry List</a>`);
    };
    const result = await POST(new NextRequest("http://127.0.0.1:3000/api/league", {
      method: "POST", headers: { origin: process.env.APP_URL!, cookie: "apex_demo=demo-admin", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "driverLineupRefresh", eventId: f.event.id, kind: "gp" }),
    }));
    assert.equal(result.status, 200);
    const after = await readState();
    assert.equal(after.events[0].lineupSync!.status, "waiting");
    assert.match(after.events[0].lineupSync!.message, /No verified FIA entry list/);
    assert.deepEqual(after.events[0].driverLineups, before.events[0].driverLineups);
    assert.deepEqual(after.seasons[0].drivers, before.seasons[0].drivers);
    assert.deepEqual(after.entries, before.entries);
    assert.equal(downloads, 0);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(new URL(`../.data/${process.env.DEMO_DATA_FILE}`, import.meta.url), { force: true });
  }
});
