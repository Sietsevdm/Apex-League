import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { standings } from "../lib/model";
import { recordCorrection } from "../lib/result-corrections";
import { standingsMovement } from "../lib/standings-movement";
import {
  calendarSubscriptionAction,
  subscribedCalendar,
} from "../lib/calendar-subscriptions";
import { deadlineCalendar } from "../lib/league-extras";
import { startVisibleTicker } from "../lib/visible-timer";
test("movement follows scoring and ties and needs two completed weekends", () => {
  const s = seed(true),
    id = s.seasons[0].id;
  assert.ok(Object.values(standingsMovement(s, id)).every((n) => n === 0));
  const event = s.events[1],
    entry = s.entries.find(
      (p) => p.eventId === event.id && p.userId === "demo-5",
    )!;
  entry.picks = {
    order: [...event.gp!.order],
    pole: event.gp!.pole,
    fastest: event.gp!.fastest,
    retirement: "ALO",
    dotd: event.gp!.dotd,
  };
  const before = standings(
    { ...s, events: s.events.filter((e) => e.id !== event.id) },
    id,
  );
  const movement = standingsMovement(s, id);
  for (const row of standings(s, id))
    assert.equal(
      movement[row.id],
      before.find((r) => r.id === row.id)!.rank - row.rank,
    );
  assert.ok(movement["demo-5"] > 0);
  event.gp!.published = false;
  assert.deepEqual(standingsMovement(s, id), {});
});
test("corrections require reasons, preserve snapshots, omit predictions and do not duplicate", () => {
  const s = seed(true),
    event = s.events[0],
    before = structuredClone(event.gp!),
    after = { ...structuredClone(before), voids: ["pole"] };
  assert.throws(
    () => recordCorrection(s, event, "gp", after, "Admin", ""),
    /reason/,
  );
  recordCorrection(s, event, "gp", after, "Admin", "Penalty confirmed");
  const record = s.resultCorrections![0];
  assert.ok(
    record.changes.length > 0 &&
      record.changes.every((c) => c.before - c.after === 3),
  );
  assert.ok(!JSON.stringify(record).includes('"picks"'));
  event.gp = after;
  recordCorrection(s, event, "gp", structuredClone(after), "Admin", "Same");
  assert.equal(s.resultCorrections!.length, 1);
  after.order.reverse();
  assert.deepEqual(record.before, before);
  assert.notDeepEqual(record.after.order, after.order);
});
test("calendar tokens are hashed, revocable, replaceable and require active membership", () => {
  const s = seed(true),
    user = s.users[0],
    season = s.seasons[0];
  const create = () =>
    calendarSubscriptionAction(s, user, {
      action: "calendarSubscriptionCreate",
      seasonId: season.id,
    });
  const token = (path: string) =>
    new URL(path, "https://example.invalid").searchParams.get("token")!;
  const first = token(create().calendarSubscription.path!);
  assert.ok(subscribedCalendar(s, first));
  assert.ok(!JSON.stringify(user.calendarSubscriptions).includes(first));
  const ics = deadlineCalendar(s, season, "en", true);
  assert.equal(ics, deadlineCalendar(s, season, "en", true));
  assert.ok(
    ics.includes("SEQUENCE:0") &&
      ics.includes("LAST-MODIFIED:") &&
      !ics.includes(user.email),
  );
  const second = token(create().calendarSubscription.path!);
  assert.equal(subscribedCalendar(s, first), undefined);
  user.active = false;
  assert.equal(subscribedCalendar(s, second), undefined);
  user.active = true;
  user.seasonIds = [];
  assert.equal(subscribedCalendar(s, second), undefined);
  user.seasonIds = [season.id];
  calendarSubscriptionAction(s, user, {
    action: "calendarSubscriptionRevoke",
    seasonId: season.id,
  });
  assert.equal(subscribedCalendar(s, second), undefined);
  assert.throws(
    () =>
      calendarSubscriptionAction(s, user, {
        action: "calendarSubscriptionCreate",
        seasonId: "unknown",
      }),
    /Join/,
  );
});
test("ticker pauses hidden, resynchronizes on return, and cleans up", () => {
  let listener: (() => void) | undefined,
    running = false,
    ticks = 0;
  const doc = {
    hidden: false,
    addEventListener: (_n: string, fn: () => void) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = undefined;
    },
  };
  const timers = {
    setInterval: () => {
      running = true;
      return 1;
    },
    clearInterval: () => {
      running = false;
    },
  };
  const start = () =>
    startVisibleTicker(
      () => ticks++,
      doc as unknown as Document,
      timers as unknown as Parameters<typeof startVisibleTicker>[2],
    );
  const stop = start();
  assert.equal(ticks, 1);
  assert.ok(running);
  doc.hidden = true;
  listener!();
  assert.equal(running, false);
  assert.equal(ticks, 1);
  doc.hidden = false;
  listener!();
  assert.ok(running);
  assert.equal(ticks, 2);
  stop();
  assert.equal(running, false);
  assert.equal(listener, undefined);
  doc.hidden = true;
  const stop2 = start();
  assert.equal(ticks, 2);
  assert.equal(running, false);
  stop2();
});


test("backup restore and season cleanup revoke calendar links and remove correction records", async () => {
  process.env.BACKUP_SECRET = "local-calendar-backup-test-secret-at-least-32-characters";
  const {encryptBackup, decryptBackup} = await import("../lib/backups");
  const {purgeSeason} = await import("../lib/data-cleanup");
  const s=seed(true), user=s.users[0], season=s.seasons[0];
  calendarSubscriptionAction(s,user,{action:"calendarSubscriptionCreate",seasonId:season.id});
  recordCorrection(s,s.events[0],"gp",{...structuredClone(s.events[0].gp!),voids:["pole"]},"Admin","Void pole");
  const restored=decryptBackup(encryptBackup(s));
  assert.equal(restored.users[0].calendarSubscriptions,undefined);
  assert.equal(restored.resultCorrections!.length,1);
  purgeSeason(s,season.id);
  assert.equal(s.resultCorrections!.length,0);
  assert.equal(user.calendarSubscriptions!.length,0);
});
