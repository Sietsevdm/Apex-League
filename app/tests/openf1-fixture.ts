import { seed } from "../lib/seed";
export function providerFixture(
  year = 2027,
  raceDate = seed(true).events[0].race,
) {
  const source = seed(true),
    season = source.seasons[0];
  const race = {
    session_key: 101,
    meeting_key: 1,
    year,
    session_name: "Race",
    session_type: "Race",
    circuit_key: 63,
    circuit_short_name: "Sakhir",
    date_start: raceDate,
    date_end: raceDate,
    is_cancelled: false,
  };
  const qualifying = { ...race, session_key: 102, session_name: "Qualifying" };
  const drivers = season.drivers
    .slice(0, 20)
    .map((d, i) => ({
      session_key: 101,
      meeting_key: 1,
      driver_number: i + 1,
      first_name: d.name.split(" ").slice(0, -1).join(" "),
      last_name: d.name.split(" ").at(-1),
      name_acronym: d.id,
      team_name: d.team,
      team_colour: d.color.replace("#", ""),
    }));
  const results = drivers.map((d, i) => ({
    session_key: 101,
    meeting_key: 1,
    driver_number: d.driver_number,
    position: i + 1,
    dnf: false,
    dns: false,
    dsq: false,
    number_of_laps: 50,
    duration: 5000 + i,
  }));
  const laps = drivers.map((d, i) => ({
    session_key: 101,
    meeting_key: 1,
    driver_number: d.driver_number,
    lap_number: 1,
    lap_duration: 80 + i,
    date_start: raceDate,
  }));
  const respond = (input: RequestInfo | URL) => {
    (globalThis as any).apexOpenF1Next = 0;
    const u = new URL(String(input));
    if (u.pathname.endsWith("/sessions"))
      return Response.json(
        u.searchParams.get("session_name") === "Race"
          ? [race]
          : [race, qualifying],
      );
    if (u.pathname.endsWith("/meetings"))
      return Response.json([
        {
          year,
          meeting_key: 1,
          meeting_name: "Bahrain Grand Prix",
          location: "Sakhir",
        },
      ]);
    if (u.pathname.endsWith("/drivers")) return Response.json(drivers);
    if (u.pathname.endsWith("/race_control")) return Response.json([]);
    if (u.pathname.endsWith("/laps")) return Response.json(laps);
    if (u.pathname.endsWith("/session_result"))
      return Response.json(
        u.searchParams.get("session_key") === "102"
          ? results.map((r) => ({ ...r, session_key: 102 }))
          : results,
      );
    throw new Error(`Unexpected URL ${u}`);
  };
  return { race, qualifying, drivers, results, laps, respond };
}
