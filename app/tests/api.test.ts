import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { NextRequest } from "next/server";
process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `api-test-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET =
  "local-automated-test-secret-at-least-32-characters";
test("API enforces privacy, roles, deadlines, registration and idempotent publication", async () => {
  const { GET, POST } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const get = async (user = "demo-admin") => {
    const r = await GET(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        headers: { cookie: `apex_demo=${user}` },
      }),
    );
    assert.equal(r.status, 200);
    return r.json();
  };
  const post = async (
    body: Record<string, unknown>,
    user = "demo-admin",
    origin = "http://127.0.0.1:3000",
  ) => {
    const r = await POST(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        method: "POST",
        headers: {
          origin,
          host: "127.0.0.1:3000",
          cookie: `apex_demo=${user}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
    return { status: r.status, data: await r.json() };
  };
  try {
    const updates = await import("../app/api/updates/route");
    const adminUpdates = await updates.GET(new NextRequest("http://127.0.0.1:3000/api/updates", { headers: { cookie: "apex_demo=demo-admin" } }));
    assert.equal(adminUpdates.status, 200);
    assert.equal((await adminUpdates.json()).status, "unconfigured");
    assert.equal((await updates.GET(new NextRequest("http://127.0.0.1:3000/api/updates", { headers: { cookie: "apex_demo=demo-1" } }))).status, 403);
    const initial = await get();
    assert.ok(initial.state.users.every((u: any) => !("password" in u)));
    const picks = {
      order: initial.state.seasons[0].drivers
        .slice(0, 10)
        .map((d: any) => d.id),
      pole: "VER",
      fastest: "NOR",
      retirement: "none",
      dotd: "LEC",
    };
    assert.equal(
      (
        await post(
          {
            action: "predict",
            eventId: "singapore",
            kind: "gp",
            picks,
            submitted: true,
          },
          "demo-1",
        )
      ).status,
      200,
    );
    const admin = await get();
    assert.ok(
      !admin.state.entries.some(
        (p: any) => p.userId === "demo-1" && p.eventId === "singapore",
      ),
    );
    const owner = await get("demo-1");
    assert.equal(owner.state.receipts.length, 1);
    const setup = await post({
      action: "createSeason",
      year: 2030,
      name: "Wizard test",
      cutoff: "2030-01-01T00:00:00Z",
      copyId: "sample-season",
    });
    assert.equal(setup.status, 200);
    const createdSeason = setup.data.state.seasons.at(-1);
    assert.equal(createdSeason.calendarSync.enabled, true);
    assert.equal(
      createdSeason.drivers.length,
      initial.state.seasons[0].drivers.length,
    );
    assert.ok(
      setup.data.state.users
        .find((u: any) => u.id === "demo-admin")
        .seasonIds.includes(createdSeason.id),
    );
    await transaction((s) => {
      s.seasons = s.seasons.filter((x) => x.id !== createdSeason.id);
      s.users.forEach(
        (u) =>
          (u.seasonIds = u.seasonIds.filter((id) => id !== createdSeason.id)),
      );
    });
    assert.deepEqual(owner.state.receipts[0].picks, picks);
    assert.equal(admin.state.replacementCounts.singapore.gp.VER, null);
    assert.equal(owner.state.replacementCounts, undefined);
    assert.ok(
      owner.state.submissionOverview.singapore.gp.every(
        (row: any) => !("picks" in row),
      ),
    );
    const replacement = {
      action: "replacement",
      eventId: "singapore",
      kind: "gp",
      from: "VER",
      to: "RESERVE",
      name: "Reserve Driver",
      team: "Red Bull",
      policy: "carry",
    };
    assert.equal((await post(replacement, "demo-1")).status, 403);
    assert.equal((await post({ ...replacement, from: "UNKNOWN" })).status, 400);
    assert.equal((await post(replacement)).status, 200);
    const replacedOwner = await get("demo-1");
    assert.equal(replacedOwner.state.events.find((e: any) => e.id === "singapore").replacements[0].note, "");
    assert.deepEqual(replacedOwner.state.receipts[0].picks, picks);
    assert.equal(
      replacedOwner.state.events.find((e: any) => e.id === "singapore")
        .replacements[0].policy,
      "carry",
    );
    await transaction((s) => {
      delete s.events.find((e) => e.id === "singapore")!.replacements;
      s.seasons[0].drivers = s.seasons[0].drivers.filter(
        (d) => d.id !== "RESERVE",
      );
    });
    assert.equal(
      admin.state.receipts.length,
      0,
      "Receipts stay private even for organisers",
    );
    await post(
      {
        action: "predict",
        eventId: "singapore",
        kind: "gp",
        picks: { ...picks, pole: "NOR" },
        submitted: false,
      },
      "demo-1",
    );
    assert.equal(
      (await get("demo-1")).state.receipts[0].picks.pole,
      "VER",
      "Editing drafts must not rewrite receipts",
    );
    await post(
      {
        action: "predict",
        eventId: "singapore",
        kind: "gp",
        picks,
        submitted: true,
      },
      "demo-1",
    );
    assert.equal((await post({ action: "backupList" }, "demo-1")).status, 403);
    assert.equal(
      (
        await post(
          { action: "backupRestore", confirmation: "NO" },
          "demo-admin",
        )
      ).status,
      400,
    );
    assert.ok(
      owner.state.entries.some(
        (p: any) => p.userId === "demo-1" && p.eventId === "singapore",
      ),
    );
    assert.equal(
      (
        await post(
          { action: "appearance", theme: initial.state.settings.theme },
          "demo-1",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await post(
          { action: "appearance", theme: initial.state.settings.theme },
          "demo-admin",
          "https://evil.example",
        )
      ).status,
      403,
    );
    const duplicate = { ...picks, order: Array(10).fill("VER") };
    assert.equal(
      (
        await post(
          {
            action: "predict",
            eventId: "singapore",
            kind: "gp",
            picks: duplicate,
            submitted: true,
          },
          "demo-1",
        )
      ).status,
      400,
    );
    await transaction((s) => {
      s.events.find((e) => e.id === "singapore")!.lockedGp = true;
      s.seasons[0].cutoff = new Date(Date.now() - 1000).toISOString();
    });
    assert.equal(
      (
        await post(
          {
            action: "predict",
            eventId: "singapore",
            kind: "gp",
            picks,
            submitted: true,
          },
          "demo-1",
        )
      ).status,
      409,
    );
    assert.equal((await post({ action: "loginText", loginText: { headline: "Our league" } }, "demo-1")).status, 403);
    assert.equal((await post({ action: "loginText", loginText: { headline: "Our league", welcome: "Welcome to our grid" } })).status, 200);
    const publicLogin = await get("signed-out");
    assert.equal(publicLogin.loginText.headline, "Our league");
    assert.equal(publicLogin.loginText.welcome, "Welcome to our grid");
    assert.equal((await post({ action: "previousYearLineup", seasonId: "sample-season" }, "demo-1")).status, 403);
    assert.equal((await post({ action: "previousYearLineup", seasonId: "sample-season" })).status, 400);
    const revealed = await get();
    assert.ok(
      revealed.state.entries.some(
        (p: any) => p.userId === "demo-1" && p.eventId === "singapore",
      ),
    );
    assert.equal((await post({ action: "registration", seasonId: "sample-season", closed: true }, "demo-1")).status, 403);
    assert.equal((await post({ action: "registration", seasonId: "sample-season", closed: true })).status, 200);
    assert.equal(
      (
        await post({
          action: "register",
          seasonId: "sample-season",
          invite: initial.state.settings.invite,
          email: "test@example.invalid",
          password: "test-only-password",
          name: "Test",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post({
          action: "member",
          id: "demo-1",
          seasonId: "sample-season",
        })
      ).status,
      400,
    );
    const result = {
      order: picks.order,
      pole: "VER",
      fastest: "NOR",
      retirements: ["none"],
      dotd: "LEC",
      voids: [],
      published: false,
    };
    assert.equal(
      (
        await post({
          action: "results",
          eventId: "singapore",
          kind: "gp",
          result,
        })
      ).status,
      200,
    );
    assert.equal(
      (await get("demo-1")).state.events.find((e: any) => e.id === "singapore")
        .gp,
      undefined,
    );
    assert.equal(
      (
        await post({
          action: "results",
          eventId: "singapore",
          kind: "gp",
          result: { ...result, published: true },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post({
          action: "results",
          eventId: "singapore",
          kind: "gp",
          result: { ...result, pole: "NOR", published: false },
        })
      ).status,
      200,
    );
    const duringCorrection = await get("demo-1");
    assert.equal(
      duringCorrection.state.events.find((e: any) => e.id === "singapore").gp
        .pole,
      "VER",
    );
    assert.equal(
      duringCorrection.state.events.find((e: any) => e.id === "singapore")
        .gpDraft,
      undefined,
    );
    assert.equal(
      (
        await post({
          action: "results",
          eventId: "singapore",
          kind: "gp",
          result: { ...result, published: true },
        })
      ).status,
      200,
    );
    const final = await get("demo-1");
    const { standings } = await import("../lib/model");
    const row = standings(final.state, "sample-season").find(
      (x) => x.id === "demo-1",
    )!;
    assert.equal(row.total, 39);
    const exported = await post({ action: "export" });
    assert.ok(exported.data.export.users.every((u: any) => !("password" in u)));
    assert.equal(exported.data.export.settings.invite, "");
    assert.equal(
      (
        await post(
          {
            action: "typography",
            typography: { text: 110, headings: 115, banner: 105 },
          },
          "demo-1",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await post({
          action: "typography",
          typography: { text: 200, headings: 100, banner: 100 },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post({
          action: "typography",
          typography: { text: 110, headings: 115, banner: 105 },
        })
      ).status,
      200,
    );
    assert.deepEqual((await get("demo-1")).state.settings.typography, {
      text: 110,
      headings: 115,
      banner: 105,
    });
    const scheduler = await import("../app/api/calendar-sync/route");
    const { defaultFonts } = await import("../lib/typography");
    assert.equal(
      (
        await post({
          action: "typography",
          typography: {
            text: 100,
            headings: 100,
            banner: 100,
            groups: defaultFonts,
          },
        })
      ).status,
      200,
    );
    assert.equal(
      (await get("demo-1")).state.settings.typography.groups.tables.family,
      "dm",
    );
    assert.equal(
      (
        await post({
          action: "typography",
          typography: {
            text: 100,
            headings: 100,
            banner: 100,
            groups: {
              ...defaultFonts,
              body: { ...defaultFonts.body, family: "bad" },
            },
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (await post({ action: "passkeyRegisterOptions", password: "wrong" }))
        .status,
      400,
    );
    const options = await post({ action: "passkeyLoginOptions" });
    assert.equal(options.status, 200);
    assert.ok(options.data.options.challenge);
    assert.equal(
      (await get()).state.passkeyChallenges,
      undefined,
      "Challenges must not leak into league responses",
    );
    assert.equal(
      (await post({ action: "passkeyLoginVerify", response: { id: "bad" } }))
        .status,
      400,
    );
    process.env.BACKUP_SECRET =
      "api-test-backup-secret-more-than-32-characters";
    process.env.BACKUP_DIR = `.data/backups-test-${process.pid}`;
    const backup = await post({ action: "backupCreate" });
    assert.equal(backup.status, 200);
    assert.equal(typeof backup.data.backup.content, "string");
    assert.equal(
      (await post({ action: "backupDownload", name: "../demo.json" })).status,
      400,
    );
    assert.equal((await post({ action: "backupList" })).data.backups.length, 1);
    assert.equal(
      (
        await post({
          action: "backupRestore",
          content: backup.data.backup.content,
          confirmation: "RESTORE",
        })
      ).status,
      200,
    );
    assert.equal(
      (await get()).state.settings.typography.groups.body.family,
      "dm",
    );
    process.env.CALENDAR_SYNC_SECRET =
      "scheduler-test-secret-more-than-32-characters";
    assert.equal(
      (
        await scheduler.POST(
          new NextRequest("http://127.0.0.1:3000/api/calendar-sync", {
            method: "POST",
          }),
        )
      ).status,
      401,
    );
    const { syncDueCalendars } = await import("../lib/calendar-sync");
    await transaction((s) => {
      s.seasons[0].calendarSync = { enabled: true };
    });
    let fetches = 0;
    const fetcher = async () => {
      fetches++;
      return [];
    };
    const now = Date.now();
    await syncDueCalendars(fetcher, now);
    await syncDueCalendars(fetcher, now + 3600000);
    assert.equal(
      fetches,
      1,
      "hourly worker only fetches each season once daily",
    );
    await syncDueCalendars(fetcher, now + 86400001);
    assert.equal(fetches, 2);
    assert.equal((await get()).state.seasons[0].calendarSync.lease, undefined);
  } finally {
    await fs.rm(`.data/${process.env.DEMO_DATA_FILE}`, { force: true });
    if (process.env.BACKUP_DIR === `.data/backups-test-${process.pid}`)
      await fs.rm(process.env.BACKUP_DIR, { recursive: true, force: true });
  }
});
