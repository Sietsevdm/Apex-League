import { standings, type State, type Picks } from "./model";

export function pickChanges(previous: Picks | undefined, current: Picks) {
  const fields = current.order.map((value, i) => ({
    label: `P${i + 1}`,
    before: previous?.order[i] || "",
    after: value,
  }));
  for (const key of ["pole", "fastest", "retirement", "dotd"] as const)
    fields.push({
      label: {
        pole: "Pole position",
        fastest: "Fastest lap",
        retirement: "First retirement",
        dotd: "Driver of the Day",
      }[key],
      before: previous?.[key] || "",
      after: current[key],
    });
  return fields.filter((field) => field.before !== field.after);
}

/** Recalculate each checkpoint using the same ties/replacements/voids as standings. */
export function seasonProgress(s: State, seasonId: string) {
  const season = s.seasons.find((item) => item.id === seasonId);
  if (!season) return [];
  const events = s.events
    .filter(
      (e) =>
        e.seasonId === seasonId &&
        !e.practiceRound &&
        (e.gp?.published || e.sprint?.published),
    )
    .sort(
      (a, b) =>
        Date.parse(a.raceDate || a.race) - Date.parse(b.raceDate || b.race) ||
        a.id.localeCompare(b.id),
    );
  const snapshot = (ids: Set<string>, titles: boolean) => {
    const rows = standings(
      {
        ...s,
        events: s.events.filter((e) => ids.has(e.id)),
        seasons: s.seasons.map((item) =>
          item.id === seasonId && !titles
            ? { ...item, champions: undefined }
            : item,
        ),
      },
      seasonId,
    );
    const leading = Math.max(0, ...rows.map((row) => row.total));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      rank: row.rank,
      total: row.total,
      gap: leading - row.total,
    }));
  };
  const ids = new Set<string>();
  const points = events.map((event) => {
    ids.add(event.id);
    return {
      id: event.id,
      label: event.name,
      partial: !event.gp?.published,
      rows: snapshot(ids, false),
    };
  });
  if (season.champions)
    points.push({
      id: "title-bonuses",
      label: "Championship bonuses",
      partial: false,
      rows: snapshot(ids, true),
    });
  return points;
}
