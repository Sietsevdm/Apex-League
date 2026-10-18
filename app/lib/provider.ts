type Json = Record<string, any>;
const providerClock = globalThis as unknown as { apexProviderNextRequest?: number };
async function waitForProviderSlot() {
  const now = Date.now();
  const start = Math.max(now, providerClock.apexProviderNextRequest || now);
  providerClock.apexProviderNextRequest = start + 300;
  if (start > now) await new Promise(resolve => setTimeout(resolve, start - now));
}

async function fetchData(route: string): Promise<Json> {
  await waitForProviderSlot();
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
    ...(r.Circuit.Location.lat != null && r.Circuit.Location.long != null && r.Circuit.Location.lat !== "" && r.Circuit.Location.long !== "" && Number.isFinite(Number(r.Circuit.Location.lat)) && Math.abs(Number(r.Circuit.Location.lat)) <= 90 && Number.isFinite(Number(r.Circuit.Location.long)) && Math.abs(Number(r.Circuit.Location.long)) <= 180
      ? { location: { latitude: Number(r.Circuit.Location.lat), longitude: Number(r.Circuit.Location.long) } } : {}),
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
export async function fetchCalendar(year: number) {
  const data = await fetchData(`${year}/races/`);
  if (!data?.RaceTable || !Array.isArray(data.RaceTable.Races))
    throw new Error("Calendar provider returned an invalid response.");
  return calendarEvents(data.RaceTable.Races, year);
}
export function teamColor(id: string) {
  const key = id.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key.includes("mclaren")) return "#FF8700";
  if (key.includes("ferrari")) return "#FF5A65";
  if (key.includes("mercedes")) return "#55DEC9";
  if (key.includes("astonmartin")) return "#7EC398";
  if (key.includes("williams")) return "#75A5FF";
  if (key.includes("alpine") || key.includes("renault")) return "#E697D5";
  if (key.includes("racingbull") || key === "rb" || key.includes("alphatauri") || key.includes("tororosso")) return "#99AFFA";
  if (key.includes("redbull")) return "#5594F5";
  if (key.includes("haas")) return "#DFDFDF";
  if (key.includes("audi") || key.includes("sauber")) return "#E3E3E3";
  if (key.includes("cadillac")) return "#BEB6A7";
  return "#8BA7BD";
}
export async function fetchLineup(year: number) {
  const [drivers, constructors, openingDrivers, firstResults, latestResults] = await Promise.all([
    fetchData(`${year}/drivers/`),
    fetchData(`${year}/constructors/`),
    fetchData(`${year}/1/drivers/`),
    fetchData(`${year}/1/results/`).catch(() => ({} as Json)),
    fetchData(`${year}/last/results/`).catch(() => ({} as Json)),
  ]);
  const starters = new Set((openingDrivers.DriverTable?.Drivers || []).map((d: Json) => d.driverId));
  const teams = new Map<string, Json>();
  for (const data of [firstResults, latestResults])
    for (const race of data.RaceTable?.Races || [])
      for (const row of race.Results || []) if (row.Driver?.driverId && row.Constructor)
        teams.set(row.Driver.driverId, row.Constructor);
  return {
    drivers: (drivers.DriverTable?.Drivers || []).map((d: Json) => ({
      id: String(d.driverId),
      replacementOnly: starters.size > 0 && !starters.has(d.driverId),
      name: `${d.givenName} ${d.familyName}`,
      team: String(teams.get(d.driverId)?.name || ""),
      color: teamColor(String(teams.get(d.driverId)?.constructorId || "")),
    })),
    constructors: (constructors.ConstructorTable?.Constructors || []).map((c: Json) => String(c.name)),
  };
}
export async function importCalendar(year: number) {
  const [events, lineup] = await Promise.all([fetchCalendar(year), fetchLineup(year)]);
  return { ...lineup, events };
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

export async function openingDriverIds(year: number): Promise<string[]> {
  const data = await fetchData(`${year}/1/drivers/`);
  return (data.DriverTable?.Drivers || []).map((d: Json) => String(d.driverId));
}
