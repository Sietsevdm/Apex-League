import { randomUUID } from "node:crypto";
import { leagueSettings } from "./leagues";
import {
  emptyResult,
  locked,
  type Event,
  type Result,
  type Season,
} from "./model";
import { transaction } from "./store";
import { waitForProviderSlot } from "./provider";

type Json = Record<string, any>;
const normal = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
function driverId(driver: Json, season: Season) {
  const full = normal(`${driver.given_name} ${driver.family_name}`);
  const exact = season.drivers.filter((d) => normal(d.name) === full);
  const matches = exact.length
    ? exact
    : season.drivers.filter((d) =>
        normal(d.name).endsWith(normal(driver.family_name || "!")),
      );
  if (matches.length !== 1)
    throw new Error(
      `Driver matching needs review: ${driver.family_name || "unknown"}.`,
    );
  return matches[0].id;
}
async function provider(path: string) {
  await waitForProviderSlot();
  const response = await fetch(`https://api.jolpi.ca/f1/alpha/${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `Automatic results provider returned ${response.status}. Retrying next hour.`,
    );
  return (await response.json()).data as Json;
}

/** Fail closed when an award row or its driver cannot be matched uniquely. */
export function awardWinner(html: string, country: string, season: Season) {
  const text = (s: string) =>
    s
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ");
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
    [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => text(c[1])),
  );
  const row = rows.find((c) => normal(c[0] || "") === normal(country));
  if (!row) return "";
  const winner = normal(row[1] || "");
  const matches = season.drivers.filter(
    (d) =>
      winner.includes(normal(d.name)) ||
      winner.includes(normal(d.name.split(/\s+/).at(-1) || "!")),
  );
  return matches.length === 1 ? matches[0].id : "";
}

export function confirmedResult(
  race: Json,
  qualifying: Json,
  season: Season,
  kind: "gp" | "sprint",
  dotd = "",
): Result {
  if (
    race.season?.year !== season.year ||
    qualifying.season?.year !== season.year ||
    race.round?.id !== qualifying.round?.id ||
    race.code !== (kind === "gp" ? "R" : "SR") ||
    qualifying.code !== (kind === "gp" ? "Q" : "SQ")
  )
    throw new Error("Result session identity does not match.");
  const rows: Json[] = race.results || [];
  const n = kind === "gp" ? 10 : 8;
  const order = Array.from({ length: n }, (_, i) =>
    rows.filter((r) => r.position === i + 1),
  );
  if (order.some((matches) => matches.length !== 1))
    throw new Error("Waiting for complete race classification.");
  const pole = (qualifying.results || []).filter((r: Json) => r.position === 1);
  const fastest = rows.filter((r) => r.components?.FLAP?.position === 1);
  if (pole.length !== 1 || fastest.length !== 1)
    throw new Error("Waiting for qualifying or fastest lap results.");
  const allowed = new Set([
    "FINISHED",
    "LAPPED",
    "RETIRED",
    "DISQUALIFIED",
    "DID_NOT_START",
    "DID_NOT_QUALIFY",
    "DID_NOT_PREQUALIFY",
    "WITHDREW",
  ]);
  if (rows.some((r) => !allowed.has(r.status)))
    throw new Error("Unrecognised finishing status needs review.");
  const retired = rows.filter((r) => r.status === "RETIRED");
  if (retired.some((r) => !Number.isInteger(r.laps) || r.laps < 0))
    throw new Error("Waiting for retirement lap data.");
  const first = retired.filter(
    (r) => r.laps === Math.min(...retired.map((r) => r.laps)),
  );
  if (first.length > 1)
    throw new Error(
      "First retirement is ambiguous on the same lap; organiser review required.",
    );
  if (kind === "gp" && !dotd)
    throw new Error("Waiting for the official Driver of the Day award.");
  const result = {
    ...emptyResult(),
    order: order.map((r) => driverId(r[0].driver, season)),
    pole: driverId(pole[0].driver, season),
    fastest: driverId(fastest[0].driver, season),
    retirements: first.length ? [driverId(first[0].driver, season)] : ["none"],
    dotd: kind === "gp" ? dotd : "",
    published: true,
  };
  if (
    new Set(result.order).size !== n ||
    (dotd && !season.drivers.some((d) => d.id === dotd))
  )
    throw new Error("Invalid or duplicate result drivers.");
  return result;
}

export async function fetchAutomaticResult(
  season: Season,
  event: Event,
  kind: "gp" | "sprint",
) {
  const schedule = await provider(`schedules/${season.year}/`);
  const round = schedule.events?.find(
    (e: Json) => e.round.number === event.providerRound,
  );
  if (
    !round ||
    round.round.is_cancelled ||
    normal(round.circuit.name) !== normal(event.circuit)
  )
    throw new Error("Provider event matching needs review.");
  const raceCode = kind === "gp" ? "R" : "SR";
  const qualiCode = kind === "gp" ? "Q" : "SQ";
  const race = await provider(
    `results/${encodeURIComponent(round.round.id)}/${raceCode}/`,
  );
  const qualifying = await provider(
    `results/${encodeURIComponent(round.round.id)}/${qualiCode}/`,
  );
  if (
    race.round?.id !== round.round.id ||
    race.round?.number !== event.providerRound
  )
    throw new Error("Provider returned results for a different weekend.");
  let dotd = "";
  if (kind === "gp") {
    const winners = (race.results || []).filter(
      (r: Json) => r.driver_of_the_day_winner === true,
    );
    if (winners.length === 1) dotd = driverId(winners[0].driver, season);
    if (!dotd) {
      const response = await fetch(
        `https://www.formula1.com/en/results/${season.year}/awards/driver-of-the-day`,
        { cache: "no-store", signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok)
        throw new Error("Official Driver of the Day source is unavailable.");
      const aliases: Record<string, string> = {
        australian: "Australia",
        chinese: "China",
        japanese: "Japan",
        canadian: "Canada",
        austrian: "Austria",
        british: "Great Britain",
        belgian: "Belgium",
        hungarian: "Hungary",
        dutch: "Netherlands",
        italian: "Italy",
        spanish: "Spain",
        "mexico city": "Mexico",
        "sao paulo": "Brazil",
        "abu dhabi": "Abu Dhabi",
        "saudi arabian": "Saudi Arabia",
      };
      const name = String(round.round.name)
        .replace(/\s+Grand Prix$/i, "")
        .toLowerCase();
      const alias = Object.entries(aliases).find(
        ([key]) => normal(key) === normal(name),
      )?.[1];
      dotd = awardWinner(await response.text(), alias || name, season);
    }
  }
  return confirmedResult(race, qualifying, season, kind, dotd);
}

