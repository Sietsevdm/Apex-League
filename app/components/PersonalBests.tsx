"use client";
import { Flame, Target, Trophy } from "lucide-react";
import { personalBests } from "@/lib/player-insights";
import type { Season, State } from "@/lib/model";
import { useLocale } from "@/lib/i18n";

export default function PersonalBests({ s, season, meId }: { s: State; season: Season; meId: string }) {
  const { t } = useLocale();
  const best = personalBests(s, season.id, meId);
  const cards = [
    { title: "Best weekend", value: best.weekend.value, unit: "points", isNew: best.weekend.isNew, Icon: Trophy, note: "Your highest combined GP and Sprint score.", context: best.weekend.events.join(" · ") },
    { title: "Most exact positions", value: best.exact.value, unit: "exact positions", isNew: best.exact.isNew, Icon: Target, note: "Your most exact finishing positions in one complete weekend.", context: best.exact.events.join(" · ") },
    { title: "Longest scoring streak", value: best.streak.value, unit: "weekends", isNew: best.streak.isNew, Icon: Flame, note: "Consecutive completed weekends with at least one point.", context: best.streak.value ? `${best.streak.start} → ${best.streak.end}` : "" },
  ];
  return <section className="panel personal-bests" aria-labelledby="personal-bests-title"><div className="section-title"><h2 id="personal-bests-title">{t("Personal bests")}</h2><span className="weekend-social-tag">{season.year}</span></div><p className="muted">{t("Your own benchmarks. Your next target.")}</p>
    <div className="personal-best-grid">{cards.map(({ title, value, unit, isNew, Icon, note, context }) => <article className="personal-best-card" key={title}><div className="personal-best-top"><Icon size={22} aria-hidden="true" />{isNew && <span className="personal-best-new">{t("New personal best")}</span>}</div><h3>{t(title)}</h3><div className="personal-best-value">{best.weekends ? value : "—"}<span>{t(unit)}</span></div><p>{t(note)}</p><div className="personal-best-context">{context || t("Your first record is still ahead.")}</div></article>)}</div>
    <div className="personal-best-footer"><span>{t("Current scoring streak")} <strong>{best.streak.current}</strong></span><span>{best.weekends} {t("completed weekends")}</span></div><p className="tiny">{t("Published, complete championship weekends only. Practice, season bonuses and fully void weekends are excluded. New means the latest complete weekend beat your previous record.")}</p>
  </section>;
}
