"use client";
import { predictionsVisible, type Event, type Season, type State } from "@/lib/model";
import { predictionColumns } from "@/lib/weekend-social";
import { useLocale } from "@/lib/i18n";
import TimingDriver from "./TimingDriver";

export default function WeekendPredictionGrid({ s, season, event, kind, meId }: { s: State; season: Season; event: Event; kind: "gp" | "sprint"; meId: string }) {
  const { t } = useLocale();
  const visible = predictionsVisible(event, kind);
  const columns = predictionColumns(kind);
  const users = s.users.filter(u => u.seasonIds.includes(season.id));
  return <section className="panel weekend-grid-panel" aria-labelledby="weekend-grid-title">
    <div className="section-title"><h2 id="weekend-grid-title">{t("Weekend prediction grid")}</h2><span className="weekend-social-tag">{kind === "gp" ? "GP" : t("Sprint")}</span></div>
    <p className="muted">{t("The whole league. Every pick. One grid.")}</p>
    {!visible ? <div className="weekend-social-empty"><strong>{t("The grid is still secret")}</strong><p>{t("Submitted predictions become visible here after qualifying (scheduled start plus one hour).")}</p></div> : <>
      <div className="weekend-grid-scroll" role="region" aria-label={t("Weekend prediction grid")} tabIndex={0}>
        <table className="weekend-prediction-grid">
          <caption className="sr-only">{event.name} · {kind === "gp" ? "GP" : t("Sprint")} · {t("Submitted predictions only")}</caption>
          <thead><tr><th scope="col">{t("Player")}</th>{columns.map(c => <th scope="col" key={c.label}><abbr title={t(c.label)}>{c.short}</abbr></th>)}</tr></thead>
          <tbody>{users.map(user => {
            const entry = s.entries.find(p => p.userId === user.id && p.eventId === event.id && p.kind === kind && p.submitted);
            return <tr key={user.id} className={user.id === meId ? "your-row" : ""}><th scope="row"><span className="weekend-grid-player">{user.name}</span>{!entry && <small>{t("No submission")}</small>}</th>{columns.map(c => <td key={c.label}><TimingDriver season={season} id={entry ? c.pick(entry.picks) : ""} /></td>)}</tr>;
          })}</tbody>
        </table>
      </div>
      <p className="tiny">{t("Three-letter driver codes with team colors and logos. Scroll sideways for every category.")}</p>
      <div className="weekend-grid-key"><span>POLE · {t("Pole position")}</span><span>FL · {t("Fastest lap")}</span><span>OUT · {t("First retirement")}</span>{kind === "gp" && <span>DOTD · {t("Driver of the Day")}</span>}</div>
    </>}
  </section>;
}
