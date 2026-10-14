import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `receipt-history-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET =
  "receipt-history-test-secret-at-least-32-characters";
test("submission/draft/resubmission history is immutable, named and private to its owner", async () => {
  const { GET, POST } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const get = async (user = "demo-1") =>
    (
      await GET(
        new NextRequest(`${process.env.APP_URL}/api/league`, {
          headers: { cookie: `apex_demo=${user}`, "x-apex-scope": "season" },
        }),
      )
    ).json();
  const post = async (body: any) =>
    POST(
      new NextRequest(`${process.env.APP_URL}/api/league`, {
        method: "POST",
        headers: {
          cookie: "apex_demo=demo-1",
          origin: process.env.APP_URL!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
  try {
    const s = (await get()).state;
    const event = s.events.find((e: any) => !e.lockedGp && !e.practiceRound);
    const drivers = s.seasons[0].drivers;
    const picks = {
      order: drivers.slice(0, 10).map((d: any) => d.id),
      pole: drivers[0].id,
      fastest: drivers[1].id,
      retirement: "none",
      dotd: drivers[0].id,
    };
    for (const submitted of [true, false, true]) {
      const response = await post({
        action: "predict",
        eventId: event.id,
        kind: "gp",
        submitted,
        picks: { ...picks, pole: submitted ? picks.pole : drivers[2].id },
      });
      assert.equal(response.status, 200);
    }
    let data = await get();
    const receipts = data.state.receipts;
    assert.deepEqual(
      receipts.map((r: any) => r.status),
      ["submitted", "draft", "submitted"],
    );
    assert.equal(receipts[0].picks.pole, picks.pole);
    assert.equal(receipts[1].picks.pole, drivers[2].id);
    await transaction((s) => {
      s.seasons[0].drivers[0].name = "Changed later";
    });
    data = await get();
    assert.equal(
      data.state.receipts[0].driverNames[drivers[0].id],
      drivers[0].name,
    );
    assert.equal((await get("demo-admin")).state.receipts.length, 0);
    assert.equal((await get("demo-2")).state.receipts.length, 0);
  } finally {
    await fs.rm(path.resolve(".data", process.env.DEMO_DATA_FILE!), {
      force: true,
    });
  }
});
