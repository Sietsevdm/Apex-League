"use client";
import { Users } from "lucide-react";
import { weekendRival } from "@/lib/player-insights";
import { predictionsVisible, type Event, type State } from "@/lib/model";
import { predictionColumns } from "@/lib/weekend-social";
import { useLocale } from "@/lib/i18n";

export default function RivalOfWeekend({ s, event, meId, selectedId, kind, onCompare }: { s: State; event: Event; meId: string; selectedId: string; kind: "gp" | "sprint"; onCompare: (id: string) => void }) {
  const { t } = useLocale();
  const rival = weekendRival(s, event.seasonId, meId);
  if (!rival) return null;
  const visible = predictionsVisible(event, kind);
  const mine = s.entries.find(p => p.userId === meId && p.eventId === event.id && p.kind === kind && p.submitted);
  const theirs = s.entries.find(p => p.userId === rival.id && p.eventId === event.id && p.kind === kind && p.submitted);
  const different = visible && mine && theirs ? predictionColumns(kind).filter(c => c.pick(mine.picks) !== c.pick(theirs.picks)).length : undefined;
  return <section className="panel rival-weekend" aria-label={t("Rival of the weekend")}>
    <div className="rival-weekend-intro"><span className="insight-icon"><Users size={19} aria-hidden="true" /></span><div><p className="insight-eyebrow">{t("Rival of the weekend")}</p><h2>{rival.name}</h2><p className="muted">{t("Your closest championship challenger")}</p></div></div>
    <dl className="rival-weekend-stats"><div><dt>{t("Points gap")}</dt><dd>{rival.gap} <small>{t("pts")}</small></dd></div><div><dt>{t("You / rival")}</dt><dd>P{rival.myRank} <span className="muted">/</span> P{rival.rank}</dd></div><div><dt>{t("Different picks")}</dt><dd>{different ?? "—"}</dd></div></dl>
    <button className="secondary" disabled={selectedId === rival.id} onClick={() => onCompare(rival.id)}>{t(selectedId === rival.id ? "Comparing now" : "Compare rival")}</button>
    <p className="rival-weekend-note tiny">{t(visible ? "Closest in championship points. Compare your GP and Sprint calls below." : "Chosen by championship points. Prediction differences appear after qualifying.")}</p>
  </section>;
}
