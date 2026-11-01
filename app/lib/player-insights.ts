import { predictionsVisible, score, standings, type Event, type State } from "./model";
import { predictionColumns } from "./weekend-social";

/** Compare against other submitted members; tied modes are not a majority. */
export function againstTheGrid(s: State, event: Event, kind: "gp" | "sprint", userId: string, now = Date.now()) {
  if (!predictionsVisible(event, kind, now)) return [];
  const members = new Set(s.users.filter(u => u.seasonIds.includes(event.seasonId)).map(u => u.id));
  const entries = s.entries.filter(p => p.eventId === event.id && p.kind === kind && p.submitted && members.has(p.userId));
  const mine = entries.find(p => p.userId === userId);
  const others = entries.filter(p => p.userId !== userId);
  if (!mine || others.length < 2) return [];
  return predictionColumns(kind).flatMap(column => {
    const counts = new Map<string, number>();
    for (const p of others) { const id = column.pick(p.picks); if (id) counts.set(id, (counts.get(id) || 0) + 1); }
    const majority = [...counts].find(([, count]) => count > others.length / 2);
    const pick = column.pick(mine.picks);
    return majority && pick && pick !== majority[0] ? [{ label: column.label, pick, majority: majority[0], supporters: majority[1], total: others.length }] : [];
  });
}

/** Recommendation is based on public championship points, never private picks. */
export function weekendRival(s: State, seasonId: string, userId: string) {
  const rows = standings(s, seasonId);
  const me = rows.find(row => row.id === userId);
  if (!me) return undefined;
  const rival = rows.filter(row => row.id !== userId).sort((a, b) =>
    Math.abs(a.total - me.total) - Math.abs(b.total - me.total) || Math.abs(a.rank - me.rank) - Math.abs(b.rank - me.rank) || a.id.localeCompare(b.id),
  )[0];
  return rival ? { ...rival, gap: Math.abs(rival.total - me.total), myRank: me.rank, myTotal: me.total } : undefined;
}

export function personalBests(s: State, seasonId: string, userId: string) {
  const events = s.events.filter(e => e.seasonId === seasonId && !e.practiceRound).sort((a, b) => Date.parse(a.race || a.raceDate || "") - Date.parse(b.race || b.raceDate || "") || a.id.localeCompare(b.id));
  const rows = events.flatMap(e => {
    const kinds = ["gp", ...(e.hasSprint || e.sprintQualifying || e.sprintRace ? ["sprint"] : [])] as ("gp" | "sprint")[];
    if (!kinds.every(kind => e[kind]?.published)) return [];
    const eligible = kinds.some(kind => (kind === "gp" ? ["order", "podium", "pole", "fastest", "retirement", "dotd"] : ["order", "pole", "fastest", "retirement"]).some(category => !e[kind]!.voids.includes(category)));
    if (!eligible) return [];
    let points = 0, exact = 0;
    for (const kind of kinds) {
      const entry = s.entries.find(p => p.userId === userId && p.eventId === e.id && p.kind === kind && p.submitted);
      if (entry) { const sc = score(entry.picks, e[kind], kind); points += sc.total; exact += sc.exact; }
    }
    return [{ id: e.id, name: e.name, points, exact }];
  });
  const record = (key: "points" | "exact") => {
    const value = Math.max(0, ...rows.map(row => row[key]));
    return { value, events: value > 0 ? rows.filter(row => row[key] === value).map(row => row.name) : [], isNew: rows.length > 1 && value > 0 && rows.at(-1)![key] > Math.max(...rows.slice(0, -1).map(row => row[key])) };
  };
  let streak = 0, longest = 0, start = "", end = "", currentStart = "", priorLongest = 0;
  for (const [i, row] of rows.entries()) {
    if (i === rows.length - 1) priorLongest = longest;
    if (row.points > 0) { if (!streak) currentStart = row.name; streak++; } else streak = 0;
    if (streak > longest) { longest = streak; start = currentStart; end = row.name; }
  }
  return { weekends: rows.length, weekend: record("points"), exact: record("exact"), streak: { value: longest, current: streak, start, end, isNew: rows.length > 1 && streak > priorLongest } };
}
