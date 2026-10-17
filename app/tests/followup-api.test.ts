import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { NextRequest } from "next/server";
process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `followup-api-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET =
  "local-followup-tests-secret-at-least-32-characters";

test("read snapshots bypass pending writes and GETs do not rewrite unchanged state; corrections and subscriptions enforce privacy", async () => {
  const { transaction, readState } = await import("../lib/store");
  const { GET, POST } = await import("../app/api/league/route");
  const { GET: calendar } = await import("../app/api/calendar/route");
  const file = `.data/${process.env.DEMO_DATA_FILE}`;
  const request = (user = "demo-admin") =>
    new NextRequest("http://127.0.0.1:3000/api/league", {
      headers: {
        cookie: `apex_demo=${user}`,
        "x-apex-scope": "season",
        "x-apex-season": "sample-season",
      },
    });
  const post = async (body: Record<string, unknown>, user = "demo-admin") =>
    POST(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        method: "POST",
        headers: {
          origin: process.env.APP_URL!,
          host: "127.0.0.1:3000",
          cookie: `apex_demo=${user}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
  try {
    await GET(request());
    await transaction(s => { delete s.seasons[0].registrationClosed; });
    await GET(request());
    assert.equal((await readState()).seasons[0].registrationClosed, false);
    const original = await fs.stat(file),
      text = await fs.readFile(file, "utf8");
    await GET(request());
    await GET(request("demo-1"));
    assert.equal((await fs.stat(file)).mtimeMs, original.mtimeMs);
    assert.equal(await fs.readFile(file, "utf8"), text);
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve)),
      started = new Promise<void>((resolve) => (entered = resolve));
    const writer = transaction(async (s) => {
      s.settings.welcome = "Committed later";
      entered();
      await gate;
    });
    await started;
    try {
      const snapshot = await readState();
      assert.notEqual(snapshot.settings.welcome, "Committed later");
      snapshot.settings.welcome = "Local mutation";
    } finally {
      release();
    }
    await writer;
    assert.equal((await readState()).settings.welcome, "Committed later");
    const event = (await readState()).events[0];
    const correction = {
      action: "results",
      eventId: event.id,
      kind: "gp",
      result: { ...event.gp!, voids: ["pole"] },
      reason: "Pole penalty confirmed",
    };
    assert.equal((await post(correction, "demo-1")).status, 403);
    assert.equal((await post({ ...correction, reason: "" })).status, 400);
    assert.equal((await post(correction)).status, 200);
    assert.equal((await post(correction)).status, 200);
    const player = await (await GET(request("demo-1"))).json();
    assert.equal(player.state.resultCorrections.length, 1);
    assert.equal(player.state.resultCorrections[0].reason, correction.reason);
    assert.ok(
      !JSON.stringify(player.state.resultCorrections).includes('"picks"'),
    );
    const created = await (
      await post(
        { action: "calendarSubscriptionCreate", seasonId: "sample-season" },
        "demo-1",
      )
    ).json();
    const feedUrl = `http://127.0.0.1:3000${created.calendarSubscription.path}`;
    const feed = await calendar(new NextRequest(feedUrl));
    assert.equal(feed.status, 200);
    const ics = await feed.text();
    assert.ok(
      ics.includes("BEGIN:VCALENDAR") && !ics.includes("@example.invalid"),
    );
    const safe = await (await GET(request())).json();
    assert.ok(!JSON.stringify(safe).includes("tokenHash"));
    const exported = await (await post({ action: "export" })).json();
    assert.ok(!JSON.stringify(exported).includes("tokenHash"));
    await post(
      { action: "calendarSubscriptionRevoke", seasonId: "sample-season" },
      "demo-1",
    );
    assert.equal((await calendar(new NextRequest(feedUrl))).status, 404);
    assert.equal(
      (
        await calendar(
          new NextRequest("http://127.0.0.1:3000/api/calendar?token=invalid"),
        )
      ).status,
      404,
    );
  } finally {
    await fs.rm(file, { force: true });
  }
});
