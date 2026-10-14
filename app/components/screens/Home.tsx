"use client";
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
  const e = bannerEvent(s, season.id);
  if (!e)
    return (
      <Empty
        title={tr("Your next race awaits")}
        body="Add the calendar in Admin studio to begin."
      />
    );
  const gpLocked = locked(e, "gp"),
    spLocked = e.sprintQualifying ? locked(e, "sprint") : false;
  const published = e.gp?.published;
  const status = published
    ? "Results published"
    : !cutoff(e, "gp")
      ? "Session times to be confirmed"
      : Date.now() >= Date.parse(e.race)
        ? "Race day"
        : gpLocked
          ? "Grand Prix picks locked"
          : Date.now() < Date.parse(e.practice)
            ? "Coming up"
            : "Race weekend";
  return (
    <section
      className="hero"
      style={{
        backgroundImage: `linear-gradient(90deg,rgba(7,13,25,.96) 0%,rgba(7,13,25,.76) 40%,rgba(7,13,25,.12) 100%),url("${e.photo || "/circuit-night.svg"}")`,
        backgroundPosition: `0 0,center ${e.focal}%`,
      }}
    >
      <div className="hero-top">
        <Pill>
          <span className="live-dot" />
          {tr(status)}
        </Pill>
        {tr(
          (e.hasSprint || e.sprintQualifying) && (
            <Pill>
              {tr("Sprint weekend")}
              {tr(spLocked ? "· Sprint locked" : "")}
            </Pill>
          ),
        )}
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
                  ? "View your picks"
                  : "Make your predictions",
            )}
            <ArrowUpRight size={18} />
          </button>
          <div>
            <small>
              {tr(gpLocked ? "RACE START" : "GP PREDICTIONS CLOSE")}
            </small>
            <strong>{tr(date(gpLocked ? e.race : cutoff(e, "gp")))}</strong>
          </div>
        </div>
      </div>

      <div className="banner-circuit-facts">
        <div className="facts">
          <div>
            <small>{tr("CIRCUIT")}</small>
            <strong>{e.circuit}</strong>
          </div>
          <div>
            <small>{tr("LENGTH")}</small>
            <strong>
              {tr(e.length ? `${e.length} km` : "To be confirmed")}
            </strong>
          </div>
          <div>
            <small>{tr("RACE LAPS")}</small>
            <strong>{tr(e.laps || "To be confirmed")}</strong>
          </div>
          <div>
            <small>{tr("FIRST PRACTICE")}</small>
            <strong>{tr(date(e.practice))}</strong>
          </div>
        </div>
      </div>
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
