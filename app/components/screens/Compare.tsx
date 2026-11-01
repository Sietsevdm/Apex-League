"use client";
import { useLocale } from "@/lib/i18n";
import { Season, State, bannerEvent } from "@/lib/model";
import { useEffect, useState } from "react";
import RivalOfWeekend from "../RivalOfWeekend";
import { weekendRival } from "@/lib/player-insights";
import WeekendPredictionGrid from "../WeekendPredictionGrid";
import { startVisibleTicker } from "@/lib/visible-timer";
import { Empty, Heading } from "./Shared";

export default function Compare({ s, season, meId }: { s: State; season: Season; meId: string }) {
  const { t } = useLocale();
  const [, setNow] = useState(Date.now);
  useEffect(() => startVisibleTicker(() => setNow(Date.now())), []);
  const events = s.events.filter(e => e.seasonId === season.id);
  const [id, setId] = useState(() => bannerEvent(s, season.id)?.id || events[0]?.id);
  const [kind, setKind] = useState<"gp" | "sprint">("gp");
  const [rival, setRival] = useState(() => weekendRival(s, season.id, meId)?.id || "");
  const [focused, setFocused] = useState(false);
  const event = events.find(e => e.id === id);
  if (!event) return <Empty title={t("Find your rival")} body="Comparisons appear once your league has a calendar." />;
  return <div className="weekend-predictions-page">
    <Heading eyebrow="FRIENDS UNTIL LIGHTS OUT" title={t("Weekend predictions")} description={t("Every player's calls, side by side.")} />
    <div className="toolbar weekend-predictions-controls">
      <select value={id} aria-label={t("Comparison weekend")} onChange={ev => { setId(ev.target.value); setKind("gp"); }}>
        {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <div className="segmented" role="group" aria-label={t("Prediction session")}>
        <button className={kind === "gp" ? "selected" : ""} aria-pressed={kind === "gp"} onClick={() => setKind("gp")}>GP</button>
        {(event.hasSprint || event.sprintQualifying) && <button className={kind === "sprint" ? "selected" : ""} aria-pressed={kind === "sprint"} onClick={() => setKind("sprint")}>{t("Sprint")}</button>}
      </div>
    </div>
    <RivalOfWeekend s={s} event={event} meId={meId} selectedId={focused ? rival : ""} kind={kind} onCompare={id => { setRival(id); setFocused(true); }} />
    <WeekendPredictionGrid s={s} season={season} event={event} kind={kind} meId={meId} rivalId={rival} focused={focused} onFocusChange={setFocused} onRivalChange={setRival} />
  </div>;
}
