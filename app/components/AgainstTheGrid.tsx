"use client";
import { Sparkles } from "lucide-react";
import { againstTheGrid } from "@/lib/player-insights";
import type { Event, Season, State } from "@/lib/model";
import { useLocale } from "@/lib/i18n";
import TimingDriver from "./TimingDriver";

export default function AgainstTheGrid({ s, season, event, kind, meId }: { s: State; season: Season; event: Event; kind: "gp" | "sprint"; meId: string }) {
  const { t } = useLocale();
  const picks = againstTheGrid(s, event, kind, meId);
  const render = (items: typeof picks) => <div className="against-picks">{items.map(p => <article className="against-pick" key={p.label}><h4>{t(p.label)}</h4><div className="against-pick-row"><span>{t("Your pick")}</span><TimingDriver season={season} id={p.pick} /></div><div className="against-pick-row"><span>{t("League majority")}</span><TimingDriver season={season} id={p.majority} /></div><p>{p.supporters}/{p.total} {t("other submitted players")}</p></article>)}</div>;
  return <div className="against-grid"><div className="against-grid-heading"><h3><Sparkles size={16} aria-hidden="true" />{t("Against the grid")}</h3><span>{picks.length} {t("different calls")}</span></div><p className="tiny">{t("Where you disagree with more than half of the other submitted players. At least two other entries required.")}</p>
    {picks.length ? <>{render(picks.slice(0, 3))}{picks.length > 3 && <details className="against-more"><summary>{t("See every different call")} ({picks.length})</summary>{render(picks.slice(3))}</details>}</> : <p className="against-empty">{t("No clear majority to challenge in your submitted picks yet.")}</p>}
  </div>;
}
