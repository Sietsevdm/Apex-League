import { locked, standings, type State, type Season, type User } from "./model";
export type ResponseContext = {
  scope: "season" | "archive" | "admin";
  seasonId?: string;
};
export function scopedState(s: State, user: User, context: ResponseContext) {
  const selected =
    s.seasons.find((season) => season.id === context.seasonId) ||
    s.seasons.filter((season) => !season.archived).at(-1) ||
    s.seasons.at(-1);
  const events =
    context.scope === "archive"
      ? []
      : s.events.filter((event) => event.seasonId === selected?.id);
  const eventIds = new Set(events.map((event) => event.id));
  const metadata = (season: Season): Season => ({
    id: season.id,
    year: season.year,
    name: season.name,
    cutoff: season.cutoff,
    archived: season.archived,
    registrationClosed: season.registrationClosed,
    drivers: [],
    constructors: [],
  });
  let summaries: Record<string, { leaders: string; total: number }> | undefined;
  if (context.scope === "archive") {
    const publicResults = {
      ...s,
      events: s.events.map((event) => ({
        ...event,
        gp: event.gp?.published ? event.gp : undefined,
        sprint: event.sprint?.published ? event.sprint : undefined,
      })),
      entries: s.entries.filter(
        (entry) =>
          entry.userId === user.id ||
          (entry.submitted &&
            s.events.some(
              (event) =>
                event.id === entry.eventId && locked(event, entry.kind),
            )),
      ),
      championPicks: s.championPicks.filter(
        (pick) =>
          pick.userId === user.id ||
          s.seasons.some(
            (season) =>
              season.id === pick.seasonId &&
              Date.now() >= Date.parse(season.cutoff),
          ),
      ),
    };
    summaries = Object.fromEntries(
      s.seasons.map((season) => {
        const rows = standings(publicResults, season.id);
        return [
          season.id,
          {
            leaders: rows
              .filter((row) => row.rank === 1)
              .map((row) => row.name)
              .join(" & "),
            total: rows[0]?.total || 0,
          },
        ];
      }),
    );
  }
  return {
    context: { scope: context.scope, seasonId: selected?.id },
    summaries,
    state: {
      ...s,
      seasons: s.seasons.map((season) =>
        season.id === selected?.id && context.scope !== "archive"
          ? season
          : metadata(season),
      ),
      events,
      entries: s.entries.filter((entry) => eventIds.has(entry.eventId)),
      championPicks:
        context.scope === "archive"
          ? []
          : s.championPicks.filter((pick) => pick.seasonId === selected?.id),
      resultCorrections: s.resultCorrections?.filter(correction => eventIds.has(correction.eventId)),
      receipts: s.receipts?.filter(
        (receipt) =>
          eventIds.has(receipt.eventId) && receipt.userId === user.id,
      ),
      settings: { ...s.settings, savedBannerPhotos: undefined },
      audit: context.scope === "admin" && user.role === "admin" ? s.audit : [],
      passkeyChallenges: undefined,
      backupHealth:
        context.scope === "admin" && user.role === "admin"
          ? s.backupHealth
          : undefined,
    } satisfies State,
  };
}
