import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { applyDelta } from "../lib/state-delta";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `conditional-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET = "conditional-test-secret-at-least-32-characters";

test("conditional GET, compact saves, stale fallback and session isolation", async () => {
  const { GET, POST } = await import("../app/api/league/route");
  const headers = { cookie: "apex_demo=demo-1", "x-apex-scope": "season" };
  const get = (extra = {}) =>
    GET(
      new NextRequest(`${process.env.APP_URL}/api/league`, {
        headers: { ...headers, ...extra },
      }),
    );
  const post = (base: string, body: object) =>
    POST(
      new NextRequest(`${process.env.APP_URL}/api/league`, {
        method: "POST",
        headers: {
          ...headers,
          origin: process.env.APP_URL!,
          "Content-Type": "application/json",
          "x-apex-base-version": base,
        },
        body: JSON.stringify(body),
      }),
    );
  const save = (base: string, name: string) =>
    post(base, {
      action: "profile",
      name,
      timezone: "Europe/Amsterdam",
      reminders: false,
    });
  try {
    const first = await get();
    const before = await first.json();
    const unchanged = await get({
      "if-none-match": first.headers.get("etag")!,
    });
    assert.equal(unchanged.status, 304);
    assert.equal(await unchanged.text(), "");
    const response = await save(before.revision, "Updated Player");
    const delta = await response.json();
    assert.equal(delta.delta, true);
    const full = await (await get()).json();
    assert.deepEqual(applyDelta(before, delta), full);
    assert.ok(JSON.stringify(delta).length < JSON.stringify(full).length / 2);
    assert.equal(
      (await get({ "if-none-match": first.headers.get("etag")! })).status,
      200,
    );
    const stale = await (await save(before.revision, "Newer Player")).json();
    assert.equal(stale.delta, undefined);
    assert.equal(stale.authenticated, true);
    const other = await get({
      cookie: "apex_demo=demo-2",
      "if-none-match": `"${full.revision}"`,
    });
    assert.equal(other.status, 200);
    const expired = await get({
      cookie: "apex_demo=missing",
      "if-none-match": `"${full.revision}"`,
    });
    assert.equal(expired.status, 200);
    assert.equal((await expired.json()).authenticated, false);
    const { transaction } = await import("../lib/store");
    await transaction((s) => {
      const event = s.events.at(-1)!;
      event.qualifying = "2099-01-01T00:00:00.000Z";
      event.lockedGp = false;
    });
    const ready = await (await get()).json();
    const event = ready.state.events.at(-1);
    const prediction = await post(ready.revision, {
      action: "predict",
      eventId: event.id,
      kind: "gp",
      submitted: false,
      picks: {
        order: Array(10).fill(""),
        pole: "",
        fastest: "",
        retirement: "",
        dotd: "",
      },
    });
    assert.equal(prediction.status, 200);
    const saved = await prediction.json();
    assert.equal(saved.delta, true);
    const current = await (await get()).json();
    assert.deepEqual(applyDelta(ready, saved), current);
    // Time alone changes visibility, even without a provider update or user save.
    const realNow = Date.now;
    try {
      Date.now = () => Date.parse("2100-01-01T00:00:00.000Z");
      const deadline = await get({ "if-none-match": `"${current.revision}"` });
      assert.equal(deadline.status, 200);
      assert.notEqual((await deadline.json()).revision, current.revision);
    } finally {
      Date.now = realNow;
    }
  } finally {
    await fs.rm(path.resolve(".data", process.env.DEMO_DATA_FILE!), {
      force: true,
    });
  }
});
