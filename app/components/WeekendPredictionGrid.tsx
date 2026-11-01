"use client";
import { predictionsVisible, type Event, type Season, type State } from "@/lib/model";
import { predictionColumns } from "@/lib/weekend-social";
import { useLocale } from "@/lib/i18n";
import AgainstTheGrid from "./AgainstTheGrid";
import { againstTheGrid } from "@/lib/player-insights";
import TimingDriver from "./TimingDriver";

export default function WeekendPredictionGrid({ s, season, event, kind, meId, rivalId, focused = false, onFocusChange, onRivalChange }: { s: State; season: Season; event: Event; kind: "gp" | "sprint"; meId: string; rivalId?: string; focused?: boolean; onFocusChange?: (value: boolean) => void; onRivalChange?: (id: string) => void }) {
  const { t } = useLocale();
  const visible = predictionsVisible(event, kind);
  const against = new Set(againstTheGrid(s, event, kind, meId).map(p => p.label));
  const columns = predictionColumns(kind);
  const members = s.users.filter(u => u.seasonIds.includes(season.id));
  const users = focused ? members.filter(u => u.id === meId || u.id === rivalId).sort((a,b) => Number(b.id === meId) - Number(a.id === meId)) : members;
  return <section className="panel weekend-grid-panel" aria-labelledby="weekend-grid-title">
    <div className="section-title"><h2 id="weekend-grid-title">{t("Weekend prediction grid")}</h2><span className="weekend-social-tag">{kind === "gp" ? "GP" : t("Sprint")}</span></div>
    <p className="muted">{t("The whole league. Every pick. One grid.")}</p>
    {onFocusChange && <div className="weekend-grid-filters">
      <div className="segmented" role="group" aria-label={t("Players in view")}>
        <button className={!focused ? "selected" : ""} aria-pressed={!focused} onClick={() => onFocusChange(false)}>{t("Everyone")}</button>
        <button className={focused ? "selected" : ""} aria-pressed={focused} disabled={!members.some(u => u.id !== meId)} onClick={() => onFocusChange(true)}>{t("You + rival")}</button>
      </div>
      {focused && <label><span>{t("Rival")}</span><select value={rivalId} aria-label={t("Select rival")} onChange={ev => onRivalChange?.(ev.target.value)}>{members.filter(u => u.id !== meId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}
      <span className="weekend-grid-count">{users.length}/{members.length} {t("players shown")}</span>
    </div>}
    {!visible ? <div className="weekend-social-empty"><strong>{t("The grid is still secret")}</strong><p>{t("Submitted predictions become visible here after qualifying (scheduled start plus one hour).")}</p></div> : <>
      <details className="against-grid-disclosure" key={`${event.id}-${kind}`}><summary><span>{t("Against the grid")}</span><small>{against.size} {t(against.size === 1 ? "different call" : "different calls")}</small></summary><AgainstTheGrid s={s} season={season} event={event} kind={kind} meId={meId} /></details>
      <div className="weekend-grid-scroll" role="region" aria-label={t("Weekend prediction grid")} tabIndex={0}>
        <table className="weekend-prediction-grid">
          <caption className="sr-only">{event.name} · {kind === "gp" ? "GP" : t("Sprint")} · {t("Submitted predictions only")}</caption>
          <thead><tr><th scope="col">{t("Player")}</th>{columns.map(c => <th scope="col" key={c.label}><abbr title={t(c.label)}>{c.short}</abbr></th>)}</tr></thead>
          <tbody>{users.map(user => {
            const entry = s.entries.find(p => p.userId === user.id && p.eventId === event.id && p.kind === kind && p.submitted);
            return <tr key={user.id} className={user.id === meId ? "your-row" : ""}><th scope="row"><span className="weekend-grid-player">{user.name}</span>{!entry && <small>{t("No submission")}</small>}</th>{columns.map(c => <td key={c.label} className={user.id === meId && against.has(c.label) ? "against-grid-cell" : undefined}>{user.id === meId && against.has(c.label) && <span className="insight-sr">{t("Against the grid")}: </span>}<TimingDriver season={season} id={entry ? c.pick(entry.picks) : ""} /></td>)}</tr>;
          })}</tbody>
        </table>
      </div>
      <p className="tiny">{t("Three-letter driver codes with team colors and logos. Gold outlines mark your against-the-grid picks. Scroll sideways for every category.")}</p>
      <div className="weekend-grid-key"><span>POLE · {t("Pole position")}</span><span>FL · {t("Fastest lap")}</span><span>OUT · {t("First retirement")}</span>{kind === "gp" && <span>DOTD · {t("Driver of the Day")}</span>}</div>
    </>}
  </section>;
}
