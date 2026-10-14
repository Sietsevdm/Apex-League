import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { standings } from "../lib/model";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `scoped-api-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET = "scoped-api-test-secret-at-least-32-characters";

test("scoped API keeps season scoring/privacy, fetches archives on demand and avoids historical payloads", async () => {
  const { GET, POST } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const headers = (user: string, scope?: string, seasonId?: string) => ({
    cookie: `apex_demo=${user}`,
    ...(scope ? { "x-apex-scope": scope } : {}),
    ...(seasonId ? { "x-apex-season": seasonId } : {}),
  });
  const get = async (user: string, scope?: string, seasonId?: string) => {
    const response = await GET(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        headers: headers(user, scope, seasonId),
      }),
    );
    return { status: response.status, data: await response.json() };
  };
  try {
    await transaction((s) => {
      const original = structuredClone(s);
      for (let i = 0; i < 6; i++) {
        const seasonId = `history-${i}`;
        s.seasons.unshift({
          ...structuredClone(original.seasons[0]),
          id: seasonId,
          name: `Old season ${i}`,
          year: 2020 + i,
          archived: true,
        });
        s.users.forEach((user) => user.seasonIds.push(seasonId));
        for (const event of original.events) {
          s.events.push({
            ...structuredClone(event),
            id: `${seasonId}-${event.id}`,
            seasonId,
          });
          s.entries.push(
            ...original.entries
              .filter((entry) => entry.eventId === event.id)
              .map((entry) => ({
                ...structuredClone(entry),
                eventId: `${seasonId}-${event.id}`,
              })),
          );
        }
      }
      s.audit.push({
        id: "large-audit",
        date: new Date().toISOString(),
        actor: "Admin",
        action: "history ".repeat(1000),
      });
      const event = s.events[0];
      event.photo = "";
      s.settings.savedBannerPhotos = [
        {
          year: 2027,
          name: event.name,
          circuit: event.circuit,
          photo: "data:image/png;base64,reusable-library-photo",
          focal: 50,
          credit: "",
        },
      ];
    });
    const full = (await get("demo-1")).data;
    const scoped = (await get("demo-1", "season")).data;
    assert.equal(scoped.context.seasonId, "sample-season");
    assert.ok(
      scoped.state.events.every(
        (event: any) => event.seasonId === "sample-season",
      ),
    );
    assert.ok(
      scoped.state.seasons
        .filter((season: any) => season.id !== "sample-season")
        .every((season: any) => season.drivers.length === 0),
    );
    assert.deepEqual(
      standings(scoped.state, "sample-season"),
      standings(full.state, "sample-season"),
    );
    assert.ok(
      scoped.state.entries.every((entry: any) =>
        full.state.entries.some(
          (visible: any) => JSON.stringify(visible) === JSON.stringify(entry),
        ),
      ),
    );
    assert.equal(scoped.state.settings.invite, "");
    assert.equal(scoped.state.settings.savedBannerPhotos, undefined);
    assert.equal(
      scoped.state.events[0].photo,
      "data:image/png;base64,reusable-library-photo",
    );
    assert.ok(scoped.state.users.every((user: any) => !("password" in user)));
    assert.ok(JSON.stringify(scoped).length < JSON.stringify(full).length / 2);
    const archive = (await get("demo-1", "archive")).data;
    assert.equal(archive.state.events.length, 0);
    assert.equal(archive.state.entries.length, 0);
    for (const season of full.state.seasons) {
      const rows = standings(full.state, season.id);
      assert.equal(
        archive.state.seasonSummaries[season.id].total,
        rows[0]?.total || 0,
      );
    }
    const historical = (await get("demo-1", "season", "history-0")).data;
    assert.ok(
      historical.state.events.every(
        (event: any) => event.seasonId === "history-0",
      ),
    );
    assert.deepEqual(
      standings(historical.state, "history-0"),
      standings(full.state, "history-0"),
    );
    assert.equal((await get("demo-1", "admin")).status, 403);
    assert.equal((await get("demo-admin", "unknown")).status, 400);
    const admin = (await get("demo-admin", "admin")).data;
    assert.ok(
      admin.state.audit.some((entry: any) => entry.id === "large-audit"),
    );
    const created = await POST(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        method: "POST",
        headers: {
          ...headers("demo-admin", "admin", "sample-season"),
          origin: process.env.APP_URL!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createSeason",
          name: "New season",
          year: 2028,
          cutoff: "2028-01-01T00:00:00.000Z",
          copyId: "history-0",
        }),
      }),
    );
    assert.equal(created.status, 200);
    const next = await created.json();
    assert.equal(
      next.state.seasons.find(
        (season: any) => season.id === next.context.seasonId,
      ).drivers.length,
      full.state.seasons[0].drivers.length,
    );
    assert.equal(next.state.seasons.at(-1).id, next.context.seasonId);
  } finally {
    await fs.rm(path.resolve(".data", process.env.DEMO_DATA_FILE!), {
      force: true,
    });
  }
});
