import type { Driver, Event, Season, State } from "./model";
import type { Replacement } from "./enhancements";
import { predictionDrivers } from "./season-controls";
import { fetchFIAEntryList, fiaDocumentURL, driverIdentity, teamIdentity, localRaceTimestamp, FIAEntryListUnavailable, type FIAEntryList } from "./fia-entry-list";
import { eventSessions } from "./openf1";
import { fetchFormula1Roster, formula1RosterURL, type Formula1Roster } from "./formula1-roster";

type SessionKind = "gp" | "sprint";
type OfficialLineup = FIAEntryList | Formula1Roster;

function upcomingSession(event: Event, kind: SessionKind) {
  return Date.parse(kind === "gp" ? event.qualifying : event.sprintQualifying || "") > Date.now();
}

export async function fetchOfficialLineup(season: Season, event: Event, kind: SessionKind) {
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
  try {
    return await fetchFIAEntryList(season.year, event.name, event.race, { gmtOffset: offset });
  } catch (error) {
    if (!(error instanceof FIAEntryListUnavailable) || !upcomingSession(event, kind)) throw error;
    try {
      return await fetchFormula1Roster(season.year);
    } catch {
      throw new FIAEntryListUnavailable("No verified FIA entry list is available for this weekend yet. Formula 1's current roster could not be verified. The saved lineup is unchanged.");
    }
  }
}

/** Build everything before mutating state. Missing/ambiguous seats never partially update a league. */
export function planOfficialLineup(s: State, season: Season, event: Event, kind: SessionKind, list: OfficialLineup) {
  const fia = "eventName" in list ? list : undefined;
  if (fia) {
    fiaDocumentURL(fia.url);
    const at = localRaceTimestamp(event.race, fia.gmtOffset);
    if (fia.year !== season.year || driverIdentity(fia.eventName) !== driverIdentity(event.name) ||
        !Number.isFinite(at) || at < Date.parse(fia.startsOn + "T00:00:00Z") ||
        at >= Date.parse(fia.endsOn + "T00:00:00Z") + 86400000 ||
        !Number.isFinite(Date.parse(fia.startsOn)) || !Number.isFinite(Date.parse(fia.endsOn)))
      throw new Error("The FIA entry list does not match this race weekend.");
  } else if (list.url !== formula1RosterURL || list.year !== season.year || !upcomingSession(event, kind)) {
    throw new Error("Formula 1's current roster can only refresh an upcoming session in the same season.");
  }
  if (season.archived || event.practiceRound || event[kind]?.published)
    throw new Error("Choose an active, unpublished session.");
  if (kind === "sprint" && (!event.sprintQualifying || Date.now() >= Date.parse(event.sprintQualifying)))
    throw new Error("Sprint has started or is unavailable; use the session replacement editor.");
  if (list.drivers.length < 20 || list.drivers.length > 24 ||
      new Set(list.drivers.map(d => driverIdentity(d.name))).size !== list.drivers.length ||
      (fia && (new Set(fia.drivers.map(d => d.number)).size !== fia.drivers.length ||
        new Set(fia.drivers.map(d => d.code)).size !== fia.drivers.length)))
    throw new Error("Waiting for a complete, unambiguous official lineup.");
  const previous = predictionDrivers(s, season, event, kind);
  const additions: Driver[] = [];
  const drivers = list.drivers.map(row => {
    const matches = season.drivers.filter(d => driverIdentity(d.name) === driverIdentity(row.name) ||
      (row.code && (d.code || d.id).toUpperCase() === row.code.toUpperCase() &&
        driverIdentity(d.name.split(/\s+/).at(-1)!) === driverIdentity(row.name.split(/\s+/).at(-1)!)));
    if (matches.length > 1) throw new Error("Driver identity is ambiguous; use the replacement editor.");
    const known = matches[0];
    if (known) {
      if (teamIdentity(known.team) !== teamIdentity(row.team)) throw new Error("Driver team transfers need organiser review.");
      return known;
    }
    if (row.code && season.drivers.some(d => (d.code || d.id).toUpperCase() === row.code?.toUpperCase()))
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
      note: fia ? "Confirmed by an organiser refresh from the FIA weekend entry list."
        : "Applied from Formula 1's current roster for this upcoming session.",
      ...(fia ? { official: { source: "fia", url: fia.url, team: from.team, fromName: from.name, toName: to.name,
        year: fia.year, startsOn: fia.startsOn, endsOn: fia.endsOn, gmtOffset: fia.gmtOffset,
        code: to.code, driverNumber: fia.drivers.find(d => driverIdentity(d.name) === driverIdentity(to.name))!.number,
        ...(event.openf1MeetingKey ? { meetingKey: event.openf1MeetingKey } : {}) } } : {}) });
  }
  if (season.drivers.length + additions.length > 40) throw new Error("Driver limit needs organiser review.");
  return { drivers, additions, rules, source: list.url, sourceName: fia ? "FIA" : "Formula 1" };
}

export function applyOfficialLineup(season: Season, event: Event, kind: "gp" | "sprint", plan: ReturnType<typeof planOfficialLineup>, now = new Date().toISOString()) {
  season.drivers.push(...plan.additions);
  event.replacements = [...(event.replacements || []), ...plan.rules];
  const draft = kind === "gp" ? event.gpDraft : event.sprintDraft;
  if (draft) draft.replacements = event.replacements.filter(r => r.kind === kind);
  event.driverLineups ??= {};
  event.driverLineups[kind] = { ids: plan.drivers.map(d => d.id), source: plan.source, refreshedAt: now };
  const changes = plan.rules.map(rule => `${season.drivers.find(d => d.id === rule.from)?.name} → ${season.drivers.find(d => d.id === rule.to)?.name}`).join(", ");
  event.lineupSync = { kind, lastAttempt: now, status: "updated", message: `${plan.sourceName} lineup refreshed: ${plan.drivers.length} drivers. New replacements: ${plan.rules.length}.${changes ? ` ${changes}` : ""}` };
}
