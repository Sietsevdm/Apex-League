import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { NextRequest } from "next/server";
import { seed } from "../lib/seed";
import {
  authorizeManagement,
  canManageLeague,
  leagueView,
  migrateLeagues,
} from "../lib/leagues";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Admin from "../components/screens/Admin";
import Auth from "../components/Auth";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `leagues-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET = "multi-league-test-session-secret-at-least-32";

test("legacy migration preserves accounts, predictions and seasons, and assigns one existing league idempotently", () => {
  const s = seed(true),
    entries = structuredClone(s.entries),
    roles = s.users.map((u) => u.role);
  migrateLeagues(s);
  assert.equal(s.leagues?.length, 1);
  assert.equal(s.leagues?.[0].ownerId, "demo-admin");
  assert.ok(s.seasons.every((x) => x.leagueId === "default"));
  assert.deepEqual(s.entries, entries);
  assert.deepEqual(
    s.users.map((u) => u.role),
    roles,
  );
  const migrated = JSON.stringify(s);
  migrateLeagues(s);
  assert.equal(JSON.stringify(s), migrated);
});

test("ownership checks cover forged season/event/copy targets and site-wide account tools", () => {
  const s = seed(true);
  migrateLeagues(s);
  const a = s.users[1];
  a.role = "organiser";
  s.leagues!.push({
    id: "a",
    name: "A",
    ownerId: a.id,
    createdAt: "2026-01-01",
  });
  s.seasons.push({ ...s.seasons[0], id: "a-season", leagueId: "a" });
  assert.ok(canManageLeague(s, a, "a"));
  assert.ok(!canManageLeague(s, a, "default"));
  for (const body of [
    { action: "branding" },
    { action: "results", eventId: s.events[0].id },
    { action: "event", id: s.events[0].id, seasonId: "a-season" },
    { action: "createSeason", copyId: s.seasons[0].id },
  ])
    assert.throws(
      () =>
        authorizeManagement(
          s,
          a,
          body,
          body.action === "branding" ? "default" : "a",
        ),
      /only manage/,
    );
  for (const action of [
    "backupCreate",
    "backupRestore",
    "resetPassword",
    "loginText",
    "export",
    "purgeSeasonData",
  ])
    assert.throws(
      () => authorizeManagement(s, a, { action }, "a"),
      /Site owner/,
    );
  assert.throws(
    () => authorizeManagement(s, a, { action: "member", role: "admin" }, "a"),
    /site owner/,
  );
  assert.ok(authorizeManagement(s, s.users[0], { action: "branding" }, "a"));
});

test("management navigation groups league tools and shows site account/backup tools only to Admin", () => {
  const s = seed(true);
  migrateLeagues(s);
  s.selectedLeagueId = "default";
  const props = {
    s,
    season: s.seasons[0],
    meId: "demo-admin",
    call: async () => ({}),
    go: () => {},
    onPreview: () => {},
  };
  const admin = renderToStaticMarkup(createElement(Admin, props));
  assert.match(admin, /management-menu/);
  assert.match(admin, /Race setup/);
  assert.match(admin, /Site accounts/);
  assert.match(admin, /Data &amp; history/);
  s.users[0].role = "organiser";
  const organiser = renderToStaticMarkup(createElement(Admin, props));
  assert.match(organiser, /League management/);
  assert.match(organiser, /Results &amp; scoring/);
  assert.doesNotMatch(
    organiser,
    /Site accounts|Data &amp; history|Site administration/,
  );
});

test("API isolates leagues, enforces all three roles, supports owner creation/invites and preserves prediction privacy", async () => {
  const { POST, GET } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const post = (
    body: object,
    user = "demo-admin",
    league?: string,
    scope?: string,
  ) =>
    POST(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:3000",
          cookie: `apex_demo=${user}`,
          "content-type": "application/json",
          ...(league ? { "x-apex-league": league } : {}),
          ...(scope ? { "x-apex-scope": scope } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  const get = (user: string, league: string, scope = "season") =>
    GET(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        headers: {
          cookie: `apex_demo=${user}`,
          "x-apex-league": league,
          "x-apex-scope": scope,
        },
      }),
    );
  try {
    await transaction((s) => {
      Object.assign(s, seed(true));
      migrateLeagues(s);
    });
    assert.equal(
      (await post({ action: "member", id: "demo-1", role: "organiser" }))
        .status,
      200,
    );
    assert.equal(
      (await post({ action: "member", id: "demo-2", role: "organiser" }))
        .status,
      200,
    );
    assert.equal(
      (await post({ action: "leagueCreate", name: "Forbidden" }, "demo-3"))
        .status,
      403,
    );
    const aResponse = await post(
      { action: "leagueCreate", name: "League A" },
      "demo-1",
    );
    assert.equal(aResponse.status, 200);
    const a = (await aResponse.json()).state.selectedLeagueId;
    const bResponse = await post(
      { action: "leagueCreate", name: "League B" },
      "demo-2",
    );
    assert.equal(bResponse.status, 200);
    const b = (await bResponse.json()).state.selectedLeagueId;
    const create = async (league: string, user: string) => {
      const response = await post(
        {
          action: "createSeason",
          year: 2027,
          name: "Season",
          cutoff: "2099-01-01T00:00:00Z",
        },
        user,
        league,
        "admin",
      );
      assert.equal(response.status, 200);
      return (await response.json()).context.seasonId as string;
    };
    const sa = await create(a, "demo-1"),
      sb = await create(b, "demo-2");
    await transaction((s) => {
      for (const id of [sa, sb])
        s.seasons.find((x) => x.id === id)!.drivers = structuredClone(
          s.seasons[0].drivers,
        );
      const template = s.events[0];
      s.events.push({
        ...structuredClone(template),
        id: "a-race",
        seasonId: sa,
        gp: undefined,
        gpDraft: { ...template.gp!, published: false },
        qualifying: "2099-02-01T00:00:00Z",
        race: "2099-02-02T00:00:00Z",
        lockedGp: false,
      });
      s.events.push({
        ...structuredClone(template),
        id: "b-race",
        seasonId: sb,
        gp: undefined,
        gpDraft: { ...template.gp!, published: false },
      });
    });
    for (const [body, league, user] of [
      [{ action: "branding", name: "Hacked", welcome: "" }, a, "demo-2"],
      [{ action: "branding", name: "Hacked", welcome: "" }, a, "demo-3"],
      [{ action: "resultsImport", eventId: "b-race" }, a, "demo-1"],
      [{ action: "event", id: "b-race", seasonId: sa }, a, "demo-1"],
      [{ action: "createSeason", copyId: sb }, a, "demo-1"],
      [{ action: "member", id: "demo-1", role: "admin" }, a, "demo-1"],
      [{ action: "member", id: "demo-2", active: false }, a, "demo-1"],
      [{ action: "backupList" }, a, "demo-1"],
    ] as const)
      assert.equal(
        (await post(body, user, league)).status,
        403,
        JSON.stringify(body),
      );
    assert.equal(
      (
        await post(
          { action: "branding", name: "A updated", welcome: "A only" },
          "demo-1",
          a,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await post(
          { action: "branding", name: "B by admin", welcome: "B only" },
          "demo-admin",
          b,
        )
      ).status,
      200,
    );
    const state = await transaction((s) => structuredClone(s));
    assert.notEqual(state.settings.name, "A updated");
    assert.equal(
      state.leagues!.find((l) => l.id === a)!.settings!.welcome,
      "A only",
    );
    const own = (await (await get("demo-1", a, "admin")).json()).state;
    assert.deepEqual(
      own.seasons.map((s: any) => s.id),
      [sa],
    );
    assert.deepEqual(
      own.events.map((e: any) => e.id),
      ["a-race"],
    );
    assert.ok(own.events[0].gpDraft);
    assert.ok(!own.leagues.some((l: any) => l.id === b));
    assert.ok(own.leagues.every((l: any) => !l.settings));
    assert.equal((await get("demo-1", b)).status, 403);
    const invite = state.leagues!.find((l) => l.id === a)!.settings!.invite;
    const publicInfo = await (
      await post({ action: "publicInfo", invite })
    ).json();
    assert.deepEqual(
      publicInfo.seasons.map((x: any) => x.id),
      [sa],
    );
    assert.equal(
      (
        await post({
          action: "register",
          name: "Wrong invitation",
          email: "wrong@example.invalid",
          password: "test-password-at-least-12",
          seasonId: sa,
          invite: state.settings.invite,
        })
      ).status,
      400,
    );
    for (const missingOrInvalid of [undefined, "", "invented-invite"]) {
      const info = await (
        await post({ action: "publicInfo", invite: missingOrInvalid })
      ).json();
      assert.deepEqual(
        info.seasons,
        [],
        "no season discovery without a valid league invite",
      );
    }
    const newPlayer = {
      action: "register",
      name: "Invited player",
      email: "invited@example.invalid",
      password: "test-password-at-least-12",
      invite,
    };
    assert.equal(
      (await post({ ...newPlayer, seasonId: sb, leagueId: b })).status,
      400,
    );
    assert.equal(
      (await post({ ...newPlayer, invite: "invented", seasonId: sa })).status,
      400,
    );
    const invitedResponse = await post(
      { ...newPlayer, seasonId: sa, leagueId: b },
      "unknown",
      b,
    );
    assert.equal(invitedResponse.status, 200);
    const invitedData = await invitedResponse.json();
    assert.equal(invitedData.state.selectedLeagueId, a);
    assert.deepEqual(
      invitedData.state.leagues.map((l: any) => l.id),
      [a],
    );
    const invitedUser = await transaction((s) =>
      s.users.find((u) => u.email === newPlayer.email)!,
    );
    assert.deepEqual(invitedUser.seasonIds, [sa]);
    assert.equal(invitedUser.role, "player");
    assert.equal((await get(invitedUser.id, b)).status, 403);
    assert.equal(
      (
        await post(
          { action: "joinLeague", invite, leagueId: b, seasonId: sb },
          "demo-3",
        )
      ).status,
      200,
    );
    const player = (await (await get("demo-3", a)).json()).state;
    assert.equal(player.settings.invite, "");
    assert.equal(player.events[0].gpDraft, undefined);
    assert.equal(player.audit.length, 0);
    assert.equal((await get("demo-3", a, "admin")).status, 403);
    const drivers = state.seasons
      .find((s) => s.id === sa)!
      .drivers.map((d) => d.id);
    assert.equal(
      (
        await post(
          {
            action: "predict",
            eventId: "a-race",
            kind: "gp",
            submitted: true,
            picks: {
              order: drivers.slice(0, 10),
              pole: drivers[0],
              fastest: drivers[0],
              retirement: "none",
              dotd: drivers[0],
            },
          },
          "demo-3",
          a,
        )
      ).status,
      200,
    );
    // An organiser can play in another league without obtaining its management access.
    assert.equal(
      (
        await post(
          {
            action: "joinLeague",
            invite: state.leagues!.find((l) => l.id === b)!.settings!.invite,
          },
          "demo-1",
        )
      ).status,
      200,
    );
    const asPlayer = (await (await get("demo-1", b)).json()).state;
    assert.equal(asPlayer.events[0].gpDraft, undefined);
    assert.equal(asPlayer.settings.invite, "");
    assert.equal((await get("demo-1", b, "admin")).status, 403);
    assert.equal(
      (
        await post(
          { action: "branding", name: "Still forbidden", welcome: "" },
          "demo-1",
          b,
        )
      ).status,
      403,
    );
    assert.equal(
      (await post({ action: "removeLeagueMember", id: "demo-3" }, "demo-1", a))
        .status,
      200,
    );
    assert.equal((await get("demo-3", a)).status, 403);
    const final = await transaction((s) => s);
    assert.equal(final.users.find((u) => u.id === "demo-3")!.active, true);
    assert.ok(
      final.entries.some(
        (e) => e.userId === "demo-3" && e.eventId === "a-race",
      ),
    );
    assert.ok(
      final.users
        .find((u) => u.id === "demo-3")!
        .seasonIds.includes("sample-season"),
    );
    // Public creation must grant ownership only to a new Organiser account.
    const signup = {
      action: "registerLeague",
      name: "New organiser",
      email: "owner@example.invalid",
      password: "test-password-at-least-12",
      leagueName: "My racing friends",
      role: "admin",
      seasonId: "sample-season",
      invite: "ignored",
    };
    const beforeSignup = await transaction((s) => ({
      users: s.users.length,
      leagues: s.leagues!.length,
    }));
    assert.equal((await post({ ...signup, leagueName: " " })).status, 400);
    assert.equal((await post({ ...signup, password: "short" })).status, 400);
    assert.equal((await post({ ...signup, email: "invalid" })).status, 400);
    const unchanged = await transaction((s) => ({
      users: s.users.length,
      leagues: s.leagues!.length,
    }));
    assert.deepEqual(unchanged, beforeSignup, "invalid signup must be atomic");
    const createdResponse = await post(signup);
    assert.equal(createdResponse.status, 200);
    assert.match(
      createdResponse.headers.get("set-cookie") || "",
      /apex_session=/,
    );
    const created = (await createdResponse.json()).state;
    const saved = await transaction((s) => structuredClone(s));
    const owner = saved.users.find((u) => u.email === signup.email)!;
    assert.equal(owner.role, "organiser");
    assert.deepEqual(owner.seasonIds, []);
    const owned = saved.leagues!.find(
      (l) => l.id === created.selectedLeagueId,
    )!;
    assert.equal(owned.name, signup.leagueName);
    assert.equal(owned.ownerId, owner.id);
    assert.notEqual(owned.settings!.invite, saved.settings.invite);
    assert.deepEqual(created.seasons, []);
    assert.deepEqual(
      created.leagues.map((l: any) => l.id),
      [owned.id],
    );
    assert.equal((await get(owner.id, "default", "admin")).status, 403);
    assert.equal(
      (await post({ action: "backupList" }, owner.id, owned.id)).status,
      403,
    );
    assert.equal(
      (await post(signup)).status,
      400,
      "duplicate accounts cannot claim leagues",
    );
    assert.equal(
      (
        await post(
          {
            action: "createSeason",
            name: "First season",
            year: 2027,
            cutoff: "2099-01-01T00:00:00Z",
          },
          owner.id,
          owned.id,
          "admin",
        )
      ).status,
      200,
    );
  } finally {
    await fs.unlink(`.data/${process.env.DEMO_DATA_FILE}`).catch(() => {});
  }
});

test("login offers both invitation joining and creating a league", () => {
  const html = renderToStaticMarkup(
    createElement(Auth, {
      data: { authenticated: false, demo: false },
      call: async () => ({}),
      error: "",
      setError: () => {},
    }),
  );
  assert.match(html, /Create your own league/);
  assert.match(html, /Have an invitation\? Join the league/);
  assert.match(html, /Sign in/);
});
