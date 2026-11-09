import type { Driver, Event, Season, State } from "./model";
import type { Replacement } from "./enhancements";
import { predictionDrivers } from "./season-controls";
import { fetchFIAEntryList, fiaDocumentURL, driverIdentity, teamIdentity, localRaceTimestamp, type FIAEntryList } from "./fia-entry-list";
import { eventSessions } from "./openf1";

export async function fetchOfficialLineup(season: Season, event: Event) {
  let offset = event.raceGmtOffset;
  if (!offset) {
    // Older calendars did not retain the circuit's UTC offset (e.g. Saturday in Las Vegas).
    try {
      const { race } = await eventSessions(season, event, "gp", false);
      if (Math.abs(Date.parse(race.date_start) - Date.parse(event.race)) < 3 * 86400000)
        offset = race.gmt_offset;
    } catch {
      // FIA still validates the exact event, season and date. Never substitute a prior weekend.
    }
  }
  return fetchFIAEntryList(season.year, event.name, event.race, { gmtOffset: offset });
}

/** Build everything before mutating state. Missing/ambiguous seats never partially update a league. */
export function planOfficialLineup(s: State, season: Season, event: Event, kind: "gp" | "sprint", list: FIAEntryList) {
  fiaDocumentURL(list.url);
  const at = localRaceTimestamp(event.race, list.gmtOffset);
  if (list.year !== season.year || driverIdentity(list.eventName) !== driverIdentity(event.name) ||
      !Number.isFinite(at) || at < Date.parse(list.startsOn + "T00:00:00Z") ||
      at >= Date.parse(list.endsOn + "T00:00:00Z") + 86400000 ||
      !Number.isFinite(Date.parse(list.startsOn)) || !Number.isFinite(Date.parse(list.endsOn)))
    throw new Error("The FIA entry list does not match this race weekend.");
  if (season.archived || event.practiceRound || event[kind]?.published)
    throw new Error("Choose an active, unpublished session.");
  if (kind === "sprint" && (!event.sprintQualifying || Date.now() >= Date.parse(event.sprintQualifying)))
    throw new Error("Sprint has started or is unavailable; use the session replacement editor.");
  if (list.drivers.length < 20 || list.drivers.length > 24 ||
      new Set(list.drivers.map(d => driverIdentity(d.name))).size !== list.drivers.length ||
      new Set(list.drivers.map(d => d.number)).size !== list.drivers.length ||
      new Set(list.drivers.map(d => d.code)).size !== list.drivers.length)
    throw new Error("Waiting for a complete, unambiguous FIA entry list.");
  const previous = predictionDrivers(s, season, event, kind);
  const additions: Driver[] = [];
  const drivers = list.drivers.map(row => {
    const matches = season.drivers.filter(d => driverIdentity(d.name) === driverIdentity(row.name) ||
      ((d.code || d.id).toUpperCase() === row.code.toUpperCase() &&
        driverIdentity(d.name.split(/\s+/).at(-1)!) === driverIdentity(row.name.split(/\s+/).at(-1)!)));
    if (matches.length > 1) throw new Error("Driver identity is ambiguous; use the replacement editor.");
    const known = matches[0];
    if (known) {
      if (teamIdentity(known.team) !== teamIdentity(row.team)) throw new Error("Driver team transfers need organiser review.");
      return known;
    }
    if (season.drivers.some(d => (d.code || d.id).toUpperCase() === row.code.toUpperCase()))
      throw new Error("FIA driver name and saved driver code disagree; organiser review required.");
    const team = previous.filter(d => teamIdentity(d.team) === teamIdentity(row.team));
    if (team.length !== 2) throw new Error("FIA team seats do not match the saved lineup; review the season lineup.");
    const id = `openf1-${driverIdentity(row.name)}`;
    if (season.drivers.some(d => d.id === id)) throw new Error("New driver identity conflicts with a saved driver.");
    const added: Driver = { id, providerDriverId: id, code: row.code, name: row.name, team: team[0].team, color: team[0].color, replacementOnly: true };
    additions.push(added);
    return added;
  });
  const teams = new Set(previous.map(d => teamIdentity(d.team)));
  if (new Set(drivers.map(d => d.id)).size !== drivers.length ||
      new Set(drivers.map(d => teamIdentity(d.team))).size !== teams.size ||
      [...teams].some(team => previous.filter(d => teamIdentity(d.team) === team).length !== 2 ||
        drivers.filter(d => teamIdentity(d.team) === team).length !== 2))
    throw new Error("FIA team seats do not match the saved lineup; review the season lineup.");
  const rules: Replacement[] = [];
  for (const team of teams) {
    const before = previous.filter(d => teamIdentity(d.team) === team);
    const after = drivers.filter(d => teamIdentity(d.team) === team);
    const removed = before.filter(d => !after.some(a => a.id === d.id));
    const added = after.filter(d => !before.some(a => a.id === d.id));
    if (!removed.length && !added.length) continue;
    if (removed.length !== 1 || added.length !== 1) throw new Error("Multiple changed seats need organiser review.");
    const from = removed[0], to = added[0];
    if (previous.some(d => d.id === to.id)) throw new Error("Driver team transfers need organiser review.");
    const overlapping = (event.replacements || []).filter(r => r.kind === kind &&
      [r.from, r.to].some(id => id === from.id || id === to.id));
    if (overlapping.some(r => r.from !== from.id || r.to !== to.id))
      throw new Error("A confirmed replacement changed; use the session replacement editor.");
    if (!overlapping.length) rules.push({ from: from.id, to: to.id, kind, policy: "carry", source: "automatic",
      note: "Confirmed by an organiser refresh from the FIA weekend entry list.",
      official: { source: "fia", url: list.url, team: from.team, fromName: from.name, toName: to.name,
        year: list.year, startsOn: list.startsOn, endsOn: list.endsOn, gmtOffset: list.gmtOffset,
        code: to.code, driverNumber: list.drivers.find(d => driverIdentity(d.name) === driverIdentity(to.name))!.number,
        ...(event.openf1MeetingKey ? { meetingKey: event.openf1MeetingKey } : {}) } });
  }
  if (season.drivers.length + additions.length > 40) throw new Error("Driver limit needs organiser review.");
  return { drivers, additions, rules, source: list.url };
}

export function applyOfficialLineup(season: Season, event: Event, kind: "gp" | "sprint", plan: ReturnType<typeof planOfficialLineup>, now = new Date().toISOString()) {
  season.drivers.push(...plan.additions);
  event.replacements = [...(event.replacements || []), ...plan.rules];
  const draft = kind === "gp" ? event.gpDraft : event.sprintDraft;
  if (draft) draft.replacements = event.replacements.filter(r => r.kind === kind);
  event.driverLineups ??= {};
  event.driverLineups[kind] = { ids: plan.drivers.map(d => d.id), source: plan.source, refreshedAt: now };
  event.lineupSync = { kind, lastAttempt: now, status: "updated", message: `FIA lineup refreshed: ${plan.drivers.length} drivers. New replacements: ${plan.rules.length}.` };
}
