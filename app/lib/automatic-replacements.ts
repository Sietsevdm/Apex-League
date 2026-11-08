import {
  openf1,
  checkedRows,
  eventSessions,
  raceSessions,
  normal as normalize,
  type Row,
} from "./openf1";
import { randomUUID } from "node:crypto";
import type { Driver, Event, Season } from "./model";
import type { Replacement } from "./enhancements";
import { transaction } from "./store";
import { leagueSettings } from "./leagues";
import {
  fetchFIAEntryList,
  fiaDriverUpdates,
  FIAConflict,
  teamIdentity,
  driverIdentity,
  type FIAEntryList,
} from "./fia-entry-list";
import {
  applyOfficialDriverUpdates,
  fetchOfficialDriverUpdates,
  type OfficialDriverUpdate,
} from "./official-driver-updates";

type Entry = {
  session: { id: string; type: string; is_cancelled: boolean };
  round: { id: string; number: number; is_cancelled: boolean };
  driver: {
    id: string;
    given_name: string;
    family_name: string;
    abbreviation?: string;
  };
  team: { id: string; name: string; primary_color?: string };
};
type Lineups = {
  opening: Entry[];
  current: Entry[];
  qualifying?: Entry[];
  official?: OfficialDriverUpdate[];
  sourceMessage?: string;
};
const normal = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export async function fetchReplacementLineups(
  season: Season,
  event: Event,
): Promise<Lineups> {
  const { race, qualifying } = await eventSessions(season, event, "gp", false);
  const opening = (await raceSessions(season.year)).find(
    (r) => !r.is_cancelled,
  );
  if (!opening) throw new Error("Opening GP schedule is unavailable.");
  const entries = (
    rows: Row[],
    session: Row,
    round: number,
    type = "R",
  ): Entry[] => {
    return rows.map((row) => ({
      session: { id: String(session.session_key), type, is_cancelled: false },
      round: {
        id: String(session.meeting_key),
        number: round,
        is_cancelled: false,
      },
      driver: {
        id: `openf1-${normalize(`${row.first_name} ${row.last_name}`)}`,
        given_name: row.first_name,
        family_name: row.last_name,
        abbreviation: row.name_acronym,
      },
      team: {
        id: normalize(row.team_name || ""),
        name: row.team_name,
        primary_color: `#${row.team_colour}`,
      },
    }));
  };
  const read = async (session: Row) =>
    checkedRows(
      await openf1("drivers", { session_key: session.session_key }),
      session,
    );
  const first = await read(opening);
  let current = await read(race);
  const qualified =
    Date.parse(qualifying.date_end) <= Date.now()
      ? await read(qualifying)
      : undefined;
  let official: OfficialDriverUpdate[] = (event.replacements || [])
    .filter((r) => r.kind === "gp" && r.official)
    .map((r) => r.official!);
  let sourceMessage =
    "FIA entry list not available; OpenF1 checked and FIA will retry hourly.";
  let fiaList: FIAEntryList | undefined;
  try {
    const meetings = await openf1("meetings", {
      meeting_key: race.meeting_key,
    });
    if (
      meetings.length !== 1 ||
      meetings[0].year !== season.year ||
      meetings[0].meeting_key !== race.meeting_key ||
      !meetings[0].meeting_name
    )
      throw new Error("FIA meeting matching is not available.");
    const list = await fetchFIAEntryList(
      season.year,
      meetings[0].meeting_name,
      race.date_start,
      { gmtOffset: race.gmt_offset },
    );
    fiaList = list;
    // OpenF1 can have no future race roster yet. The complete FIA list can confirm it.
    if (!current.length)
      current = first.map((r) => ({
        ...r,
        session_key: race.session_key,
        meeting_key: race.meeting_key,
      }));
    official = fiaDriverUpdates(list, first, current, race.meeting_key);
    sourceMessage =
      "All teams checked against the FIA weekend entry list and OpenF1.";
  } catch (error) {
    if (error instanceof FIAConflict) throw error;
  }
  if (current.some((r) => normalize(r.team_name || "") === "haasf1team")) {
    try {
      const fresh = await fetchOfficialDriverUpdates(
        season.year,
        race.date_start,
      );
      for (const update of fresh) {
        if (
          fiaList &&
          !fiaList.drivers.some(
            (d) =>
              teamIdentity(d.team) === teamIdentity(update.team) &&
              driverIdentity(d.name) === driverIdentity(update.toName),
          )
        )
          throw new FIAConflict(
            "FIA and official team driver announcements disagree; organiser review required.",
          );
        const existing = official.find(
          (u) => normalize(u.team) === normalize(update.team),
        );
        if (
          existing &&
          (normalize(existing.fromName) !== normalize(update.fromName) ||
            normalize(existing.toName) !== normalize(update.toName))
        )
          throw new FIAConflict(
            "FIA and official team driver announcements disagree; organiser review required.",
          );
        if (!existing) official.push(update);
      }
    } catch (error) {
      if (error instanceof FIAConflict) throw error;
      // A separate source outage must not block consistent OpenF1 entries.
      if (
        !official.length &&
        !event.replacements?.some(
          (r) => r.kind === "gp" && r.source !== "automatic",
        ) &&
        qualified &&
        current.some(
          (r) =>
            !qualified.some(
              (q) =>
                normalize(`${q.first_name} ${q.last_name}`) ===
                normalize(`${r.first_name} ${r.last_name}`),
            ),
        )
      )
        throw error;
    }
  }
  const confirmed = applyOfficialDriverUpdates(
    current,
    official,
    season.year,
    race.date_start,
    qualified,
  );
  return {
    opening: entries(first, opening, 1),
    current: entries(confirmed, race, event.providerRound!),
    ...(qualified
      ? {
          qualifying: entries(qualified, qualifying, event.providerRound!, "Q"),
        }
      : {}),
    official,
    sourceMessage,
  };
}

