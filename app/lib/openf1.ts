import { providerHeaders } from "./provider-http";
import circuits from "./openf1-circuits.json";
import type { Event, Season, Driver } from "./model";
export type Row = Record<string, any>;
export const normal = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
type ProviderClock = {
  apexOpenF1Next?: number;
  apexOpenF1CooldownUntil?: number;
};
const state = globalThis as unknown as ProviderClock;
type ClientOptions = {
  fetcher?: typeof fetch;
  clock?: () => number;
  wait?: (ms: number) => Promise<void>;
  limiter?: ProviderClock;
};
/** Retry temporary failures without ignoring the provider's rate-limit cooldown. */
export function createOpenF1Client(options: ClientOptions = {}) {
  const fetcher =
    options.fetcher || ((...args: Parameters<typeof fetch>) => fetch(...args));
  const clock = options.clock || Date.now;
  const wait =
    options.wait ||
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const limiter = options.limiter || {};
  return async function request(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<Row[]> {
    const url = new URL(`https://api.openf1.org/v1/${endpoint}`);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, String(value));
    for (let attempt = 0; attempt < 3; attempt++) {
      const start = Math.max(
        clock(),
        limiter.apexOpenF1Next || 0,
        limiter.apexOpenF1CooldownUntil || 0,
      );
      if (start - clock() > 60000)
        throw new Error(
          `OpenF1 ${endpoint} is rate limited. Please retry later.`,
        );
      limiter.apexOpenF1Next = start + 2200;
      if (start > clock()) await wait(start - clock());
      // A concurrent request may have learned of a cooldown after our slot was reserved.
      while ((limiter.apexOpenF1CooldownUntil || 0) > clock()) {
        const retryStart = Math.max(
          clock(),
          limiter.apexOpenF1Next || 0,
          limiter.apexOpenF1CooldownUntil || 0,
        );
        if (retryStart - clock() > 60000)
          throw new Error(
            `OpenF1 ${endpoint} is rate limited. Please retry later.`,
          );
        limiter.apexOpenF1Next = retryStart + 2200;
        await wait(retryStart - clock());
      }
      let response: Response;
      try {
        response = await fetcher(url, {
          headers: providerHeaders,
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        });
      } catch (error) {
        if (attempt < 2) {
          await wait((attempt + 1) * 2000);
          continue;
        }
        const name = (error as Error)?.name;
        throw new Error(
          `OpenF1 ${endpoint} ${name === "TimeoutError" || name === "AbortError" ? "request timed out" : "connection failed"}. Existing data is retained.`,
        );
      }
      if (
        response.status === 429 ||
        [500, 502, 503, 504].includes(response.status)
      ) {
        const retry = response.headers.get("retry-after");
        const seconds =
          retry !== null && /^\d+(?:\.\d+)?$/.test(retry.trim())
            ? Number(retry) * 1000
            : NaN;
        const headerDelay = Number.isFinite(seconds)
          ? seconds
          : retry
            ? Date.parse(retry) - clock()
            : NaN;
        const delay = Math.max(
          (attempt + 1) * 2000,
          Number.isFinite(headerDelay)
            ? headerDelay
            : response.status === 429
              ? 60000
              : 0,
        );
        if (response.status === 429)
          limiter.apexOpenF1CooldownUntil = Math.max(
            limiter.apexOpenF1CooldownUntil || 0,
            clock() + delay,
          );
        if (attempt < 2 && delay <= 60000) {
          await response.body?.cancel();
          if (response.status !== 429) await wait(delay);
          continue;
        }
      }
      if (response.status === 404) {
        const body = await response.json().catch(() => null);
        if (body?.detail === "No results found.") return [];
      }
      if (!response.ok)
        throw new Error(
          `OpenF1 ${endpoint} returned HTTP ${response.status}. Existing data is retained.`,
        );
      let rows: unknown;
      try {
        rows = await response.json();
      } catch {
        throw new Error(
          `OpenF1 ${endpoint} returned invalid JSON. Existing data is retained.`,
        );
      }
      if (!Array.isArray(rows))
        throw new Error(`OpenF1 ${endpoint} returned an invalid response.`);
      return rows;
    }
    throw new Error(`OpenF1 ${endpoint} is temporarily unavailable.`);
  };
}
export const openf1 = createOpenF1Client({ limiter: state });
export function circuitInfo(key: number | string) {
  return (
    circuits as Record<
      string,
      { id: string; name: string; latitude: number; longitude: number }
    >
  )[String(key)];
}
export function checkedRows(rows: Row[], session: Row) {
  if (
    rows.some(
      (r) =>
        r.session_key !== session.session_key ||
        r.meeting_key !== session.meeting_key,
    )
  )
    throw new Error("OpenF1 returned data for a different session.");
  return rows;
}
export async function raceSessions(year: number) {
  if (year < 2023)
    throw new Error(
      "OpenF1 supports seasons from 2023 onwards. Older seasons require manual setup.",
    );
  const rows = await openf1("sessions", { year, session_name: "Race" });
  if (
    rows.some(
      (s) =>
        s.year !== year ||
        s.session_name !== "Race" ||
        !Number.isInteger(s.session_key) ||
        !Number.isFinite(Date.parse(s.date_start)),
    )
  )
    throw new Error("OpenF1 race schedule needs review.");
  if (
    new Set(rows.map((s) => s.session_key)).size !== rows.length ||
    new Set(rows.map((s) => s.meeting_key)).size !== rows.length
  )
    throw new Error("OpenF1 race schedule is ambiguous.");
  return rows.sort(
    (a, b) => Date.parse(a.date_start) - Date.parse(b.date_start),
  );
}
export async function eventSessions(
  season: Season,
  event: Event,
  kind: "gp" | "sprint",
  requireFinished = true,
) {
  const races = await raceSessions(season.year);
  const matches = races.filter((r) =>
    event.openf1MeetingKey
      ? r.meeting_key === event.openf1MeetingKey
      : circuitInfo(r.circuit_key)?.id === event.providerCircuitId ||
        normal(
          circuitInfo(r.circuit_key)?.name || r.circuit_short_name || "",
        ) === normal(event.circuit),
  );
  const dated = matches.filter(
    (r) =>
      Math.abs(Date.parse(r.date_start) - Date.parse(event.race)) <
      3 * 86400000,
  );
  const candidates = event.openf1MeetingKey ? matches : dated;
  if (candidates.length !== 1 || candidates[0].is_cancelled)
    throw new Error("OpenF1 event matching needs organiser review.");
  const all = await openf1("sessions", {
    meeting_key: candidates[0].meeting_key,
  });
  if (
    all.some(
      (r) =>
        r.meeting_key !== candidates[0].meeting_key || r.year !== season.year,
    )
  )
    throw new Error("OpenF1 meeting identity does not match.");
  const unique = (names: string[]) => {
    const found = all.filter(
      (r) => names.includes(r.session_name) && !r.is_cancelled,
    );
    if (found.length !== 1)
      throw new Error("Waiting for the OpenF1 race or qualifying session.");
    return found[0];
  };
  const race = kind === "gp" ? candidates[0] : unique(["Sprint"]);
  const qualifying = unique(
    kind === "gp" ? ["Qualifying"] : ["Sprint Qualifying", "Sprint Shootout"],
  );
  if (requireFinished && Date.now() < Date.parse(race.date_end))
    throw new Error("Waiting for the session to finish.");
  return { race, qualifying };
}
export function matchDriver(row: Row, season: Season): Driver {
  // Driver numbers identify a driver only within the matched session, never across seasons.
  const full = normal(`${row.first_name} ${row.last_name}`);
  const exact = season.drivers.filter((d) => normal(d.name) === full);
  const matches = exact.length
    ? exact
    : season.drivers.filter((d) =>
        normal(d.name).endsWith(normal(row.last_name || "!")),
      );
  if (matches.length !== 1)
    throw new Error(
      `Driver matching needs review: ${row.full_name || row.last_name || "unknown"}.`,
    );
  return matches[0];
}
export function importedDriver(row: Row): Driver {
  const name = `${row.first_name} ${row.last_name}`;
  if (!row.first_name || !row.last_name || !Number.isInteger(row.driver_number))
    throw new Error("OpenF1 driver identity is incomplete.");
  return {
    id: `openf1-${normal(name)}`,
    name,
    code: row.name_acronym,
    team: row.team_name || "",
    color: /^[0-9a-f]{6}$/i.test(row.team_colour || "")
      ? `#${row.team_colour}`
      : "#8BA7BD",
  };
}