function fingerprint(season: Season, event: Event) {
  return JSON.stringify({ season, event: { ...event, resultSync: undefined } });
}
export async function syncDueResults(
  fetcher = fetchAutomaticResult,
  now = Date.now(),
) {
  const jobs = await transaction((s) => {
    const jobs: {
      season: Season;
      event: Event;
      kind: "gp" | "sprint";
      lease: string;
      fingerprint: string;
    }[] = [];
    for (const season of s.seasons.filter((s) => !s.archived)) {
      for (const event of s.events.filter(
        (e) =>
          e.seasonId === season.id &&
          !e.practiceRound &&
          Number.isInteger(e.providerRound),
      )) {
        for (const kind of ["gp", "sprint"] as const) {
          const start = Date.parse(
            kind === "gp" ? event.race : event.sprintRace || "",
          );
          const status = event.resultSync?.[kind];
          if (
            !Number.isFinite(start) ||
            now < start + (kind === "gp" ? 3 : 1) * 3600000 ||
            event[kind]?.published ||
            !locked(event, kind, now) ||
            (status?.leaseUntil || 0) > now ||
            (status?.lastAttempt &&
              now - Date.parse(status.lastAttempt) < 3600000)
          )
            continue;
          if (event[kind === "gp" ? "gpDraft" : "sprintDraft"]) {
            (event.resultSync ||= {})[kind] = {
              ...status,
              message:
                "A saved organiser draft needs review before automatic publication.",
            };
            continue;
          }
          const lease = randomUUID();
          jobs.push({
            season: structuredClone(season),
            event: structuredClone(event),
            kind,
            lease,
            fingerprint: fingerprint(season, event),
          });
        }
      }
    }
    // Rotate unavailable older results while prioritising unattempted recent races.
    const selected = jobs
      .sort(
        (a, b) =>
          Date.parse(
            a.event.resultSync?.[a.kind]?.lastAttempt || "1970-01-01",
          ) -
            Date.parse(
              b.event.resultSync?.[b.kind]?.lastAttempt || "1970-01-01",
            ) || Date.parse(b.event.race) - Date.parse(a.event.race),
      )
      .slice(0, 3);
    for (const job of selected) {
      const event = s.events.find((e) => e.id === job.event.id)!;
      (event.resultSync ||= {})[job.kind] = {
        ...event.resultSync?.[job.kind],
        lease: job.lease,
        leaseUntil: now + 10 * 60000,
        lastAttempt: new Date(now).toISOString(),
      };
    }
    return selected;
  });
  const outcomes = [];
  for (const job of jobs) {
    let result: Result | undefined,
      error = "";
    try {
      result = await fetcher(job.season, job.event, job.kind);
    } catch (e) {
      error = (e as Error).message.slice(0, 300);
    }
    const status = await transaction((s) => {
      const event = s.events.find((e) => e.id === job.event.id);
      const season = s.seasons.find((s) => s.id === job.season.id);
      const sync = event?.resultSync?.[job.kind];
      if (!event || !season || sync?.lease !== job.lease) return "skipped";
      delete sync.lease;
      delete sync.leaseUntil;
      if (
        season.archived ||
        fingerprint(season, event) !== job.fingerprint ||
        event[job.kind]?.published
      )
        return "skipped";
      sync.message = error || "Results automatically confirmed and published.";
      if (!result) {
        sync.status = "waiting";
        return "waiting";
      }
      const at = new Date(now).toISOString();
      event[job.kind] = {
        ...result,
        replacements: event.replacements?.filter((r) => r.kind === job.kind),
        provenance: {
          source: "Jolpica session results / Formula1.com Driver of the Day",
          fetchedAt: at,
          confirmedAt: at,
          confirmedBy: "Automatic results",
        },
      };
      delete event[job.kind === "gp" ? "gpDraft" : "sprintDraft"];
      sync.status = "published";
      s.audit.unshift({
        id: randomUUID(),
        date: at,
        actor: "Automatic results",
        leagueId: season.leagueId,
        action: `Published ${job.kind} results: ${event.name}`,
      });
      s.audit = s.audit.slice(0, 1000);
      const settings = leagueSettings(s, season.leagueId);
      settings.announcements.unshift({
        id: randomUUID(),
        date: at,
        title: `${event.name} · ${job.kind === "gp" ? "Grand Prix" : "Sprint"} results published`,
        body: "Results automatically confirmed. League scores and standings have been updated.",
      });
      settings.announcements = settings.announcements.slice(0, 100);
      return "published";
    });
    outcomes.push({ eventId: job.event.id, kind: job.kind, status });
  }
  return outcomes;
}
