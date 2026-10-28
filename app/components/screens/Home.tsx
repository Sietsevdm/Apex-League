"use client";
import { useEffect, useState } from "react";
import { startVisibleTicker } from "@/lib/visible-timer";
import { useBannerWeather } from "../BannerWeather";
import GrandPrixFact from "../GrandPrixFact";
import WeekendForecast from "../WeekendForecast";
import PredictionStatus from "../PredictionStatus";
import DeadlineTime from "../DeadlineTime";
import { weekendTasks } from "@/lib/weekend-guidance";
import { standingsMovement } from "@/lib/standings-movement";
import { weekendProgress } from "@/lib/weekend-progress";
import { useLocale } from "@/lib/i18n";
import {
  Season,
  State,
  bannerEvent,
  cutoff,
  locked,
  standings,
} from "@/lib/model";
import { ArrowUpRight, ChevronRight, MapPin } from "lucide-react";
import { Empty, Heading, Pill, StandingsTable } from "./Shared";
function Banner({
  s,
  season,
  meId,
  go,
  rows,
}: {
  s: State;
  season: Season;
  meId: string;
  rows: ReturnType<typeof standings>;
  go: (p: string, id?: string, kind?: "gp" | "sprint") => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [now, setNow] = useState(Date.now);
  useEffect(() => startVisibleTicker(() => setNow(Date.now())), []);
  const e = bannerEvent(s, season.id, now);
  const weatherData = useBannerWeather(
    e?.id,
    !season.archived && !e?.practiceRound,
    e?.photo,
    meId,
  );
  const weather = weatherData?.weather;
  const me = rows.find((row) => row.id === meId);
  if (!e)
    return (
      <Empty
        title={tr("Your next race awaits")}
        body="Your organiser hasn't added the race calendar yet. Once it's ready, your next race and prediction deadline will appear here."
      />
    );
  const gpLocked = locked(e, "gp", now);
  const isSprint = Boolean(e.hasSprint || e.sprintQualifying || e.sprintRace);
  const published = e.gp?.published;
  const deadlines = (
    ["gp", ...(isSprint ? ["sprint"] : [])] as ("gp" | "sprint")[]
  )
    .filter(
      (kind) =>
        !season.archived &&
        !locked(e, kind, now) &&
        !(kind === "gp" ? e.gp : e.sprint)?.published,
    )
    .map((kind) => ({ kind, time: Date.parse(cutoff(e, kind)) }))
    .sort((a, b) => a.time - b.time);
  const nextDeadline = deadlines[0];
  const tasks = weekendTasks(s, e, meId, now);
  const nextTask = tasks
    .filter((task) => !task.locked && !task.submitted)
    .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline))[0];
  const timezone = s.users.find((user) => user.id === meId)?.timezone;
  const lastCompleted = s.events
    .filter(
      (event) =>
        event.seasonId === season.id &&
        !event.practiceRound &&
        event.gp?.published,
    )
    .sort((a, b) => Date.parse(b.race) - Date.parse(a.race))[0];
  const raceTime = Date.parse(e.race);
  const target = nextDeadline?.time ?? raceTime;
  const seconds = Math.max(0, Math.ceil((target - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const countdown = !Number.isFinite(target)
    ? tr("To be confirmed")
    : now >= target
      ? tr(published ? "Results published" : "Race started")
      : `${Math.floor(seconds / 86400)}d ${pad(Math.floor(seconds / 3600) % 24)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
  const stages = weekendProgress(e, now);
  const active = stages.findIndex((session) => session.running);
  const units = [
    { value: Math.floor(seconds / 86400), label: "DAYS" },
    { value: Math.floor(seconds / 3600) % 24, label: "HRS" },
    { value: Math.floor(seconds / 60) % 60, label: "MIN" },
    { value: seconds % 60, label: "SEC" },
  ];
  return (
    <>
      <section
        className="hero hero-weekend"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(7,13,25,.84) 0%,rgba(7,13,25,.5) 45%,rgba(7,13,25,.15) 100%),url("${weatherData?.photo || e.photo || "/circuit-night.svg"}"),url("${e.photo || "/circuit-night.svg"}")`,
          backgroundPosition: `0 0,center ${e.focal}%,center ${e.focal}%`,
        }}
      >
        <div className="hero-top">
          <Pill tone={nextDeadline ? "picks-open" : "picks-closed"}>
            <span className="live-dot" />
            {tr(nextDeadline ? "Predictions open" : "Predictions closed")}
          </Pill>
          {isSprint && <Pill>{tr("Sprint weekend")}</Pill>}
          <div
            className="prediction-readiness"
            aria-label={tr("Your weekend predictions")}
          >
            {(
              ["gp", ...(isSprint ? ["sprint"] : [])] as ("gp" | "sprint")[]
            ).map((kind) => {
              const entry = s.entries.find(
                (entry) =>
                  entry.eventId === e.id &&
                  entry.userId === meId &&
                  entry.kind === kind,
              );
              const state = entry?.submitted
                ? "Submitted"
                : entry
                  ? "Draft"
                  : "Not started";
              const closed = season.archived || locked(e, kind, now);
              return (
                <button
                  key={kind}
                  className={`entry-status ${state.toLowerCase()}`}
                  onClick={() => go("predict", e.id, kind)}
                >
                  <strong>{kind === "gp" ? "GP" : tr("Sprint")}</strong> ·{" "}
                  <PredictionStatus
                    submitted={entry?.submitted}
                    exists={Boolean(entry)}
                    locked={closed}
                  />
                </button>
              );
            })}
          </div>
          {!season.archived && !e.practiceRound && (
            <WeekendForecast
              key={`${e.id}:${meId}`}
              event={e}
              weather={weather}
            />
          )}
        </div>
        <div className="hero-copy">
          <div className="eyebrow">
            {tr(season.year)} {tr("WORLD CHAMPIONSHIP \u00B7 YOUR LEAGUE")}
          </div>
          <h2>{tr(e.name)}</h2>
          <p>
            <MapPin size={15} />
            {e.circuit}
            {" · "}
            {e.country}
          </p>
          <div className="hero-bottom">
            <button
              className="primary"
              onClick={() =>
                go(
                  published ? "results" : "predict",
                  e.id,
                  nextTask?.kind || nextDeadline?.kind,
                )
              }
            >
              {tr(
                published
                  ? "Open your weekend score"
                  : gpLocked
                    ? "View your predictions"
                    : nextTask
                      ? nextTask.kind === "sprint"
                        ? "Complete Sprint picks"
                        : "Complete GP picks"
                      : "Edit your predictions",
              )}
              <ArrowUpRight size={18} />
            </button>
            <div className="banner-countdown">
              <small>
                {tr(
                  nextDeadline
                    ? nextDeadline.kind === "sprint"
                      ? "SPRINT PREDICTIONS CLOSE IN"
                      : "PREDICTIONS CLOSE IN"
                    : "RACE START",
                )}
              </small>
              <div
                className="countdown-display"
                role="timer"
                aria-live="off"
                title={date(
                  Number.isFinite(target) ? new Date(target).toISOString() : "",
                )}
                aria-label={countdown}
              >
                {Number.isFinite(target) && now < target ? (
                  <div className="countdown-units" aria-hidden="true">
                    {units.map(({ value, label }, i) => (
                      <div className="countdown-unit" key={label}>
                        <strong>{i === 0 ? value : pad(value)}</strong>
                        <span>{tr(label)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <strong>{countdown}</strong>
                )}
              </div>
              <div className="banner-deadlines">
                {tasks.map((task) => (
                  <DeadlineTime
                    key={task.kind}
                    value={task.deadline}
                    timezone={timezone}
                    label={
                      task.kind === "gp" ? "GP deadline" : "Sprint deadline"
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <dl className="banner-season-summary" aria-label={tr("Season summary")}>
          <div>
            <dt>{tr("YOUR POSITION")}</dt>
            <dd>{me ? `P${me.rank}` : "—"}</dd>
            <small>{tr(`${rows.length} players on the grid`)}</small>
          </div>
          <div>
            <dt>{tr("SEASON POINTS")}</dt>
            <dd>{me?.total || 0}</dd>
            {lastCompleted && (
              <button
                className="score-link"
                onClick={() => go("results", lastCompleted.id)}
              >
                {tr("Open last weekend score")}
                <ChevronRight size={14} />
              </button>
            )}
            <small>
              {tr(
                `${(rows[0]?.total || 0) - (me?.total || 0)} points to the leader`,
              )}
            </small>
          </div>
        </dl>
        <ol className="weekend-progress" aria-label={tr("Weekend progress")}>
          {stages.map((session, i) => (
            <li
              key={session.label}
              className={session.done ? "done" : i === active ? "current" : ""}
              aria-current={i === active ? "step" : undefined}
              title={`${date(session.time)} · ${tr("Estimated session progress")}`}
            >
              <span className="session-track" aria-hidden="true">
                <span
                  className="session-fill"
                  style={{ transform: `scaleX(${session.progress})` }}
                />
              </span>
              <span>
                {tr(session.label)}
                {session.done ? ` · ${tr("done")}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>
      {!season.archived && (
        <section className="next-action-card" aria-label={tr("Your next step")}>
          <div>
            <h2>{tr("Your next step")}</h2>
            <p>
              {tasks
                .map(
                  (task) =>
                    `${task.kind === "gp" ? "GP" : tr("Sprint")}: ${tr(task.submitted ? "Submitted" : task.locked ? "Locked without a submission" : task.draft ? "Draft needs submitting" : "Still needs your picks")}`,
                )
                .join(" · ")}
            </p>
            <small>
              {tr(
                nextTask
                  ? "Finish the remaining picks before their deadline. Your submitted picks are already safe."
                  : nextDeadline
                    ? "You're up to date. Your submitted picks remain editable until locking."
                    : "Predictions are locked. Open the results to see your points.",
              )}
            </small>
          </div>
          <button
            className="secondary"
            onClick={() =>
              go(
                published || !nextDeadline ? "results" : "predict",
                e.id,
                nextTask?.kind || nextDeadline?.kind,
              )
            }
          >
            {tr(
              nextTask
                ? nextTask.kind === "sprint"
                  ? "Complete Sprint picks"
                  : "Complete GP picks"
                : nextDeadline
                  ? "Review your picks"
                  : "Open your weekend score",
            )}
            <ArrowUpRight size={16} />
          </button>
        </section>
      )}
      <GrandPrixFact key={`${season.id}:${e.id}`} event={e} />
    </>
  );
}
function Home({
  s,
  season,
  meId,
  go,
}: {
  s: State;
  season: Season;
  meId: string;
  go: (p: string, id?: string, kind?: "gp" | "sprint") => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const rows = standings(s, season.id);
  return (
    <>
      <Heading
        eyebrow="WELCOME TO YOUR PADDOCK"
        title={tr(`Let’s race, ${s.users.find((u) => u.id === meId)?.name}.`)}
        description={tr(s.settings.welcome)}
      >
        <Pill>{season.name}</Pill>
      </Heading>
      <Banner s={s} season={season} meId={meId} go={go} rows={rows} />
      <div className="overview-championship">
        <section className="panel">
          <div className="section-title">
            <h2>{tr("The championship fight")}</h2>
            <button className="text-button" onClick={() => go("leaderboard")}>
              {tr("Full standings")}
              <ChevronRight size={16} />
            </button>
          </div>
          <StandingsTable
            rows={rows.slice(0, 5)}
            meId={meId}
            movement={standingsMovement(s, season.id)}
          />
        </section>
      </div>
      <section className="practice-callout">
        <div>
          <Pill>{tr("NO PRESSURE. NO POINTS.")}</Pill>
          <h3>{tr("Warm up before lights out.")}</h3>
          <p>
            {tr(
              "Try the practice round. Your championship standings stay untouched.",
            )}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            const e = s.events.find(
              (x) => x.seasonId === season.id && x.practiceRound,
            );
            if (e) go("predict", e.id);
            else go("calendar");
          }}
        >
          {tr("Explore practice")}
          <ArrowUpRight size={17} />
        </button>
      </section>
    </>
  );
}
export default Home;
