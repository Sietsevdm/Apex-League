type Json = Record<string, any>;
async function fetchData(route: string): Promise<Json> {
  const response = await fetch(
    `https://api.jolpi.ca/ergast/f1/${route}?limit=100`,
    {
      headers: { "User-Agent": "ApexPredictionLeague/0.1.0" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(
      `Results provider returned ${response.status}. Try again later or enter results manually.`,
    );
  return (await response.json()).MRData;
}
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
    practice: stamp(r.FirstPractice),
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
export async function fetchCalendar(year: number) {
  const data = await fetchData(`${year}/races/`);
  if (!data?.RaceTable || !Array.isArray(data.RaceTable.Races))
    throw new Error("Calendar provider returned an invalid response.");
  return calendarEvents(data.RaceTable.Races, year);
}
export async function importCalendar(year: number) {
  const [schedule, drivers, constructors] = await Promise.all([
    fetchData(`${year}/`),
    fetchData(`${year}/drivers/`),
    fetchData(`${year}/constructors/`),
  ]);
  const races = schedule.RaceTable?.Races || [];
  return {
    drivers: (drivers.DriverTable?.Drivers || []).map((d: Json) => ({
      id: d.driverId,
      name: `${d.givenName} ${d.familyName}`,
      team: "",
      color: "#8BA7BD",
    })),
    constructors: (constructors.ConstructorTable?.Constructors || []).map(
      (c: Json) => c.name,
    ),
    events: calendarEvents(races, year),
  };
}
export async function importResults(
  year: number,
  round: number,
  kind: "gp" | "sprint",
) {
  const race = await fetchData(
    `${year}/${round}/${kind === "gp" ? "results" : "sprint"}/`,
  );
  const r = race.RaceTable?.Races?.[0];
  const rows = r?.[kind === "gp" ? "Results" : "SprintResults"] || [];
  if (!rows.length)
    throw new Error("Results have not been published by the provider yet.");
  let pole = "";
  if (kind === "gp") {
    const q = await fetchData(`${year}/${round}/qualifying/`);
    pole =
      q.RaceTable?.Races?.[0]?.QualifyingResults?.find(
        (v: Json) => v.position === "1",
      )?.Driver.driverId || "";
  }
  return {
    order: rows
      .slice(0, kind === "gp" ? 10 : 8)
      .map((v: Json) => v.Driver.driverId),
    pole,
    fastest:
      rows.find((v: Json) => v.FastestLap?.rank === "1")?.Driver.driverId || "",
  };
}
