"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { dutch } from "./nl";
export type Language = "en" | "nl";
const LocaleContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  timezone?: string;
  setTimezone: (timezone?: string) => void;
}>({ language: "en", setLanguage: () => {}, setTimezone: () => {} });
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [timezone, setTimezone] = useState<string>();
  useEffect(() => {
    const saved = localStorage.getItem("league-language");
    if (saved === "nl" || saved === "en") {
      document.documentElement.lang = saved;
      setLanguage(saved);
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const change = (value: Language) => {
    document.documentElement.lang = value;
    setLanguage(value);
    localStorage.setItem("league-language", value);
  };
  return (
    <LocaleContext.Provider value={{ language, setLanguage: change, timezone, setTimezone }}>
      {children}
    </LocaleContext.Provider>
  );
}
export function translate<T>(value: T, language: Language): T {
  if (language === "en" || typeof value !== "string") return value;
  const trimmed = value.trim();
  const translated = dutch[trimmed];
  if (translated) return value.replace(trimmed, translated) as T;
  const patterns: [RegExp, string][] = [
    [/^Let’s race, (.+)\.$/, "Tijd om te racen, $1."],
    [/^(\d+) points$/, "$1 punten"],
    [/^(\d+) players on the grid$/, "$1 spelers op de grid"],
    [/^(\d+) points to the leader$/, "$1 punten achter de leider"],
    [/^View as (.+)$/, "Bekijk als $1"],
    [/^(.+) · Grand Prix$/, "$1 · Grand Prix"],
    [/^(.+) · Sprint$/, "$1 · Sprint"],
    [/^Closes in (.+)$/, "Sluit over $1"],
    [/^Closes (.+)$/, "Sluit $1"],
    [/^Locked (.+)$/, "Gesloten $1"],
    [/^(.+) recap$/, "$1 terugblik"],
  ];
  for (const [pattern, replacement] of patterns)
    if (pattern.test(value)) return value.replace(pattern, replacement) as T;
  return value as T;
}
export function useLocale() {
  const locale = useContext(LocaleContext);
  return {
    ...locale,
    t: <T,>(value: T) => translate(value, locale.language),
    date: (
      value: string,
      options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      },
    ) =>
      value
        ? new Date(value).toLocaleString(
            locale.language === "nl" ? "nl-NL" : "en-GB",
            { ...(locale.timezone ? { timeZone: locale.timezone } : {}), ...options },
          )
        : translate("Time to be confirmed", locale.language),
  };
}
