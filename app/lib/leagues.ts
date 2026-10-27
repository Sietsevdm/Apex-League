import type { State, User } from "./model";
export const DEFAULT_LEAGUE = "default";
function deny(message = "You can only manage leagues you created."): never {
  throw Object.assign(new Error(message), { status: 403 });
}
/** Existing admin accounts keep their site-wide access. No legacy account is promoted. */
export function migrateLeagues(s: State) {
  if (!s.leagues?.length)
    s.leagues = [
      {
        id: DEFAULT_LEAGUE,
        name: s.settings.name,
        ownerId: s.users.find((u) => u.active && u.role === "admin")?.id || "",
      },
    ];
  const fallback = s.leagues[0].id;
  for (const season of s.seasons) season.leagueId ||= fallback;
  if (!s.leagues[0].ownerId)
    s.leagues[0].ownerId =
      s.users.find((u) => u.active && u.role === "admin")?.id || "";
}
export function canManageLeague(s: State, user: User, id: string) {
  return (
    user.role === "admin" ||
    (user.role === "organiser" &&
      s.leagues?.some((l) => l.id === id && l.ownerId === user.id)) ||
    false
  );
}
export function canManageSeason(s: State, user: User, seasonId?: string) {
  const season = s.seasons.find((x) => x.id === seasonId);
  return Boolean(
    season &&
    canManageLeague(
      s,
      user,
      season.leagueId || s.leagues?.[0]?.id || DEFAULT_LEAGUE,
    ),
  );
}
export function accessibleLeagues(s: State, user: User) {
  migrateLeagues(s);
  return s.leagues!.filter(
    (l) =>
      canManageLeague(s, user, l.id) ||
      s.seasons.some(
        (season) =>
          season.leagueId === l.id && user.seasonIds.includes(season.id),
      ),
  );
}
export function selectLeague(
  s: State,
  user: User,
  requested?: string,
  seasonId?: string,
) {
  const leagues = accessibleLeagues(s, user);
  const bySeason = s.seasons.find((x) => x.id === seasonId)?.leagueId;
  const id = requested || bySeason;
  if (id && !leagues.some((l) => l.id === id))
    deny("This league is unavailable to your account.");
  return (
    leagues.find((l) => l.id === id) ||
    leagues.find((l) => l.ownerId === user.id) ||
    leagues[0]
  );
}
export function leagueSettings(s: State, leagueId?: string) {
  return s.leagues?.find((l) => l.id === leagueId)?.settings || s.settings;
}
/** Isolate league data before season projections and existing prediction-privacy filtering. */
export function leagueView(
  s: State,
  user: User,
  requested?: string,
  seasonId?: string,
): State {
  const league = selectLeague(s, user, requested, seasonId);
  const seasons = s.seasons.filter((x) => x.leagueId === league?.id);
  const seasonIds = new Set(seasons.map((x) => x.id));
  const events = s.events.filter((x) => seasonIds.has(x.seasonId));
  const eventIds = new Set(events.map((x) => x.id));
  return {
    ...s,
    selectedLeagueId: league?.id,
    leagues: accessibleLeagues(s, user).map(({ settings, ...l }) => ({
      ...l,
      name: leagueSettings(s, l.id).name,
    })),
    settings: leagueSettings(s, league?.id),
    seasons,
    events,
    users: s.users
      .filter(
        (u) =>
          user.role === "admin" ||
          u.id === user.id ||
          u.id === league?.ownerId ||
          u.seasonIds.some((id) => seasonIds.has(id)),
      )
      .map((u) =>
        user.role === "admin"
          ? u
          : { ...u, seasonIds: u.seasonIds.filter((id) => seasonIds.has(id)) },
      ),
    entries: s.entries.filter((x) => eventIds.has(x.eventId)),
    championPicks: s.championPicks.filter((x) => seasonIds.has(x.seasonId)),
    receipts: s.receipts?.filter((x) => eventIds.has(x.eventId)),
    resultCorrections: s.resultCorrections?.filter((x) =>
      seasonIds.has(x.seasonId),
    ),
    audit: s.audit.filter(
      (x) =>
        user.role === "admin" ||
        x.leagueId === league?.id ||
        (!x.leagueId && league?.id === s.leagues?.[0]?.id),
    ),
  };
}
const SITE_ACTIONS = new Set([
  "backupCreate",
  "backupList",
  "backupDownload",
  "backupRestore",
  "resetPassword",
  "deleteSeasons",
  "purgeSeasonData",
  "deleteArchivedSeason",
  "purgeSeason",
  "export",
  "loginText",
]);
export function authorizeManagement(
  s: State,
  user: User,
  body: Record<string, any>,
  requested?: string,
) {
  migrateLeagues(s);
  if (user.role !== "admin" && user.role !== "organiser")
    deny("Management access required.");
  const eventId = body.eventId || (["event", "lock"].includes(body.action) ? body.id : undefined);
  const targetSeasonId = body.seasonId || s.events.find(e => e.id === eventId)?.seasonId;
  const targetLeagueId = s.seasons.find(season => season.id === targetSeasonId)?.leagueId;
  const league = selectLeague(s, user, user.role === "admin" && targetLeagueId ? targetLeagueId : requested, targetSeasonId);
  if (!league || !canManageLeague(s, user, league.id)) deny();
  if (SITE_ACTIONS.has(body.action) && user.role !== "admin")
    deny("Site owner access required.");
  const checkSeason = (id: string) => {
    const season = s.seasons.find((x) => x.id === id);
    if (!season && user.role === "admin")
      throw Object.assign(new Error("Unknown season."), { status: 400 });
    if (
      !season ||
      (user.role !== "admin" && season.leagueId !== league.id) ||
      !canManageSeason(s, user, id)
    )
      deny();
  };
  if (body.seasonId) checkSeason(body.seasonId);
  if (body.copyId) checkSeason(body.copyId);
  if (Array.isArray(body.seasonIds)) body.seasonIds.forEach(checkSeason);
  if (eventId) {
    const event = s.events.find((x) => x.id === eventId);
    if (event) checkSeason(event.seasonId);
    else if (body.action !== "event") deny();
  }
  if (
    body.action === "member" &&
    user.role !== "admin" &&
    (body.role !== undefined ||
      body.active !== undefined ||
      body.password !== undefined)
  )
    deny("Only the site owner can change account roles or access.");
  return league;
}
