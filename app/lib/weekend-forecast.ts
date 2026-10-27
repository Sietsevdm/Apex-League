import type { Event } from "./model";
import { bannerWeather, WEATHER_INTERVAL } from "./banner-weather";
import { weekendSessions } from "./weekend-progress";
export type ForecastPoint = {
  time: number;
  temperature: number;
  rain: number;
  wind: number;
  label: string;
  wet: boolean;
};
export type SessionForecast = {
  label: string;
  time: string;
  status: "available" | "started" | "unknown" | "out_of_range" | "unavailable";
  weather?: ForecastPoint;
};
export type WeekendForecast = {
  sessions: SessionForecast[];
  fetchedAt?: string;
  disabled?: boolean;
};
type HourlyForecast = {
  points: ForecastPoint[];
  first: number;
  last: number;
  fetchedAt: string;
};
const codes = new Set([
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 97, 99,
]);
export function parseHourlyForecast(
  data: any,
  now: number,
): HourlyForecast | null {
  const h = data?.hourly;
  if (!Array.isArray(h?.time) || !h.time.length) return null;
  const points: ForecastPoint[] = [];
  const validTimes = h.time
    .filter((t: unknown) => typeof t === "number" && Number.isFinite(t))
    .map((t: number) => t * 1000);
  if (!validTimes.length) return null;
  h.time.forEach((t: unknown, i: number) => {
    const temperature = h.temperature_2m?.[i],
      rain = h.precipitation_probability?.[i],
      wind = h.wind_speed_10m?.[i],
      code = h.weather_code?.[i];
    if (
      typeof t !== "number" ||
      !Number.isFinite(t) ||
      !codes.has(code) ||
      ![temperature, rain, wind].every(
        (v) => typeof v === "number" && Number.isFinite(v),
      ) ||
      rain < 0 ||
      rain > 100 ||
      wind < 0
    )
      return;
    const snow = [71, 73, 75, 77, 85, 86].includes(code),
      wet = !snow && code >= 51;
    const label =
      code >= 95
        ? "Thunderstorm"
        : snow
          ? "Snow"
          : code >= 80
            ? "Showers"
            : wet
              ? "Rain"
              : code >= 45
                ? "Fog"
                : code === 3
                  ? "Cloudy"
                  : code === 2
                    ? "Partly cloudy"
                    : "Clear";
    points.push({
      time: t * 1000,
      temperature: Math.round(temperature),
      rain: Math.round(rain),
      wind: Math.round(wind),
      label,
      wet,
    });
  });
  if (!points.length) return null;
  return {
    points,
    first: Math.min(...validTimes),
    last: Math.max(...validTimes),
    fetchedAt: new Date(now).toISOString(),
  };
}
export function sessionForecasts(
  event: Event,
  hourly: HourlyForecast | null,
  now: number,
): SessionForecast[] {
  const end = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate() + 16,
  );
  return weekendSessions(event).map((s) => {
    const start = Date.parse(s.time);
    if (!Number.isFinite(start)) return { ...s, status: "unknown" };
    if (start < now) return { ...s, status: "started" };
    if (start >= end) return { ...s, status: "out_of_range" };
    if (!hourly) return { ...s, status: "unavailable" };
    const hour = Math.floor(start / 3600000) * 3600000;
    const weather = hourly.points.find((p) => p.time === hour);
    if (weather) return { ...s, status: "available", weather };
    return {
      ...s,
      status:
        hour < hourly.first || hour > hourly.last
          ? "out_of_range"
          : "unavailable",
    };
  });
}
export function createForecastService(
  fetcher: typeof fetch = fetch,
  clock = Date.now,
  locate = bannerWeather.location,
) {
  const cache = new Map<
    string,
    {
      until: number;
      data: HourlyForecast | null;
      pending?: Promise<HourlyForecast | null>;
    }
  >();
  async function hourly(latitude: number, longitude: number) {
    const key = `${latitude},${longitude}`;
    const old = cache.get(key);
    if (old?.pending) return old.pending;
    if (old && old.until > clock()) return old.data;
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    const entry = { until: 0, data: null } as {
      until: number;
      data: HourlyForecast | null;
      pending?: Promise<HourlyForecast | null>;
    };
    const pending = (async () => {
      try {
        const apiKey = process.env.OPEN_METEO_API_KEY;
        const url = new URL(
          apiKey
            ? "https://customer-api.open-meteo.com/v1/forecast"
            : "https://api.open-meteo.com/v1/forecast",
        );
        url.searchParams.set("latitude", String(latitude));
        url.searchParams.set("longitude", String(longitude));
        url.searchParams.set(
          "hourly",
          "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
        );
        url.searchParams.set("forecast_days", "16");
        url.searchParams.set("timezone", "UTC");
        url.searchParams.set("timeformat", "unixtime");
        url.searchParams.set("temperature_unit", "celsius");
        url.searchParams.set("wind_speed_unit", "kmh");
        if (apiKey) url.searchParams.set("apikey", apiKey);
        const response = await fetcher(url, {
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        entry.data = response.ok
          ? parseHourlyForecast(await response.json(), clock())
          : null;
      } catch {
        entry.data = null;
      }
      entry.until = clock() + (entry.data ? WEATHER_INTERVAL : 60000);
      delete entry.pending;
      return entry.data;
    })();
    entry.pending = pending;
    cache.set(key, entry);
    return pending;
  }
  return {
    async forecast(event: Event): Promise<WeekendForecast> {
      if (process.env.BANNER_WEATHER_ENABLED === "false")
        return { sessions: [], disabled: true };
      const initial = sessionForecasts(event, null, clock());
      if (!initial.some((s) => s.status === "unavailable"))
        return { sessions: initial };
      let data: HourlyForecast | null = null;
      try {
        const point = await locate(event);
        if (point) data = await hourly(point.latitude, point.longitude);
      } catch {}
      return {
        sessions: sessionForecasts(event, data, clock()),
        fetchedAt: data?.fetchedAt,
      };
    },
  };
}
const shared = globalThis as unknown as {
  apexWeekendForecast?: ReturnType<typeof createForecastService>;
};
export const weekendForecast = (shared.apexWeekendForecast ??=
  createForecastService());
