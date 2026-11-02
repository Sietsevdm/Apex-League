import { test, before } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { createECDH } from "node:crypto";
import { seed } from "../lib/seed";
import { emptyResult } from "../lib/model";
import { weekendScoresReady, recordWeekendScores } from "../lib/weekend-scores";
let dueScoreNotifications: typeof import("../lib/push").dueScoreNotifications;
let pushAction: typeof import("../lib/push").pushAction;
let sendDuePush: typeof import("../lib/push").sendDuePush;
before(async () => {
  ({ dueScoreNotifications, pushAction, sendDuePush } =
    await import("../lib/push"));
});

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `weekend-notifications-${process.pid}.json`;
process.env.APP_URL = "https://league.example.com";
process.env.SESSION_SECRET =
  "weekend-scores-test-secret-at-least-32-characters";
const now = Date.now();
const key = createECDH("prime256v1");
key.generateKeys();
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/scores-device",
  keys: {
    p256dh: key.getPublicKey().toString("base64url"),
    auth: Buffer.alloc(16, 3).toString("base64url"),
  },
};
function fixture() {
  const s = structuredClone(seed(true)),
    event = s.events.find((e) => !e.practiceRound)!;
  s.events = [event];
  s.entries = [];
  event.hasSprint = false;
  event.sprintQualifying = "";
  event.sprintRace = "";
  event.gp = emptyResult();
  event.sprint = undefined;
  event.scoresPublishedAt = undefined;
  event.qualifying = new Date(now - 86400000).toISOString();
  event.lockedGp = true;
  pushAction(s, s.users[1], { action: "pushSubscribe", subscription });
  s.push!.subscriptions[0].createdAt = new Date(now - 3600000).toISOString();
  return { s, event };
}

test("complete weekend publication queues once, while drafts, partial Sprint weekends, corrections and practice do not", () => {
  const { event } = fixture();
  recordWeekendScores(event, false, now);
  assert.equal(event.scoresPublishedAt, undefined);
  event.hasSprint = true;
  event.gp = { ...emptyResult(), published: true };
  recordWeekendScores(event, false, now);
  assert.equal(event.scoresPublishedAt, undefined);
  event.sprint = { ...emptyResult(), published: true };
  recordWeekendScores(event, false, now);
  assert.equal(event.scoresPublishedAt, new Date(now).toISOString());
  recordWeekendScores(event, true, now + 1000);
  assert.equal(event.scoresPublishedAt, new Date(now).toISOString());
  event.practiceRound = true;
  assert.equal(weekendScoresReady(event), false);
});

test("score notifications require current membership, active season, prior opt-in and recent newly completed scores", () => {
  const { s, event } = fixture();
  event.gp = { ...emptyResult(), published: true };
  assert.equal(dueScoreNotifications(s, now).length, 0); // No historical backfill on upgrade.
  recordWeekendScores(event, false, now);
  assert.equal(dueScoreNotifications(s, now).length, 1);
  for (const mutate of [
    (x: typeof s) => {
      x.users[1].active = false;
    },
    (x: typeof s) => {
      x.users[1].seasonIds = [];
    },
    (x: typeof s) => {
      x.seasons[0].archived = true;
    },
    (x: typeof s) => {
      x.events[0].practiceRound = true;
    },
    (x: typeof s) => {
      x.events[0].hasSprint = true;
    },
    (x: typeof s) => {
      x.push!.subscriptions[0].createdAt = new Date(now + 1).toISOString();
    },
  ]) {
    const copy = structuredClone(s);
    mutate(copy);
    assert.equal(dueScoreNotifications(copy, now).length, 0);
  }
  assert.equal(dueScoreNotifications(s, now + 49 * 3600000).length, 0);
});

test("concurrent workers deliver scores once outside the state lock, and publication edits do not resend", async () => {
  const { transaction } = await import("../lib/store");
  const { s, event } = fixture();
  event.gp = { ...emptyResult(), published: true };
  recordWeekendScores(event, false, now);
  try {
    await transaction((state) => Object.assign(state, s));
    let calls = 0;
    const send = async (_: unknown, payload: string) => {
      calls++;
      const message = JSON.parse(payload);
      assert.equal(message.title, "Weekend scores are in");
      assert.ok(message.body.includes(event.name));
      await transaction((state) => {
        state.settings.welcome = "saved during delivery";
      });
    };
    const runs = await Promise.all([
      sendDuePush(send, now),
      sendDuePush(send, now),
    ]);
    assert.equal(calls, 1);
    assert.equal(
      runs.reduce((a, b) => a + b.sent, 0),
      1,
    );
    assert.equal((await sendDuePush(send, now + 300000)).sent, 0);
    const state = await transaction((x) => structuredClone(x));
    assert.equal(state.settings.welcome, "saved during delivery");
  } finally {
    await fs.rm(`.data/${process.env.DEMO_DATA_FILE}`, { force: true });
  }
});

test("score delivery drains batches past 20, honors retries and removes expired subscriptions", async () => {
  const { transaction } = await import("../lib/store");
  const { s, event } = fixture();
  event.gp = { ...emptyResult(), published: true };
  recordWeekendScores(event, false, now);
  s.events = Array.from({ length: 22 }, (_, i) => ({
    ...structuredClone(event),
    id: `scores-${i}`,
  }));
  try {
    await transaction((state) => Object.assign(state, s));
    assert.equal((await sendDuePush(async () => {}, now)).sent, 20);
    assert.equal((await sendDuePush(async () => {}, now)).sent, 2);
    await transaction((state) => {
      state.push!.deliveries = {};
    });
    await sendDuePush(async () => {
      throw { statusCode: 410 };
    }, now);
    assert.equal(
      await transaction((state) => state.push!.subscriptions.length),
      0,
    );
  } finally {
    await fs.rm(`.data/${process.env.DEMO_DATA_FILE}`, { force: true });
  }
});

test("manual organiser publication queues a weekend notification, while saving or correcting a draft does not", async () => {
  const { transaction } = await import("../lib/store"),
    { POST } = await import("../app/api/league/route"),
    { NextRequest } = await import("next/server");
  const { s, event } = fixture();
  const result = {
    ...emptyResult(),
    order: s.seasons[0].drivers.slice(0, 10).map((d) => d.id),
    pole: s.seasons[0].drivers[0].id,
    fastest: s.seasons[0].drivers[0].id,
    dotd: s.seasons[0].drivers[0].id,
    retirements: ["none"],
  };
  const save = (published: boolean) =>
    POST(
      new NextRequest(`${process.env.APP_URL}/api/league`, {
        method: "POST",
        headers: {
          origin: process.env.APP_URL!,
          cookie: "apex_demo=demo-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "results",
          eventId: event.id,
          kind: "gp",
          result: { ...result, published },
        }),
      }),
    );
  try {
    await transaction((state) => Object.assign(state, s));
    assert.equal((await save(false)).status, 200);
    assert.equal(
      await transaction((state) => state.events[0].scoresPublishedAt),
      undefined,
    );
    assert.equal((await save(true)).status, 200);
    const at = await transaction((state) => state.events[0].scoresPublishedAt);
    assert.ok(at);
    assert.equal((await save(true)).status, 200);
    assert.equal(
      await transaction((state) => state.events[0].scoresPublishedAt),
      at,
    );
  } finally {
    await fs.rm(`.data/${process.env.DEMO_DATA_FILE}`, { force: true });
  }
});
