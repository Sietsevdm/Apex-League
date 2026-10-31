"use client";
import { useLocale } from "@/lib/i18n";
import { Season, State, bannerEvent } from "@/lib/model";
import { ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { Empty, Heading, Pill } from "./Shared";
const CalendarDownload = dynamic(
  () => import("../LeagueExtras").then((m) => m.CalendarDownload),
  { loading: () => null },
);
function Calendar({
  s,
  season,
  go,
  call,
}: {
  s: State;
  season: Season;
  call: import("@/lib/client-data").Call;
  go: (p: string, id?: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const current = season.archived ? undefined : bannerEvent(s, season.id);
  return (
    <>
      <Heading
        eyebrow="YOUR SEASON, AT A GLANCE"
        title={tr("The race calendar")}
        description={tr(
          "All session times are shown in your device\u2019s local timezone.",
        )}
      />
      <CalendarDownload s={s} season={season} call={call} />
      {!s.events.some(event => event.seasonId === season.id) && <Empty title="Your calendar is on its way" body="Your organiser hasn't added the race calendar yet. Race weekends and prediction deadlines will appear here when it's ready." />}
      <div className="calendar-list">
        {tr(
          s.events
            .filter((e) => e.seasonId === season.id)
            .sort((a, b) => Date.parse(a.practice) - Date.parse(b.practice))
            .map((e, i) => (
              <section className={`calendar-card calendar-card-artwork${current?.id === e.id ? " calendar-card-current" : ""}`} aria-current={current?.id === e.id ? "true" : undefined} key={e.id}>
                <img className="calendar-card-image" src={e.photo || "/circuit-night.svg"} alt="" loading="lazy" decoding="async" style={{ objectPosition: `center ${e.focal ?? 50}%` }} onError={event => { event.currentTarget.style.display = "none"; }} />
                <div className="calendar-round">
                  <div className="round-number">
                    {tr(e.practiceRound ? "P" : String(i + 1).padStart(2, "0"))}
                  </div>
                  {e.sprintQualifying && <Pill>{tr("Sprint")}</Pill>}
                </div>
                <div className="calendar-info">
                  {current?.id === e.id && <span className="calendar-current-label">{tr("Current race weekend")}</span>}
                  <div className="inline">
                    <h2>{e.name}</h2>
                    {tr(e.practiceRound && <Pill>{tr("Practice")}</Pill>)}
                  </div>
                  <p>
                    {e.circuit}
                    {" · "}
                    {e.country}
                  </p>
                  <div className="schedule">
                    <span>
                      {tr("FP1")}
                      <strong>{tr(date(e.practice))}</strong>
                    </span>
                    {tr(
                      e.sprintQualifying && (
                        <span>
                          {tr("Sprint qualifying")}
                          <strong>{tr(date(e.sprintQualifying))}</strong>
                        </span>
                      ),
                    )}
                    <span>
                      {tr("Qualifying")}
                      <strong>{tr(date(e.qualifying))}</strong>
                    </span>
                    <span>
                      {tr("Race")}
                      <strong>{tr(date(e.race))}</strong>
                    </span>
                  </div>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    go(e.gp?.published ? "results" : "predict", e.id)
                  }
                >
                  {tr(e.gp?.published ? "Results" : "Predictions")}
                  <ChevronRight size={16} />
                </button>
              </section>
            )),
        )}
      </div>
    </>
  );
}

export default Calendar;
