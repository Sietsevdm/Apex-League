"use client";
import { useEffect, useState } from "react";
import type { CircuitWeather } from "@/lib/banner-weather";
import { backgroundRefresh } from "@/lib/background-refresh";

type BannerWeatherData = { eventId: string; weather: CircuitWeather | null; photo: string | null };
export function useBannerWeather(eventId: string | undefined, enabled: boolean, basePhoto: string | undefined, userId: string) {
  const [data, setData] = useState<{ value: BannerWeatherData; basePhoto: string | undefined; userId: string } | null>(null);
  useEffect(() => {
    if (!eventId || !enabled) return;
    const refresh = backgroundRefresh({
      initiallyStale: true, interval: 15 * 60_000,
      active: () => document.visibilityState === "visible" && navigator.onLine,
      subscribe: changed => {
        document.addEventListener("visibilitychange", changed);
        window.addEventListener("online", changed);
        window.addEventListener("offline", changed);
        window.addEventListener("focus", changed);
        return () => {
          document.removeEventListener("visibilitychange", changed);
          window.removeEventListener("online", changed);
          window.removeEventListener("offline", changed);
          window.removeEventListener("focus", changed);
        };
      },
      load: async signal => {
        const response = await fetch(`/api/banner-weather?eventId=${encodeURIComponent(eventId)}`, { signal, cache: "no-store" });
        if (!response.ok) throw new Error("Weather unavailable");
        return await response.json() as BannerWeatherData;
      },
      onData: value => setData({ value, basePhoto, userId }), onError: () => setData(null),
    });
    return () => { refresh.dispose(); };
  }, [eventId, enabled, basePhoto, userId]);
  return enabled && data && data.value.eventId === eventId && data.basePhoto === basePhoto && data.userId === userId &&
    (!data.value.weather || Date.now() - Date.parse(data.value.weather.fetchedAt) < 30 * 60_000) ? data.value : null;
}
