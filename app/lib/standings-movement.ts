import { standings, type State } from "./model";
/** Compare current standings with the previous fully published GP weekend. */
export function standingsMovement(
  s: State,
  seasonId: string,
): Record<string, number> {
  const completed = s.events
    .filter(
      (e) => e.seasonId === seasonId && !e.practiceRound && e.gp?.published,
    )
    .sort(
      (a, b) =>
        Date.parse(a.raceDate || a.race) - Date.parse(b.raceDate || b.race) ||
        a.id.localeCompare(b.id),
    );
  if (completed.length < 2) return {};
  const past = new Set(completed.slice(0, -1).map((e) => e.id));
  const baseline = standings(
    {
      ...s,
      events: s.events.filter((e) => e.seasonId !== seasonId || past.has(e.id)),
      seasons: s.seasons.map((season) =>
        season.id === seasonId ? { ...season, champions: undefined } : season,
      ),
    },
    seasonId,
  );
  return Object.fromEntries(
    standings(s, seasonId).map((row) => [
      row.id,
      (baseline.find((p) => p.id === row.id)?.rank ?? row.rank) - row.rank,
    ]),
  );
}
