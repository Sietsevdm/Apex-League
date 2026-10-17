"use client";
import { useLocale } from "@/lib/i18n";
import { Season, State } from "@/lib/model";
import { ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { Heading, Pill } from "./Shared";
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
      <div className="calendar-list">
        {tr(
          s.events
            .filter((e) => e.seasonId === season.id)
            .sort((a, b) => Date.parse(a.practice) - Date.parse(b.practice))
            .map((e, i) => (
              <section className="calendar-card" key={e.id}>
                <div className="calendar-round">
                  <div className="round-number">
                    {tr(e.practiceRound ? "P" : String(i + 1).padStart(2, "0"))}
                  </div>
                  {e.sprintQualifying && <Pill>{tr("Sprint")}</Pill>}
                </div>
                <div className="calendar-info">
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
