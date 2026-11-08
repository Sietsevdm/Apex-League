import {
  openf1,
  checkedRows,
  eventSessions,
  matchDriver,
  circuitInfo,
  normal,
  type Row,
} from "./openf1";
import { awardWinner, confirmedResult } from "./automatic-results";
import { emptyResult, type Event, type Result, type Season } from "./model";
import { applyOfficialDriverUpdates } from "./official-driver-updates";

/** A retirement is bracketed by observed movement and sustained stationary telemetry. */
export function stopInterval(rows: Row[]): { from: number; to: number } {
  const data: (Row & { at: number })[] = rows
    .map((r) => ({ ...r, at: Date.parse(r.date) }))
    .sort((a, b) => a.at - b.at);
  if (
    data.length < 2 ||
    data.some(
      (r) =>
        !Number.isFinite(r.at) ||
        typeof r.speed !== "number" ||
        !Number.isFinite(r.speed) ||
        r.speed < 0,
    )
  )
    throw new Error(
      "Retirement telemetry is incomplete; organiser review required.",
    );
  let last = -1;
  for (let i = 0; i < data.length; i++) if (data[i].speed > 1) last = i;
  if (
    last < 0 ||
    last === data.length - 1 ||
    !data
      .slice(0, last + 1)
      .some((r) => r.speed > 30 && r.rpm > 0 && r.n_gear > 0)
  )
    throw new Error("Waiting for a confirmed permanent retirement stop.");
  const tail = data.slice(last);
  if (
    tail.at(-1)!.at - tail[1].at < 30000 ||
    tail.some(
      (r, i) =>
        i > 0 && (r.at - tail[i - 1].at > 2000 || r.at <= tail[i - 1].at),
    )
  )
    throw new Error(
      "Retirement telemetry has gaps or insufficient stationary evidence.",
    );
  return { from: data[last].at, to: data[last + 1].at };
}
export function firstStop(stops: { id: string; from: number; to: number }[]) {
  const sorted = [...stops].sort((a, b) => a.from - b.from);
  if (!sorted.length) return ["none"];
  // Do not turn sampling uncertainty into a joint retirement or arbitrary tie-break.
  if (sorted.slice(1).some((s) => s.from <= sorted[0].to + 2000))
    throw new Error(
      "Retirement order is too close to distinguish; organiser review required.",
    );
  return [sorted[0].id];
}
/** Apply race-control deletions in timestamp order; never assume the leader lap is the driver's lap. */
export function validLaps(laps: Row[], messages: Row[], sessionStart: number) {
  const deleted = new Set<string>();
  for (const row of [...messages].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  )) {
    if (Date.parse(row.date) < sessionStart) continue;
    const text = String(row.message || "");
    if (
      !/\b(DELETED|REINSTATED)\b/i.test(text) ||
      !/\b(LAP|TIME)\b/i.test(text)
    )
      continue;
    const car = text.match(/\bCAR\s+(\d+)\b/i),
      lap = text.match(/\bLAP\s+(\d+)\b/i);
    if (!car || !lap)
      throw new Error(
        "Lap deletion needs organiser review before fastest-lap confirmation.",
      );
    const key = `${Number(car[1])}:${Number(lap[1])}`;
    if (/\bREINSTATED\b/i.test(text)) deleted.delete(key);
    else deleted.add(key);
  }
  return laps.filter((l) => !deleted.has(`${l.driver_number}:${l.lap_number}`));
}
function uniqueDrivers(rows: Row[]) {
  if (
    new Set(rows.map((r) => r.driver_number)).size !== rows.length ||
    rows.some((r) => !Number.isInteger(r.driver_number))
  )
    throw new Error("OpenF1 driver list is incomplete or duplicated.");
}
export async function fetchOpenF1Result(
  season: Season,
  event: Event,
  kind: "gp" | "sprint",
  automatic: boolean,
): Promise<Result> {
  const { race, qualifying } = await eventSessions(season, event, kind);
  let drivers = checkedRows(
    await openf1("drivers", { session_key: race.session_key }),
    race,
  );
  const rows = checkedRows(
    await openf1("session_result", { session_key: race.session_key }),
    race,
  );
  const q = checkedRows(
    await openf1("session_result", { session_key: qualifying.session_key }),
    qualifying,
  );
  const laps = checkedRows(
    await openf1("laps", { session_key: race.session_key }),
    race,
  );
  const official = (event.replacements || [])
    .filter((r) => r.kind === kind && r.official)
    .map((r) => r.official!);
  if (kind === "gp" && official.length) {
    const qualified = checkedRows(
      await openf1("drivers", { session_key: qualifying.session_key }),
      qualifying,
    );
    uniqueDrivers(qualified);
    if (qualified.length < 20 || qualified.length > 24)
      throw new Error("Waiting for complete qualifying driver identities.");
    drivers = applyOfficialDriverUpdates(
      drivers,
      official,
      season.year,
      race.date_start,
      qualified,
    );
  }
  uniqueDrivers(drivers);
  uniqueDrivers(rows);
  uniqueDrivers(q);
  if (
    drivers.length < 20 ||
    drivers.length > 24 ||
    rows.length !== drivers.length ||
    rows.some(
      (r) =>
        !drivers.some((d) => d.driver_number === r.driver_number) ||
        ![r.dnf, r.dns, r.dsq].every((v) => typeof v === "boolean") ||
        !Number.isInteger(r.number_of_laps) ||
        r.number_of_laps < 0,
    )
  )
    throw new Error("Waiting for a complete OpenF1 classification.");
  const local = new Map(
    drivers.map((d) => [d.driver_number, matchDriver(d, season)]),
  );
  const id = (num: number) => {
    const d = local.get(num);
    if (!d) throw new Error("OpenF1 driver identity needs review.");
    return d.id;
  };
  const poles = q.filter((r) => r.position === 1 && !r.dns && !r.dsq);
  const control = checkedRows(
    await openf1("race_control", { session_key: race.session_key }),
    race,
  );
  const timed = validLaps(laps, control, Date.parse(race.date_start)).filter(
    (l) =>
      typeof l.lap_duration === "number" &&
      Number.isFinite(l.lap_duration) &&
      l.lap_duration > 0 &&
      rows.some((r) => r.driver_number === l.driver_number && !r.dsq && !r.dns),
  );
  const min = Math.min(...timed.map((l) => l.lap_duration));
  const fastest = [
    ...new Set(
      timed.filter((l) => l.lap_duration === min).map((l) => l.driver_number),
    ),
  ];
  const order = Array.from({ length: kind === "gp" ? 10 : 8 }, (_, i) => {
    const found = rows.filter((r) => r.position === i + 1 && !r.dsq && !r.dns);
    if (found.length !== 1)
      throw new Error("Waiting for complete race classification.");
    return id(found[0].driver_number);
  });
  if (
    new Set(order).size !== order.length ||
    poles.length !== 1 ||
    fastest.length !== 1
  )
    throw new Error(
      "Waiting for unambiguous qualifying or fastest lap results.",
    );
  const partial = {
    ...emptyResult(),
    order,
    pole: id(poles[0].driver_number),
    fastest: id(fastest[0]),
  };
  // Manual import remains useful even if the retirement or official award still needs review.
  if (!automatic) return partial;
  const retired = rows
    .filter((r) => r.dnf && !r.dns && !r.dsq)
    .sort((a, b) => a.number_of_laps - b.number_of_laps);
  const durations = rows
    .map((r) => r.duration)
    .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
  const lapEnds = laps
    .filter((l) => typeof l.lap_duration === "number" && l.lap_duration > 0)
    .map((l) => Date.parse(l.date_start) + l.lap_duration * 1000)
    .filter(Number.isFinite);
  const end =
    Math.max(
      Date.parse(race.date_end),
      Date.parse(race.date_start) + Math.max(0, ...durations) * 1000,
      ...lapEnds,
    ) +
    10 * 60000;
  const stops: { id: string; from: number; to: number }[] = [];
  for (const row of retired) {
    const last = laps
      .filter(
        (l) =>
          l.driver_number === row.driver_number &&
          l.lap_number <= row.number_of_laps + 1 &&
          Number.isFinite(Date.parse(l.date_start)),
      )
      .sort((a, b) => b.lap_number - a.lap_number)[0];
    if (!last) throw new Error("Waiting for retirement lap timing.");
    const completed = laps
      .filter(
        (l) =>
          l.driver_number === row.driver_number &&
          typeof l.lap_duration === "number" &&
          l.lap_duration > 0,
      )
      .map((l) => Date.parse(l.date_start) + l.lap_duration * 1000)
      .filter(Number.isFinite);
    // Completing a later lap proves this car was still racing after an already observed stop.
    if (
      stops.length &&
      completed.some((at) => at > Math.min(...stops.map((s) => s.to)) + 2000)
    )
      continue;
    const lapStart = Date.parse(last.date_start),
      start = Math.max(Date.parse(race.date_start), lapStart - 60000),
      until = Math.min(lapStart + 6 * 60000, end);
    if (start < Date.parse(race.date_start) || until <= start)
      throw new Error("Retirement timing is outside the matched session.");
    const telemetry = checkedRows(
      await openf1("car_data", {
        session_key: race.session_key,
        driver_number: row.driver_number,
        "date>": new Date(start).toISOString(),
        "date<": new Date(until).toISOString(),
      }),
      race,
    );
    if (telemetry.some((r) => r.driver_number !== row.driver_number))
      throw new Error("Retirement telemetry driver does not match.");
    const stop = stopInterval(telemetry);
    // A subsequent restart or movement invalidates this stop. Missing data stays reviewable.
    const later = checkedRows(
      await openf1("car_data", {
        session_key: race.session_key,
        driver_number: row.driver_number,
        "date>": new Date(until).toISOString(),
        "date<": new Date(end).toISOString(),
        "speed>": 1,
      }),
      race,
    );
    if (later.length)
      throw new Error(
        "Later car movement makes retirement timing uncertain; organiser review required.",
      );
    stops.push({ id: id(row.driver_number), ...stop });
  }
  const retirements = firstStop(stops);
  let dotd = "";
  if (kind === "gp") {
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
      "saudi arabian": "Saudi Arabia",
    };
    const meeting = await openf1("meetings", { meeting_key: race.meeting_key });
    if (
      meeting.length !== 1 ||
      meeting[0].year !== season.year ||
      meeting[0].meeting_key !== race.meeting_key
    )
      throw new Error("Official award event matching needs review.");
    const name = String(meeting[0].meeting_name)
      .replace(/\s+Grand Prix$/i, "")
      .toLowerCase();
    const alias = Object.entries(aliases).find(
      ([key]) => normal(key) === normal(name),
    )?.[1];
    const html = await response.text();
    const circuitAliases: Record<string, string> = {
      catalunya: "Barcelona-Catalunya",
      madring: "Spain",
      rodriguez: "Mexico",
      sepang: "Malaysia",
    };
    const country =
      circuitAliases[circuitInfo(race.circuit_key)?.id || ""] || alias || name;
    dotd = awardWinner(html, country, season);
    if (!dotd)
      throw new Error("Waiting for the official Driver of the Day award.");
  }
  // Reuse the complete-category validator; all driver IDs remain the league's saved IDs.
  const person = (n: number) => {
    const d = drivers.find((d) => d.driver_number === n)!;
    return { given_name: d.first_name, family_name: d.last_name };
  };
  const identity = {
    season: { year: season.year },
    round: { id: String(race.meeting_key) },
  };
  return confirmedResult(
    {
      ...identity,
      code: kind === "gp" ? "R" : "SR",
      results: rows.map((r) => ({
        position: r.position,
        driver: person(r.driver_number),
        laps: r.number_of_laps,
        status: r.dsq
          ? "DISQUALIFIED"
          : r.dns
            ? "DID_NOT_START"
            : r.dnf
              ? "RETIRED"
              : "FINISHED",
        components: {
          FLAP: { position: r.driver_number === fastest[0] ? 1 : 2 },
        },
      })),
    },
    {
      ...identity,
      code: kind === "gp" ? "Q" : "SQ",
      results: [{ position: 1, driver: person(poles[0].driver_number) }],
    },
    season,
    kind,
    dotd,
    retirements,
  );
}
