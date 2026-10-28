import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { NextRequest } from "next/server";
process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `prediction-editing-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET = "prediction-editing-isolated-test-secret-32-chars";

test("GP and Sprint submitted picks can be replaced before lock; invalid or late edits retain the saved entry", async () => {
  const { POST } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const send = async (kind: string, picks: unknown) => {
    const response = await POST(new NextRequest("http://127.0.0.1:3000/api/league", {
      method: "POST", headers: { origin: process.env.APP_URL!, cookie: "apex_demo=demo-1", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "predict", eventId: "singapore", kind, picks, submitted: true }),
    }));
    return response;
  };
  try {
    await transaction(s => {
      const e = s.events.find(e => e.id === "singapore")!;
      e.qualifying = new Date(Date.now() + 8 * 3600000).toISOString();
      e.sprintQualifying = new Date(Date.now() + 4 * 3600000).toISOString();
      e.gpDeadline = new Date(Date.now() + 7 * 3600000).toISOString();
      e.sprintDeadline = new Date(Date.now() + 3 * 3600000).toISOString();
      e.lockedGp = e.lockedSprint = false;
    });
    for (const kind of ["gp", "sprint"] as const) {
      const ids = await transaction(s => s.seasons[0].drivers.map(d => d.id));
      const picks = { order: ids.slice(0, kind === "gp" ? 10 : 8), pole: ids[0], fastest: ids[1], retirement: "none", dotd: ids[2] };
      assert.equal((await send(kind, picks)).status, 200);
      const edited = { ...picks, pole: ids[1] };
      assert.equal((await send(kind, edited)).status, 200);
      assert.equal((await send(kind, { ...edited, pole: "" })).status, 400);
      await transaction(s => {
        const entry = s.entries.find(p => p.eventId === "singapore" && p.kind === kind && p.userId === "demo-1")!;
        assert.equal(entry.submitted, true);
        assert.deepEqual(entry.picks, edited);
        const receipts = s.receipts!.filter(r => r.eventId === "singapore" && r.kind === kind && r.userId === "demo-1");
        assert.equal(receipts[0].picks.pole, ids[0]);
        assert.equal(receipts.at(-1)!.picks.pole, ids[1]);
        const e = s.events.find(e => e.id === "singapore")!;
        if (kind === "gp") e.lockedGp = true; else e.lockedSprint = true;
      });
      assert.equal((await send(kind, picks)).status, 409);
      await transaction(s => assert.deepEqual(s.entries.find(p => p.eventId === "singapore" && p.kind === kind && p.userId === "demo-1")!.picks, edited));
    }
  } finally {
    await fs.rm(`.data/${process.env.DEMO_DATA_FILE}`, { force: true });
  }
});
