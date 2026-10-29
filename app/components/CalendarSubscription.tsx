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
  const [googleHelp, setGoogleHelp] = useState(false);
  const urlInput = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    setGoogleHelp(false);
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
              ref={urlInput}
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
                  urlInput.current?.focus();
                  urlInput.current?.select();
                  setError("Copy was unavailable. Touch and hold the selected link, then choose Copy.");
                }
              }}
            >
              {t(copied ? "Copied" : "Copy subscription link")}
            </button>
            <button className="secondary" aria-expanded={googleHelp} onClick={() => setGoogleHelp(!googleHelp)}>
              {t("Set up Google Calendar")}
            </button>
            <a
              className="secondary"
              href={url.replace(/^https?:/, "webcal:")}
              referrerPolicy="no-referrer"
            >
              {t("Add to iOS Calendar")}
            </a>
          </div>
          {googleHelp && (
            <section className="calendar-setup" aria-label={t("Google Calendar setup")}>
              <h4>{t("Google Calendar setup")}</h4>
              <p>{t("Google Calendar on Android cannot add a subscription link directly. Add it once in Google Calendar on a computer using the same Google account as your phone.")}</p>
              <ol>
                <li>{t("Copy your private subscription link above.")}</li>
                <li>{t("On a computer, open Google Calendar. Next to Other calendars, choose +, then From URL.")}</li>
                <li>{t("Paste the link and choose Add calendar.")}</li>
                <li>{t("On your phone, open Google Calendar and enable the new calendar in its menu. If it is missing, refresh the app and check Settings → Show more.")}</li>
              </ol>
              <a className="secondary" href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">{t("Open Google Calendar website")}</a>
              <p className="tiny">{t("Google controls calendar refresh and notifications. Check notification settings after adding the calendar; reminders are not confirmed by creating this link.")}</p>
            </section>
          )}
          <details className="calendar-manual-help">
            <summary>{t("Apple Calendar did not open?")}</summary>
            <p className="tiny">{t("On iPhone, copy the link, open Calendar → Calendars → Add Calendar → Add Subscription Calendar, and paste it. If using an in-app browser, open this page in Safari first.")}</p>
          </details>
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
