import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { seed } from "../lib/seed";
import { createECDH } from "node:crypto";
process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `push-test-${process.pid}.json`;
process.env.APP_URL = "https://league.example.com";
process.env.SESSION_SECRET = "push-test-secret-at-least-32-characters";
const browserKey = createECDH("prime256v1");
browserKey.generateKeys();
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test-device",
  keys: {
    p256dh: browserKey.getPublicKey().toString("base64url"),
    auth: Buffer.alloc(16, 2).toString("base64url"),
  },
};

test("subscriptions restrict delivery hosts, isolate accounts and retain stable signing keys", async () => {
  const { validSubscription, pushAction } = await import("../lib/push");
  assert.deepEqual(validSubscription(subscription), subscription);
  for (const endpoint of [
    "http://fcm.googleapis.com/test",
    "https://127.0.0.1/test",
    "https://fcm.googleapis.com.evil.test/test",
    "https://fcm.googleapis.com:8080/test",
  ])
    assert.throws(() => validSubscription({ ...subscription, endpoint }));
  const s = seed(true);
  const u = s.users[1];
  const first = pushAction(s, u, { action: "pushSubscribe", subscription });
  const other = pushAction(s, s.users[2], {
    action: "pushStatus",
    endpoint: subscription.endpoint,
  });
  assert.equal(other.push.devices, 0);
  assert.equal(other.push.subscribed, false);
  assert.equal(other.push.publicKey, first.push.publicKey);
  pushAction(s, s.users[2], { action: "pushUnsubscribe", all: true });
  assert.equal(s.push!.subscriptions.length, 1);
  pushAction(s, s.users[2], { action: "pushSubscribe", subscription });
  assert.equal(s.push!.subscriptions.length, 1);
  assert.equal(s.push!.subscriptions[0].userId, s.users[2].id);
});

test("test notifications produce a signed, encrypted Web Push request without needing email", async () => {
  const { pushAction, preparePushTest, sendPushTest } =
    await import("../lib/push");
  const webpush = (await import("web-push")).default;
  const s = seed(true);
  pushAction(s, s.users[1], { action: "pushSubscribe", subscription });
  const job = preparePushTest(s, s.users[1], subscription.endpoint);
  assert.throws(() => preparePushTest(s, s.users[2], subscription.endpoint));
  let checked = false;
  await sendPushTest(job, async (sub, payload, options) => {
    const request = webpush.generateRequestDetails(sub, payload, options);
    assert.equal(request.endpoint, subscription.endpoint);
    assert.ok(request.headers.Authorization || request.headers.authorization);
    assert.ok(Buffer.isBuffer(request.body));
    assert.ok(
      !request.body!.toString().includes("Push notifications are working"),
    );
    checked = true;
  });
  assert.equal(checked, true);
});

test("push scheduler skips submitted/locked/archived entries, deduplicates and sends outside the lock", async () => {
  const { pushAction, dueReminders, sendDuePush } = await import("../lib/push");
  const { transaction } = await import("../lib/store");
  try {
    await transaction((s) => {
      const initial = seed(true);
      Object.assign(s, initial);
      s.events = s.events.filter((e) => e.id === "singapore");
      const e = s.events[0];
      e.gpDeadline = new Date(Date.now() + 45 * 60000).toISOString();
      e.sprintDeadline = new Date(Date.now() + 20 * 3600000).toISOString();
      e.lockedGp = false;
      e.lockedSprint = false;
      s.entries = [];
      pushAction(s, s.users[1], { action: "pushSubscribe", subscription });
    });
    let state = await transaction((s) => structuredClone(s));
    assert.equal(dueReminders(state).length, 2);
    const submitted = structuredClone(state);
    submitted.entries.push({
      userId: state.users[1].id,
      eventId: state.events[0].id,
      kind: "gp",
      submitted: true,
      updatedAt: new Date().toISOString(),
      picks: { order: [], pole: "", fastest: "", retirement: "", dotd: "" },
    });
    assert.equal(dueReminders(submitted).length, 1);
    const archived = structuredClone(state);
    archived.seasons[0].archived = true;
    assert.equal(dueReminders(archived).length, 0);
    let calls = 0;
    const send = async (_sub: unknown, payload: string) => {
      calls++;
      assert.ok(JSON.parse(payload).body.includes("Closes within"));
      await transaction((s) => {
        s.settings.welcome = "Saved during provider request";
      });
    };
    const runs = await Promise.all([sendDuePush(send), sendDuePush(send)]);
    assert.equal(
      runs.reduce((n, r) => n + r.sent, 0),
      2,
    );
    assert.equal(calls, 2);
    assert.equal((await sendDuePush(send)).sent, 0);
    state = await transaction((s) => structuredClone(s));
    assert.equal(state.settings.welcome, "Saved during provider request");
    await transaction((s) => {
      s.push!.deliveries = {};
    });
    await sendDuePush(async () => {
      throw { statusCode: 410 };
    });
    state = await transaction((s) => structuredClone(s));
    assert.equal(state.push!.subscriptions.length, 0);
  } finally {
    await fs.rm(path.resolve(".data", process.env.DEMO_DATA_FILE!), {
      force: true,
    });
  }
});

