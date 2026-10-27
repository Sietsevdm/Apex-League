"use client";
import { useEffect, useRef, useState } from "react";
import {
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  CloudSun,
  Sun,
  Wind,
  Droplets,
  X,
  ChevronRight,
  MapPin,
} from "lucide-react";
import type { Event } from "@/lib/model";
import type { CircuitWeather } from "@/lib/banner-weather";
import type {
  WeekendForecast as Forecast,
  SessionForecast,
} from "@/lib/weekend-forecast";
import { useLocale } from "@/lib/i18n";
import { weekendSessions } from "@/lib/weekend-progress";
import { backgroundRefresh } from "@/lib/background-refresh";

export default function WeekendForecast({
  event,
  weather,
}: {
  event: Event;
  weather?: CircuitWeather | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { t, date } = useLocale();
  const [open, setOpen] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Forecast } | null>(
    null,
  );
  const [error, setError] = useState(false);
  const key = `${event.id}:${weekendSessions(event)
    .map((s) => s.time)
    .join("|")}`;
  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(false);
    const refresh = backgroundRefresh({
      initiallyStale: true,
      interval: 15 * 60000,
      active: () => document.visibilityState === "visible" && navigator.onLine,
      subscribe: (changed) => {
        document.addEventListener("visibilitychange", changed);
        window.addEventListener("online", changed);
        window.addEventListener("offline", changed);
        return () => {
          document.removeEventListener("visibilitychange", changed);
          window.removeEventListener("online", changed);
          window.removeEventListener("offline", changed);
        };
      },
      load: async (signal) => {
        const response = await fetch(
          `/api/banner-weather?eventId=${encodeURIComponent(event.id)}&forecast=1`,
          { signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Forecast unavailable");
        const value = await response.json();
        if (
          value.eventId !== event.id ||
          !Array.isArray(value.forecast?.sessions)
        )
          throw new Error("Forecast unavailable");
        return value.forecast as Forecast;
      },
      onData: (data) => {
        setResult({ key, data });
        setError(false);
      },
      onError: () => {
        setResult(null);
        setError(true);
      },
    });
    return () => refresh.dispose();
  }, [open, key, attempt, event.id]);
  const data = result?.key === key ? result.data : null;
  const sessions: SessionForecast[] = weekendSessions(event).map((s) => {
    if (Date.parse(s.time) < Date.now()) return { ...s, status: "started" };
    const found = data?.sessions.find(
      (p) => p.label === s.label && p.time === s.time,
    );
    if (
      found?.weather &&
      data?.fetchedAt &&
      Date.now() - Date.parse(data.fetchedAt) > 30 * 60000
    )
      return { ...s, status: "unavailable" };
    return found || { ...s, status: "unavailable" };
  });
  const featured = sessions.filter((s) => !/^FP/.test(s.label)),
    practice = sessions.filter((s) => /^FP/.test(s.label));
  const reason = (s: SessionForecast) =>
    t(
      s.status === "started"
        ? "Session has started"
        : s.status === "unknown"
          ? "Session time not confirmed"
          : s.status === "out_of_range"
            ? "Outside forecast range"
            : "Forecast unavailable",
    );
  const icon = (w: SessionForecast["weather"]) =>
    w?.label === "Snow"
      ? CloudSnow
      : w?.label === "Fog"
        ? CloudFog
        : w?.label === "Thunderstorm"
          ? CloudLightning
          : w?.wet
            ? CloudRain
            : w?.label === "Clear"
              ? Sun
              : CloudSun;
  const race = sessions.find((s) => s.label === "Race")?.weather;
  return (
    <>
      <button
        className="banner-weather forecast-trigger"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        aria-label={t("Open weekend forecast")}
      >
        <CloudSun size={15} />
        {weather
          ? `${weather.temperature}°C · ${t(weather.label)}`
          : t("Weekend forecast")}
        <span>
          {t("Weekend forecast")} <ChevronRight size={12} />
        </span>
      </button>
      <dialog
        ref={dialog}
        className="weekend-forecast"
        aria-labelledby="forecast-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="forecast-body">
          <div className="forecast-heading">
            <span className="forecast-eyebrow">{t("THE WEEKEND AHEAD")}</span>
            <button
              className="forecast-close"
              aria-label={t("Close forecast")}
              onClick={() => dialog.current?.close()}
            >
              <X size={20} />
            </button>
          </div>
          <h2 id="forecast-title">{t("Weekend forecast")}</h2>
          <p className="forecast-location">
            <MapPin size={14} />
            {event.circuit}
          </p>
          <div className="forecast-preview-note">
            <span />
            {data?.fetchedAt
              ? `${t("Updated")} ${date(data.fetchedAt)}`
              : t(
                  error
                    ? "Forecast unavailable"
                    : data?.disabled
                      ? "Weather forecasts are disabled"
                      : "Loading forecast…",
                )}
          </div>
          <div className="forecast-outlook">
            <CloudRain size={30} />
            <div>
              <strong>
                {t(
                  race
                    ? race.rain >= 50
                      ? "Rain possible for the race"
                      : "Lower rain chance for the race"
                    : "Plan for the weekend",
                )}
              </strong>
              <p>{t("Forecast for the hour each session starts.")}</p>
            </div>
          </div>
          {error && (
            <button
              className="secondary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              {t("Try again")}
            </button>
          )}
          {!data?.disabled && (
            <>
              <div className="forecast-cards">
                {featured.map((s) => {
                  const w = s.weather,
                    Icon = icon(w);
                  return (
                    <article
                      className={`forecast-card ${w?.wet ? "forecast-rain" : ""}`}
                      key={s.label}
                    >
                      <div className="forecast-session">
                        <strong>
                          {t(s.label === "Quali" ? "Qualifying" : s.label)}
                        </strong>
                        <span>
                          {Number.isFinite(Date.parse(s.time))
                            ? date(s.time)
                            : t("To be confirmed")}
                        </span>
                      </div>
                      {w ? (
                        <>
                          <div className="forecast-temperature">
                            <Icon size={38} strokeWidth={1.4} />
                            <strong>
                              {w.temperature}
                              <span>°C</span>
                            </strong>
                          </div>
                          <p className="forecast-condition">{t(w.label)}</p>
                          <div className="forecast-metrics">
                            <span>
                              <Droplets size={15} />
                              <strong>{w.rain}%</strong> {t("precipitation")}
                            </span>
                            <span>
                              <Wind size={15} />
                              <strong>{w.wind}</strong> km/h
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="forecast-condition forecast-missing">
                          {t(!data && !error ? "Loading forecast…" : reason(s))}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
              {practice.length > 0 && (
                <div className="forecast-practice">
                  {practice.map((s) => {
                    const PracticeIcon = icon(s.weather);
                    return (
                      <div key={s.label}>
                        <strong>{s.label}</strong>
                        {s.weather ? (
                          <>
                            <PracticeIcon size={17} />
                            <span>{s.weather.temperature}°</span>
                            <small>
                              <Droplets size={11} />
                              {s.weather.rain}%
                            </small>
                          </>
                        ) : (
                          <small>{!data && !error ? "…" : reason(s)}</small>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <footer className="forecast-footer">
            <span>{t("Times shown in your timezone")}</span>
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Weather data by Open-Meteo")}
            </a>
          </footer>
        </div>
      </dialog>
    </>
  );
}
