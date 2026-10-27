"use client";
import { useRef } from "react";
import {
  CloudRain,
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
import { useLocale } from "@/lib/i18n";
import { weekendSessions } from "@/lib/weekend-progress";

/** Visual prototype only: sample forecast numbers never enter league data. */
export default function WeekendForecastPreview({
  event,
  weather,
}: {
  event: Event;
  weather?: CircuitWeather | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { t, date } = useLocale();
  const sessions = weekendSessions(event);
  const practice = sessions.filter((s) => /^FP/.test(s.label));
  const featured = sessions.filter((s) => !/^FP/.test(s.label));
  return (
    <>
      <button
        className="banner-weather forecast-trigger"
        onClick={() => dialog.current?.showModal()}
        aria-label={t("Open weekend forecast preview")}
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
            {t("Design preview · Sample forecast")}
          </div>
          <div className="forecast-outlook">
            <CloudRain size={30} />
            <div>
              <strong>{t("A dry grid. A wet Sunday?")}</strong>
              <p>{t("Race-day showers could mix up the order.")}</p>
            </div>
          </div>
          <div className="forecast-cards">
            {featured.map((s) => {
              const race = s.label === "Race";
              const Icon = race ? CloudRain : CloudSun;
              return (
                <article
                  className={`forecast-card ${race ? "forecast-rain" : ""}`}
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
                  <div className="forecast-temperature">
                    <Icon size={38} strokeWidth={1.4} />
                    <strong>
                      {race ? 20 : 23}
                      <span>°C</span>
                    </strong>
                  </div>
                  <p className="forecast-condition">
                    {t(race ? "Showers" : "Partly cloudy")}
                  </p>
                  <div className="forecast-metrics">
                    <span>
                      <Droplets size={15} />
                      <strong>{race ? 75 : 20}%</strong> {t("rain")}
                    </span>
                    <span>
                      <Wind size={15} />
                      <strong>{race ? 18 : 12}</strong> km/h
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
          {practice.length > 0 && (
            <div className="forecast-practice">
              {practice.map((s, i) => (
                <div key={s.label}>
                  <strong>{s.label}</strong>
                  <Sun size={17} />
                  <span>{24 - i}°</span>
                  <small>
                    <Droplets size={11} />
                    {10 + i * 5}%
                  </small>
                </div>
              ))}
            </div>
          )}
          <footer className="forecast-footer">
            <span>{t("Times shown in your timezone")}</span>
            <span>{t("Illustrative weather · Live data not connected")}</span>
          </footer>
        </div>
      </dialog>
    </>
  );
}
