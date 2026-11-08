import { test, before } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { seed } from "../lib/seed";
import { extractFIAPDF, parseFIAEntryList } from "../lib/fia-entry-list";
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
test("OpenF1 GP entry fetch matches the calendar and excludes practice participants", async () => {
  const { season, event } = fixture(),
    original = globalThis.fetch;
  event.openf1MeetingKey = 2;
  const race = (meeting: number) => ({
    session_key: meeting * 10,
    meeting_key: meeting,
    year: season.year,
    session_name: "Race",
    date_start: "2026-03-01T00:00:00Z",
    date_end: "2026-03-01T02:00:00Z",
    is_cancelled: false,
  });
  try {
    globalThis.fetch = async (input) => {
      const u = new URL(String(input));
      if (u.pathname.endsWith("/meetings")) return Response.json([]);
      if (u.pathname.endsWith("/sessions"))
        return Response.json(
          u.searchParams.has("meeting_key")
            ? [
                race(2),
                { ...race(2), session_key: 21, session_name: "Qualifying" },
              ]
            : [race(1), race(2)],
        );
      assert.equal(u.pathname, "/v1/drivers");
      const key = Number(u.searchParams.get("session_key"));
      return Response.json(
        Array.from({ length: 20 }, (_, i) => ({
          session_key: key,
          meeting_key: Math.floor(key / 10),
          driver_number: i + 1,
          first_name: "Driver",
          last_name: `Person${i}`,
          team_name: `Team${Math.floor(i / 2)}`,
          team_colour: "123456",
        })),
      );
    };
    const result = await fetchReplacementLineups(season, event);
    assert.equal(result.current.length, 20);
    assert.equal(planReplacements(season, event, result).rules.length, 0);
    event.openf1MeetingKey = 999;
    await assert.rejects(fetchReplacementLineups(season, event), /matching/);
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

test("a stale complete GP list cannot report no change when completed qualifying has a replacement", () => {
  const { season, event, data } = fixture();
  const replacement = structuredClone(data.current[0].driver);
  data.current[0].driver = structuredClone(data.opening[0].driver);
  const qualifying = data.current.map((r) => ({
    ...structuredClone(r),
    session: { ...r.session, id: "qualifying", type: "Q" },
  }));
  qualifying[0].driver = replacement;
  const before = structuredClone({ season, event });
  assert.throws(
    () => planReplacements(season, event, { ...data, qualifying }),
    /race and qualifying entries disagree.*Driver Person0.*New Reserve/,
  );
  assert.deepEqual({ season, event }, before);
  // Once the GP entry feed catches up, the normal carry policy is generated.
  data.current[0].driver = replacement;
  const plan = planReplacements(season, event, { ...data, qualifying });
  assert.equal(plan.rules.length, 1);
  assert.equal(plan.rules[0].from, "D0");
  assert.equal(plan.drivers[0].name, "New Reserve");
});

test("explicit organiser confirmation resolves the session conflict without being overwritten", () => {
  const { season, event, data } = fixture();
  const replacement = structuredClone(data.current[0].driver);
  data.current[0].driver = structuredClone(data.opening[0].driver);
  const qualifying = data.current.map((r) => ({
    ...structuredClone(r),
    session: { ...r.session, id: "qualifying", type: "Q" },
  }));
  qualifying[0].driver = replacement;
  season.drivers.push({
    id: "RES",
    name: "New Reserve",
    team: "Team0",
    color: "#123456",
  });
  event.replacements = [
    {
      from: "D0",
      to: "RES",
      kind: "gp",
      policy: "keep",
      note: "Confirmed by organiser",
    },
  ];
  const before = structuredClone(event.replacements);
  const plan = planReplacements(season, event, { ...data, qualifying });
  assert.equal(plan.rules.length, 0);
  assert.deepEqual(event.replacements, before);
});

test("incomplete or wrong-session qualifying evidence waits instead of changing GP picks", () => {
  const { season, event, data } = fixture();
  const qualifying = data.current.map((r) => ({
    ...structuredClone(r),
    session: { ...r.session, id: "qualifying", type: "Q" },
  }));
  assert.throws(
    () =>
      planReplacements(season, event, {
        ...data,
        qualifying: qualifying.slice(0, 19),
      }),
    /complete/,
  );
  qualifying[0].session.type = "FP1";
  assert.throws(
    () => planReplacements(season, event, { ...data, qualifying }),
    /complete/,
  );
});

test("discovered official appointment resolves stale GP entries, persists proof and respects manual policies", async () => {
  const { season, event } = fixture(),
    original = globalThis.fetch;
  season.year = 2026;
  season.drivers[0] = {
    ...season.drivers[0],
    name: "Esteban Ocon",
    team: "Haas F1 Team",
  };
  event.openf1MeetingKey = 2;
  let sourceDown = false;
  const statement = `<article><p>TGR Haas F1 Team can confirm that Esteban Ocon will no longer compete on its behalf in the 2026 FIA Formula 1 World Championship.</p><p>New Reserve will now partner Oliver Bearman in the team at the Test Grand Prix – hosted at Test Circuit, Test, 6-8 November 2026 – Round 2 of the 2026 FIA Formula 1 World Championship.</p></article>`;
  const race = (meeting: number) => ({
    session_key: meeting * 10,
    meeting_key: meeting,
    year: 2026,
    session_name: "Race",
    date_start: meeting === 1 ? "2026-03-01T00:00:00Z" : "2026-11-08T17:00:00Z",
    date_end: "2026-11-08T19:00:00Z",
    is_cancelled: false,
  });
  globalThis.fetch = async (input) => {
    (globalThis as any).apexOpenF1Next = 0;
    const url = new URL(String(input));
    if (url.pathname.endsWith("/meetings")) return Response.json([]);
    if (url.hostname === "www.haasf1team.com")
      return sourceDown
        ? new Response("down", { status: 503 })
        : new Response(
            url.pathname === "/news"
              ? `<a href="/news/team-statement-driver-update-1">Statement</a>`
              : statement,
          );
    if (url.pathname.endsWith("/sessions"))
      return Response.json(
        url.searchParams.has("meeting_key")
          ? [
              race(2),
              {
                ...race(2),
                session_key: 21,
                session_name: "Qualifying",
                date_end: "2026-11-07T20:00:00Z",
              },
            ]
          : [race(1), race(2)],
      );
    assert.equal(url.pathname, "/v1/drivers");
    const key = Number(url.searchParams.get("session_key"));
    return Response.json(
      Array.from({ length: 20 }, (_, i) => ({
        session_key: key,
        meeting_key: Math.floor(key / 10),
        driver_number: key === 21 && i === 0 ? 51 : i + 1,
        first_name: i === 0 ? (key === 21 ? "New" : "Esteban") : "Driver",
        last_name: i === 0 ? (key === 21 ? "Reserve" : "Ocon") : `Person${i}`,
        team_name: i < 2 ? "Haas F1 Team" : `Team${Math.floor(i / 2)}`,
        team_colour: "123456",
      })),
    );
  };
  try {
    const lineups = await fetchReplacementLineups(season, event);
    const plan = planReplacements(season, event, lineups);
    assert.equal(plan.rules.length, 1);
    assert.equal(plan.rules[0].from, "D0");
    assert.equal(plan.drivers[0].name, "New Reserve");
    assert.match(plan.rules[0].official!.url, /haasf1team.com/);
    assert.equal(
      mappedPicks(
        {
          order: ["D0"],
          pole: "D0",
          fastest: "D0",
          retirement: "D0",
          dotd: "D0",
        },
        plan.rules,
      ).pole,
      plan.rules[0].to,
    );
    season.drivers.push(...plan.drivers);
    event.replacements = plan.rules;
    sourceDown = true;
    assert.equal(
      planReplacements(
        season,
        event,
        await fetchReplacementLineups(season, event),
      ).rules.length,
      0,
    );
    event.replacements = [
      {
        ...plan.rules[0],
        source: undefined,
        official: undefined,
        policy: "keep",
      },
    ];
    sourceDown = false;
    assert.equal(
      planReplacements(
        season,
        event,
        await fetchReplacementLineups(season, event),
      ).rules.length,
      0,
    );
    assert.equal(event.replacements[0].policy, "keep");
    sourceDown = true;
    assert.equal(
      planReplacements(
        season,
        event,
        await fetchReplacementLineups(season, event),
      ).rules.length,
      0,
    );
    // Exercise the real hourly persistence path using isolated demo storage.
    sourceDown = false;
    delete event.replacements;
    delete event.gp;
    delete event.gpDraft;
    event.race = "2026-11-08T17:00:00Z";
    const { transaction } = await import("../lib/store");
    const state = seed(true);
    state.seasons = [season];
    state.events = [event];
    await transaction((s) => Object.assign(s, state));
    const outcome = await syncDueReplacements(
      fetchReplacementLineups,
      Date.parse("2026-11-08T12:00:00Z"),
    );
    assert.equal(outcome[0].status, "updated");
    assert.equal(
      await transaction((s) => s.events[0].replacements?.[0].official?.toName),
      "New Reserve",
    );
    assert.equal(
      await transaction(
        (s) =>
          s.audit.filter((a) => a.actor === "Automatic replacements").length,
      ),
      1,
    );
  } finally {
    globalThis.fetch = original;
    await fs.unlink(`.data/${process.env.DEMO_DATA_FILE}`).catch(() => {});
  }
});

test("FIA full-roster fetch confirms the real replacement, including before qualifying with empty OpenF1 GP entries", async () => {
  const { season, event } = fixture(),
    original = globalThis.fetch;
  const bytes = await fs.readFile(
    new URL("./fixtures/fia-2026-brazil-entry-list.pdf", import.meta.url),
  );
  const sourceURL =
    "https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_entry_list.pdf";
  const list = parseFIAEntryList(
    await extractFIAPDF(bytes),
    sourceURL,
    2026,
    "São Paulo Grand Prix",
    "2026-11-08T17:00:00Z",
  );
  const cam = list.drivers.findIndex((d) => d.code === "CAM");
  const baseline = list.drivers.map((d) => ({
    first_name: d.name.split(" ")[0],
    last_name: d.name.split(" ").slice(1).join(" "),
    team_name: d.team.includes("Haas") ? "Haas F1 Team" : d.team,
    driver_number: d.number,
    team_colour: "123456",
  }));
  Object.assign(baseline[cam], {
    first_name: "Esteban",
    last_name: "Ocon",
    driver_number: 31,
  });
  season.year = 2026;
  season.drivers = baseline.map((d, i) => ({
    id: `S${i}`,
    name: `${d.first_name} ${d.last_name}`,
    team: d.team_name,
    color: "#123456",
  }));
  event.providerRound = 20;
  event.openf1MeetingKey = 2;
  event.race = "2026-11-08T17:00:00Z";
  let emptyGP = false,
    beforeQ = false,
    unavailable = false;
  const race = (key: number) => ({
    session_key: key * 10,
    meeting_key: key,
    year: 2026,
    session_name: "Race",
    date_start: key === 1 ? "2026-03-01T00:00:00Z" : event.race,
    date_end: "2026-11-08T19:00:00Z",
    is_cancelled: false,
  });
  globalThis.fetch = async (input) => {
    (globalThis as any).apexOpenF1Next = 0;
    const url = new URL(String(input));
    if (url.hostname === "www.fia.com") {
      if (unavailable) return new Response("Down", { status: 503 });
      if (url.pathname.endsWith("/2026"))
        return new Response(
          '<option value="/documents/championships/110/2026/event/Sao-Paulo">São Paulo Grand Prix</option>',
        );
      if (url.pathname.endsWith(".pdf")) return new Response(bytes);
      return new Response(`<a href="${sourceURL}">Doc 13 - Entry List</a>`);
    }
    if (url.hostname === "www.haasf1team.com")
      return new Response("<html>No extra announcements</html>");
    if (url.pathname.endsWith("/meetings"))
      return Response.json([
        { meeting_key: 2, year: 2026, meeting_name: "São Paulo Grand Prix" },
      ]);
    if (url.pathname.endsWith("/sessions"))
      return Response.json(
        url.searchParams.has("meeting_key")
          ? [
              race(2),
              {
                ...race(2),
                session_key: 21,
                session_name: "Qualifying",
                date_end: beforeQ
                  ? "2099-11-07T20:00:00Z"
                  : "2026-11-07T20:00:00Z",
              },
            ]
          : [race(1), race(2)],
      );
    assert.equal(url.pathname, "/v1/drivers");
    const key = Number(url.searchParams.get("session_key"));
    return Response.json(
      emptyGP && key === 20
        ? []
        : baseline.map((d, i) => ({
            ...d,
            session_key: key,
            meeting_key: Math.floor(key / 10),
            ...(key === 21 && i === cam
              ? { first_name: "Rafael", last_name: "Câmara", driver_number: 51 }
              : {}),
          })),
    );
  };
  try {
    const lineup = await fetchReplacementLineups(season, event),
      plan = planReplacements(season, event, lineup);
    assert.equal(plan.rules.length, 1);
    assert.equal(plan.rules[0].official?.source, "fia");
    assert.equal(plan.rules[0].official?.driverNumber, 51);
    assert.match(plan.sourceMessage!, /All teams checked/);
    season.drivers.push(...plan.drivers);
    event.replacements = plan.rules;
    unavailable = true;
    const retry = planReplacements(
      season,
      event,
      await fetchReplacementLineups(season, event),
    );
    assert.equal(retry.rules.length, 0);
    assert.match(retry.sourceMessage!, /FIA entry list not available/);
    unavailable = false;
    emptyGP = true;
    beforeQ = true;
    delete event.replacements;
    const early = await fetchReplacementLineups(season, event);
    assert.equal(early.current.length, 22);
    assert.equal(early.qualifying, undefined);
    assert.equal(
      planReplacements(season, event, early).rules[0].official?.driverNumber,
      51,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("the current race weekend is checked ahead of a backlog of unpublished older races", async () => {
  const { s, season, event, data } = fixture(),
    now = Date.parse("2030-06-01T12:00:00Z");
  delete event.gp;
  delete event.gpDraft;
  event.race = new Date(now).toISOString();
  event.replacementSync = {
    lastAttempt: new Date(now - 2 * 3600000).toISOString(),
  };
  const previous = Array.from({ length: 4 }, (_, i) => ({
    ...structuredClone(event),
    id: `past-${i}`,
    race: new Date(now - (i + 2) * 86400000).toISOString(),
    replacementSync: undefined,
  }));
  s.events = [...previous, event];
  s.seasons = [season];
  const { transaction } = await import("../lib/store");
  await transaction((state) => Object.assign(state, s));
  try {
    const checked: string[] = [];
    await syncDueReplacements(async (_, e) => {
      checked.push(e.id);
      return data;
    }, now);
    assert.equal(checked[0], event.id);
    assert.equal(checked.length, 3);
  } finally {
    await fs.unlink(`.data/${process.env.DEMO_DATA_FILE}`).catch(() => {});
  }
});

test("official identity proof can refresh a matching manual rule without changing its scoring policy", async () => {
  const { s, season, event, data } = fixture(),
    now = Date.parse("2030-06-01T12:00:00Z");
  season.drivers.push({
    id: "RES",
    name: "New Reserve",
    team: "Team0",
    color: "#123456",
  });
  event.replacements = [
    {
      from: "D0",
      to: "RES",
      kind: "gp",
      policy: "keep",
      note: "Organiser decision",
    },
  ];
  event.race = new Date(now).toISOString();
  delete event.gp;
  delete event.gpDraft;
  s.events = [event];
  s.seasons = [season];
  s.audit = [];
  const official = {
    source: "fia" as const,
    url: "https://www.fia.com/system/files/decision-document/entry_list.pdf",
    fromName: "Driver Person0",
    toName: "New Reserve",
    team: "Team0",
    year: 2030,
    startsOn: "2030-06-01",
    endsOn: "2030-06-03",
    meetingKey: 2,
    driverNumber: 51,
  };
  const { transaction } = await import("../lib/store");
  await transaction((state) => Object.assign(state, s));
  try {
    assert.equal(
      (
        await syncDueReplacements(
          async () => ({ ...data, official: [official] }),
          now,
        )
      )[0].status,
      "checked",
    );
    const stored = await transaction((state) =>
      structuredClone(state.events[0].replacements!),
    );
    assert.deepEqual(stored, [{ ...event.replacements[0], official }]);
    assert.equal(stored[0].policy, "keep");
    assert.equal(stored[0].source, undefined);
    assert.equal(stored[0].note, "Organiser decision");
    assert.equal(await transaction((state) => state.audit.length), 0);
  } finally {
    await fs.unlink(`.data/${process.env.DEMO_DATA_FILE}`).catch(() => {});
  }
});
