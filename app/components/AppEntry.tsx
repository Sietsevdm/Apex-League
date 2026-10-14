"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Auth from "./Auth";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import { appearanceStyle } from "@/lib/appearance";
import type { Call, ClientData } from "@/lib/client-data";

const LeagueApp = dynamic(() => import("./LeagueApp"), {
  loading: () => <Loading />,
});
function Loading() {
  const { t } = useLocale();
  return (
    <main className="app loading">
      <div className="brand-mark">A</div>
      <h2>{t("Preparing your grid…")}</h2>
    </main>
  );
}
type Props = {
  initialData: ClientData;
  hasSession: boolean;
  initialError?: string;
};
function Entry({ initialData, hasSession, initialError = "" }: Props) {
  const [data, setData] = useState(initialData);
  const [checking, setChecking] = useState(hasSession);
  const [error, setError] = useState(initialError);

  // Only returning sessions need a state request. Anonymous login is already rendered.
  useEffect(() => {
    if (!hasSession) return;
    const controller = new AbortController();
    fetch("/api/league", {
      cache: "no-store",
      signal: controller.signal,
      headers: { "X-Apex-Scope": "season" },
    })
      .then(async (response) => {
        const next = await response.json();
        if (!response.ok) throw new Error(next.error);
        if (!controller.signal.aborted) setData(next);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError((reason as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [hasSession]);

  const signedOut = useCallback(
    (next: ClientData) => {
      setData({ ...initialData, ...next });
      setError("");
    },
    [initialData],
  );
  const call: Call = async (body) => {
    const response = await fetch("/api/league", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Apex-Scope": "season" },
      body: JSON.stringify(body),
    });
    const next = await response.json();
    if (!response.ok) throw new Error(next.error);
    if ("authenticated" in next) setData(next);
    return next;
  };
  return (
    <div style={appearanceStyle(data)}>
      {checking ? (
        <Loading />
      ) : data.authenticated && data.state ? (
        <LeagueApp initialData={data} onSignedOut={signedOut} />
      ) : (
        <Auth data={data} call={call} error={error} setError={setError} />
      )}
    </div>
  );
}
export default function AppEntry(props: Props) {
  return (
    <LocaleProvider>
      <Entry {...props} />
    </LocaleProvider>
  );
}
