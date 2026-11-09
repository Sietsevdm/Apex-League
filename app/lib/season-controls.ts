import type { State, Season, Event } from "./model";
const identity = (name: string) => name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function registrationOpen(season: Season) {
  return !season.archived && !(season.registrationClosed ?? (Date.now() >= Date.parse(season.cutoff)));
}
export function migrateRegistration(s: State) {
  for (const season of s.seasons) if (season.registrationClosed === undefined)
    season.registrationClosed = Date.now() >= Date.parse(season.cutoff);
}
export function predictionDrivers(s: State, season: Season, event: Event, kind: "gp" | "sprint") {
  const lineup = event.driverLineups?.[kind];
  if (lineup) return season.drivers.filter(d => lineup.ids.includes(d.id));
  const excluded = new Set((event.replacements || []).filter(r => r.kind === kind).map(r => r.from));
  const replacements = s.events.filter(e => e.seasonId === season.id).flatMap(e => e.replacements || []);
  const targets = new Set(replacements.map(r => r.to));
  const confirmed = new Set((event.replacements || []).filter(r => r.kind === kind).map(r => r.to));
  return season.drivers.filter(d => !excluded.has(d.id) && ((!d.replacementOnly && !targets.has(d.id)) || confirmed.has(d.id)));
}

export function classifyImportedDrivers(season: Season, starters: string[]) {
  const known = new Set(starters);
  for (const d of season.drivers) {
    const surname=identity(d.name.split(/\s+/).at(-1) || "!");
    const family=starters.filter(id=>id.startsWith("openf1-") && id.endsWith(surname));
    if (known.has(`openf1-${identity(d.name)}`) || (family.length===1 && season.drivers.filter(other=>identity(other.name.split(/\s+/).at(-1)||"!")===surname).length===1)) known.add(d.id);
  }
  if (season.drivers.filter(d => known.has(d.id)).length < 10) return false;
  for (const driver of season.drivers) if (driver.replacementOnly === undefined)
    driver.replacementOnly = !known.has(driver.id);
  return true;
}

export function seasonNameMatches(input: string, name: string) {
  const normalize = (value: string) => value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  return Boolean(normalize(name)) && normalize(input) === normalize(name);
}

export function mergeImportedLineup(season: Season, imported: { drivers: Season["drivers"]; constructors: string[] }) {
  // Fill missing records even after the pick deadline; never replace saved IDs or manual lineups.
  if (!season.drivers.length) season.drivers = imported.drivers;
  else for (const driver of season.drivers) {
    const matches = imported.drivers.filter(d => d.id === driver.id || identity(d.name) === identity(driver.name));
    const match = matches.length === 1 ? matches[0] : undefined;
    if (!match) continue;
    if (!driver.team && match.team) driver.team = match.team;
    if (!driver.color || driver.color === "#8BA7BD") driver.color = match.color;
  }
  if (!season.constructors.length) season.constructors = imported.constructors;
}
