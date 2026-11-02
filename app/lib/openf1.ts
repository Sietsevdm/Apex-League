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
const state = globalThis as unknown as { apexOpenF1Next?: number };
export async function openf1(
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<Row[]> {
  const url = new URL(`https://api.openf1.org/v1/${endpoint}`);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, String(value));
  for (let attempt = 0; attempt < 2; attempt++) {
    const start = Math.max(Date.now(), state.apexOpenF1Next || 0);
    state.apexOpenF1Next = start + 2200;
    if (start > Date.now())
      await new Promise((r) => setTimeout(r, start - Date.now()));
    const response = await fetch(url, {
      headers: providerHeaders,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 429 && attempt === 0) {
      const delay = Math.min(
        15000,
        Math.max(
          2000,
          Number(response.headers.get("retry-after")) * 1000 || 2000,
        ),
      );
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    if (response.status === 404) {
      const body = await response.json().catch(() => null);
      if (body?.detail === "No results found.") return [];
    }
    if (!response.ok)
      throw new Error(
        `OpenF1 returned ${response.status}. Retrying next hour; manual results remain available.`,
      );
    const rows = await response.json();
    if (!Array.isArray(rows))
      throw new Error("OpenF1 returned an invalid response.");
    return rows;
  }
  throw new Error("OpenF1 rate limit; retry later.");
}
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
