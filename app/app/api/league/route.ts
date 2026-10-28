import { scopedState, type ResponseContext } from "@/lib/response-scope";
import {
  authorizeManagement,
  canManageLeague,
  canManageSeason,
  leagueSettings,
  leagueView,
  migrateLeagues,
  selectLeague,
} from "@/lib/leagues";
import { mutationResponse, versioned } from "@/lib/state-response";
import { pushAction, preparePushTest, sendPushTest } from "@/lib/push";
import { importSnapshot, validateImportSnapshot } from "@/lib/manual-imports";
import {
  registrationOpen,
  predictionDrivers,
  classifyImportedDrivers,
  seasonNameMatches,
  mergeImportedLineup,
} from "@/lib/season-controls";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { calendarSubscriptionAction } from "@/lib/calendar-subscriptions";
import { recordCorrection } from "@/lib/result-corrections";
import { transaction, readState, demoMode } from "@/lib/store";
import { hashPassword, verifyPassword, session, readSession } from "@/lib/auth";
import {
  State,
  Season,
  User,
  Event,
  Picks,
  Result,
  cutoff,
  locked,
  complete,
  emptyResult,
} from "@/lib/model";
import {
  importCalendar,
  importResults,
  openingDriverIds,
  fetchLineup,
} from "@/lib/provider";
import { recordCalendarSync } from "@/lib/calendar-sync";
import { validFonts } from "@/lib/typography";
import {
  createBackup,
  listBackups,
  readBackup,
  decryptBackup,
} from "@/lib/backups";
import { passkeyAction } from "@/lib/passkeys";
import { launchChecklist } from "@/lib/league-extras";
import { submissionOverview } from "@/lib/enhancements";
import { decorateImages } from "@/lib/banner-images";
import {
  deleteArchivedSeasons,
  purgeSeasonData,
  purgeSeason,
} from "@/lib/data-cleanup";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const globalLimits = globalThis as unknown as {
  apexLimits?: Map<string, { count: number; until: number }>;
};
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
function limit(key: string, max = 12) {
  const m = (globalLimits.apexLimits ??= new Map());
  const now = Date.now();
  if (m.size > 5000) for (const [k, v] of m) if (v.until < now) m.delete(k);
  const v = m.get(key);
  if (v && v.until > now) {
    if (v.count >= max) fail("Too many attempts. Please wait a minute.", 429);
    v.count++;
  } else m.set(key, { count: 1, until: now + 60000 });
}
function text(x: unknown, max = 300) {
  if (typeof x !== "string" || x.length > max) fail("Invalid text value.");
  return x.trim();
}
function timestamp(x: unknown) {
  const v = text(x);
  if (!Number.isFinite(Date.parse(v))) fail("Enter a valid date and time.");
  return new Date(v).toISOString();
}
function admin(u: User) {
  if (u.role !== "admin" && u.role !== "organiser")
    fail("Management access required.", 403);
}
function audit(s: State, u: User, action: string, leagueId?: string) {
  s.audit.unshift({
    id: randomUUID(),
    date: new Date().toISOString(),
    actor: u.name,
    action,
    leagueId: leagueId || "_site",
  });
  s.audit = s.audit.slice(0, 1000);
}
function tick(s: State) {
  for (const e of s.events) {
    if (Date.now() >= Date.parse(cutoff(e, "gp"))) e.lockedGp = true;
    if (e.sprintQualifying && Date.now() >= Date.parse(cutoff(e, "sprint")))
      e.lockedSprint = true;
  }
}
async function bootstrap(s: State) {
  if (demoMode || s.users.length) return;
  const email = process.env.BOOTSTRAP_EMAIL,
    password = process.env.BOOTSTRAP_PASSWORD;
  if (
    !email ||
    !password ||
    password.length < 16 ||
    password.includes("CHANGE_")
  )
    fail("Configure a valid bootstrap organiser email and password.", 503);
  s.users.push({
    id: randomUUID(),
    email: email.toLowerCase(),
    name: "Organiser",
    password: hashPassword(password),
    role: "admin",
    active: true,
    seasonIds: [],
    reminders: false,
    timezone: "Europe/Amsterdam",
    version: 0,
  });
}
function current(s: State, req: NextRequest) {
  if (demoMode) {
    const id = req.cookies.get("apex_demo")?.value || "demo-admin";
    return s.users.find((u) => u.id === id && u.active);
  }
  const token = readSession(req.cookies.get("apex_session")?.value || "");
  return token
    ? s.users.find(
        (u) => u.id === token.id && u.version === token.version && u.active,
      )
    : undefined;
}
function view(
  s: State,
  u: User | undefined,
  req?: NextRequest,
  selectedId?: string,
  leagueId?: string,
) {
  if (!u)
    return {
      authenticated: false,
      demo: demoMode,
      loginText: s.settings.loginText,
      name: s.settings.name,
      logo: s.settings.logo,
      typography: s.settings.typography,
      theme: s.settings.theme,
    };
  s = leagueView(
    s,
    u,
    leagueId || req?.headers.get("x-apex-league") || undefined,
    selectedId || req?.headers.get("x-apex-season") || undefined,
  );
  const manager = Boolean(
    s.selectedLeagueId && canManageLeague(s, u, s.selectedLeagueId),
  );
  const savedPhotos = s.settings.savedBannerPhotos;
  const scope = req?.headers.get("x-apex-scope");
  if (scope && !["season", "archive", "admin"].includes(scope))
    fail("Unknown response scope.");
  if (scope === "admin") admin(u);
  if (scope === "admin" && !manager)
    fail("You can only manage leagues you created.", 403);
  const projection = scope
    ? scopedState(s, u, {
        scope: scope as ResponseContext["scope"],
        seasonId: selectedId || req?.headers.get("x-apex-season") || undefined,
        leagueId: s.selectedLeagueId,
      })
    : undefined;
  if (projection) s = projection.state;
  const safe = structuredClone(s) as any;
  delete safe.push;
  if (projection?.summaries) safe.seasonSummaries = projection.summaries;
  if (projection && savedPhotos)
    Object.defineProperty(safe.settings, "savedBannerPhotos", {
      value: savedPhotos,
      enumerable: false,
    });
  safe.seasons.forEach((season: Season) => {
    if (season.calendarSync) {
      delete season.calendarSync.lease;
      delete season.calendarSync.leaseUntil;
    }
  });
  delete safe.passkeyChallenges;
  safe.events.forEach((event: Event) => {
    for (const sync of Object.values(event.resultSync || {})) {
      delete sync.lease;
      delete sync.leaseUntil;
    }
  });
  safe.submissionOverview = Object.fromEntries(
    s.events.map((e) => [
      e.id,
      {
        gp: submissionOverview(s, e, "gp"),
        sprint: submissionOverview(s, e, "sprint"),
      },
    ]),
  );
  if (manager)
    safe.replacementCounts = Object.fromEntries(
      s.events.map((e) => [
        e.id,
        Object.fromEntries(
          ["gp", "sprint"].map((kind) => [
            kind,
            Object.fromEntries(
              (s.seasons.find((x) => x.id === e.seasonId)?.drivers || []).map(
                (d) => [
                  d.id,
                  locked(e, kind as "gp" | "sprint")
                    ? s.entries.filter(
                        (p) =>
                          p.submitted &&
                          p.eventId === e.id &&
                          p.kind === kind &&
                          [
                            ...p.picks.order,
                            p.picks.pole,
                            p.picks.fastest,
                            p.picks.retirement,
                            p.picks.dotd,
                          ].includes(d.id),
                      ).length
                    : null,
                ],
              ),
            ),
          ]),
        ),
      ]),
    );
  if (u.role !== "admin") delete safe.backupHealth;
  safe.receipts = (s.receipts || []).filter((r) => r.userId === u.id);
  safe.resultCorrections = (s.resultCorrections || []).filter((correction) =>
    s.events.some(
      (event) =>
        event.id === correction.eventId &&
        event[correction.kind]?.published &&
        locked(event, correction.kind),
    ),
  );
  if (manager)
    safe.launchChecks = Object.fromEntries(
      s.seasons
        .filter(
          (season) => !projection || season.id === projection.context.seasonId,
        )
        .map((season) => [season.id, launchChecklist(s, season)]),
    );
  safe.users = s.users.map((v) => ({
    id: v.id,
    name: v.name,
    role: v.role,
    active: v.active,
    seasonIds: v.seasonIds,
    ...(v.id === u.id || u.role === "admin"
      ? {
          pushEnabled:
            s.push?.subscriptions.some((sub) => sub.userId === v.id) || false,
        }
      : {}),
    ...(v.id === u.id || u.role === "admin"
      ? {
          email: v.email,
          timezone: v.timezone,
          reminders: v.reminders,
          passkeys:
            v.id === u.id
              ? (v.passkeys || []).map((k) => ({
                  id: k.id,
                  name: k.name,
                  createdAt: k.createdAt,
                }))
              : undefined,
        }
      : {}),
  }));
  safe.entries = s.entries.filter(
    (p) =>
      p.userId === u.id ||
      (p.submitted &&
        locked(
          s.events.find((e) => e.id === p.eventId)!,
          p.kind,
        )),
  );
  safe.championPicks = s.championPicks.filter(
    (p) =>
      p.userId === u.id ||
      Date.now() >=
        Date.parse(s.seasons.find((x) => x.id === p.seasonId)!.cutoff),
  );
  if (!manager) {
    safe.settings.invite = "";
    safe.audit = [];
    safe.events = safe.events.map((e: Event) => ({
      ...e,
      gpDraft: undefined,
      sprintDraft: undefined,
      resultSync: undefined,
      gp: e.gp?.published ? e.gp : undefined,
      sprint: e.sprint?.published ? e.sprint : undefined,
    }));
  }
  return {
    authenticated: true,
    demo: demoMode,
    userId: u.id,
    state: safe,
    context: projection?.context || {
      scope: "season",
      leagueId: s.selectedLeagueId,
    },
  };
}
const lineupRefreshAttempts = new Map<string, number>();
async function refreshImportedLineups(req: NextRequest) {
  const candidates = await (async () => {
    const s = await readState();
    if (!current(s, req)) return [];
    return s.seasons
      .filter(
        (season) =>
          !season.archived &&
          season.drivers.length > 20 &&
          season.drivers.some((d) => d.replacementOnly === undefined) &&
          Date.now() - (lineupRefreshAttempts.get(season.id) || 0) >
            60 * 60 * 1000,
      )
      .map((season) => ({ id: season.id, year: season.year }));
  })();
  for (const candidate of candidates) {
    lineupRefreshAttempts.set(candidate.id, Date.now());
    try {
      const starters = await openingDriverIds(candidate.year);
      await transaction((s) => {
        const season = s.seasons.find(
          (season) =>
            season.id === candidate.id && season.year === candidate.year,
        );
        if (season) classifyImportedDrivers(season, starters);
      });
    } catch {
      /* Keep the saved lineup when the calendar provider is unavailable; retry later. */
    }
  }
}
export async function GET(req: NextRequest) {
  try {
    await refreshImportedLineups(req);
    let snapshot = await readState();
    const needsMaintenance =
      (!demoMode && !snapshot.users.length) ||
      snapshot.seasons.some(
        (season) => season.registrationClosed === undefined,
      ) ||
      snapshot.events.some(
        (e) =>
          (!e.lockedGp && Date.now() >= Date.parse(cutoff(e, "gp"))) ||
          (e.sprintQualifying &&
            !e.lockedSprint &&
            Date.now() >= Date.parse(cutoff(e, "sprint"))),
      );
    if (needsMaintenance)
      snapshot = await transaction(async (s) => {
        await bootstrap(s);
        tick(s);
        return structuredClone(s);
      });
    const data = view(snapshot, current(snapshot, req), req);
    const result = versioned(await decorateImages(data));
    const headers = {
      "Cache-Control": "private, no-store",
      Vary: "Cookie, X-Apex-Scope, X-Apex-Season, X-Apex-League",
      ...(result.revision ? { ETag: `"${result.revision}"` } : {}),
    };
    if (
      result.revision &&
      req.headers.get("if-none-match") === `"${result.revision}"`
    )
      return new NextResponse(null, { status: 304, headers });
    return NextResponse.json(result, { headers });
  } catch (e) {
    return error(e);
  }
}
function error(e: unknown) {
  const err = e as Error & { status?: number };
  if (!err.status) console.error(err);
  return NextResponse.json(
    {
      error: err.status
        ? err.message
        : "The server could not complete this request. Check server configuration or try again.",
    },
    { status: err.status || 500 },
  );
}
async function prepareManualImport(req: NextRequest, body: any) {
  if (
    !["calendarImport", "previousYearLineup", "resultsImport"].includes(
      body.action,
    )
  )
    return;
  const snapshot = await transaction(async (s) => {
    await bootstrap(s);
    tick(s);
    const user = current(s, req);
    if (!user) fail("Please sign in.", 401);
    admin(user);
    authorizeManagement(
      s,
      user,
      body,
      req.headers.get("x-apex-league") || undefined,
    );
    return importSnapshot(s, user, body);
  });
  // No transaction or league write lock is held during these network requests.
  try {
    if (body.action === "calendarImport")
      return { snapshot, calendar: await importCalendar(snapshot.year) };
    if (body.action === "previousYearLineup")
      return { snapshot, lineup: await fetchLineup(snapshot.year - 1) };
    return {
      snapshot,
      results: await importResults(
        snapshot.year,
        snapshot.round!,
        body.kind === "sprint" ? "sprint" : "gp",
      ),
    };
  } catch (error) {
    if (body.action === "calendarImport")
      return { snapshot, error: error as Error };
    throw error;
  }
}
function invitedLeague(s: State, rawInvite: unknown) {
  if (typeof rawInvite !== "string" || rawInvite.length > 200) return undefined;
  const invite = text(rawInvite, 200);
  if (!invite) return undefined;
  const matches =
    s.leagues?.filter((l) => leagueSettings(s, l.id).invite === invite) || [];
  return matches.length === 1 ? matches[0] : undefined;
}
function createOwnedLeague(s: State, u: User, leagueName: unknown) {
  const id = randomUUID();
  const name = text(leagueName, 80);
  if (!name) fail("Enter a league name.");
  s.leagues!.push({
    id,
    name,
    ownerId: u.id,
    createdAt: new Date().toISOString(),
    settings: {
      ...structuredClone(s.settings),
      name,
      invite: randomUUID(),
      bannerOverride: "",
      announcements: [],
      savedBannerPhotos: [],
    },
  });
  audit(s, u, `Created league: ${name}`, id);
  return id;
}
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const expected =
      process.env.APP_URL ||
      (demoMode ? `http://${req.headers.get("host")}` : "");
    if (!origin || origin !== expected)
      fail("Request origin is not allowed.", 403);
    if (Number(req.headers.get("content-length") || 0) > 100_000_000)
      fail("Upload is too large.", 413);
    const raw = await req.text();
    if (raw.length > 100_000_000) fail("Upload is too large.", 413);
    const b = JSON.parse(raw);
    const preparedImport = await prepareManualImport(req, b);
    let responseSeasonId: string | undefined;
    let pushTest: ReturnType<typeof preparePushTest> | undefined;
    let before: any;
    let passkeyChallengeCookie: string | undefined;
    let cookie: string | undefined,
      logout = false,
      demoCookie: string | undefined;
    const data = await transaction(async (s) => {
      await bootstrap(s);
      tick(s);
      let u = current(s, req);
      if (u && req.headers.has("x-apex-base-version"))
        before = versioned(await decorateImages(view(s, u, req)));
      if (
        [
          "passkeyLoginOptions",
          "passkeyLoginVerify",
          "passkeyRegisterOptions",
          "passkeyRegisterVerify",
        ].includes(b.action)
      ) {
        limit("passkey-global", 100);
        try {
          const result = await passkeyAction(
            s,
            u,
            b,
            req.cookies.get("apex_passkey")?.value || "",
          );
          if (result.options) {
            passkeyChallengeCookie = result.challengeId;
            return { options: result.options };
          }
          if (result.user) {
            cookie = session(result.user.id, result.user.version);
            return view(s, result.user, req, responseSeasonId);
          }
        } catch (e) {
          return { error: (e as Error).message, passkeyError: true };
        }
      }
      if (b.action === "login") {
        limit(`login:${String(b.email).toLowerCase()}`);
        limit("login-global", 100);
        u = s.users.find(
          (v) => v.email === text(b.email).toLowerCase() && v.active,
        );
        if (!u || !verifyPassword(text(b.password, 1000), u.password))
          fail("Email or password is incorrect.", 401);
        cookie = session(u.id, u.version);
        if (demoMode) demoCookie = u.id;
        return view(s, u, req, responseSeasonId);
      }
      if (b.action === "register" || b.action === "registerLeague") {
        const creating = b.action === "registerLeague";
        limit("register", 20);
        const invitationLeague = creating
          ? undefined
          : invitedLeague(s, b.invite);
        if (!creating && !invitationLeague) fail("The invitation is invalid.");
        const season = s.seasons.find(
          (v) => v.id === b.seasonId && !v.archived,
        );
        if (!creating && (!season || !registrationOpen(season)))
          fail("Registration for this season is closed.");
        if (!creating && season!.leagueId !== invitationLeague!.id)
          fail("The invitation is invalid.");
        const email = text(b.email).toLowerCase();
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          s.users.some((v) => v.email === email)
        )
          fail("Use a valid, unused email address.");
        const password = text(b.password, 1000);
        if (password.length < 12)
          fail("Use a password with at least 12 characters.");
        u = {
          id: randomUUID(),
          email,
          name: text(b.name, 60),
          password: hashPassword(password),
          role: creating ? "organiser" : "player",
          active: true,
          seasonIds: creating ? [] : [season!.id],
          reminders: false,
          timezone: "Europe/Amsterdam",
          version: 0,
        };
        if (!u.name) fail("Enter a display name.");
        s.users.push(u);
        cookie = session(u.id, 0);
        if (demoMode) demoCookie = u.id;
        if (creating) {
          const id = createOwnedLeague(s, u, b.leagueName);
          return view(s, u, undefined, undefined, id);
        }
        audit(s, u, "Joined the league", season!.leagueId);
        return view(s, u, undefined, season!.id, invitationLeague!.id);
      }
      if (b.action === "publicInfo") {
        const league = invitedLeague(s, b.invite);
        return {
          seasons: s.seasons
            .filter(
              (x) =>
                !x.archived && Boolean(league) && x.leagueId === league!.id,
            )
            .map((x) => ({
              id: x.id,
              name: x.name,
              registrationClosed: !registrationOpen(x),
            })),
        };
      }
      if (!u) fail("Please sign in.", 401);
      if (
        [
          "calendarSubscriptionStatus",
          "calendarSubscriptionCreate",
          "calendarSubscriptionRevoke",
        ].includes(b.action)
      )
        return calendarSubscriptionAction(s, u, b);
      if (b.action === "pushTest") {
        limit(`push-test:${u.id}`, 3);
        pushTest = preparePushTest(s, u, b.endpoint);
        return { push: { test: true } };
      }
      if (["pushStatus", "pushSubscribe", "pushUnsubscribe"].includes(b.action))
        return pushAction(s, u, b);
      if (b.action === "logout") {
        if (s.push && b.pushEndpoint)
          s.push.subscriptions = s.push.subscriptions.filter(
            (sub) => !(sub.userId === u.id && sub.endpoint === b.pushEndpoint),
          );
        logout = true;
        if (demoMode) demoCookie = "signed-out";
        return view(s, undefined, req, responseSeasonId);
      }
      if (b.action === "demoUser" && demoMode) {
        const selected = s.users.find((v) => v.id === b.id && v.active);
        if (!selected) fail("Unknown demo user.");
        demoCookie = selected.id;
        return view(s, selected, req, responseSeasonId);
      }
      if (b.action === "removePasskey") {
        if (!verifyPassword(text(b.password, 1000), u.password))
          fail("Current password is incorrect.", 403);
        u.passkeys = (u.passkeys || []).filter((k) => k.id !== b.id);
        audit(s, u, "Removed a passkey");
        return view(s, u, req, responseSeasonId);
      }
      if (b.action === "profile") {
        u.name = text(b.name, 60) || u.name;
        u.timezone = text(b.timezone, 100);
        try {
          new Intl.DateTimeFormat("en", { timeZone: u.timezone });
        } catch {
          fail("Invalid timezone.");
        }
        u.reminders = Boolean(b.reminders);
        if (b.password) {
          if (
            !demoMode &&
            !verifyPassword(text(b.currentPassword, 1000), u.password)
          )
            fail("Current password is incorrect.");
          const password = text(b.password, 1000);
          if (password.length < 12)
            fail("New password must have at least 12 characters.");
          u.password = hashPassword(password);
          u.version++;
          if (!demoMode) cookie = session(u.id, u.version);
        }
        return view(s, u, req, responseSeasonId);
      }
      if (b.action === "predict") {
        const e = s.events.find((x) => x.id === b.eventId);
        if (!e || !u.seasonIds.includes(e.seasonId))
          fail("You are not a member of this season.", 403);
        const kind: "gp" | "sprint" = b.kind === "sprint" ? "sprint" : "gp";
        if (kind === "sprint" && !e.sprintQualifying)
          fail("This weekend has no Sprint.");
        if (locked(e, kind)) fail("Predictions are locked.", 409);
        const season = s.seasons.find((x) => x.id === e.seasonId)!;
        const p = b.picks as Picks;
        if (
          !p ||
          !Array.isArray(p.order) ||
          p.order.length !== (kind === "gp" ? 10 : 8)
        )
          fail("Invalid finishing order.");
        const ids = predictionDrivers(s, season, e, kind).map((d) => d.id);
        const valid = (v: unknown, none = false) =>
          typeof v === "string" &&
          (v === "" || ids.includes(v) || (none && v === "none"));
        if (
          p.order.some((v) => !valid(v)) ||
          new Set(p.order.filter(Boolean)).size !==
            p.order.filter(Boolean).length ||
          !valid(p.pole) ||
          !valid(p.fastest) ||
          !valid(p.retirement, true) ||
          !valid(p.dotd)
        )
          fail("Use valid drivers without duplicate finishing positions.");
        if (b.submitted && !complete(p, kind))
          fail("Complete every prediction before submitting.");
        const entry = {
          userId: u.id,
          eventId: e.id,
          kind,
          picks: {
            order: p.order,
            pole: p.pole,
            fastest: p.fastest,
            retirement: p.retirement,
            dotd: p.dotd,
          },
          submitted: Boolean(b.submitted),
          updatedAt: new Date().toISOString(),
        };
        const i = s.entries.findIndex(
          (x) => x.userId === u!.id && x.eventId === e.id && x.kind === kind,
        );
        if (i < 0) s.entries.push(entry);
        else s.entries[i] = entry;
        if (
          entry.submitted ||
          s.receipts?.some(
            (receipt) =>
              receipt.userId === u!.id &&
              receipt.eventId === e.id &&
              receipt.kind === kind,
          )
        ) {
          s.receipts ??= [];
          s.receipts.push({
            id: randomUUID(),
            status: entry.submitted ? "submitted" : "draft",
            driverNames: Object.fromEntries(
              season.drivers.map((driver) => [driver.id, driver.name]),
            ),
            userId: u.id,
            eventId: e.id,
            kind,
            picks: structuredClone(entry.picks),
            submittedAt: entry.updatedAt,
            deadline: cutoff(e, kind),
          });
        }
        return view(s, u, req, responseSeasonId);
      }
      if (b.action === "championPick") {
        const season = s.seasons.find((x) => x.id === b.seasonId);
        if (
          !season ||
          !u.seasonIds.includes(season.id) ||
          Date.now() >= Date.parse(season.cutoff)
        )
          fail("Season predictions are closed.");
        if (
          !season.drivers.some((x) => x.id === b.driver) ||
          !season.constructors.includes(b.constructor)
        )
          fail("Choose a driver and constructor.");
        const pick = {
          userId: u.id,
          seasonId: season.id,
          driver: b.driver,
          constructor: b.constructor,
        };
        s.championPicks = s.championPicks.filter(
          (x) => !(x.userId === u!.id && x.seasonId === season.id),
        );
        s.championPicks.push(pick);
        return view(s, u, req, responseSeasonId);
      }
      if (b.action === "leagueCreate") {
        admin(u);
        const id = createOwnedLeague(s, u, b.name);
        return view(s, u, undefined, undefined, id);
      }
      if (b.action === "joinLeague") {
        const league = invitedLeague(s, b.invite);
        if (!league) fail("The invitation is invalid.");
        const season = s.seasons
          .filter(
            (x) =>
              x.leagueId === league.id && registrationOpen(x) && !x.archived,
          )
          .at(-1);
        if (!season) fail("Registration for this season is closed.");
        if (!u.seasonIds.includes(season.id)) u.seasonIds.push(season.id);
        audit(s, u, "Joined the league", league.id);
        return view(s, u, undefined, season.id, league.id);
      }
      admin(u);
      const managedLeague = authorizeManagement(
        s,
        u,
        b,
        req.headers.get("x-apex-league") || undefined,
      );
      const settings = leagueSettings(s, managedLeague.id);
      const auditLeague = (state: State, user: User, action: string) =>
        audit(state, user, action, managedLeague.id);
      if (preparedImport) validateImportSnapshot(s, u, preparedImport.snapshot);
      if (b.action === "backupCreate") {
        try {
          const result = await createBackup(s);
          auditLeague(s, u, "Created encrypted league backup");
          return { backup: result };
        } catch (e) {
          return { error: (e as Error).message, backupError: true };
        }
      }
      if (b.action === "backupList")
        return {
          backups: await listBackups(),
          health: s.backupHealth || {},
          configured: Boolean(
            process.env.BACKUP_SECRET && process.env.BACKUP_SECRET.length >= 32,
          ),
        };
      if (b.action === "backupDownload") {
        const name = text(b.name, 150);
        if (!(await listBackups()).some((file) => file.name === name))
          fail("Unknown backup.");
        return { backup: { name, content: await readBackup(name) } };
      }
      if (b.action === "backupRestore") {
        if (b.confirmation !== "RESTORE")
          fail("Type RESTORE to replace the current league.");
        if (!demoMode && !verifyPassword(text(b.password, 1000), u.password))
          fail("Current password is incorrect.", 403);
        let restored: State;
        try {
          restored = decryptBackup(b.content);
        } catch {
          fail("Backup cannot be verified. Check the file and BACKUP_SECRET.");
        }
        await createBackup(s);
        Object.keys(s).forEach((k) => delete (s as any)[k]);
        Object.assign(s, restored);
        auditLeague(
          s,
          u,
          "Restored league backup; previous state saved before restore",
        );
        logout = true;
        return { restored: true };
      }
      if (b.action === "replacement") {
        const event = s.events.find((e) => e.id === b.eventId);
        const season = s.seasons.find((x) => x.id === event?.seasonId);
        if (!event || !season) fail("Unknown event.");
        const kind: "gp" | "sprint" = b.kind === "sprint" ? "sprint" : "gp";
        if (kind === "sprint" && !event.sprintQualifying)
          fail("No Sprint for this event.");
        if (event[kind]?.published)
          fail("Set replacement policy before publishing results.");
        const from = text(b.from, 50),
          to = text(b.to, 50);
        if (
          !season.drivers.some((d) => d.id === from) ||
          from === to ||
          !["carry", "keep"].includes(b.policy)
        )
          fail("Choose a valid replacement policy.");
        const currentRules =
          event.replacements?.filter(
            (r) => r.kind === kind && r.from !== from,
          ) || [];
        if (
          currentRules.some((r) => [r.from, r.to].includes(to) || r.to === from)
        )
          fail("Replacement chains and duplicate seats are not supported.");
        if (!season.drivers.some((d) => d.id === to)) {
          if (!/^[a-zA-Z0-9_-]+$/.test(to) || !to)
            fail("Use a unique driver ID.");
          const name = text(b.name, 80),
            team = text(b.team, 80);
          if (!name || season.drivers.length >= 40)
            fail("Enter a driver name.");
          season.drivers.push({
            id: to,
            name,
            team,
            color: "#8BA7BD",
            replacementOnly: true,
          });
        }
        const rule = {
          from,
          to,
          kind,
          policy: b.policy,
          note: text(b.note, 300),
        };
        if (!rule.note) fail("Explain the replacement policy.");
        event.replacements = [
          ...(event.replacements || []).filter(
            (r) => !(r.kind === kind && r.from === from),
          ),
          rule,
        ];
        for (const key of ["gpDraft", "sprintDraft"] as const)
          if (event[key])
            event[key]!.replacements = (event.replacements || []).filter(
              (r) => r.kind === (key === "gpDraft" ? "gp" : "sprint"),
            );
        settings.announcements.unshift({
          id: randomUUID(),
          title: `Driver replacement · ${event.name}`,
          body: `${from} → ${to} (${kind}): ${b.policy === "carry" ? "picks follow the replacement driver" : "original driver picks remain"}. ${rule.note}`,
          date: new Date().toISOString(),
        });
        auditLeague(
          s,
          u,
          `Replacement ${event.name} ${kind}: ${from} → ${to}, ${b.policy}. ${rule.note}`,
        );
      } else if (b.action === "typography") {
        const sizes = b.typography;
        if (
          !sizes ||
          ["text", "headings", "banner"].some(
            (key) =>
              !Number.isInteger(sizes[key]) ||
              sizes[key] < 85 ||
              sizes[key] > 140,
          )
        )
          fail("Font sizes must be between 85% and 140%.");
        if (sizes.groups && !validFonts(sizes.groups))
          fail("Invalid font controls.");
        settings.typography = {
          text: sizes.text,
          headings: sizes.headings,
          banner: sizes.banner,
          ...(sizes.groups ? { groups: structuredClone(sizes.groups) } : {}),
        };
        auditLeague(s, u, "Updated font sizes");
      } else if (b.action === "loginText") {
        const fields = [
          "eyebrow",
          "headline",
          "accent",
          "description",
          "footer",
          "welcome",
          "subtitle",
        ] as const;
        if (!b.loginText || typeof b.loginText !== "object")
          fail("Invalid login text.");
        s.settings.loginText = Object.fromEntries(
          fields.map((key) => [key, text(b.loginText[key] ?? "", 500)]),
        );
        auditLeague(s, u, "Updated login screen text");
      } else if (b.action === "branding") {
        settings.name = text(b.name, 80) || settings.name;
        settings.welcome = text(b.welcome, 500);
        if (b.logo !== undefined) {
          if (
            b.logo &&
            !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.logo)
          )
            fail("Upload a PNG, JPEG or WebP image.");
          settings.logo = text(b.logo, 1_500_000);
        }
        auditLeague(s, u, "Updated league branding");
      } else if (b.action === "banner") {
        const e = s.events.find((v) => v.id === b.eventId);
        if (!e) fail("Unknown event.");
        if (b.photo !== undefined) {
          if (
            b.photo &&
            !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
              b.photo,
            )
          )
            fail("Upload a PNG, JPEG or WebP image.");
          e.photo = text(b.photo, 3_000_000);
          const year = s.seasons.find(
            (season) => season.id === e.seasonId,
          )!.year;
          if (settings.savedBannerPhotos)
            settings.savedBannerPhotos = settings.savedBannerPhotos.filter(
              (photo) =>
                !(
                  photo.year === year &&
                  photo.name === e.name &&
                  photo.circuit === e.circuit
                ),
            );
        }
        e.credit = text(b.credit, 200);
        e.focal = Math.max(0, Math.min(100, Number(b.focal) || 0));
        settings.bannerOverride = b.override ? e.id : "";
        auditLeague(s, u, `Updated banner for ${e.name}`);
      } else if (b.action === "announcement") {
        settings.announcements.unshift({
          id: randomUUID(),
          title: text(b.title, 100),
          body: text(b.body, 2000),
          date: new Date().toISOString(),
        });
        auditLeague(s, u, "Published announcement");
      } else if (b.action === "deleteAnnouncement") {
        settings.announcements = settings.announcements.filter(
          (x) => x.id !== b.id,
        );
        auditLeague(s, u, "Removed announcement");
      } else if (b.action === "rotateInvite") {
        settings.invite = randomUUID();
        auditLeague(s, u, "Revoked old invitation link");
      } else if (b.action === "member") {
        const member = s.users.find((v) => v.id === b.id);
        if (!member || member.id === u.id)
          fail("Cannot change your own access here.");
        if (b.role && !["admin", "organiser", "player"].includes(b.role))
          fail("Invalid role.");
        if (b.role) {
          member.role = b.role;
          member.version++;
        }
        if (typeof b.active === "boolean") {
          member.active = b.active;
          member.version++;
        }
        if (b.seasonId) {
          const season = s.seasons.find((x) => x.id === b.seasonId);
          if (!season || !registrationOpen(season))
            fail("Season registration is closed.");
          if (!member.seasonIds.includes(season.id))
            member.seasonIds.push(season.id);
        }
        auditLeague(s, u, `Updated access for ${member.name}`);
      } else if (b.action === "removeLeagueMember") {
        const member = s.users.find((x) => x.id === b.id);
        if (
          !member ||
          member.id === u.id ||
          member.id === managedLeague.ownerId
        )
          fail("Cannot remove the league owner or your own membership here.");
        const ids = new Set(
          s.seasons
            .filter((x) => x.leagueId === managedLeague.id)
            .map((x) => x.id),
        );
        member.seasonIds = member.seasonIds.filter((id) => !ids.has(id));
        member.calendarSubscriptions = member.calendarSubscriptions?.filter(
          (sub) => !ids.has(sub.seasonId),
        );
        auditLeague(s, u, `Removed ${member.name} from this league`);
      } else if (b.action === "resetPassword") {
        const member = s.users.find((v) => v.id === b.id);
        if (!member || member.id === u.id)
          fail("Use profile settings for your own password.");
        const password = text(b.password, 1000);
        if (password.length < 12) fail("Use at least 12 characters.");
        member.password = hashPassword(password);
        member.version++;
        auditLeague(s, u, `Reset account access for ${member.name}`);
      } else if (b.action === "registration") {
        const season = s.seasons.find((x) => x.id === b.seasonId);
        if (!season || season.archived) fail("Choose an active season.");
        if (typeof b.closed !== "boolean") fail("Choose registration status.");
        season.registrationClosed = b.closed;
        auditLeague(
          s,
          u,
          `${b.closed ? "Closed" : "Opened"} registration for ${season.name}`,
        );
      } else if (b.action === "createSeason") {
        const year = Number(b.year);
        if (!Number.isInteger(year) || year < 1950 || year > 2100)
          fail("Invalid year.");
        const previous = s.seasons.find((v) => v.id === b.copyId);
        const season = {
          id: randomUUID(),
          year,
          name: text(b.name, 100) || `${year} season`,
          leagueId: managedLeague.id,
          drivers: structuredClone(previous?.drivers || []),
          constructors: structuredClone(previous?.constructors || []),
          registrationClosed: false,
          cutoff: timestamp(b.cutoff),
          archived: false,
          calendarSync: { enabled: true },
        };
        s.seasons.push(season);
        responseSeasonId = season.id;
        u.seasonIds.push(season.id);
        auditLeague(s, u, `Created ${season.name}`);
      } else if (b.action === "lineup") {
        const season = s.seasons.find((x) => x.id === b.seasonId);
        if (!season || Date.now() >= Date.parse(season.cutoff))
          fail("Season lineup is locked.");
        const drivers = b.drivers;
        if (
          !Array.isArray(drivers) ||
          drivers.length < 10 ||
          drivers.length > 40 ||
          new Set(drivers.map((d: any) => d.id)).size !== drivers.length
        )
          fail("Provide 10–40 unique drivers.");
        season.drivers = drivers.map((d: any) => ({
          replacementOnly: d.replacementOnly === true,
          id: text(d.id, 50),
          name: text(d.name, 80),
          team: text(d.team, 80),
          color: /^#[\da-f]{6}$/i.test(d.color) ? d.color : "#8BA7BD",
        }));
        season.constructors = b.constructors.map((x: any) => text(x, 80));
        auditLeague(s, u, "Updated season lineup");
      } else if (b.action === "calendarSyncSettings") {
        const season = s.seasons.find((x) => x.id === b.seasonId);
        if (!season) fail("Unknown season.");
        season.calendarSync ??= { enabled: false };
        season.calendarSync.enabled = Boolean(b.enabled);
        auditLeague(
          s,
          u,
          `${season.calendarSync.enabled ? "Enabled" : "Disabled"} daily calendar sync for ${season.name}`,
        );
      } else if (b.action === "previousYearLineup") {
        const season = s.seasons.find(
          (x) => x.id === b.seasonId && !x.archived,
        );
        if (!season || season.drivers.length)
          fail("Choose an active season with an empty lineup.");
        const imported = preparedImport!.lineup!;
        if (!imported.drivers.length)
          fail("No lineup is available for the previous year.");
        mergeImportedLineup(season, imported);
        auditLeague(
          s,
          u,
          `Imported ${season.year - 1} lineup as a starting point for ${season.name}; review drivers and teams`,
        );
      } else if (b.action === "calendarImport") {
        const season = s.seasons.find((x) => x.id === b.seasonId);
        if (!season) fail("Unknown season.");
        try {
          if (preparedImport!.error) throw preparedImport!.error;
          const imported = preparedImport!.calendar!;
          mergeImportedLineup(season, imported);
          recordCalendarSync(s, season, imported.events, u.name);
          if (!season.drivers.length)
            season.calendarSync!.message +=
              " Driver lineup is not published by Jolpica yet. Copy a lineup from another season or enter it manually.";
        } catch (error) {
          season.calendarSync ??= { enabled: false };
          season.calendarSync.lastAttempt = new Date().toISOString();
          season.calendarSync.status = "error";
          season.calendarSync.message = (error as Error).message.slice(0, 400);
        }
      } else if (b.action === "event") {
        const season = s.seasons.find((x) => x.id === b.seasonId);
        if (!season) fail("Unknown season.");
        const old = s.events.find((x) => x.id === b.id);
        const e: Event = {
          id: old?.id || randomUUID(),
          seasonId: season.id,
          name: text(b.name, 100),
          circuit: text(b.circuit, 100),
          country: text(b.country, 80),
          location: old?.location,
          calendarSequence: (old?.calendarSequence || 0) + 1,
          calendarModified: new Date().toISOString(),
          practice: timestamp(b.practice),
          practice2:
            b.practice2 === undefined
              ? old?.practice2
              : b.practice2
                ? timestamp(b.practice2)
                : undefined,
          practice3:
            b.practice3 === undefined
              ? old?.practice3
              : b.practice3
                ? timestamp(b.practice3)
                : undefined,
          qualifying: timestamp(b.qualifying),
          race: timestamp(b.race),
          sprintQualifying: b.sprintQualifying
            ? timestamp(b.sprintQualifying)
            : undefined,
          sprintRace: b.sprintRace ? timestamp(b.sprintRace) : undefined,
          practiceRound: Boolean(old?.practiceRound ?? b.practiceRound),
          length: text(b.length || "", 20),
          laps: Number(b.laps) || 0,
          photo: old?.photo || "",
          credit: old?.credit || "",
          focal: old?.focal ?? 50,
          gp: old?.gp,
          sprint: old?.sprint,
          gpDraft: old?.gpDraft,
          sprintDraft: old?.sprintDraft,
          lockedGp: old
            ? Boolean(old.lockedGp) ||
              (Boolean(cutoff(old, "gp")) && locked(old, "gp"))
            : false,
          lockedSprint: old
            ? Boolean(old.lockedSprint) ||
              (Boolean(cutoff(old, "sprint")) && locked(old, "sprint"))
            : false,
          gpDeadline:
            old && cutoff(old, "gp") && locked(old, "gp")
              ? cutoff(old, "gp")
              : undefined,
          sprintDeadline:
            old && cutoff(old, "sprint") && locked(old, "sprint")
              ? cutoff(old, "sprint")
              : undefined,
          providerCircuitId: old?.providerCircuitId,
          providerRound: old?.providerRound,
          raceDate: old?.raceDate,
          hasSprint: Boolean(b.sprintQualifying),
          calendarOverride:
            Boolean(old?.providerCircuitId) && Boolean(b.calendarOverride),
          calendarReview: old?.calendarReview,
        };
        if (!e.name) fail("Enter an event name.");
        if (Boolean(e.sprintQualifying) !== Boolean(e.sprintRace))
          fail("Enter both Sprint times.");
        if (
          old?.sprintQualifying &&
          !e.sprintQualifying &&
          (old.lockedSprint ||
            s.entries.some((x) => x.eventId === old.id && x.kind === "sprint"))
        )
          fail("Cannot remove a Sprint after predictions exist or lock.");
        if (old) {
          s.events[s.events.indexOf(old)] = e;
        } else s.events.push(e);
        if (Date.now() < Date.parse(season.cutoff)) {
          const first = s.events
            .filter((x) => x.seasonId === season.id && !x.practiceRound)
            .sort((a, b) => Date.parse(a.practice) - Date.parse(b.practice))[0];
          if (first)
            season.cutoff = cutoff(
              first,
              first.sprintQualifying ? "sprint" : "gp",
            );
        }
        auditLeague(s, u, `Updated schedule: ${e.name}`);
      } else if (b.action === "resultsImport") {
        const e = s.events.find((x) => x.id === b.eventId),
          season = s.seasons.find((x) => x.id === e?.seasonId);
        if (!e || !season) fail("Unknown event.");
        const round = e.providerRound || Number(e.id.split("-").at(-1));
        if (!Number.isInteger(round))
          fail(
            "Automatic imports require an event imported from the calendar.",
          );
        const kind: "gp" | "sprint" = b.kind === "sprint" ? "sprint" : "gp";
        const imported = preparedImport!.results!;
        return {
          imported: {
            ...imported,
            provenance: {
              source: "Jolpica F1 API",
              fetchedAt: new Date().toISOString(),
            },
          },
          note: "Confirm retirement, Driver of the Day and any missing fields before publishing.",
        };
      } else if (b.action === "results") {
        const e = s.events.find((x) => x.id === b.eventId);
        if (!e) fail("Unknown event.");
        const kind: "gp" | "sprint" = b.kind === "sprint" ? "sprint" : "gp";
        if (kind === "sprint" && !e.sprintQualifying)
          fail("No Sprint for this event.");
        const r = b.result as Result;
        const ids = s.seasons
          .find((x) => x.id === e.seasonId)!
          .drivers.map((d) => d.id);
        if (
          !r ||
          !Array.isArray(r.order) ||
          !Array.isArray(r.retirements) ||
          !Array.isArray(r.voids) ||
          r.voids.some(
            (x) =>
              ![
                "order",
                "podium",
                "pole",
                "fastest",
                "retirement",
                "dotd",
              ].includes(x),
          )
        )
          fail("Invalid results.");
        if (
          r.order.some((x) => x && !ids.includes(x)) ||
          new Set(r.order.filter(Boolean)).size !==
            r.order.filter(Boolean).length ||
          [r.pole, r.fastest, r.dotd].some((x) => x && !ids.includes(x)) ||
          r.retirements.some((x) => x !== "none" && !ids.includes(x)) ||
          (r.retirements.includes("none") && r.retirements.length > 1)
        )
          fail("Use valid, unique drivers.");
        if (r.voids.includes("order") && !r.voids.includes("podium"))
          r.voids.push("podium");
        if (r.published) {
          if (!locked(e, kind)) fail("Cannot publish before predictions lock.");
          if (
            !r.voids.includes("order") &&
            (r.order.length !== (kind === "gp" ? 10 : 8) ||
              r.order.some((x) => !x))
          )
            fail("Complete finishing positions or mark the category void.");
          for (const key of [
            "pole",
            "fastest",
            "retirement",
            ...(kind === "gp" ? ["dotd"] : []),
          ])
            if (
              !r.voids.includes(key) &&
              !(key === "retirement" ? r.retirements.length : r[key as "pole"])
            )
              fail(`Confirm ${key} or mark it void.`);
        }
        const nextResult: Result = {
          replacements: e.replacements?.filter((rule) => rule.kind === kind),
          provenance: {
            ...(r.provenance || { source: "Organiser entry" }),
            ...(r.published
              ? { confirmedAt: new Date().toISOString(), confirmedBy: u.name }
              : {}),
          },
          order: r.order,
          pole: r.pole || "",
          fastest: r.fastest || "",
          retirements: r.retirements,
          dotd: r.dotd || "",
          voids: r.voids,
          published: Boolean(r.published),
        };
        recordCorrection(
          s,
          e,
          kind,
          nextResult,
          u.name,
          text(b.reason || "", 300),
        );
        e[r.published ? kind : kind === "gp" ? "gpDraft" : "sprintDraft"] =
          nextResult;
        if (r.published) delete e[kind === "gp" ? "gpDraft" : "sprintDraft"];
        auditLeague(
          s,
          u,
          `${r.published ? "Published" : "Saved draft"} ${kind} results: ${e.name}. ${text(b.reason || "", 300)}`,
        );
      } else if (b.action === "champions") {
        const season = s.seasons.find((x) => x.id === b.seasonId);
        if (
          !season ||
          !season.drivers.some((d) => d.id === b.driver) ||
          !season.constructors.includes(b.constructor)
        )
          fail("Select valid champions.");
        const final = s.events
          .filter((e) => e.seasonId === season.id && !e.practiceRound)
          .sort((a, b) => Date.parse(b.race) - Date.parse(a.race))[0];
        if (!final || Date.now() < Date.parse(final.race))
          fail("Award championship points only after the final race.");
        season.champions = { driver: b.driver, constructor: b.constructor };
        auditLeague(s, u, `Confirmed champions for ${season.name}`);
      } else if (b.action === "archive") {
        const season = s.seasons.find((x) => x.id === b.seasonId);
        if (!season) fail("Unknown season.");
        season.archived = Boolean(b.archived);
        auditLeague(
          s,
          u,
          `${season.archived ? "Archived" : "Reopened"} ${season.name}`,
        );
      } else if (b.action === "deleteArchivedSeason") {
        const season = s.seasons.find(
          (season) => season.id === b.seasonId && season.archived,
        );
        if (!season) fail("Select an archived season.");
        if (
          typeof b.confirmation !== "string" ||
          !seasonNameMatches(b.confirmation, season.name)
        )
          fail("Type the season name to confirm.");
        try {
          await createBackup(s);
        } catch (error) {
          fail(`Deletion cancelled: ${(error as Error).message}`);
        }
        deleteArchivedSeasons(s, [season.id]);
        auditLeague(s, u, `Deleted archived season: ${season.name}`);
      } else if (b.action === "purgeSeason") {
        const season = s.seasons.find((season) => season.id === b.seasonId);
        if (!season) fail("Unknown season.");
        if (
          typeof b.confirmation !== "string" ||
          !seasonNameMatches(b.confirmation, season.name)
        )
          fail("Type the season name to confirm.");
        try {
          await createBackup(s);
        } catch (error) {
          fail(`Deletion cancelled: ${(error as Error).message}`);
        }
        purgeSeason(s, season.id);
        auditLeague(s, u, `Purged season: ${season.name}`);
      } else if (
        b.action === "deleteSeasons" ||
        b.action === "purgeSeasonData"
      ) {
        const phrase =
          b.action === "deleteSeasons"
            ? "DELETE ARCHIVED SEASONS"
            : "PURGE SEASON DATA";
        if (b.confirmation !== phrase) fail(`Type ${phrase} to confirm.`);
        const ids: string[] = b.seasonIds;
        if (b.action === "deleteSeasons") {
          if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string"))
            fail("Select archived seasons only.");
          try {
            deleteArchivedSeasons(structuredClone(s), ids);
          } catch (error) {
            fail((error as Error).message);
          }
        }
        try {
          await createBackup(s);
        } catch (error) {
          fail(`Deletion cancelled: ${(error as Error).message}`);
        }
        if (b.action === "deleteSeasons") {
          const names = s.seasons
            .filter((season) => ids.includes(season.id))
            .map((season) => season.name);
          deleteArchivedSeasons(s, ids);
          auditLeague(s, u, `Deleted archived seasons: ${names.join(", ")}`);
        } else {
          purgeSeasonData(s);
          auditLeague(
            s,
            u,
            "Purged all season and prediction data; accounts, settings and banner files retained",
          );
        }
      } else if (b.action === "export") {
        auditLeague(s, u, "Exported league data");
        const exported = structuredClone(s) as any;
        exported.users.forEach((x: any) => {
          delete x.password;
          delete x.version;
          delete x.passkeys;
          delete x.calendarSubscriptions;
        });
        delete exported.passkeyChallenges;
        delete exported.push;
        exported.settings.invite = "";
        exported.leagues?.forEach((league: any) => {
          if (league.settings) league.settings.invite = "";
        });
        return { export: exported };
      } else fail("Unknown action.");
      return view(s, u, req, responseSeasonId);
    });
    if (pushTest) await sendPushTest(pushTest);
    const result = versioned(await decorateImages(data));
    const response = NextResponse.json(
      mutationResponse(before, result, req.headers.get("x-apex-base-version")),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
    if ("passkeyError" in data || "backupError" in data)
      return NextResponse.json(data, { status: 400 });
    if (passkeyChallengeCookie)
      response.cookies.set("apex_passkey", passkeyChallengeCookie, {
        httpOnly: true,
        secure: expected.startsWith("https://"),
        sameSite: "strict",
        maxAge: 300,
        path: "/",
      });
    if (cookie)
      response.cookies.set("apex_session", cookie, {
        httpOnly: true,
        secure: process.env.APP_URL?.startsWith("https://"),
        sameSite: "lax",
        maxAge: 604800,
        path: "/",
      });
    if (logout) response.cookies.delete("apex_session");
    if (demoCookie)
      response.cookies.set("apex_demo", demoCookie, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    return response;
  } catch (e) {
    return error(e);
  }
}
