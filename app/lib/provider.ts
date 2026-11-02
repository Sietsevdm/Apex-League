import {
  openf1,
  checkedRows,
  raceSessions,
  circuitInfo,
  importedDriver,
  type Row,
} from "./openf1";
import type { Event, Season } from "./model";
import { fetchOpenF1Result } from "./openf1-results";
type Json = Record<string, any>;
// Retained for compatibility with exported legacy calendar data.
export function calendarEvents(races: Json[], year: number) {
  const stamp = (x: Json | undefined) =>
    x?.date && x?.time && Number.isFinite(Date.parse(`${x.date}T${x.time}`))
      ? `${x.date}T${x.time}`
      : "";
  return races.map((r) => ({
    id: `${year}-${r.round}`,
    providerRound: Number(r.round),
    providerCircuitId: String(r.Circuit.circuitId),
    name: r.raceName,
    circuit: r.Circuit.circuitName,
    country: r.Circuit.Location.locality,
    ...(r.Circuit.Location.lat != null &&
    r.Circuit.Location.long != null &&
    r.Circuit.Location.lat !== "" &&
    r.Circuit.Location.long !== "" &&
    Number.isFinite(Number(r.Circuit.Location.lat)) &&
    Math.abs(Number(r.Circuit.Location.lat)) <= 90 &&
    Number.isFinite(Number(r.Circuit.Location.long)) &&
    Math.abs(Number(r.Circuit.Location.long)) <= 180
      ? {
          location: {
            latitude: Number(r.Circuit.Location.lat),
            longitude: Number(r.Circuit.Location.long),
          },
        }
      : {}),
    practice: stamp(r.FirstPractice),
    practice2: stamp(r.SecondPractice),
    practice3: stamp(r.ThirdPractice),
    qualifying: stamp(r.Qualifying),
    race: stamp(r),
    raceDate: r.date,
    hasSprint: Boolean(r.Sprint || r.SprintQualifying || r.SprintShootout),
    sprintQualifying: stamp(r.SprintQualifying) || stamp(r.SprintShootout),
    sprintRace: stamp(r.Sprint),
    practiceRound: false,
    length: "",
    laps: 0,
    photo: "",
    credit: "",
    focal: 50,
  }));
}
export function teamColor(id: string) {
  const key = id.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key.includes("mclaren")) return "#FF8700";
  if (key.includes("ferrari")) return "#FF5A65";
  if (key.includes("mercedes")) return "#55DEC9";
  if (key.includes("astonmartin")) return "#7EC398";
  if (key.includes("williams")) return "#75A5FF";
  if (key.includes("alpine") || key.includes("renault")) return "#E697D5";
  if (
    key.includes("racingbull") ||
    key === "rb" ||
    key.includes("alphatauri") ||
    key.includes("tororosso")
  )
    return "#99AFFA";
  if (key.includes("redbull")) return "#5594F5";
  if (key.includes("haas")) return "#DFDFDF";
  if (key.includes("audi") || key.includes("sauber")) return "#E3E3E3";
  if (key.includes("cadillac")) return "#BEB6A7";
  return "#8BA7BD";
}

