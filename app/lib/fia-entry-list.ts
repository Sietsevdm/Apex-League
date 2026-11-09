import { execFile } from "node:child_process";
import { join } from "node:path";
import { normal, type Row } from "./openf1";
import type { OfficialDriverUpdate } from "./official-driver-updates";

export type PDFWord = { str: string; transform: number[]; height: number };
export type FIAEntry = {
  number: number;
  code: string;
  name: string;
  team: string;
};
export type FIAEntryList = {
  url: string;
  year: number;
  eventName: string;
  startsOn: string;
  endsOn: string;
  gmtOffset?: string;
  drivers: FIAEntry[];
};
export class FIAConflict extends Error {}
const origin = "https://www.fia.com";
export function fiaDocumentURL(value: string) {
  const url = new URL(value, origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    !/^\/system\/files\/decision-document\/[a-z0-9_.-]+\.pdf$/i.test(
      url.pathname,
    ) ||
    url.search ||
    url.hash
  )
    throw new Error("Unsupported FIA document URL.");
  return url.href;
}
/** Sponsor names vary between the official entry list and OpenF1. Unknown teams require review. */
export function teamIdentity(name: string) {
  const value = normal(name);
  const teams = [
    "racingbulls",
    "redbullracing",
    "mclaren",
    "mercedes",
    "ferrari",
    "williams",
    "astonmartin",
    "haas",
    "audi",
    "alpine",
    "cadillac",
    "sauber",
    "alphatauri",
  ];
  return teams.find((t) => value.includes(t)) || value;
}
export function driverIdentity(name: string) {
  const value = normal(name);
  return value === "alexanderalbon" ? "alexalbon" : value;
}
export function localRaceTimestamp(raceStart: string, gmtOffset?: string) {
  if (!gmtOffset) return Date.parse(raceStart);
  const match = gmtOffset.match(/^([+-]?)(\d{2}):(\d{2})(?::00)?$/);
  if (!match || Number(match[2]) > 14 || Number(match[3]) >= 60)
    throw new FIAConflict(
      "Race timezone needs review before FIA weekend matching.",
    );
  return (
    Date.parse(raceStart) +
    (match[1] === "-" ? -1 : 1) *
      (Number(match[2]) * 60 + Number(match[3])) *
      60000
  );
}
function lines(words: PDFWord[]) {
  const result: PDFWord[][] = [];
  for (const word of words
    .filter((w) => w.str.trim())
    .sort(
      (a, b) =>
        b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4],
    )) {
    const line = result.at(-1);
    if (line && Math.abs(line[0].transform[5] - word.transform[5]) < 1.5)
      line.push(word);
    else result.push([word]);
  }
  return result.map((line) =>
    line.sort((a, b) => a.transform[4] - b.transform[4]),
  );
}
/** Read the actual table columns; superscript footnotes must never change car numbers. */
export function parseFIAEntryList(
  pages: PDFWord[][],
  sourceURL: string,
  year: number,
  eventName: string,
  raceStart: string,
  gmtOffset?: string,
): FIAEntryList {
  const url = fiaDocumentURL(sourceURL),
    drivers: FIAEntry[] = [];
  const pageLines = pages.map(lines);
  const texts = pageLines.flat().map((line) =>
    line
      .map((w) => w.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  if (
    !texts.some(
      (t) => driverIdentity(t) === driverIdentity(`${year} ${eventName}`),
    )
  )
    throw new FIAConflict(
      "FIA entry list event or season does not match this GP.",
    );
  const dates = texts
    .map((t) =>
      t.match(
        /^(\d{1,2})(?:\s+([A-Za-z]+))?\s*[-–—]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
      ),
    )
    .filter(Boolean);
  const windows = dates.map((d) => {
    const start = Date.parse(
        `${d![2] || d![4]} ${d![1]}, ${d![5]} 00:00:00 GMT`,
      ),
      end = Date.parse(`${d![4]} ${d![3]}, ${d![5]} 00:00:00 GMT`);
    if (
      Number(d![5]) !== year ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end < start ||
      end - start > 4 * 86400000 ||
      new Date(start).getUTCDate() !== Number(d![1]) ||
      new Date(end).getUTCDate() !== Number(d![3])
    )
      throw new FIAConflict("FIA entry list weekend dates need review.");
    return [
      new Date(start).toISOString().slice(0, 10),
      new Date(end).toISOString().slice(0, 10),
    ];
  });
  if (!windows.length || new Set(windows.map((w) => w.join())).size !== 1)
    throw new FIAConflict("FIA entry list weekend is missing or ambiguous.");
  const [startsOn, endsOn] = windows[0],
    at = localRaceTimestamp(raceStart, gmtOffset);
  if (
    !Number.isFinite(at) ||
    at < Date.parse(startsOn + "T00:00:00Z") ||
    at >= Date.parse(endsOn + "T00:00:00Z") + 86400000
  )
    throw new FIAConflict(
      "FIA entry list belongs to a different race weekend.",
    );
  for (const page of pageLines) {
    let headers: PDFWord[] | undefined;
    for (const line of page) {
      const text = line.map((w) => w.str).join(" ");
      if (
        /In addition to the list of cars and drivers|additional drivers|drivers.*(?:FP1|FP2)/i.test(
          text,
        )
      )
        break;
      if (
        line.some((w) => w.str === "TLA") &&
        line.some((w) => w.str === "Constructor")
      ) {
        headers = ["No.", "TLA", "Driver", "Nat", "Team", "Constructor"].map(
          (label) => line.find((w) => w.str === label)!,
        );
        if (headers.some((h) => !h))
          throw new Error("FIA entry list table format needs review.");
        continue;
      }
      if (!headers) continue;
      const columns = headers.map((h, i) =>
        line
          .filter(
            (w) =>
              w.transform[4] >= h.transform[4] - 2 &&
              (i === headers!.length - 1 ||
                w.transform[4] < headers![i + 1].transform[4] - 2) &&
              w.height >= h.height * 0.8,
          )
          .map((w) => w.str)
          .join(" ")
          .trim(),
      );
      if (!/^\d{1,2}$/.test(columns[0]) || !/^[A-Z]{3}$/.test(columns[1]))
        continue;
      const number = Number(columns[0]);
      if (
        !number ||
        !/^[A-Z]{3}$/.test(columns[3]) ||
        !columns[2].includes(" ") ||
        !columns[4]
      )
        throw new Error("FIA entry list driver identity needs review.");
      drivers.push({
        number,
        code: columns[1],
        name: columns[2],
        team: columns[4],
      });
    }
  }
  const teams = new Map<string, FIAEntry[]>();
  for (const row of drivers)
    teams.set(teamIdentity(row.team), [
      ...(teams.get(teamIdentity(row.team)) || []),
      row,
    ]);
  if (
    drivers.length < 20 ||
    drivers.length > 24 ||
    new Set(drivers.map((d) => d.number)).size !== drivers.length ||
    new Set(drivers.map((d) => driverIdentity(d.name))).size !==
      drivers.length ||
    [...teams.values()].some((t) => t.length !== 2)
  )
    throw new Error("Waiting for a complete, unambiguous FIA GP entry list.");
  return { url, year, eventName, startsOn, endsOn, gmtOffset, drivers };
}
export async function extractFIAPDF(data: Uint8Array): Promise<PDFWord[][]> {
  if (
    data.length > 5_000_000 ||
    Buffer.from(data.subarray(0, 5)).toString() !== "%PDF-"
  )
    throw new Error("FIA entry list is not a supported PDF.");
  return new Promise<PDFWord[][]>((resolve, reject) => {
    const child = execFile(process.execPath, ["--max-old-space-size=256", join(process.cwd(), "scripts", "fia-pdf-runtime.mjs")], {
      timeout: 30000, maxBuffer: 8_000_000, windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        console.error("FIA PDF runtime failed:", stderr.slice(-1000) || error.message);
        reject(new Error("The FIA PDF reader could not load the entry list. Please retry or update the app image."));
        return;
      }
      try {
        const pages = JSON.parse(stdout) as PDFWord[][];
        if (!Array.isArray(pages) || !pages.length || pages.length > 8 || pages.some(page => !Array.isArray(page) || page.some(word =>
          typeof word.str !== "string" || !Array.isArray(word.transform) || word.transform.length < 6 ||
          !word.transform.every(Number.isFinite) || !Number.isFinite(word.height))))
          throw new Error("Invalid FIA PDF text output.");
        resolve(pages);
      } catch {
        reject(new Error("The FIA PDF reader returned invalid text data."));
      }
    });
    child.stdin?.on("error", () => { /* The process callback reports startup/reader failures. */ });
    child.stdin?.end(Buffer.from(data));
  });
}

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function discoverFIAEntryDocument(html: string) {
  const documents = [
    ...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ]
    .flatMap((m) => {
      const title = plain(m[2]).match(
        /\bDoc\s+(\d+)\s*[-–]\s*((?:Revised\s+)?Entry List(?:\s+V\d+)?)/i,
      );
      if (!title) return [];
      return [{ url: fiaDocumentURL(m[1]), number: Number(title[1]) }];
    })
    .sort((a, b) => b.number - a.number);
  if (!documents.length) return;
  if (
    new Set(
      documents
        .filter((d) => d.number === documents[0].number)
        .map((d) => d.url),
    ).size !== 1
  )
    throw new FIAConflict(
      "FIA has conflicting entry list versions; organiser review required.",
    );
  // A later driver-change decision means the original entry list may no longer be current.
  for (const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const change = plain(m[1]).match(
      /\bDoc\s+(\d+)\s*[-–].*\bchange of driver\b/i,
    );
    if (change && Number(change[1]) > documents[0].number)
      throw new FIAConflict(
        "A newer FIA driver-change decision needs an updated entry list or organiser review.",
      );
  }
  return documents[0].url;
}
async function read(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error("FIA entry list is unavailable; retrying hourly.");
  return response;
}
export async function fetchFIAEntryList(
  year: number,
  eventName: string,
  raceStart: string,
  options: {
    fetcher?: typeof fetch;
    extract?: typeof extractFIAPDF;
    gmtOffset?: string;
  } = {},
) {
  const fetcher = options.fetcher || fetch;
  const index = await (
    await read(`${origin}/documents/championships/110/${year}`, fetcher)
  ).text();
  const choices = [
    ...index.matchAll(
      /<option\b[^>]*value=["']([^"']+)["'][^>]*>([^<]+)<\/option>/gi,
    ),
  ].filter(
    (m) =>
      normal(m[2]) === normal(eventName) &&
      m[1].startsWith(`/documents/championships/110/${year}/event/`),
  );
  if (new Set(choices.map((m) => m[1])).size !== 1)
    throw new Error(
      "FIA weekend document page is not available yet; retrying hourly.",
    );
  const page = await (
    await read(new URL(choices[0][1], origin).href, fetcher)
  ).text();
  const url = discoverFIAEntryDocument(page);
  if (!url)
    throw new Error(
      "FIA weekend entry list is not published yet; retrying hourly.",
    );
  const bytes = new Uint8Array(await (await read(url, fetcher)).arrayBuffer());
  return parseFIAEntryList(
    await (options.extract || extractFIAPDF)(bytes),
    url,
    year,
    eventName,
    raceStart,
    options.gmtOffset,
  );
}
/** Compare every team with the opening lineup, and prove each changed seat independently. */
export function fiaDriverUpdates(
  list: FIAEntryList,
  opening: Row[],
  current: Row[],
  meetingKey: number,
): OfficialDriverUpdate[] {
  const teams = new Set(opening.map((r) => teamIdentity(r.team_name || "")));
  if (
    list.drivers.length !== opening.length ||
    current.length !== opening.length ||
    new Set(list.drivers.map((r) => teamIdentity(r.team))).size !== teams.size
  )
    throw new FIAConflict(
      "FIA and OpenF1 team entries disagree; organiser review required.",
    );
  const updates: OfficialDriverUpdate[] = [];
  for (const team of teams) {
    const before = opening.filter(
        (r) => teamIdentity(r.team_name || "") === team,
      ),
      race = current.filter((r) => teamIdentity(r.team_name || "") === team),
      after = list.drivers.filter((r) => teamIdentity(r.team) === team);
    if (before.length !== 2 || race.length !== 2 || after.length !== 2)
      throw new FIAConflict("FIA team seats do not match OpenF1.");
    const names = before.map((r) =>
      driverIdentity(`${r.first_name} ${r.last_name}`),
    );
    const missing = before.filter(
        (r) =>
          !after.some(
            (a) =>
              driverIdentity(a.name) ===
              driverIdentity(`${r.first_name} ${r.last_name}`),
          ),
      ),
      added = after.filter((r) => !names.includes(driverIdentity(r.name)));
    if (missing.length !== added.length || missing.length > 1)
      throw new FIAConflict(
        "Multiple changed FIA team seats need organiser review.",
      );
    if (!missing.length) {
      if (
        race.some(
          (r) =>
            !after.some(
              (a) =>
                driverIdentity(a.name) ===
                driverIdentity(`${r.first_name} ${r.last_name}`),
            ),
        )
      )
        throw new FIAConflict(
          "FIA and OpenF1 race drivers disagree; organiser review required.",
        );
      continue;
    }
    updates.push({
      source: "fia",
      url: list.url,
      team: race[0].team_name,
      fromName: `${missing[0].first_name} ${missing[0].last_name}`,
      toName: added[0].name,
      driverNumber: added[0].number,
      code: added[0].code,
      meetingKey,
      year: list.year,
      startsOn: list.startsOn,
      endsOn: list.endsOn,
      gmtOffset: list.gmtOffset,
    });
  }
  return updates;
}
