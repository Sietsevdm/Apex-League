import { randomUUID } from "node:crypto";
import { State, themes, emptyPicks, emptyResult, Driver } from "./model";
const sampleDrivers: Driver[] = [
  ["VER", "Max Verstappen", "Red Bull", "#5594F5"],
  ["NOR", "Lando Norris", "McLaren", "#FF8700"],
  ["LEC", "Charles Leclerc", "Ferrari", "#FF5A65"],
  ["HAM", "Lewis Hamilton", "Ferrari", "#FF5A65"],
  ["PIA", "Oscar Piastri", "McLaren", "#FF8700"],
  ["RUS", "George Russell", "Mercedes", "#55DEC9"],
  ["ANT", "Kimi Antonelli", "Mercedes", "#55DEC9"],
  ["ALO", "Fernando Alonso", "Aston Martin", "#7EC398"],
  ["SAI", "Carlos Sainz", "Williams", "#75A5FF"],
  ["ALB", "Alex Albon", "Williams", "#75A5FF"],
  ["GAS", "Pierre Gasly", "Alpine", "#E697D5"],
  ["HUL", "Nico Hülkenberg", "Audi", "#E3E3E3"],
  ["STR", "Lance Stroll", "Aston Martin", "#7EC398"],
  ["OCO", "Esteban Ocon", "Haas", "#DFDFDF"],
  ["BEA", "Oliver Bearman", "Haas", "#DFDFDF"],
  ["LAW", "Liam Lawson", "Racing Bulls", "#99AFFA"],
  ["HAD", "Isack Hadjar", "Red Bull", "#5594F5"],
  ["BOR", "Gabriel Bortoleto", "Audi", "#E3E3E3"],
  ["BOT", "Valtteri Bottas", "Cadillac", "#BEB6A7"],
  ["PER", "Sergio Pérez", "Cadillac", "#BEB6A7"],
].map(([id, name, team, color]) => ({ id, name, team, color }));
export function seed(demo: boolean): State {
  const s: State = {
    schema: 1,
    settings: {
      name: "Apex League",
      welcome: "Good friends. Bold predictions. Every point counts.",
      theme: themes[0],
      logo: "",
      invite: randomUUID(),
      bannerOverride: "",
      announcements: [],
    },
    users: [],
    seasons: [],
    events: [],
    entries: [],
    championPicks: [],
    audit: [],
  };
  if (!demo) return s;
  const now = Date.now(),
    t = (hours: number) => new Date(now + hours * 3600000).toISOString();
  s.seasons = [
    {
      id: "sample-season",
      year: 2027,
      name: "2027 · Demo season",
      drivers: sampleDrivers,
      constructors: [...new Set(sampleDrivers.map((d) => d.team))],
      cutoff: t(48),
      archived: false,
    },
  ];
  s.users = ["You", "Alex", "Jamie", "Sam", "Robin", "Noor"].map((name, i) => ({
    id: i === 0 ? "demo-admin" : `demo-${i}`,
    email: `${name.toLowerCase()}@example.invalid`,
    name,
    password: "",
    role: i === 0 ? "admin" : "player",
    active: true,
    seasonIds: ["sample-season"],
    reminders: false,
    timezone: "Europe/Amsterdam",
    version: 0,
  }));
  const configs = [
    [
      "bahrain",
      "Bahrain",
      "Bahrain International Circuit",
      "Sakhir",
      -350,
      "5.412",
      57,
    ],
    [
      "jeddah",
      "Saudi Arabian",
      "Jeddah Corniche Circuit",
      "Jeddah",
      -180,
      "6.174",
      50,
    ],
    [
      "singapore",
      "Singapore",
      "Marina Bay Street Circuit",
      "Singapore",
      -2,
      "4.940",
      62,
    ],
    [
      "suzuka",
      "Japanese",
      "Suzuka International Racing Course",
      "Suzuka",
      166,
      "5.807",
      53,
    ],
  ] as const;
  s.events = configs.map(
    ([id, name, circuit, country, h, length, laps], i) => ({
      id,
      seasonId: "sample-season",
      name: `${name} Grand Prix`,
      circuit,
      country,
      practice: t(h),
      qualifying: t(h + 48),
      race: t(h + 72),
      ...(i === 2 ? { sprintQualifying: t(24), sprintRace: t(42) } : {}),
      practiceRound: false,
      length,
      laps,
      photo: i === 2 ? "/circuit-night.svg" : "/circuit-day.svg",
      credit: "Illustrated placeholder · upload your circuit photograph",
      focal: 50,
    }),
  );
  for (const e of s.events.slice(0, 2)) {
    e.lockedGp = true;
    e.gp = {
      ...emptyResult(),
      order: sampleDrivers.slice(0, 10).map((d) => d.id),
      pole: "NOR",
      fastest: "VER",
      retirements: ["ALO"],
      dotd: "LEC",
      published: true,
    };
    s.users.forEach((u, i) => {
      const order = sampleDrivers.slice(0, 10).map((d) => d.id);
      for (let j = 0; j < i; j++) {
        const a = (j * 2) % 10,
          b = (a + 1) % 10;
        [order[a], order[b]] = [order[b], order[a]];
      }
      s.entries.push({
        userId: u.id,
        eventId: e.id,
        kind: "gp",
        submitted: true,
        updatedAt: t(-400),
        picks: {
          order,
          pole: i % 2 ? "VER" : "NOR",
          fastest: i % 3 ? "NOR" : "VER",
          retirement: i % 2 ? "none" : "ALO",
          dotd: i % 2 ? "NOR" : "LEC",
        },
      });
    });
  }
  s.events.push({
    id: "practice",
    seasonId: "sample-season",
    name: "Practice round",
    circuit: "Try your predictions",
    country: "No championship points",
    practice: t(-24),
    qualifying: t(200),
    race: t(220),
    practiceRound: true,
    length: "—",
    laps: 0,
    photo: "/circuit-night.svg",
    credit: "Illustration",
    focal: 50,
  });
  s.settings.announcements = [
    {
      id: randomUUID(),
      title: "Welcome to the grid",
      body: "This is an interactive demo. Drivers, dates and results are sample data—not an official calendar. Try a prediction, then explore the admin controls.",
      date: t(-24),
    },
  ];
  return s;
}
