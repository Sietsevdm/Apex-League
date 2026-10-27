import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseHourlyForecast,
  sessionForecasts,
  createForecastService,
} from "../lib/weekend-forecast";
import { seed } from "../lib/seed";
import { WEATHER_INTERVAL } from "../lib/banner-weather";
const now = Date.parse("2026-10-27T10:00:00Z");
const base = () => ({
  ...seed(true).events[0],
  practice: "2026-10-27T09:00:00Z",
  practice2: "",
  practice3: "2026-11-20T10:00:00Z",
  qualifying: "2026-10-28T13:35:00Z",
  race: "2026-10-29T15:00:00Z",
  sprintQualifying: undefined,
  sprintRace: undefined,
  hasSprint: false,
  location: { latitude: 34.8431, longitude: 136.541 },
});
const raw = () => ({
  hourly: {
    time: [
      Date.parse("2026-10-28T13:00:00Z") / 1000,
      Date.parse("2026-10-29T15:00:00Z") / 1000,
    ],
    temperature_2m: [23.3, 19.8],
    precipitation_probability: [0, 75],
    wind_speed_10m: [0, 18.1],
    weather_code: [2, 80],
  },
});
test("hourly forecast maps UTC session-start hours, including non-whole-hour starts, with real zero values", () => {
  const data = parseHourlyForecast(raw(), now)!;
  const rows = sessionForecasts(base(), data, now);
  assert.equal(rows[0].status, "started");
  assert.equal(rows[1].status, "unknown");
  assert.equal(rows[2].status, "out_of_range");
  assert.deepEqual(rows[3].weather, {
    time: Date.parse("2026-10-28T13:00:00Z"),
    temperature: 23,
    rain: 0,
    wind: 0,
    label: "Partly cloudy",
    wet: false,
  });
  assert.equal(rows[4].weather?.rain, 75);
  assert.equal(rows[4].weather?.label, "Showers");
  const sprint = {
    ...base(),
    sprintQualifying: "2026-10-28T13:45:00Z",
    sprintRace: "2026-10-29T15:00:00Z",
  };
  assert.equal(sessionForecasts(sprint, data, now)[1].weather?.temperature, 23);
  assert.equal(
    sessionForecasts(
      { ...base(), qualifying: "2026-10-28T14:00:00Z" },
      data,
      now,
    )[3].status,
    "unavailable",
    "do not borrow an earlier forecast hour across a gap",
  );
  assert.equal(
    sessionForecasts({ ...base(), race: "2026-10-30T00:00:00Z" }, data, now)[4]
      .status,
    "out_of_range",
  );
});
test("missing and invalid forecast values are unavailable rather than invented", () => {
  for (const value of [null, {}, { hourly: { time: [] } }])
    assert.equal(parseHourlyForecast(value, now), null);
  for (const field of [
    "temperature_2m",
    "precipitation_probability",
    "wind_speed_10m",
    "weather_code",
  ]) {
    const input: any = raw();
    input.hourly[field][1] = null;
    const rows = sessionForecasts(base(), parseHourlyForecast(input, now), now);
    assert.equal(rows[4].status, "unavailable");
    assert.equal(rows[4].weather, undefined);
  }
  const invalid: any = raw();
  invalid.hourly.precipitation_probability = [-1, 101];
  assert.equal(parseHourlyForecast(invalid, now), null);
});
test("forecast provider uses circuit coordinates, UTC, explicit units, deduplicated caching and failure recovery", async () => {
  let at = now,
    calls = 0,
    fail = false;
  const urls: URL[] = [];
  const service = createForecastService(
    (async (input) => {
      calls++;
      urls.push(new URL(String(input)));
      if (fail) throw Error("offline");
      return Response.json(raw());
    }) as typeof fetch,
    () => at,
    async (e) => e.location!,
  );
  const [a, b] = await Promise.all([
    service.forecast(base()),
    service.forecast(base()),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
  assert.equal(urls[0].searchParams.get("latitude"), "34.8431");
  assert.equal(urls[0].searchParams.get("forecast_days"), "16");
  assert.equal(urls[0].searchParams.get("timezone"), "UTC");
  assert.equal(urls[0].searchParams.get("wind_speed_unit"), "kmh");
  await service.forecast({ ...base(), qualifying: "2026-10-28T14:00:00Z" });
  assert.equal(calls, 1);
  at += WEATHER_INTERVAL + 1;
  fail = true;
  assert.equal(
    (await service.forecast(base())).sessions[4].status,
    "unavailable",
  );
  assert.equal(calls, 2);
  await service.forecast(base());
  assert.equal(calls, 2);
  at += 60001;
  fail = false;
  assert.equal((await service.forecast(base())).sessions[4].weather?.rain, 75);
  assert.equal(calls, 3);
});
test("unknown locations, past races, distant calendars and disabled weather do not fetch forecast data", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return Response.json(raw());
  }) as typeof fetch;
  const noLocation = createForecastService(
    fetcher,
    () => now,
    async () => null,
  );
  assert.equal(
    (await noLocation.forecast(base())).sessions[4].status,
    "unavailable",
  );
  assert.equal(calls, 0);
  const service = createForecastService(
    fetcher,
    () => now,
    async (e) => e.location!,
  );
  const distant = {
    ...base(),
    practice: "",
    practice3: "",
    qualifying: "2027-01-01T12:00:00Z",
    race: "2027-01-02T12:00:00Z",
  };
  await service.forecast(distant);
  assert.equal(calls, 0);
  const before = process.env.BANNER_WEATHER_ENABLED;
  try {
    process.env.BANNER_WEATHER_ENABLED = "false";
    assert.equal((await service.forecast(base())).disabled, true);
    assert.equal(calls, 0);
  } finally {
    if (before === undefined) delete process.env.BANNER_WEATHER_ENABLED;
    else process.env.BANNER_WEATHER_ENABLED = before;
  }
});

test("ordinary overview exposes the functional forecast without a demo flag or sample numbers", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: Home } = await import("../components/screens/Home");
  const state = seed(true);
  state.settings.bannerOverride = state.events.find(
    (e) => !e.practiceRound,
  )!.id;
  const html = renderToStaticMarkup(
    createElement(Home, {
      s: state,
      season: state.seasons[0],
      meId: state.users[0].id,
      go: () => {},
    }),
  );
  assert.match(html, /Open weekend forecast/);
  assert.match(html, /Loading forecast/);
  assert.ok(!html.includes("Sample forecast"));
  assert.ok(!html.includes("wet Sunday"));
});
