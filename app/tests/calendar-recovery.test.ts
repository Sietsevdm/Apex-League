import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CalendarSync from "../components/CalendarSync";
import { createOpenF1Client } from "../lib/openf1";
import { CALENDAR_FAILURE_FALLBACK } from "../lib/calendar-error";
import { seed } from "../lib/seed";
import { providerFixture } from "./openf1-fixture";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `calendar-recovery-${process.pid}.json`;
function client(fetcher: typeof fetch) {
  let now = 0;
  return {
    request: createOpenF1Client({
      fetcher,
      clock: () => now,
      wait: async (ms) => {
        now += ms;
      },
    }),
    time: () => now,
  };
}
test("temporary OpenF1 server failures retry, while permanent errors identify the failed endpoint", async () => {
  let calls = 0;
  const c = client(async () =>
    ++calls === 1
      ? new Response("temporary", { status: 503 })
      : Response.json([{ year: 2026 }]),
  );
  assert.deepEqual(await c.request("meetings"), [{ year: 2026 }]);
  assert.equal(calls, 2);
  assert.ok(c.time() >= 2000);
  calls = 0;
  const permanent = client(async () => {
    calls++;
    return new Response("denied", { status: 403 });
  });
  await assert.rejects(
    permanent.request("sessions"),
    /sessions returned HTTP 403/,
  );
  assert.equal(calls, 1);
});
test("rate-limit Retry-After is honored, including HTTP dates and long cooldowns", async () => {
  for (const retry of ["60", new Date(60000).toUTCString()]) {
    let calls = 0;
    const times: number[] = [];
    let now = 0;
    const request = createOpenF1Client({
      clock: () => now,
      wait: async (ms) => {
        now += ms;
      },
      fetcher: async () => {
        times.push(now);
        return ++calls === 1
          ? new Response("rate", {
              status: 429,
              headers: { "retry-after": retry },
            })
          : Response.json([]);
      },
    });
    await request("sessions");
    assert.equal(calls, 2);
    assert.ok(times[1] - times[0] >= 60000);
  }
  let calls = 0;
  const c = client(async () => {
    calls++;
    return new Response("rate", {
      status: 429,
      headers: { "retry-after": "120" },
    });
  });
  await assert.rejects(c.request("sessions"), /429/);
  await assert.rejects(c.request("meetings"), /rate limited/);
  assert.equal(calls, 1);
});
test("transport timeouts have bounded retries and a readable endpoint-specific error", async () => {
  let calls = 0;
  const c = client(async () => {
    calls++;
    throw new DOMException("timeout", "TimeoutError");
  });
  await assert.rejects(
    c.request("meetings"),
    /OpenF1 meetings request timed out/,
  );
  assert.equal(calls, 3);
});
test("failed calendar checks retain saved data, retry hourly, then return to daily checks", async () => {
  const { transaction } = await import("../lib/store"),
    { syncDueCalendars } = await import("../lib/calendar-sync");
  const s = structuredClone(seed(true)),
    now = Date.parse("2030-01-10T00:00:00Z"),
    lastSuccess = new Date(now - 86400000).toISOString();
  s.seasons[0].calendarSync = { enabled: true, lastSuccess };
  s.events[0].calendarOverride = true;
  let calls = 0,
    fail = true;
  const snapshot = structuredClone(s.events);
  const fetcher = async () => {
    calls++;
    if (fail) throw new Error("sessions temporarily unavailable");
    return [{ ...s.events[0] }];
  };
  try {
    await transaction((state) => Object.assign(state, s));
    const failed = await syncDueCalendars(fetcher, now);
    assert.equal(failed[0].status, "error");
    assert.match(failed[0].message!, /sessions temporarily unavailable/);
    const stored = await transaction((state) => structuredClone(state));
    assert.deepEqual(stored.events, snapshot);
    assert.equal(stored.seasons[0].calendarSync?.lastSuccess, lastSuccess);
    assert.deepEqual(await syncDueCalendars(fetcher, now + 30 * 60000), []);
    assert.equal(calls, 1);
    fail = false;
    assert.equal(
      (await syncDueCalendars(fetcher, now + 3600000))[0].status,
      "synced",
    );
    assert.equal(calls, 2);
    assert.deepEqual(await syncDueCalendars(fetcher, now + 7200000), []);
    assert.equal(
      await transaction((state) => state.seasons[0].calendarSync?.lastSuccess),
      new Date(now + 3600000).toISOString(),
    );
    assert.equal(
      (await syncDueCalendars(fetcher, now + 25 * 3600000))[0].status,
      "synced",
    );
  } finally {
    await fs.rm(`.data/${process.env.DEMO_DATA_FILE}`, { force: true });
  }
});
test("Check now can import a valid calendar even when driver refresh fails", async () => {
  const { importCalendar } = await import("../lib/provider"),
    f = providerFixture(2026, "2026-03-01T00:00:00Z"),
    original = globalThis.fetch;
  try {
    globalThis.fetch = async (input) =>
      new URL(String(input)).pathname.endsWith("/drivers")
        ? new Response("denied", { status: 403 })
        : f.respond(input);
    const result = await importCalendar(2026);
    assert.equal(result.events.length, 1);
    assert.deepEqual(result.drivers, []);
    assert.match(result.lineupWarning, /drivers returned HTTP 403/);
  } finally {
    globalThis.fetch = original;
  }
});
test("failed checks without saved error details display an alert and recovery guidance", () => {
  const s = structuredClone(seed(true)),
    season = s.seasons[0];
  season.calendarSync = { enabled: true, status: "error", message: "  " };
  const html = renderToStaticMarkup(
    createElement(CalendarSync, { s, season, call: async () => ({}) }),
  );
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes(CALENDAR_FAILURE_FALLBACK));
  assert.ok(html.includes("Failed checks retry hourly"));
  assert.ok(!html.includes("Create the season, enable syncing"));
});
