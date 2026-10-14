"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { State, standings } from "@/lib/model";
import { seasonNameMatches } from "@/lib/season-controls";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { useState } from "react";
import { Heading } from "./Shared";
function Archive({
  s,
  onSelect,
  call,
  isAdmin,
}: {
  s: State;
  onSelect: (id: string) => void;
  call: Call;
  isAdmin: boolean;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [purging, setPurging] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Heading
        eyebrow="THE LEAGUE LEGACY"
        title={tr("Season archive")}
        description={tr("The title fights and bragging rights live on.")}
      />
      <div className="archive-grid">
        {tr(
          s.seasons.map((season) => {
            const summary = (
              s as State & {
                seasonSummaries?: Record<
                  string,
                  { leaders: string; total: number }
                >;
              }
            ).seasonSummaries?.[season.id];
            const rows = summary ? [] : standings(s, season.id);
            return (
              <section className="panel archive-item" key={season.id}>
                <button
                  className="archive-card"
                  onClick={() => onSelect(season.id)}
                >
                  <CalendarDays />
                  <span>
                    {tr(season.archived ? "ARCHIVED" : "ACTIVE SEASON")}
                  </span>
                  <h2>{season.name}</h2>
                  <p>
                    {tr(season.archived ? "Champion" : "Current leader")}
                    {tr(":")}
                    {tr(" ")}
                    {tr(
                      summary?.leaders ||
                        rows
                          .filter((x) => x.rank === 1)
                          .map((x) => x.name)
                          .join(" & ") ||
                        "To be decided",
                    )}
                  </p>
                  <strong>
                    {tr(summary?.total ?? rows[0]?.total ?? 0)} {tr("points")}
                    <ArrowUpRight size={18} />
                  </strong>
                </button>
                {isAdmin && (
                  <>
                    <div className="button-row archive-actions">
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          call({
                            action: "archive",
                            seasonId: season.id,
                            archived: !season.archived,
                          })
                        }
                      >
                        {tr(
                          season.archived ? "Reopen season" : "Archive season",
                        )}
                      </button>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => {
                          setPurging(season.id);
                          setConfirmation("");
                          setError("");
                        }}
                      >
                        {tr(season.archived ? "Delete season" : "Purge")}
                      </button>
                    </div>
                    {purging === season.id && (
                      <div className="season-purge">
                        <p className="muted">
                          {tr(
                            "Remove this season and its races, predictions, results and receipts. Accounts, settings and banners are kept. An encrypted backup is created first.",
                          )}
                        </p>
                        <p className="tiny">
                          {tr("Season name:")} <strong>{season.name}</strong>{" "}
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() =>
                              navigator.clipboard.writeText(season.name)
                            }
                          >
                            {tr("Copy season name")}
                          </button>
                        </p>
                        <label>
                          {tr("Type the season name to confirm")}
                          <input
                            placeholder={season.name}
                            value={confirmation}
                            disabled={busy}
                            onChange={(e) => setConfirmation(e.target.value)}
                            autoComplete="off"
                          />
                        </label>
                        <div className="button-row">
                          <button
                            className="secondary"
                            disabled={
                              busy ||
                              !seasonNameMatches(confirmation, season.name)
                            }
                            onClick={async () => {
                              setBusy(true);
                              setError("");
                              try {
                                await call({
                                  action: season.archived
                                    ? "deleteArchivedSeason"
                                    : "purgeSeason",
                                  seasonId: season.id,
                                  confirmation,
                                });
                                setPurging(null);
                                setConfirmation("");
                              } catch (e) {
                                setError((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {tr(
                              busy
                                ? "Saving…"
                                : season.archived
                                  ? "Confirm deletion"
                                  : "Confirm purge",
                            )}
                          </button>
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => setPurging(null)}
                          >
                            {tr("Cancel")}
                          </button>
                        </div>
                        {error && (
                          <p className="form-error" role="alert">
                            {tr(error)}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          }),
        )}
      </div>
    </>
  );
}

export default Archive;
