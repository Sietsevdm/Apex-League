import { test, before } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { seed } from "../lib/seed";
let planReplacements: typeof import("../lib/automatic-replacements").planReplacements;
let fetchReplacementLineups: typeof import("../lib/automatic-replacements").fetchReplacementLineups;
let syncDueReplacements: typeof import("../lib/automatic-replacements").syncDueReplacements;
before(async () => {
  ({ planReplacements, fetchReplacementLineups, syncDueReplacements } =
    await import("../lib/automatic-replacements"));
});
import { mappedPicks } from "../lib/enhancements";
process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `replacements-test-${process.pid}.json`;
function fixture() {
  const s = seed(true),
    season = s.seasons[0],
    event = s.events[0];
  season.drivers = Array.from({ length: 20 }, (_, i) => ({
    id: `D${i}`,
    name: `Driver Person${i}`,
    team: `Team${Math.floor(i / 2)}`,
    color: "#123456",
  }));
  event.providerRound = 2;
  event.circuit = "Test Circuit";
  const row = (i: number, round: number) => ({
    driver: {
      id: `driver_${i}`,
      given_name: "Driver",
      family_name: `Person${i}`,
      abbreviation: `D${i}`,
    },
    team: { id: `team_${Math.floor(i / 2)}`, name: `Team${Math.floor(i / 2)}` },
    session: { id: `session_${round}`, type: "R", is_cancelled: false },
    round: { id: `round_${round}`, number: round, is_cancelled: false },
  });
  const data = {
    opening: Array.from({ length: 20 }, (_, i) => row(i, 1)),
    current: Array.from({ length: 20 }, (_, i) => row(i, 2)),
  };
  data.current[0].driver = {
    id: "driver_reserve",
    given_name: "New",
    family_name: "Reserve",
    abbreviation: "RES",
  };
  return { s, season, event, data };
}
test("confirmed GP entries add a substitute and carry every category while preserving originals", () => {
  const { s, season, event, data } = fixture(),
    before = structuredClone(s);
  const plan = planReplacements(season, event, data);
  assert.equal(plan.rules.length, 1);
  assert.equal(plan.drivers[0].providerDriverId, "driver_reserve");
  const picks = {
    order: ["D0", "D1"],
    pole: "D0",
    fastest: "D0",
    retirement: "D0",
    dotd: "D0",
  };
  const scored = mappedPicks(picks, plan.rules);
  assert.equal(scored.order[0], plan.rules[0].to);
  for (const key of ["pole", "fastest", "retirement", "dotd"] as const)
    assert.equal(scored[key], plan.rules[0].to);
  assert.equal(picks.pole, "D0");
  assert.deepEqual(s, before);
  season.drivers.push(...plan.drivers);
  event.replacements = plan.rules;
  assert.equal(planReplacements(season, event, data).rules.length, 0);
  const restored = structuredClone(data);
  restored.current[0].driver = restored.opening[0].driver;
  assert.throws(
    () => planReplacements(season, event, restored),
    /previously confirmed/,
  );
  delete event.replacements[0].source;
  event.replacements[0].policy = "keep";
  assert.equal(planReplacements(season, event, data).rules.length, 0);
});
test("incomplete, duplicate, practice-only, wrong-event, cancelled and ambiguous seats need review", () => {
  for (const change of [
    (d: any) => d.current.pop(),
    (d: any) => (d.current[1].driver = d.current[0].driver),
    (d: any) => (d.current[0].session.type = "FP1"),
    (d: any) => (d.current[0].round.number = 3),
    (d: any) => (d.current[0].round.is_cancelled = true),
    (d: any) =>
      (d.current[1].driver = {
        id: "other",
        given_name: "Other",
        family_name: "Reserve",
      }),
  ]) {
    const { season, event, data } = fixture();
    change(data);
    assert.throws(
      () => planReplacements(season, event, data),
      /Waiting|review/,
    );
  }
  const { season, event, data } = fixture();
  data.current[0].driver = data.opening[0].driver;
  assert.equal(planReplacements(season, event, data).rules.length, 0);
});
test("entry fetch uses exact GP round, validates circuit and follows pagination", async () => {
  const { season, event, data } = fixture(),
    original = globalThis.fetch,
    urls: string[] = [];
  try {
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/schedules/"))
        return Response.json({
          data: {
            events: [1, 2].map((i) => ({
              round: { number: i, id: `round_${i}`, is_cancelled: false },
              circuit: { name: "Test Circuit" },
            })),
          },
        });
      const u = new URL(url),
        rows =
          u.searchParams.get("round_id") === "round_1"
            ? data.opening
            : data.current,
        page = Number(u.searchParams.get("page"));
      assert.equal(u.searchParams.get("session_type"), "R");
      return Response.json({
        metadata: { total_pages: 2 },
        data: rows.slice((page - 1) * 10, page * 10),
      });
    };
    assert.deepEqual(await fetchReplacementLineups(season, event), data);
    assert.equal(urls.length, 5);
    event.circuit = "Wrong Circuit";
    await assert.rejects(
      () => fetchReplacementLineups(season, event),
      /matching/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("scheduler retries, applies once, preserves Sprint/picks and rejects concurrent organiser edits", async () => {
  const { transaction } = await import("../lib/store");
  const now = Date.parse("2030-06-01T12:00:00Z"),
    f = fixture();
  f.event.race = new Date(now).toISOString();
  delete f.event.gp;
  delete f.event.gpDraft;
  f.s.events = [f.event];
  f.s.seasons = [f.season];
  await transaction((s) => Object.assign(s, f.s));
  try {
    assert.equal(
      (
        await syncDueReplacements(async () => {
          throw new Error("Not yet published");
        }, now)
      )[0].status,
      "waiting",
    );
    assert.deepEqual(
      await syncDueReplacements(async () => f.data, now + 1000),
      [],
    );
    const { syncDueResults } = await import("../lib/automatic-results");
    let resultCalls = 0;
    assert.deepEqual(
      await syncDueResults(
        async () => {
          resultCalls++;
          throw new Error("Should wait for lineup");
        },
        now + 4 * 3600000,
      ),
      [],
    );
    assert.equal(resultCalls, 0);
    assert.equal(
      await transaction((s) => s.events[0].resultSync?.gp?.status),
      "waiting",
    );
    assert.equal(
      (
        await syncDueReplacements(async () => {
          await transaction((s) => {
            s.events[0].focal = 7;
          });
          return f.data;
        }, now + 3600000)
      )[0].status,
      "skipped",
    );
    assert.equal(
      (await syncDueReplacements(async () => f.data, now + 7200000))[0].status,
      "updated",
    );
    const applied = await transaction((s) => structuredClone(s));
    assert.deepEqual(applied.entries, f.s.entries);
    assert.deepEqual(applied.receipts, f.s.receipts);
    assert.deepEqual(applied.championPicks, f.s.championPicks);
    assert.deepEqual(applied.events[0].sprint, f.event.sprint);
    assert.equal(applied.events[0].replacements?.[0].policy, "carry");
    assert.equal(
      (await syncDueReplacements(async () => f.data, now + 10800000))[0].status,
      "checked",
    );
    const repeated = await transaction((s) => structuredClone(s));
    assert.equal(repeated.events[0].replacements?.length, 1);
    assert.equal(
      repeated.audit.filter((a) => a.actor === "Automatic replacements").length,
      1,
    );
    await transaction((s) => {
      s.events[0].gp = {
        order: [],
        pole: "",
        fastest: "",
        retirements: [],
        dotd: "",
        voids: [],
        published: true,
      };
    });
    assert.deepEqual(
      await syncDueReplacements(async () => f.data, now + 14400000),
      [],
    );
  } finally {
    await fs.unlink(`.data/${process.env.DEMO_DATA_FILE}`).catch(() => {});
  }
});