export async function fetchCalendar(
  year: number,
): Promise<Omit<Event, "seasonId">[]> {
  if (year < 2023)
    throw new Error(
      "OpenF1 supports seasons from 2023 onwards. Older seasons require manual setup.",
    );
  const meetings = await openf1("meetings", { year });
  const sessions = await openf1("sessions", { year });
  if (
    meetings.some((m) => m.year !== year) ||
    sessions.some((s) => s.year !== year)
  )
    throw new Error("OpenF1 calendar year does not match.");
  const races = sessions
    .filter((s) => s.session_name === "Race")
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
  if (new Set(races.map((r) => r.meeting_key)).size !== races.length)
    throw new Error("OpenF1 calendar is ambiguous.");
  return races.map((race, i) => {
    const match = meetings.filter((m) => m.meeting_key === race.meeting_key);
    if (match.length !== 1)
      throw new Error("OpenF1 calendar meeting is missing or ambiguous.");
    const meeting = match[0],
      info = circuitInfo(race.circuit_key);
    const stamp = (names: string[]) => {
      const found = sessions.filter(
        (s) =>
          s.meeting_key === race.meeting_key &&
          names.includes(s.session_name) &&
          !s.is_cancelled,
      );
      if (found.length > 1)
        throw new Error("OpenF1 calendar session is ambiguous.");
      const date = found[0]?.date_start;
      return date && Number.isFinite(Date.parse(date))
        ? new Date(date).toISOString()
        : "";
    };
    const raceTime = new Date(race.date_start).toISOString();
    return {
      id: `openf1-${meeting.meeting_key}`,
      openf1MeetingKey: meeting.meeting_key,
      providerRound: i + 1,
      providerCircuitId: info?.id || `openf1-${race.circuit_key}`,
      name: meeting.meeting_name,
      circuit: info?.name || race.circuit_short_name,
      country: meeting.location || meeting.country_name,
      ...(info
        ? { location: { latitude: info.latitude, longitude: info.longitude } }
        : {}),
      practice: stamp(["Practice 1"]),
      practice2: stamp(["Practice 2"]),
      practice3: stamp(["Practice 3"]),
      qualifying: stamp(["Qualifying"]),
      race: raceTime,
      raceDate: raceTime.slice(0, 10),
      hasSprint: sessions.some(
        (s) =>
          s.meeting_key === race.meeting_key && s.session_name === "Sprint",
      ),
      sprintQualifying: stamp(["Sprint Qualifying", "Sprint Shootout"]),
      sprintRace: stamp(["Sprint"]),
      ...(race.is_cancelled || meeting.is_cancelled
        ? {
            calendarReview:
              "OpenF1 marks this meeting cancelled; organiser review required.",
          }
        : {}),
      practiceRound: false,
      length: "",
      laps: 0,
      photo: "",
      credit: "",
      focal: 50,
    };
  });
}
export async function fetchLineup(year: number) {
  const races = (await raceSessions(year)).filter(
    (r) => !r.is_cancelled && Date.parse(r.date_start) <= Date.now(),
  );
  if (!races.length) return { drivers: [], constructors: [] };
  const opening = checkedRows(
    await openf1("drivers", { session_key: races[0].session_key }),
    races[0],
  );
  const byIdentity = new Map<string, ReturnType<typeof importedDriver>>();
  const starters = new Set(opening.map((r) => importedDriver(r).id));
  // Include race substitutes from every published GP, not practice-only participants.
  for (const race of races) {
    const rows =
      race === races[0]
        ? opening
        : checkedRows(
            await openf1("drivers", { session_key: race.session_key }),
            race,
          );
    for (const row of rows) {
      const driver = importedDriver(row);
      byIdentity.set(driver.id, {
        ...driver,
        replacementOnly: starters.size > 0 && !starters.has(driver.id),
      });
    }
  }
  const drivers = [...byIdentity.values()];
  return {
    drivers,
    constructors: [...new Set(drivers.map((d) => d.team).filter(Boolean))],
  };
}
export async function importCalendar(year: number) {
  // Sequence provider requests to respect the public rate limit.
  const events = await fetchCalendar(year),
    lineup = await fetchLineup(year);
  return { ...lineup, events };
}
export async function importResults(
  season: Season,
  event: Event,
  kind: "gp" | "sprint",
) {
  const result = await fetchOpenF1Result(season, event, kind, false);
  // Fetching a preview must not clear organiser-entered awards, retirements or voids.
  return { order: result.order, pole: result.pole, fastest: result.fastest };
}
export async function openingDriverIds(year: number): Promise<string[]> {
  const races = await raceSessions(year);
  if (!races.length) return [];
  return checkedRows(
    await openf1("drivers", { session_key: races[0].session_key }),
    races[0],
  ).map((r) => importedDriver(r).id);
}