test("push API rejects anonymous/foreign-origin requests and never serializes signing secrets or endpoints", async () => {
  const { GET, POST } = await import("../app/api/league/route");
  const post = (user: string, origin: string, body: object) =>
    POST(
      new NextRequest(`${process.env.APP_URL}/api/league`, {
        method: "POST",
        headers: {
          cookie: `apex_demo=${user}`,
          origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
  try {
    assert.equal(
      (await post("missing", process.env.APP_URL!, { action: "pushStatus" }))
        .status,
      401,
    );
    assert.equal(
      (await post("demo-1", "https://evil.test", { action: "pushStatus" }))
        .status,
      403,
    );
    const response = await post("demo-1", process.env.APP_URL!, {
      action: "pushSubscribe",
      subscription,
    });
    assert.equal(response.status, 200);
    const { transaction } = await import("../lib/store");
    const secret = await transaction((s) => s.push!.privateKey);
    for (const scope of ["season", "admin", ""]) {
      const response = await GET(
        new NextRequest(`${process.env.APP_URL}/api/league`, {
          headers: {
            cookie: "apex_demo=demo-admin",
            ...(scope ? { "x-apex-scope": scope } : {}),
          },
        }),
      );
      const body = await response.text();
      assert.ok(!body.includes(secret));
      assert.ok(!body.includes(subscription.endpoint));
      assert.ok(!JSON.parse(body).state.push);
    }
    const exported = await (
      await post("demo-admin", process.env.APP_URL!, { action: "export" })
    ).json();
    assert.equal(exported.export.push, undefined);
    const { encryptBackup, decryptBackup } = await import("../lib/backups");
    process.env.BACKUP_SECRET =
      "backup-push-test-secret-at-least-32-characters";
    const snapshot = await transaction((s) => structuredClone(s));
    const restored = decryptBackup(encryptBackup(snapshot));
    assert.equal(restored.push!.privateKey, secret);
    assert.equal(restored.push!.subscriptions.length, 0);
    assert.deepEqual(restored.push!.deliveries, {});
    await post("demo-1", process.env.APP_URL!, {
      action: "logout",
      pushEndpoint: subscription.endpoint,
    });
    assert.equal(await transaction((s) => s.push!.subscriptions.length), 0);
    const scheduler = await import("../app/api/push-reminders/route");
    process.env.CALENDAR_SYNC_SECRET =
      "push-scheduler-secret-at-least-32-characters";
    assert.equal(
      (
        await scheduler.POST(
          new NextRequest(`${process.env.APP_URL}/api/push-reminders`, {
            method: "POST",
          }),
        )
      ).status,
      401,
    );
  } finally {
    await fs.rm(path.resolve(".data", process.env.DEMO_DATA_FILE!), {
      force: true,
    });
  }
});
