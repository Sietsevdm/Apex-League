"use client";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import {
  Season,
  State,
  bannerEvent,
  cutoff,
  locked,
  standings,
} from "@/lib/model";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Empty,
  Heading,
  Metric,
  Pill,
  StandingsTable,
  remaining,
} from "./Shared";
function Banner({
  s,
  season,
  go,
}: {
  s: State;
  season: Season;
  go: (p: string, id?: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const e = bannerEvent(s, season.id, now);
  if (!e)
    return (
      <Empty
        title={tr("Your next race awaits")}
        body="Add the calendar in Admin studio to begin."
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
  const raceTime = Date.parse(e.race);
  const target = nextDeadline?.time ?? raceTime;
  const seconds = Math.max(0, Math.ceil((target - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const countdown = !Number.isFinite(target)
    ? tr("To be confirmed")
    : now >= target
      ? tr(published ? "Results published" : "Race started")
      : `${Math.floor(seconds / 86400)}d ${pad(Math.floor(seconds / 3600) % 24)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
  const sessions = [
    { label: "FP1", time: e.practice, published: false },
    ...(isSprint
      ? [
          {
            label: "Sprint quali",
            time: e.sprintQualifying || "",
            published: Boolean(e.sprint?.published),
          },
          {
            label: "Sprint",
            time: e.sprintRace || "",
            published: Boolean(e.sprint?.published),
          },
        ]
      : []),
    { label: "Quali", time: e.qualifying, published: Boolean(e.gp?.published) },
    { label: "Race", time: e.race, published: Boolean(e.gp?.published) },
  ];
  // A session is done once the next starts, or its results are published.
  const stages = sessions.map((session, i) => ({
    ...session,
    done:
      session.published ||
      sessions.slice(i + 1).some((next) => Date.parse(next.time) <= now),
  }));
  const active = stages.findIndex((session) => !session.done);
  return (
    <section
      className="hero"
      style={{
        backgroundImage: `linear-gradient(90deg,rgba(7,13,25,.96) 0%,rgba(7,13,25,.76) 40%,rgba(7,13,25,.12) 100%),url("${e.photo || "/circuit-night.svg"}")`,
        backgroundPosition: `0 0,center ${e.focal}%`,
      }}
    >
      <div className="hero-top">
        <Pill tone={nextDeadline ? "picks-open" : "picks-closed"}>
          <span className="live-dot" />
          {tr(nextDeadline ? "Predictions open" : "Predictions closed")}
        </Pill>
        {isSprint && <Pill>{tr("Sprint weekend")}</Pill>}
      </div>
      <div className="hero-copy">
        <div className="eyebrow">
          {tr(season.year)} {tr("WORLD CHAMPIONSHIP \u00B7 YOUR LEAGUE")}
        </div>
        <h2>
          {tr(e.name.replace(" Grand Prix", ""))}
          <br />
          <span>{tr("Grand Prix")}</span>
        </h2>
        <p>
          <MapPin size={15} />
          {e.circuit}
          {" · "}
          {e.country}
        </p>
        <div className="hero-bottom">
          <button
            className="primary"
            onClick={() => go(published ? "results" : "predict", e.id)}
          >
            {tr(
              published
                ? "Explore the results"
                : gpLocked
                  ? "View your predictions"
                  : "Make your predictions",
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
            <strong
              role="timer"
              aria-live="off"
              title={date(
                Number.isFinite(target) ? new Date(target).toISOString() : "",
              )}
            >
              {countdown}
            </strong>
          </div>
        </div>
      </div>
      <ol className="weekend-progress" aria-label={tr("Weekend progress")}>
        {stages.map((session, i) => (
          <li
            key={session.label}
            className={session.done ? "done" : i === active ? "current" : ""}
            aria-current={i === active ? "step" : undefined}
            title={date(session.time)}
          >
            <span className="session-track" aria-hidden="true" />
            <span>
              {tr(session.label)}
              {session.done ? ` · ${tr("done")}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </section>
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
  go: (p: string, id?: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const rows = standings(s, season.id),
    me = rows.find((r) => r.id === meId),
    banner = bannerEvent(s, season.id);
  const next = s.events
    .filter(
      (e) =>
        e.seasonId === season.id &&
        !e.practiceRound &&
        Date.now() < Date.parse(cutoff(e, "gp")),
    )
    .sort((a, b) => Date.parse(a.qualifying) - Date.parse(b.qualifying))[0];
  const recent = s.events
    .filter(
      (e) => e.seasonId === season.id && !e.practiceRound && e.gp?.published,
    )
    .sort((a, b) => Date.parse(b.race) - Date.parse(a.race))[0];
  const submission = banner
    ? s.entries.find(
        (x) => x.eventId === banner.id && x.userId === meId && x.kind === "gp",
      )
    : undefined;
  return (
    <>
      <Heading
        eyebrow="WELCOME TO YOUR PADDOCK"
        title={tr(`Let’s race, ${s.users.find((u) => u.id === meId)?.name}.`)}
        description={tr(s.settings.welcome)}
      >
        <Pill>{season.name}</Pill>
      </Heading>
      <Banner s={s} season={season} go={go} />
      <div className="metrics">
        <Metric
          label={tr("YOUR POSITION")}
          value={me ? `P${me.rank}` : "—"}
          detail={`${rows.length} players on the grid`}
          icon={<Trophy />}
        />
        <Metric
          label={tr("SEASON POINTS")}
          value={String(me?.total || 0)}
          detail={`${rows[0]?.total - (me?.total || 0) || 0} points to the leader`}
          icon={<TrendingUp />}
        />
        <Metric
          label={tr("WEEKEND ENTRY")}
          value={
            submission?.submitted
              ? "Submitted"
              : submission
                ? "Draft"
                : "Not entered"
          }
          detail={
            banner
              ? `${banner.name.replace(" Grand Prix", "")} · Grand Prix`
              : "No event scheduled"
          }
          icon={<CheckCircle2 />}
        />
        <Metric
          label={tr("NEXT DEADLINE")}
          value={next ? remaining(cutoff(next, "gp")) : "—"}
          detail={next ? next.name : "All entries locked"}
          icon={<Clock />}
        />
      </div>
      <div className="two-col">
        <section className="panel">
          <div className="section-title">
            <h2>{tr("The championship fight")}</h2>
            <button className="text-button" onClick={() => go("leaderboard")}>
              {tr("Full standings")}
              <ChevronRight size={16} />
            </button>
          </div>
          <StandingsTable rows={rows.slice(0, 5)} meId={meId} />
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>{tr("From the paddock")}</h2>
            <Bell size={18} />
          </div>
          {tr(
            s.settings.announcements.slice(0, 3).map((a) => (
              <article className="announcement" key={a.id}>
                <small>
                  {tr(date(a.date, { day: "numeric", month: "short" }))}
                </small>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </article>
            )),
          )}
          {tr(
            !s.settings.announcements.length && (
              <p className="muted">
                {tr("Your organiser\u2019s updates will appear here.")}
              </p>
            ),
          )}
          {tr(
            recent && (
              <button
                className="recap-link"
                onClick={() => go("results", recent.id)}
              >
                <Flag size={20} />
                <span>
                  <strong>
                    {tr(recent.name.replace(" Grand Prix", ""))}
                    {tr(" recap")}
                  </strong>
                  <small>{tr("Your latest race story is ready.")}</small>
                </span>
                <ArrowUpRight size={20} />
              </button>
            ),
          )}
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