function match(season: Season, row: Entry): Driver | undefined {
  const same = season.drivers.filter(
    (d) =>
      d.providerDriverId === row.driver.id ||
      normal(d.name) ===
        normal(`${row.driver.given_name} ${row.driver.family_name}`) ||
      (!!row.driver.abbreviation &&
        d.id.toUpperCase() === row.driver.abbreviation.toUpperCase()),
  );
  if (same.length > 1)
    throw new Error("Driver identity is ambiguous; organiser review required.");
  if (same.length) return same[0];
  const family = normal(row.driver.family_name);
  const suffix = season.drivers.filter(
    (d) => family && normal(d.name).endsWith(family),
  );
  if (suffix.length > 1)
    throw new Error("Driver identity is ambiguous; organiser review required.");
  return suffix[0];
}

/** Require complete GP entries, optionally corrected by an explicit official appointment. */
export function planReplacements(season: Season, event: Event, data: Lineups) {
  const validate = (rows: Entry[], round: number, type = "R") => {
    if (
      rows.length < 20 ||
      rows.length > 24 ||
      rows.some(
        (r) =>
          r.session?.type !== type ||
          r.session.is_cancelled ||
          r.round?.is_cancelled ||
          r.round?.number !== round ||
          !r.driver?.id ||
          !r.driver.family_name ||
          !r.driver.given_name ||
          !r.team?.id ||
          !r.team.name,
      ) ||
      new Set(rows.map((r) => r.driver.id)).size !== rows.length ||
      new Set(rows.map((r) => r.session.id)).size !== 1 ||
      new Set(rows.map((r) => r.round.id)).size !== 1
    )
      throw new Error(
        "Waiting for a complete, unambiguous GP race entry list.",
      );
    const teams = new Map<string, Entry[]>();
    for (const row of rows)
      teams.set(row.team.id, [...(teams.get(row.team.id) || []), row]);
    if ([...teams.values()].some((r) => r.length !== 2))
      throw new Error("Team seats need organiser review.");
    return teams;
  };
  const opening = validate(data.opening, 1),
    current = validate(data.current, event.providerRound!);
  // A full race list can be an old template. Completed qualifying exposes a changed seat.
  // It is a conflict signal, never independent permission to carry GP picks.
  if (data.qualifying) {
    const qualified = validate(data.qualifying, event.providerRound!, "Q");
    if (
      qualified.size !== current.size ||
      [...current.keys()].some((team) => !qualified.has(team))
    )
      throw new Error(
        "OpenF1 race and qualifying teams disagree; organiser review required.",
      );
    for (const [team, raceRows] of current) {
      const qRows = qualified.get(team)!;
      const raceOnly = raceRows.filter(
        (r) => !qRows.some((q) => q.driver.id === r.driver.id),
      );
      const qualiOnly = qRows.filter(
        (q) => !raceRows.some((r) => r.driver.id === q.driver.id),
      );
      if (!raceOnly.length && !qualiOnly.length) continue;
      const from =
        raceOnly.length === 1 ? match(season, raceOnly[0]) : undefined;
      const to =
        qualiOnly.length === 1 ? match(season, qualiOnly[0]) : undefined;
      const confirmed =
        from &&
        to &&
        event.replacements?.some(
          (r) =>
            r.kind === "gp" &&
            r.source !== "automatic" &&
            r.from === from.id &&
            r.to === to.id,
        );
      if (confirmed) continue;
      const names = (rows: Entry[]) =>
        rows
          .map((r) => `${r.driver.given_name} ${r.driver.family_name}`)
          .join(", ");
      throw new Error(
        `OpenF1 race and qualifying entries disagree for ${raceRows[0].team.name}: race lists ${names(raceOnly)}; qualifying lists ${names(qualiOnly)}. Waiting for updated GP entries or organiser confirmation.`,
      );
    }
  }
  if (
    opening.size !== current.size ||
    [...opening.keys()].some((t) => !current.has(t))
  )
    throw new Error("Changed teams need organiser review.");
  for (const rule of event.replacements || []) {
    if (rule.kind !== "gp" || rule.source !== "automatic") continue;
    const ids = data.current.map((row) => match(season, row)?.id);
    if (ids.includes(rule.from) || !ids.includes(rule.to))
      throw new Error(
        "A previously confirmed GP replacement changed; organiser review required.",
      );
  }
  const rules: Replacement[] = [],
    drivers: Driver[] = [];
  const proofs: { from: string; to: string; official: OfficialDriverUpdate }[] =
    [];
  for (const [team, before] of opening) {
    const after = current.get(team)!;
    const missing = before.filter(
      (r) => !after.some((a) => a.driver.id === r.driver.id),
    );
    const added = after.filter(
      (r) => !before.some((a) => a.driver.id === r.driver.id),
    );
    if (!missing.length && !added.length) continue;
    if (missing.length !== 1 || added.length !== 1)
      throw new Error("Multiple changed seats need organiser review.");
    const from = match(season, missing[0]);
    if (!from)
      throw new Error(
        "Original driver is missing from the league lineup; organiser review required.",
      );
    const row = added[0],
      known = match(season, row);
    const to = known?.id || row.driver.id;
    const official = data.official?.find(
      (u) =>
        normal(u.fromName) ===
          normal(
            `${missing[0].driver.given_name} ${missing[0].driver.family_name}`,
          ) &&
        normal(u.toName) ===
          normal(`${row.driver.given_name} ${row.driver.family_name}`) &&
        normal(u.team) === normal(row.team.name),
    );
    const manual = event.replacements?.filter((r) => r.kind === "gp") || [];
    // Manual policies and already confirmed seats always take priority.
    if (
      manual.some(
        (r) => [r.from, r.to].includes(from.id) || [r.from, r.to].includes(to),
      )
    ) {
      if (
        official &&
        manual.some(
          (r) =>
            r.from === from.id &&
            r.to === to &&
            JSON.stringify(r.official) !== JSON.stringify(official),
        )
      )
        proofs.push({ from: from.id, to, official });
      continue;
    }
    if (
      from.id === to ||
      data.opening.some((r) => r.driver.id === row.driver.id)
    )
      throw new Error("Driver transfers need organiser review.");
    if (!known)
      drivers.push({
        id: to,
        providerDriverId: row.driver.id,
        name: `${row.driver.given_name} ${row.driver.family_name}`,
        team: row.team.name,
        color: /^#[0-9a-f]{6}$/i.test(row.team.primary_color || "")
          ? row.team.primary_color!
          : from.color,
        replacementOnly: true,
      });
    rules.push({
      source: "automatic",
      from: from.id,
      to,
      kind: "gp",
      policy: "carry",
      ...(official ? { official } : {}),
      note: official
        ? official.source === "fia"
          ? "Automatically confirmed from the FIA weekend entry list."
          : "Automatically confirmed from an official team announcement."
        : "Automatically confirmed from OpenF1 GP race entries.",
    });
  }
  if (
    new Set(rules.map((r) => r.from)).size !== rules.length ||
    new Set(rules.map((r) => r.to)).size !== rules.length ||
    rules.some((r) => rules.some((other) => other.from === r.to))
  )
    throw new Error(
      "Conflicting replacement identities need organiser review.",
    );
  if (season.drivers.length + drivers.length > 40)
    throw new Error("Driver limit needs organiser review.");
  return { rules, drivers, proofs, sourceMessage: data.sourceMessage };
}
const fingerprint = (season: Season, event: Event) =>
  JSON.stringify({ season, event: { ...event, replacementSync: undefined } });
