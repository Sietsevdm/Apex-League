"use client";
import { Crosshair, Medal, TrendingUp } from "lucide-react";
import type { Event, Season, State } from "@/lib/model";
import { weekendAwards } from "@/lib/weekend-social";
import { useLocale } from "@/lib/i18n";
import TimingDriver from "./TimingDriver";

export default function WeekendAwards({ s, season, event }: { s: State; season: Season; event: Event }) {
  const { t } = useLocale();
  const awards = weekendAwards(s, event);
  return <section className="panel weekend-awards" aria-labelledby="weekend-awards-title">
    <div className="section-title"><h2 id="weekend-awards-title">{t("Weekend awards")}</h2><span className="weekend-social-tag">{t("Bragging rights")}</span></div>
    <p className="muted">{t("Great calls deserve the spotlight. Shared winners, no extra points.")}</p>
    {!awards.ready ? <div className="weekend-social-empty"><strong>{t(awards.practice ? "Just for practice" : "The spotlight is warming up")}</strong><p>{t(awards.practice ? "Weekend awards are reserved for championship race weekends." : "Awards appear when all GP and Sprint results for this weekend are published.")}</p></div> : <div className="weekend-award-grid">
      <article className="weekend-award-card bold-award"><Crosshair size={22} aria-hidden="true" /><h3>{t("Boldest correct pick")}</h3>
        <strong>{[...new Set(awards.bold.map(p => p.name))].join(" & ") || t("No standout pick")}</strong>
        <p>{t("The least popular correct selection in its category, across submitted entries. Unanimous picks do not qualify.")}</p>
        {awards.bold.length > 0 && <details><summary>{t("Winning picks")} ({awards.bold.length})</summary><ul>{awards.bold.map((p, i) => <li key={i}><span>{p.name} · {p.kind === "gp" ? "GP" : t("Sprint")} · {t(p.label)}</span><TimingDriver season={season} id={p.driverId} /><small>{p.supporters}/{p.total} {t("submitted picks")}</small></li>)}</ul></details>}
      </article>
      <article className="weekend-award-card podium-award"><Medal size={22} aria-hidden="true" /><h3>{t("Perfect podium")}</h3><strong>{awards.podiums.join(" & ") || t("No perfect podium this time")}</strong><p>{t("All three GP podium positions in the exact order, with the podium bonus confirmed.")}</p></article>
      <article className="weekend-award-card comeback-award"><TrendingUp size={22} aria-hidden="true" /><h3>{t("Biggest comeback")}</h3><strong>{awards.comeback.join(" & ") || t("No climb this weekend")}</strong>{awards.places > 0 && <span className="weekend-award-value">+{awards.places} {t("places")}</span>}<p>{t("Most championship positions gained from this weekend. Earlier races only; season bonuses excluded.")}</p></article>
    </div>}
  </section>;
}
