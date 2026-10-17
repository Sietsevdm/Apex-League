"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n";
import type { Call } from "@/lib/client-data";
export default function CalendarSubscription({
  seasonId,
  call,
}: {
  seasonId: string;
  call: Call;
}) {
  const { t, language } = useLocale();
  const callRef = useRef(call);
  callRef.current = call;
  const [error, setError] = useState("");
  const [active, setActive] = useState(false),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl("");
    setError("");
    setActive(false);
    setCopied(false);
    void callRef
      .current({ action: "calendarSubscriptionStatus", seasonId }, true)
      .then((data) => {
        if (alive) setActive(data.calendarSubscription.active);
      })
      .catch((error) => {
        if (alive) setError(error.message);
      });
    return () => {
      alive = false;
    };
  }, [seasonId]);
  const change = async (action: string) => {
    setBusy(true);
    setError("");
    try {
      const data = await call({ action, seasonId, language }, true);
      setActive(data.calendarSubscription.active);
      setCopied(false);
      setUrl(
        data.calendarSubscription.path
          ? new URL(data.calendarSubscription.path, window.location.origin).href
          : "",
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="calendar-subscription">
      <h3>{t("Subscribe to deadline updates")}</h3>
      {error && <p role="alert">{t(error)}</p>}
      <p className="tiny">
        {t(
          "Add this link as a calendar subscription to receive schedule changes automatically. Your calendar app controls refresh timing and reminders.",
        )}
      </p>
      <div className="button-row">
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void change("calendarSubscriptionCreate")}
        >
          {t(active ? "Replace subscription link" : "Create subscription link")}
        </button>
        {active && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void change("calendarSubscriptionRevoke")}
          >
            {t("Revoke subscription")}
          </button>
        )}
      </div>
      {active && !url && (
        <p className="tiny muted">
          {t(
            "A subscription is active. Replacing the link stops the previous one.",
          )}
        </p>
      )}
      {url && (
        <>
          <label>
            {t("Private subscription URL")}
            <input
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <div className="button-row">
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {t(copied ? "Copied" : "Copy subscription link")}
            </button>
            <a
              className="secondary"
              href={url.replace(/^https?:/, "webcal:")}
              referrerPolicy="no-referrer"
            >
              {t("Open calendar app")}
            </a>
          </div>
          <p className="tiny muted">
            {t(
              "Keep this link private. It grants access to deadlines only. Copy it now; it is only shown when created.",
            )}
          </p>
        </>
      )}
    </div>
  );
}
