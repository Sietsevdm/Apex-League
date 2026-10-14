import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { importSnapshot, validateImportSnapshot } from "../lib/manual-imports";
import { seed } from "../lib/seed";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `manual-imports-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET =
  "manual-imports-test-secret-at-least-32-characters";

test("import snapshots reject permission, schedule, lineup and publication races", () => {
  const state = seed(true),
    user = state.users[0];
  state.events[0].providerRound = 1;
  const snapshot = importSnapshot(state, user, {
    action: "resultsImport",
    eventId: state.events[0].id,
  });
  validateImportSnapshot(state, user, snapshot);
  for (const modify of [
    (s: typeof state) => {
      s.users[0].role = "player";
    },
    (s: typeof state) => {
      s.users[0].version++;
    },
    (s: typeof state) => {
      s.events[0].qualifying = "2020-01-01T00:00:00Z";
    },
    (s: typeof state) => {
      s.seasons[0].drivers[0].name = "Changed";
    },
    (s: typeof state) => {
      s.events[0].gp = {
        ...s.events[0].gp!,
        published: !s.events[0].gp?.published,
      };
    },
  ]) {
    const changed = structuredClone(state);
    modify(changed);
    assert.throws(
      () => validateImportSnapshot(changed, changed.users[0], snapshot),
      (error) => [403, 409].includes((error as any).status),
    );
  }
  state.entries.push({
    userId: user.id,
    eventId: state.events[0].id,
    kind: "gp",
    picks: { order: [], pole: "", fastest: "", dotd: "", retirement: "" },
    submitted: false,
    updatedAt: new Date().toISOString(),
  });
  validateImportSnapshot(state, user, snapshot); // Unrelated player saves do not invalidate imports.
});

test("provider wait does not hold the league lock; concurrent changes prevent stale import commits", async () => {
  const { POST, GET } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const originalFetch = globalThis.fetch;
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetching = new Promise<void>((resolve) => {
    started = resolve;
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await transaction((s) => {
      s.events[0].providerRound = 1;
    });
    globalThis.fetch = async (input) => {
      started();
      await gate;
      const qualifying = String(input).includes("qualifying");
      return Response.json({
        MRData: {
          RaceTable: {
            Races: [
              qualifying
                ? {
                    QualifyingResults: [
                      { position: "1", Driver: { driverId: "VER" } },
                    ],
                  }
                : {
                    Results: [
                      {
                        Driver: { driverId: "VER" },
                        FastestLap: { rank: "1" },
                      },
                    ],
                  },
            ],
          },
        },
      });
    };
    const importing = POST(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        method: "POST",
        headers: {
          origin: process.env.APP_URL!,
          cookie: "apex_demo=demo-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resultsImport",
          eventId: "bahrain",
          kind: "gp",
        }),
      }),
    );
    await fetching;
    const read = await Promise.race([
      GET(
        new NextRequest("http://127.0.0.1:3000/api/league", {
          headers: { cookie: "apex_demo=demo-1", "x-apex-scope": "season" },
        }),
      ),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("League read blocked by provider")),
          2000,
        );
      }),
    ]);
    clearTimeout(timeout);
    assert.equal(read.status, 200);
    await transaction((s) => {
      s.events[0].name = "Edited during import";
    });
    release();
    const result = await importing;
    assert.equal(result.status, 409);
    assert.match((await result.json()).error, /changed while importing/);
  } finally {
    release();
    clearTimeout(timeout);
    globalThis.fetch = originalFetch;
    await fs.rm(path.resolve(".data", process.env.DEMO_DATA_FILE!), {
      force: true,
    });
  }
});

test("manual lineup and calendar imports commit successfully and reject players before fetching", async () => {
  const { POST } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const post = (action: string, user = "demo-admin") =>
    POST(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        method: "POST",
        headers: {
          origin: process.env.APP_URL!,
          cookie: `apex_demo=${user}`,
          "Content-Type": "application/json",
          "x-apex-scope": "admin",
          "x-apex-season": "sample-season",
        },
        body: JSON.stringify({ action, seasonId: "sample-season" }),
      }),
    );
  try {
    await transaction((s) => {
      s.seasons[0].drivers = [];
      s.seasons[0].constructors = [];
    });
    globalThis.fetch = async () => {
      calls++;
      return Response.json({
        MRData: {
          DriverTable: {
            Drivers: [
              { driverId: "VER", givenName: "Max", familyName: "Verstappen" },
            ],
          },
          ConstructorTable: { Constructors: [{ name: "Red Bull" }] },
          RaceTable: { Races: [] },
        },
      });
    };
    const denied = await post("previousYearLineup", "demo-1");
    assert.equal(denied.status, 403);
    assert.equal(calls, 0);
    const lineup = await post("previousYearLineup");
    assert.equal(lineup.status, 200);
    const data = await lineup.json();
    assert.equal(data.state.seasons[0].drivers[0].id, "VER");
    const calendar = await post("calendarImport");
    assert.equal(calendar.status, 200);
    assert.equal(
      (await calendar.json()).state.seasons[0].calendarSync.status,
      "waiting",
    );
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(path.resolve(".data", process.env.DEMO_DATA_FILE!), {
      force: true,
    });
  }
});
