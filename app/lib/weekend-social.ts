import { mappedPicks } from "./enhancements";
import { score, standings, type Driver, type Event, type Picks, type State } from "./model";

export function driverCode(driver: Driver) {
  if (/^[A-Z]{3}$/i.test(driver.code || "")) return driver.code!.toUpperCase();
  if (/^[A-Z]{3}$/.test(driver.id)) return driver.id;
  const special: Record<string, string> = { zhou: "ZHO", zhou_guanyu: "ZHO", de_vries: "DEV" };
  return special[driver.id] || driver.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().split(/\s+/).at(-1)!.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "???";
}

export const predictionColumns = (kind: "gp" | "sprint") => [
  ...Array.from({ length: kind === "gp" ? 10 : 8 }, (_, i) => ({ label: `P${i + 1}`, short: `P${i + 1}`, pick: (p: Picks) => p.order[i] || "" })),
  { label: "Pole position", short: "POLE", pick: (p: Picks) => p.pole },
  { label: "Fastest lap", short: "FL", pick: (p: Picks) => p.fastest },
  { label: "First retirement", short: "OUT", pick: (p: Picks) => p.retirement },
  ...(kind === "gp" ? [{ label: "Driver of the Day", short: "DOTD", pick: (p: Picks) => p.dotd }] : []),
];

export type BoldPick = { userId: string; name: string; kind: "gp" | "sprint"; label: string; driverId: string; supporters: number; total: number };
export function weekendAwards(s: State, e: Event) {
  const members = s.users.filter(u => u.seasonIds.includes(e.seasonId));
  const kinds = ["gp", ...(e.hasSprint || e.sprintQualifying || e.sprintRace ? ["sprint"] : [])] as ("gp" | "sprint")[];
  const ready = !e.practiceRound && kinds.every(kind => e[kind]?.published);
  const empty = { ready, practice: e.practiceRound, bold: [] as BoldPick[], podiums: [] as string[], comeback: [] as string[], places: 0 };
  if (!ready) return empty;
  const bold: BoldPick[] = [];
  const podiums: string[] = [];
  for (const kind of kinds) {
    const entries = members.flatMap(user => {
      const entry = s.entries.find(p => p.eventId === e.id && p.kind === kind && p.userId === user.id && p.submitted);
      if (!entry) return [];
      const result = e[kind]!;
      const picks = mappedPicks(entry.picks, result.replacements?.filter(r => r.kind === kind));
      return [{ user, picks, scored: score(entry.picks, result, kind) }];
    });
    for (const entry of entries) {
      if (kind === "gp" && entry.scored.details.some(d => d.label === "Exact podium bonus" && d.points > 0)) podiums.push(entry.user.name);
      for (const column of predictionColumns(kind)) {
        if (!entry.scored.details.some(d => d.label === column.label && d.status === "correct")) continue;
        const driverId = column.pick(entry.picks);
        const supporters = entries.filter(other => column.pick(other.picks) === driverId).length;
        // An uncontested or unanimous selection is not a bold pick.
        if (entries.length < 2 || supporters === entries.length) continue;
        bold.push({ userId: entry.user.id, name: entry.user.name, kind, label: column.label, driverId, supporters, total: entries.length });
      }
    }
  }
  const lowest = Math.min(...bold.map(p => p.supporters / p.total));
  const winners = bold.filter(p => Math.abs(p.supporters / p.total - lowest) < 1e-9);
  const time = Date.parse(e.race || e.raceDate || "");
  const earlier = s.events.filter(other => other.seasonId === e.seasonId && !other.practiceRound && other.id !== e.id && Date.parse(other.race || other.raceDate || "") < time);
  let comeback: string[] = [], places = 0;
  if (earlier.some(other => other.gp?.published || other.sprint?.published)) {
    const base = { ...s, seasons: s.seasons.map(season => ({ ...season, champions: undefined })) };
    const before = standings({ ...base, events: earlier }, e.seasonId);
    const after = standings({ ...base, events: [...earlier, e] }, e.seasonId);
    const changes = after.map(row => ({ name: row.name, places: (before.find(p => p.id === row.id)?.rank ?? row.rank) - row.rank }));
    places = Math.max(0, ...changes.map(row => row.places));
    comeback = changes.filter(row => places > 0 && row.places === places).map(row => row.name);
  }
  return { ready, practice: false, bold: winners, podiums, comeback, places };
}
