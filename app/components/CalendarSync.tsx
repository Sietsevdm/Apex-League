"use client";
import { useLocale } from "@/lib/i18n";
import { useState } from "react";
import { RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { State, Season } from "@/lib/model";
export default function CalendarSync({
  s,
  season,
  call,
}: {
  s: State;
  season: Season;
  call: (b: Record<string, unknown>, quiet?: boolean) => Promise<any>;
}) {
  const { t: tr, language } = useLocale();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const sync = season.calendarSync;
  const when = (v?: string) =>
    v
      ? new Date(v).toLocaleString(language === "nl" ? "nl-NL" : "en-GB")
      : "Not checked yet";
  const reviews = s.events.filter(
    (e) => e.seasonId === season.id && e.calendarReview,
  );
  return (
    <section className="panel">
      <div className="section-title">
        <h2>{tr("Automatic calendar sync")}</h2>
        <span className="pill">
          {tr(sync?.enabled ? "Daily checks enabled" : "Paused")}
        </span>
      </div>
      <p className="muted">
        {tr("Watch the ")}
        {tr(season.year)}
        {tr(
          " calendar as it is released. Dates can appear before session times; predictions stay closed until qualifying times are known.",
        )}
      </p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={Boolean(sync?.enabled)}
          onChange={async (e) => {
            try {
              await call({
                action: "calendarSyncSettings",
                seasonId: season.id,
                enabled: e.target.checked,
              });
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        {tr("Automatically check this season every day")}
      </label>
      <div className="sync-summary">
        <div>
          <small>{tr("LAST ATTEMPT")}</small>
          <strong>{tr(when(sync?.lastAttempt))}</strong>
        </div>
        <div>
          <small>{tr("LAST SUCCESSFUL CHECK")}</small>
          <strong>{tr(when(sync?.lastSuccess))}</strong>
        </div>
        <div>
          <small>{tr("STATUS")}</small>
          <strong>
            {tr(
              sync?.status === "waiting"
                ? "Waiting for calendar"
                : sync?.status === "error"
                  ? "Check failed"
                  : sync?.status === "synced"
                    ? "Up to date"
                    : "Not checked yet",
            )}
          </strong>
        </div>
      </div>
      <p className="tiny">
        {tr(
          sync?.message ||
            "Create the season, enable syncing, and the VPS calendar worker will watch for publication.",
        )}
      </p>
      <p className="tiny">
        {tr(
          "Background checks run through the calendar-worker service included in the Portainer stack. The local preview supports Check now; it does not start that service.",
        )}
      </p>
      <button
        className="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await call({ action: "calendarImport", seasonId: season.id }, true);
            setError("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw size={16} />
        {tr(busy ? "Checking…" : "Check now")}
      </button>
      {tr(error && <p className="form-error">{tr(error)}</p>)}
      {tr(
        reviews.length > 0 && (
          <div className="calendar-review">
            <h3>{tr("Needs your review")}</h3>
            {tr(
              reviews.map((e) => (
                <p key={e.id}>
                  <strong>{tr(e.name)}</strong>
                  <br />
                  {tr(e.calendarReview)}
                </p>
              )),
            )}
          </div>
        ),
      )}
      <details className="sync-history">
        <summary>{tr("Recent calendar changes")}</summary>
        {tr(
          sync?.changes?.length ? (
            sync.changes.map((change, i) => (
              <div key={i}>
                <span>{tr(change.message)}</span>
                <time>{tr(when(change.date))}</time>
              </div>
            ))
          ) : (
            <p className="tiny">{tr("No changes recorded yet.")}</p>
          ),
        )}
      </details>
      <p className="tiny">
        {tr(
          "Locked deadlines stay fixed. Changes appear in league announcements. Manual schedule overrides, photos, results and predictions are preserved. Missing races are flagged rather than deleted.",
        )}
      </p>
    </section>
  );
}
