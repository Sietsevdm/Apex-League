import type { State, Season, Event } from "./model";
export function registrationOpen(season: Season) {
  return !season.archived && !(season.registrationClosed ?? (Date.now() >= Date.parse(season.cutoff)));
}
export function migrateRegistration(s: State) {
  for (const season of s.seasons) if (season.registrationClosed === undefined)
    season.registrationClosed = Date.now() >= Date.parse(season.cutoff);
}
export function predictionDrivers(s: State, season: Season, event: Event, kind: "gp" | "sprint") {
  const replacements = s.events.filter(e => e.seasonId === season.id).flatMap(e => e.replacements || []);
  const targets = new Set(replacements.map(r => r.to));
  const confirmed = new Set((event.replacements || []).filter(r => r.kind === kind).map(r => r.to));
  return season.drivers.filter(d => (!d.replacementOnly && !targets.has(d.id)) || confirmed.has(d.id));
}
