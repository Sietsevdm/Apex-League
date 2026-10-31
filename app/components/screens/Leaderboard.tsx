"use client";
import { standingsMovement } from "@/lib/standings-movement";
import { useLocale } from "@/lib/i18n";
import { Season, State, standings, bannerEvent } from "@/lib/model";
import { Trophy } from "lucide-react";
import { Heading, StandingsTable } from "./Shared";
function Leaderboard({
  s,
  season,
  meId,
}: {
  s: State;
  season: Season;
  meId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const rows = standings(s, season.id);
  const weekend = season.archived ? undefined : bannerEvent(s, season.id);
  return (
    <>
      <Heading
        eyebrow="THE CHAMPIONSHIP"
        title={tr("Every point counts.")}
        description={tr(
          "Weekend wins and exact positions settle ties. If still equal, share the glory.",
        )}
      />
      <div className="podium-cards">
        {tr(
          rows.slice(0, 3).map((r) => (
            <div className={`podium-card place-${r.rank}`} key={r.id}>
              <span>
                {tr("POSITION")}
                {tr(r.rank)}
              </span>
              <Trophy size={25} />
              <h2>{r.name}</h2>
              <strong>
                {tr(r.total)}
                <small>{tr("points")}</small>
              </strong>
              <p>
                {tr(r.wins)} {tr("weekend wins \u00B7")} {tr(r.exact)}{" "}
                {tr("exact positions")}
              </p>
            </div>
          )),
        )}
      </div>
      <section className="panel">
        {weekend && <p className="muted standings-weekend-caption">{tr("Weekend picks")} · {weekend.name} · {tr("Checkmark means submitted; predictions remain private until the deadline.")}</p>}
        <StandingsTable submissions={weekend ? { s, event: weekend } : undefined} rows={rows} meId={meId} movement={standingsMovement(s, season.id)} />
      </section>
      <section className="panel">
        <h2>{tr("Where the points come from")}</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tr("PLAYER")}</th>
                <th>{tr("RACE POINTS")}</th>
                <th>{tr("CHAMPIONSHIP BONUS")}</th>
                <th>{tr("EXACT POSITIONS")}</th>
              </tr>
            </thead>
            <tbody>
              {tr(
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{tr(r.racePoints)}</td>
                    <td>{tr(r.bonus)}</td>
                    <td>{tr(r.exact)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default Leaderboard;