export async function syncDueReplacements(
  fetcher = fetchReplacementLineups,
  now = Date.now(),
) {
  const jobs = await transaction((s) => {
    const jobs: {
      season: Season;
      event: Event;
      fingerprint: string;
      lease: string;
    }[] = [];
    for (const event of s.events) {
      const season = s.seasons.find((x) => x.id === event.seasonId),
        start = Date.parse(event.race);
      const sync = event.replacementSync;
      if (
        !season ||
        season.archived ||
        event.practiceRound ||
        !Number.isInteger(event.providerRound) ||
        event.providerRound! <= 1 ||
        event.gp?.published ||
        !Number.isFinite(start) ||
        now < start - 7 * 86400000 ||
        (sync?.leaseUntil || 0) > now ||
        (sync?.lastAttempt && now - Date.parse(sync.lastAttempt) < 3600000)
      )
        continue;
      jobs.push({
        season: structuredClone(season),
        event: structuredClone(event),
        fingerprint: fingerprint(season, event),
        lease: randomUUID(),
      });
    }
    const selected = jobs
      .sort(
        (a, b) =>
          Number(now <= Date.parse(b.event.race) + 86400000) -
            Number(now <= Date.parse(a.event.race) + 86400000) ||
          Date.parse(a.event.replacementSync?.lastAttempt || "1970-01-01") -
            Date.parse(b.event.replacementSync?.lastAttempt || "1970-01-01"),
      )
      .slice(0, 3);
    for (const job of selected)
      s.events.find((e) => e.id === job.event.id)!.replacementSync = {
        ...job.event.replacementSync,
        lastAttempt: new Date(now).toISOString(),
        lease: job.lease,
        leaseUntil: now + 10 * 60000,
      };
    return selected;
  });
  const outcomes = [];
  for (const job of jobs) {
    let plan: ReturnType<typeof planReplacements> | undefined,
      message = "";
    try {
      plan = planReplacements(
        job.season,
        job.event,
        await fetcher(job.season, job.event),
      );
    } catch (e) {
      message = (e as Error).message.slice(0, 300);
    }
    const status = await transaction((s) => {
      const event = s.events.find((e) => e.id === job.event.id),
        season = s.seasons.find((x) => x.id === job.season.id);
      if (!event || !season || event.replacementSync?.lease !== job.lease)
        return "skipped";
      const sync = event.replacementSync;
      delete sync.lease;
      delete sync.leaseUntil;
      if (
        season.archived ||
        event.gp?.published ||
        fingerprint(season, event) !== job.fingerprint
      )
        return "skipped";
      if (!plan) {
        sync.status = "waiting";
        sync.message = message;
        return "waiting";
      }
      season.drivers.push(...plan.drivers);
      event.replacements = [...(event.replacements || []), ...plan.rules];
      event.replacements = event.replacements.map((r) => {
        const proof =
          r.kind === "gp" &&
          plan.proofs.find((p) => p.from === r.from && p.to === r.to);
        return proof
          ? {
              ...r,
              official: proof.official,
              note:
                r.source === "automatic"
                  ? proof.official.source === "fia"
                    ? "Automatically confirmed from the FIA weekend entry list."
                    : "Automatically confirmed from an official team announcement."
                  : r.note,
            }
          : r;
      });
      if (event.gpDraft)
        event.gpDraft.replacements = event.replacements.filter(
          (r) => r.kind === "gp",
        );
      sync.status = plan.rules.length ? "updated" : "checked";
      sync.message = plan.rules.length
        ? "GP replacements confirmed automatically; picks follow the replacement driver."
        : "GP race entries checked; no new replacements.";
      if (plan.sourceMessage) sync.message += " " + plan.sourceMessage;
      if (plan.rules.length) {
        const at = new Date(now).toISOString();
        const names = (id: string) =>
          season.drivers.find((d) => d.id === id)?.name || id;
        const body =
          plan.rules
            .map((r) => `${names(r.from)} → ${names(r.to)}`)
            .join("; ") +
          ". GP picks follow the replacement driver. Sprint and championship picks are unchanged.";
        s.audit.unshift({
          id: randomUUID(),
          date: at,
          actor: "Automatic replacements",
          leagueId: season.leagueId,
          action: `${event.name}: ${body}`,
        });
        s.audit = s.audit.slice(0, 1000);
        const settings = leagueSettings(s, season.leagueId);
        settings.announcements.unshift({
          id: randomUUID(),
          date: at,
          title: `Driver replacement · ${event.name}`,
          body,
        });
        settings.announcements = settings.announcements.slice(0, 100);
      }
      return sync.status;
    });
    outcomes.push({ eventId: job.event.id, status });
  }
  return outcomes;
}
