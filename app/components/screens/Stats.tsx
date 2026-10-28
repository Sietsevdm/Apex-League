"use client";
import { useLocale } from "@/lib/i18n";
import { Season, State, score, standings } from "@/lib/model";
import { Flag, Target, TrendingUp, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { Heading, Metric } from "./Shared";
import ReceiptHistory from "../ReceiptHistory";
import SeasonProgress from "../SeasonProgress";
const Awards = dynamic(() => import("../LeagueExtras").then((m) => m.Awards), {
  loading: () => null,
});
function Stats({
  s,
  season,
  meId,
}: {
  s: State;
  season: Season;
  meId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const me = standings(s, season.id).find((r) => r.id === meId);
  const weeks = me?.weekends || [];
  const best = Math.max(0, ...weeks.map((w) => w.total));
  return (
    <>
      <Heading
        eyebrow="YOUR SEASON STORY"
        title={tr("Progress through the grid")}
      />
      <Awards s={s} season={season} />
      <SeasonProgress key={season.id} s={s} season={season} meId={meId} />
      <div className="metrics">
        <Metric
          label={tr("TOTAL POINTS")}
          value={String(me?.total || 0)}
          detail="Includes confirmed title bonuses"
          icon={<Trophy />}
        />
        <Metric
          label={tr("EXACT POSITIONS")}
          value={String(me?.exact || 0)}
          detail="GP and Sprint positions"
          icon={<Target />}
        />
        <Metric
          label={tr("WEEKEND WINS")}
          value={String(me?.wins || 0)}
          detail="Shared wins count too"
          icon={<Flag />}
        />
        <Metric
          label={tr("BEST WEEKEND")}
          value={String(best)}
          detail="Your highest points haul"
          icon={<TrendingUp />}
        />
      </div>
      <section className="panel">
        <h2>{tr("Your points by weekend")}</h2>
        <div className="bar-chart">
          {tr(
            weeks.map((w) => (
              <div className="bar-row" key={w.eventId}>
                <span>
                  {tr(
                    s.events
                      .find((e) => e.id === w.eventId)
                      ?.name.replace(" Grand Prix", ""),
                  )}
                </span>
                <div>
                  <i
                    style={{ width: `${best ? (w.total / best) * 100 : 0}%` }}
                  />
                </div>
                <strong>{tr(w.total)}</strong>
              </div>
            )),
          )}
        </div>
      </section>
      <section className="panel">
        <h2>{tr("Prediction history")}</h2>
        <div className="table-scroll" role="region" aria-label={tr("Prediction history")} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>{tr("EVENT")}</th>
              <th>{tr("ENTRY")}</th>
              <th>{tr("STATUS")}</th>
              <th>{tr("POINTS")}</th>
            </tr>
          </thead>
          <tbody>
            {tr(
              s.entries
                .filter(
                  (x) =>
                    x.userId === meId &&
                    s.events.some(
                      (e) => e.id === x.eventId && e.seasonId === season.id,
                    ),
                )
                .map((x) => {
                  const e = s.events.find((e) => e.id === x.eventId)!;
                  return (
                    <tr key={`${x.eventId}-${x.kind}`}>
                      <td>
                        {e.name}
                        {tr(e.practiceRound ? " · Practice" : "")}
                      </td>
                      <td>{tr(x.kind.toUpperCase())}</td>
                      <td>{tr(x.submitted ? "Submitted" : "Draft")}</td>
                      <td>{tr(score(x.picks, e[x.kind], x.kind).total)}</td>
                    </tr>
                  );
                }),
            )}
          </tbody>
        </table>
        </div>
      </section>
      <ReceiptHistory key={season.id} s={s} season={season} meId={meId} />
    </>
  );
}

export default Stats;
