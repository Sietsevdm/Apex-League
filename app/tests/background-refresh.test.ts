import { test } from "node:test";
import assert from "node:assert/strict";
import { backgroundRefresh } from "../lib/background-refresh";

function setup() {
  let time = 0,
    active = true,
    nextTimer = 0;
  let changed: () => void = () => {};
  let unsubscribed = false;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const requests: {
    signal: AbortSignal;
    resolve: (data: string) => void;
    reject: (error: Error) => void;
  }[] = [];
  const data: string[] = [],
    errors: string[] = [];
  const controller = backgroundRefresh({
    now: () => time,
    active: () => active,
    setTimer: (callback, delay) => {
      const id = ++nextTimer;
      timers.set(id, { at: time + delay, callback });
      return id;
    },
    clearTimer: (id) => {
      timers.delete(id as number);
    },
    subscribe: (callback) => {
      changed = callback;
      return () => {
        unsubscribed = true;
      };
    },
    load: (signal) =>
      new Promise<string>((resolve, reject) =>
        requests.push({ signal, resolve, reject }),
      ),
    onData: (value) => data.push(value),
    onError: (error) => errors.push(error.message),
  });
  return {
    controller,
    requests,
    data,
    errors,
    timers,
    advance(ms: number) {
      time += ms;
      for (const [id, item] of [...timers])
        if (item.at <= time) {
          timers.delete(id);
          item.callback();
        }
    },
    activity(value: boolean) {
      active = value;
      changed();
    },
    focus() {
      changed();
    },
    unsubscribed: () => unsubscribed,
  };
}
const settled = () => new Promise<void>((resolve) => setImmediate(resolve));

test("refresh waits a minute, never overlaps, and focus does not refetch fresh state", async () => {
  const s = setup();
  s.focus();
  s.advance(59_999);
  assert.equal(s.requests.length, 0);
  s.advance(1);
  assert.equal(s.requests.length, 1);
  s.focus();
  s.advance(120_000);
  assert.equal(s.requests.length, 1);
  s.requests[0].resolve("fresh");
  await settled();
  assert.deepEqual(s.data, ["fresh"]);
  s.focus();
  s.advance(59_999);
  assert.equal(s.requests.length, 1);
  s.advance(1);
  assert.equal(s.requests.length, 2);
  s.controller.dispose();
});

test("hidden/offline pauses and aborts reads; returning refreshes only stale state", async () => {
  const s = setup();
  s.activity(false);
  s.advance(120_000);
  assert.equal(s.requests.length, 0);
  s.activity(true);
  s.advance(0);
  assert.equal(s.requests.length, 1);
  s.activity(false);
  assert.equal(s.requests[0].signal.aborted, true);
  s.requests[0].resolve("obsolete");
  await settled();
  assert.deepEqual(s.data, []);
  assert.equal(s.timers.size, 0);
  s.activity(true);
  s.advance(0);
  assert.equal(s.requests.length, 2);
  s.requests[1].resolve("current");
  await settled();
  s.activity(false);
  s.advance(1000);
  s.activity(true);
  s.advance(0);
  assert.equal(s.requests.length, 2);
  s.controller.dispose();
});

test("saves invalidate an older read and pause refresh until all writes finish", async () => {
  const s = setup();
  s.advance(60_000);
  const finishOne = s.controller.beginWrite(),
    finishTwo = s.controller.beginWrite();
  assert.equal(s.requests[0].signal.aborted, true);
  s.requests[0].resolve("before-save");
  await settled();
  assert.deepEqual(s.data, []);
  finishOne(true);
  s.advance(120_000);
  assert.equal(s.requests.length, 1);
  finishOne(); // Completion is idempotent.
  finishTwo(true);
  s.advance(59_999);
  assert.equal(s.requests.length, 1);
  s.advance(1);
  assert.equal(s.requests.length, 2);
  s.controller.dispose();
});

test("errors retry at the regular interval; disposal cancels everything and ignores late data", async () => {
  const s = setup();
  s.advance(60_000);
  s.requests[0].reject(new Error("Unavailable"));
  await settled();
  assert.deepEqual(s.errors, ["Unavailable"]);
  s.advance(59_999);
  assert.equal(s.requests.length, 1);
  s.advance(1);
  assert.equal(s.requests.length, 2);
  s.controller.dispose();
  assert.equal(s.requests[1].signal.aborted, true);
  s.requests[1].resolve("after-logout");
  await settled();
  assert.deepEqual(s.data, []);
  assert.equal(s.timers.size, 0);
  assert.equal(s.unsubscribed(), true);
});

test("an aborted request retains its slot until settled, even after visibility returns", async () => {
  const s = setup();
  s.advance(60_000);
  s.activity(false);
  s.activity(true);
  s.advance(120_000);
  assert.equal(s.requests.length, 1);
  s.requests[0].resolve("ignored");
  await settled();
  s.advance(0);
  assert.equal(s.requests.length, 2);
  assert.deepEqual(s.data, []);
  s.controller.dispose();
});
