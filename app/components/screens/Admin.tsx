"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { Season, State, cutoff } from "@/lib/model";
import { registrationOpen } from "@/lib/season-controls";
import {
  CalendarDays,
  ChevronRight,
  Download,
  Eye,
  Flag,
  Shield,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Empty, Heading, Metric, download } from "./Shared";
const UpdateNotice = dynamic(() => import("../UpdateNotice"), {
  loading: () => null,
});
const ReplacementAdmin = dynamic(
  () => import("../LeagueImprovements").then((m) => m.ReplacementAdmin),
  { loading: () => null },
);
const BackupPanel = dynamic(
  () => import("../LeagueExtras").then((m) => m.BackupPanel),
  { loading: () => null },
);
const LaunchChecklist = dynamic(
  () => import("../LeagueExtras").then((m) => m.LaunchChecklist),
  { loading: () => null },
);
const Appearance = dynamic(() => import("./Appearance"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Banners = dynamic(() => import("./Banners"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Branding = dynamic(() => import("./Branding"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const EventAdmin = dynamic(() => import("./EventAdmin"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const ResultAdmin = dynamic(() => import("./ResultAdmin"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Members = dynamic(() => import("./Members"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const SeasonAdmin = dynamic(() => import("./SeasonAdmin"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Announcements = dynamic(() => import("./Announcements"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
function Admin({
  s,
  season,
  meId,
  call,
  go,
  onPreview,
}: {
  s: State;
  season?: Season;
  meId: string;
  call: Call;
  go: (p: string, id?: string) => void;
  onPreview: () => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [tab, setTab] = useState("overview");
  const tabs = [
    ["overview", "Overview"],
    ["appearance", "Appearance"],
    ["banners", "Banners"],
    ["branding", "Branding"],
    ["events", "Race weekends"],
    ["results", "Results & scoring"],
    ["members", "Members"],
    ["seasons", "Seasons & lineup"],
    ["announcements", "Announcements"],
    ["data", "Data & history"],
  ];
  const groups = [
    { id: "overview", label: "Overview", tabs: ["overview"] },
    { id: "racing", label: "Racing", tabs: ["events", "results", "seasons"] },
    { id: "players", label: "Players", tabs: ["members", "announcements"] },
    {
      id: "settings",
      label: "Settings",
      tabs: ["banners", "branding", "appearance", "data"],
    },
  ];
  const group = groups.find((g) => g.tabs.includes(tab))!;
  const events = s.events.filter((e) => e.seasonId === season?.id);
  const unresolved = events.filter(
    (e) => Date.parse(e.race) < Date.now() && !e.gp?.published,
  );
  return (
    <>
      <Heading
        eyebrow="YOUR LEAGUE, UNDER CONTROL"
        title={tr("Admin studio")}
        description={tr("More racing. Less spreadsheet work.")}
      >
        <button className="secondary" onClick={onPreview}>
          <Eye size={16} />
          {tr("Preview as player")}
        </button>
      </Heading>
      {tab === "overview" && <UpdateNotice />}
      <nav className="admin-navigation" aria-label={tr("Admin navigation")}>
        <div className="admin-tabs">
          {groups.map((g) => (
            <button
              key={g.id}
              className={group.id === g.id ? "selected" : ""}
              onClick={() => setTab(g.tabs[0])}
            >
              {tr(g.label)}
            </button>
          ))}
        </div>
        {group.tabs.length > 1 && (
          <div className="admin-tabs admin-subtabs">
            {tabs
              .filter(([id]) => group.tabs.includes(id))
              .map(([id, label]) => (
                <button
                  key={id}
                  className={tab === id ? "selected" : ""}
                  onClick={() => setTab(id)}
                >
                  {tr(label)}
                </button>
              ))}
          </div>
        )}
      </nav>
      {tr(
        tab === "overview" && (
          <>
            <div className="metrics">
              <Metric
                label={tr("LEAGUE MEMBERS")}
                value={String(s.users.filter((x) => x.active).length)}
                detail="Active accounts"
                icon={<Users />}
              />
              <Metric
                label={tr("RACE WEEKENDS")}
                value={String(events.filter((x) => !x.practiceRound).length)}
                detail={season?.name || "No season yet"}
                icon={<CalendarDays />}
              />
              <Metric
                label={tr("AWAITING RESULTS")}
                value={String(unresolved.length)}
                detail="Review and publish scores"
                icon={<Flag />}
              />
              <Metric
                label={tr("REGISTRATION")}
                value={season && registrationOpen(season) ? "Open" : "Closed"}
                detail={
                  season
                    ? "Controlled manually in Members"
                    : "Create a season first"
                }
                icon={<Shield />}
              />
            </div>
            <section className="panel">
              <h2>{tr("Needs your attention")}</h2>
              {tr(
                unresolved.length ? (
                  unresolved.map((e) => (
                    <div className="attention-row" key={e.id}>
                      <span>
                        <strong>{e.name}</strong>
                        <small>
                          {tr(
                            e.practiceRound
                              ? "Practice round"
                              : "Race completed · results not published",
                          )}
                        </small>
                      </span>
                      <button
                        className="secondary"
                        onClick={() => setTab("results")}
                      >
                        {tr("Review results")}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    {tr(
                      "You\u2019re up to date. Upcoming weekends appear below.",
                    )}
                  </p>
                ),
              )}
            </section>
            <section className="panel">
              <h2>{tr("Entry tracker")}</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("EVENT")}</th>
                      <th>{tr("GP SUBMISSIONS")}</th>
                      <th>{tr("SPRINT SUBMISSIONS")}</th>
                      <th>{tr("DEADLINE")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tr(
                      events
                        .filter((e) => !e.practiceRound)
                        .map((e) => (
                          <tr key={e.id}>
                            <td>{e.name}</td>
                            <td>
                              {tr(
                                s.entries.filter(
                                  (p) =>
                                    p.eventId === e.id &&
                                    p.kind === "gp" &&
                                    p.submitted,
                                ).length,
                              )}
                              {tr(" ")}
                              {tr("/")}
                              {tr(" ")}
                              {tr(
                                s.users.filter((u) =>
                                  u.seasonIds.includes(e.seasonId),
                                ).length,
                              )}
                            </td>
                            <td>
                              {tr(
                                e.sprintQualifying
                                  ? s.entries.filter(
                                      (p) =>
                                        p.eventId === e.id &&
                                        p.kind === "sprint" &&
                                        p.submitted,
                                    ).length
                                  : "—",
                              )}
                            </td>
                            <td>{tr(date(cutoff(e, "gp")))}</td>
                          </tr>
                        )),
                    )}
                  </tbody>
                </table>
              </div>
              <p className="tiny">
                {tr(
                  "Only your own drafts are visible. Other players\u2019 picks remain private until locking, including for organisers.",
                )}
              </p>
            </section>
          </>
        ),
      )}
      {tab === "overview" && <BackupPanel call={call} compact />}
      {tab === "overview" && season && (
        <>
          <LaunchChecklist s={s} season={season} />
        </>
      )}
      {tr(tab === "appearance" && <Appearance s={s} call={call} />)}
      {tr(
        tab === "banners" && (
          <Banners key={season?.id} s={s} season={season} call={call} />
        ),
      )}
      {tr(tab === "branding" && <Branding s={s} call={call} />)}
      {tr(
        tab === "events" &&
          (season ? (
            <EventAdmin key={season.id} s={s} season={season} call={call} />
          ) : (
            <Empty
              title={tr("Create a season first")}
              body="Open Seasons & lineup to get started."
            />
          )),
      )}
      {tab === "events" && season && (
        <ReplacementAdmin s={s} season={season} call={call} />
      )}
      {tr(
        tab === "results" &&
          (season ? (
            <ResultAdmin key={season.id} s={s} season={season} call={call} />
          ) : (
            <Empty
              title={tr("No season yet")}
              body="Create a season and calendar first."
            />
          )),
      )}
      {tr(
        tab === "members" && (
          <Members s={s} season={season} meId={meId} call={call} />
        ),
      )}
      {tr(
        tab === "seasons" && <SeasonAdmin s={s} season={season} call={call} />,
      )}
      {tr(tab === "announcements" && <Announcements s={s} call={call} />)}
      {tr(
        tab === "data" && (
          <>
            <BackupPanel call={call} />
            <section className="panel">
              <h2>{tr("Your league data")}</h2>
              <p className="muted">
                {tr(
                  "Export predictions, results, seasons and standings. Passwords and invitation secrets are excluded.",
                )}
              </p>
              <button
                className="primary"
                onClick={async () => {
                  const result = await call({ action: "export" }, true);
                  download(
                    `apex-league-${new Date().toISOString().slice(0, 10)}.json`,
                    result.export,
                  );
                }}
              >
                <Download size={17} />
                {tr("Export league JSON")}
              </button>
              <p className="tiny">
                {tr("Encrypted, restorable backups are available above.")}
              </p>
            </section>
            <section className="panel">
              <h2>{tr("Change history")}</h2>
              <div className="audit-list">
                {tr(
                  s.audit.map((a) => (
                    <div key={a.id}>
                      <span>
                        <strong>{tr(a.action)}</strong>
                        <small>{tr(a.actor)}</small>
                      </span>
                      <time>{tr(date(a.date))}</time>
                    </div>
                  )),
                )}
              </div>
              {tr(
                !s.audit.length && (
                  <p className="muted">
                    {tr("Admin changes will be recorded here.")}
                  </p>
                ),
              )}
            </section>
          </>
        ),
      )}
    </>
  );
}

export default Admin;
