import type { Event } from "./model";
import { matchedBanner } from "./banner-images";

export type BannerCondition = "sunny" | "cloudy" | "rainy" | "night";
export type CircuitLocation = { latitude: number; longitude: number };
export type CircuitWeather = {
  condition: BannerCondition;
  label: "Sunny" | "Clear" | "Cloudy" | "Fog" | "Rain" | "Snow" | "Thunderstorm";
  temperature: number;
  observedAt: string;
  fetchedAt: string;
};
export const WEATHER_INTERVAL = 15 * 60_000;
const weatherCodes = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 97, 99]);
export function validLocation(value: unknown): value is CircuitLocation {
  const v = value as CircuitLocation | undefined;
  return !!v && typeof v.latitude === "number" && Number.isFinite(v.latitude) && Math.abs(v.latitude) <= 90 &&
    typeof v.longitude === "number" && Number.isFinite(v.longitude) && Math.abs(v.longitude) <= 180;
}
export function parseWeather(data: any, now = Date.now()): CircuitWeather | null {
  const c = data?.current;
  if (!c || ![0, 1].includes(c.is_day) || !weatherCodes.has(c.weather_code) ||
    typeof c.temperature_2m !== "number" || !Number.isFinite(c.temperature_2m) ||
    typeof c.time !== "number" || !Number.isFinite(c.time) || Math.abs(now - c.time * 1000) > 90 * 60_000) return null;
  const code = c.weather_code;
  const snow = [71, 73, 75, 77, 85, 86].includes(code);
  const rain = !snow && code >= 51;
  const label: CircuitWeather["label"] = code >= 95 ? "Thunderstorm" : snow ? "Snow" : rain ? "Rain" : code >= 45 ? "Fog" : code >= 2 ? "Cloudy" : c.is_day ? "Sunny" : "Clear";
  return {
    condition: c.is_day === 0 ? "night" : rain ? "rainy" : code >= 2 ? "cloudy" : "sunny",
    label, temperature: Math.round(c.temperature_2m),
    observedAt: new Date(c.time * 1000).toISOString(), fetchedAt: new Date(now).toISOString(),
  };
}

// Circuit IDs are the calendar provider's identifiers, not city geocoding guesses.
const circuitIds: Record<string, string> = {
  "bahrain": "bahrain", "saudi-arabian": "jeddah", "australian": "albert_park",
  "japanese": "suzuka", "chinese": "shanghai", "miami": "miami", "canadian": "villeneuve",
  "monaco": "monaco", "portuguese": "portimao", "british": "silverstone", "austrian": "red_bull_ring",
  "belgian": "spa", "hungarian": "hungaroring", "italian": "monza", "spanish": "madring",
  "azerbaijan": "baku", "turkish": "istanbul", "singapore": "marina_bay", "united-states": "americas",
  "mexican": "rodriguez", "sao-paulo": "interlagos", "las-vegas": "vegas", "qatar": "losail", "abu-dhabi": "yas_marina",
};
export function weatherCircuitId(event: Event): string | undefined {
  if (event.providerCircuitId && /^[a-zA-Z0-9_-]{1,80}$/.test(event.providerCircuitId)) return event.providerCircuitId;
  return matchedBanner(event, 0, Object.entries(circuitIds).map(([race, id]) => ({
    key: `${race}-grand-prix`, file: race, url: id,
  })))?.url;
}

type CacheEntry<T> = { until: number; value?: T | null; pending?: Promise<T | null> };
/** Shared bounded caches deduplicate readers; failed providers never block league state or saves. */
export function createWeatherService(fetcher: typeof fetch = fetch, clock = Date.now) {
  const locations = new Map<string, CacheEntry<CircuitLocation>>();
  const weather = new Map<string, CacheEntry<CircuitWeather>>();
  async function cached<T>(cache: Map<string, CacheEntry<T>>, key: string, ttl: number, load: () => Promise<T | null>) {
    const old = cache.get(key);
    if (old?.pending) return old.pending;
    if (old && old.until > clock()) return old.value || null;
    if (cache.size >= 128) { const first = cache.keys().next().value; if (first !== undefined) cache.delete(first); }
    const entry: CacheEntry<T> = { until: 0 };
    const pending = (async () => {
      let value: T | null = null;
      try { value = await load(); } catch { /* Use the ordinary circuit banner on a provider outage. */ }
      entry.value = value;
      entry.until = clock() + (value ? ttl : 60_000);
      delete entry.pending;
      return value;
    })();
    entry.pending = pending;
    cache.set(key, entry);
    return pending;
  }
  async function location(event: Event) {
    if (validLocation(event.location)) return event.location;
    const id = weatherCircuitId(event);
    if (!id) return null;
    return cached(locations, id, 24 * 60 * 60_000, async () => {
      const response = await fetcher(`https://api.jolpi.ca/ergast/f1/circuits/${encodeURIComponent(id)}/?limit=1`, {
        signal: AbortSignal.timeout(5000), cache: "no-store",
      });
      if (!response.ok) return null;
      const raw = (await response.json())?.MRData?.CircuitTable?.Circuits?.[0]?.Location;
      if (!raw || raw.lat == null || raw.long == null || raw.lat === "" || raw.long === "") return null;
      const value = { latitude: Number(raw.lat), longitude: Number(raw.long) };
      return validLocation(value) ? value : null;
    });
  }
  return {
    location,
    async current(event: Event): Promise<CircuitWeather | null> {
      if (process.env.BANNER_WEATHER_ENABLED === "false") return null;
      const point = await location(event);
      if (!point) return null;
      const key = `${point.latitude},${point.longitude}`;
      return cached(weather, key, WEATHER_INTERVAL, async () => {
        const apiKey = process.env.OPEN_METEO_API_KEY;
        const url = new URL(apiKey ? "https://customer-api.open-meteo.com/v1/forecast" : "https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(point.latitude));
        url.searchParams.set("longitude", String(point.longitude));
        url.searchParams.set("current", "temperature_2m,weather_code,is_day");
        url.searchParams.set("timeformat", "unixtime");
        if (apiKey) url.searchParams.set("apikey", apiKey);
        const response = await fetcher(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
        return response.ok ? parseWeather(await response.json(), clock()) : null;
      });
    },
  };
}
const shared = globalThis as unknown as { apexBannerWeather?: ReturnType<typeof createWeatherService> };
export const bannerWeather = shared.apexBannerWeather ??= createWeatherService();
