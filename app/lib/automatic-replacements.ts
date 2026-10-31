import { randomUUID } from "node:crypto";
import type { Driver, Event, Season } from "./model";
import type { Replacement } from "./enhancements";
import { transaction } from "./store";
import { leagueSettings } from "./leagues";
import { waitForProviderSlot } from "./provider";

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
type Lineups = { opening: Entry[]; current: Entry[] };
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
  // Filter by round identity first so pagination never scans the whole season.
  await waitForProviderSlot();
  const response = await fetch(
    `https://api.jolpi.ca/f1/alpha/schedules/${season.year}/`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error("GP schedule provider is unavailable.");
  const schedule = (await response.json()).data;
  const current = schedule?.events?.filter(
    (r: any) => r.round?.number === event.providerRound,
  );
  const opening = schedule?.events?.filter((r: any) => r.round?.number === 1);
  if (
    current?.length !== 1 ||
    opening?.length !== 1 ||
    current[0].round.is_cancelled ||
    normal(current[0].circuit?.name || "") !== normal(event.circuit)
  )
    throw new Error("GP event matching needs organiser review.");
  const read = async (id: string, round: number) => {
    const rows: Entry[] = [];
    for (let page = 1; page <= 5; page++) {
      await waitForProviderSlot();
      const r = await fetch(
        `https://api.jolpi.ca/f1/alpha/core/session-entries/?year=${season.year}&round_id=${encodeURIComponent(id)}&session_type=R&page=${page}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!r.ok)
        throw new Error(
          `GP entry provider returned ${r.status}. Retrying next hour.`,
        );
      const body = await r.json();
      if (
        !Array.isArray(body.data) ||
        !Number.isInteger(body.metadata?.total_pages) ||
        body.data.some(
          (e: Entry) => e.round?.id !== id || e.round?.number !== round,
        )
      )
        throw new Error("GP entry response identity needs review.");
      rows.push(...body.data);
      if (page >= body.metadata.total_pages) return rows;
    }
    throw new Error("GP entry response needs organiser review.");
  };
  return {
    opening: await read(opening[0].round.id, 1),
    current: await read(current[0].round.id, event.providerRound!),
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

/** Require complete race entry lists. FP1/qualifying-only substitutes never qualify. */
export function planReplacements(season: Season, event: Event, data: Lineups) {
  const validate = (rows: Entry[], round: number) => {
    if (
      rows.length < 20 ||
      rows.length > 24 ||
      rows.some(
        (r) =>
          r.session?.type !== "R" ||
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
    const to = known?.id || `jolpica-${row.driver.id}`;
    const manual = event.replacements?.filter((r) => r.kind === "gp") || [];
    // Manual policies and already confirmed seats always take priority.
    if (
      manual.some(
        (r) => [r.from, r.to].includes(from.id) || [r.from, r.to].includes(to),
      )
    )
      continue;
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
      note: "Automatically confirmed from Jolpica GP race entries.",
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
  return { rules, drivers };
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
      if (event.gpDraft)
        event.gpDraft.replacements = event.replacements.filter(
          (r) => r.kind === "gp",
        );
      sync.status = plan.rules.length ? "updated" : "checked";
      sync.message = plan.rules.length
        ? "GP replacements confirmed automatically; picks follow the replacement driver."
        : "GP race entries checked; no new replacements.";
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
