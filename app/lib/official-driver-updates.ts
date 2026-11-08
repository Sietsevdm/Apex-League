import { normal, type Row } from "./openf1";
import {
  fiaDocumentURL,
  teamIdentity,
  driverIdentity,
  localRaceTimestamp,
} from "./fia-entry-list";

export type OfficialDriverUpdate = {
  source?: "fia";
  driverNumber?: number;
  code?: string;
  meetingKey?: number;
  gmtOffset?: string;
  url: string;
  team: string;
  fromName: string;
  toName: string;
  year: number;
  startsOn: string;
  endsOn: string;
};
const origin = "https://www.haasf1team.com";
const statementPath = /^\/news\/team-statement-driver-update(?:-\d+)?$/;
function officialURL(value: string) {
  const url = new URL(value, origin);
  if (
    url.origin !== origin ||
    !statementPath.test(url.pathname) ||
    url.search ||
    url.hash
  )
    throw new Error("Unsupported official driver announcement URL.");
  return url.href;
}
function text(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => {
      const value =
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : " ";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
/** Only an explicit GP appointment with a dated weekend is machine-confirmable. */
export function parseHaasDriverUpdate(
  html: string,
  sourceURL: string,
): OfficialDriverUpdate | undefined {
  const url = officialURL(sourceURL);
  const content = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const article = content.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (!article) return;
  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(
    (m) => text(m[1]),
  );
  const departure = paragraphs
    .map((p) =>
      p.match(
        /^(?:TGR )?Haas F1 Team can confirm that ([\p{L} .’'-]+?) will no longer compete on its behalf in the (\d{4}) FIA Formula 1 World Championship\.$/u,
      ),
    )
    .filter(Boolean);
  const appointments = paragraphs
    .map((p) =>
      p.match(
        /^([\p{L} .’'-]+?) will now partner [\p{L} .’'-]+? in the team at the .+? Grand Prix\s*[–—-]\s*hosted at .+?,\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*[–—-]\s*Round \d+ of the (\d{4}) FIA Formula 1 World Championship\.$/u,
      ),
    )
    .filter(Boolean);
  if (departure.length !== 1 || appointments.length !== 1) return;
  const from = departure[0]!,
    to = appointments[0]!;
  const year = Number(from[2]);
  if (
    year !== Number(to[5]) ||
    year !== Number(to[6]) ||
    normal(from[1]) === normal(to[1])
  )
    return;
  const start = Date.parse(`${to[4]} ${to[2]}, ${year} 00:00:00 GMT`);
  const end = Date.parse(`${to[4]} ${to[3]}, ${year} 00:00:00 GMT`);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    end - start > 4 * 86400000 ||
    new Date(start).getUTCDate() !== Number(to[2]) ||
    new Date(end).getUTCDate() !== Number(to[3])
  )
    return;
  return {
    url,
    team: "Haas F1 Team",
    fromName: from[1],
    toName: to[1],
    year,
    startsOn: new Date(start).toISOString().slice(0, 10),
    endsOn: new Date(end).toISOString().slice(0, 10),
  };
}
export function updateApplies(
  update: OfficialDriverUpdate,
  year: number,
  raceStart: string,
) {
  if (update.source === "fia") fiaDocumentURL(update.url);
  else officialURL(update.url);
  const at = localRaceTimestamp(raceStart, update.gmtOffset);
  return (
    update.year === year &&
    Number.isFinite(at) &&
    at >= Date.parse(update.startsOn + "T00:00:00Z") &&
    at < Date.parse(update.endsOn + "T00:00:00Z") + 86400000
  );
}
async function read(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Official Haas driver announcements are unavailable; retrying next check.",
    );
  const html = await response.text();
  if (html.length > 2_000_000)
    throw new Error("Official Haas announcement format needs review.");
  return html;
}
/** Discover current statements on the team's own news index; names are never bundled. */
export async function fetchOfficialDriverUpdates(
  year: number,
  raceStart: string,
  fetcher: typeof fetch = fetch,
) {
  const index = await read(origin + "/news", fetcher);
  const urls = new Set<string>();
  for (const match of index.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    try {
      urls.add(officialURL(match[1]));
    } catch {
      /* Not a supported team statement. */
    }
  }
  const updates: OfficialDriverUpdate[] = [];
  for (const url of [...urls].slice(0, 4)) {
    const update = parseHaasDriverUpdate(await read(url, fetcher), url);
    if (update && updateApplies(update, year, raceStart)) updates.push(update);
  }
  if (new Set(updates.map((u) => normal(u.team))).size !== updates.length)
    throw new Error("Conflicting official driver announcements need review.");
  return updates;
}
/** Keep the race identity, but use the confirmed driver's actual qualifying car number. */
export function applyOfficialDriverUpdates(
  rows: Row[],
  updates: OfficialDriverUpdate[],
  year: number,
  raceStart: string,
  qualifying?: Row[],
) {
  const result = rows.map((r) => ({ ...r }));
  for (const update of updates) {
    if (!updateApplies(update, year, raceStart)) continue;
    if (
      update.source === "fia" &&
      (!Number.isInteger(update.meetingKey) ||
        rows.some((r) => r.meeting_key !== update.meetingKey) ||
        !Number.isInteger(update.driverNumber) ||
        update.driverNumber! < 1 ||
        update.driverNumber! > 99)
    )
      throw new Error(
        "FIA replacement does not match the race meeting or car number.",
      );
    const sameTeam = (r: Row) =>
      teamIdentity(r.team_name || "") === teamIdentity(update.team);
    const name = (r: Row) => driverIdentity(`${r.first_name} ${r.last_name}`);
    const from = result.filter(
      (r) => sameTeam(r) && name(r) === driverIdentity(update.fromName),
    );
    const to = result.filter(
      (r) => sameTeam(r) && name(r) === driverIdentity(update.toName),
    );
    const alreadyUpdated = !from.length && to.length === 1;
    if (
      (!alreadyUpdated && (from.length !== 1 || to.length)) ||
      result.filter(sameTeam).length !== 2
    )
      throw new Error(
        "Official driver announcement does not match a unique team seat.",
      );
    const confirmed = qualifying?.filter(
      (r) => sameTeam(r) && name(r) === driverIdentity(update.toName),
    );
    if (
      qualifying &&
      (qualifying.filter(sameTeam).length !== 2 ||
        confirmed?.length !== 1 ||
        qualifying.some(
          (r) => sameTeam(r) && name(r) === driverIdentity(update.fromName),
        ))
    )
      throw new Error(
        "Official driver announcement and qualifying entries disagree.",
      );
    if (
      update.source === "fia" &&
      confirmed?.[0] &&
      confirmed[0].driver_number !== update.driverNumber
    )
      throw new Error("FIA and qualifying replacement car numbers disagree.");
    if (alreadyUpdated) {
      if (update.source === "fia")
        Object.assign(to[0], {
          driver_number: update.driverNumber,
          name_acronym: update.code,
        });
      continue;
    }
    const [first, ...family] = update.toName.trim().split(/\s+/);
    if (!family.length)
      throw new Error("Official replacement driver identity needs review.");
    const old = from[0];
    result[result.indexOf(old)] = {
      ...old,
      ...(confirmed?.[0] || {
        first_name: first,
        last_name: family.join(" "),
        name_acronym: "",
      }),
      ...(update.source === "fia"
        ? { driver_number: update.driverNumber, name_acronym: update.code }
        : {}),
      session_key: old.session_key,
      meeting_key: old.meeting_key,
    };
  }
  if (
    new Set(result.map((r) => normal(`${r.first_name} ${r.last_name}`)))
      .size !== result.length ||
    new Set(result.map((r) => r.driver_number)).size !== result.length
  )
    throw new Error(
      "Official replacement produces duplicated driver identities or car numbers.",
    );
  return result;
}
