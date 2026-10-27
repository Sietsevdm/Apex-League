"use client";
import { useLocale } from "@/lib/i18n";
import { Season, State } from "@/lib/model";
import { registrationOpen } from "@/lib/season-controls";
import { Heading, Pill } from "./Shared";
function Rules({ s, season }: { s: State; season: Season }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <>
      <Heading
        eyebrow="SAME GRID. SAME RULES."
        title={tr("Your league")}
        description={tr(s.settings.welcome)}
      />
      <div className="two-col">
        <section className="panel">
          <h2>{tr("The points system")}</h2>
          <table>
            <thead>
              <tr>
                <th>{tr("PREDICTION")}</th>
                <th>{tr("GP")}</th>
                <th>{tr("SPRINT")}</th>
              </tr>
            </thead>
            <tbody>
              {tr(
                [
                  ["Exact finishing position", "1 × 10", "1 × 8"],
                  ["Pole position", "3", "2"],
                  ["Exact ordered podium bonus", "5", "—"],
                  ["Fastest lap", "2", "1"],
                  ["First retirement / none", "2", "1"],
                  ["Official Driver of the Day", "1", "—"],
                  ["Maximum", "23", "12"],
                  ["Driver champion", "15", "—"],
                  ["Constructor champion", "10", "—"],
                ].map((r) => (
                  <tr key={r[0]}>
                    {tr(r.map((x, i) => <td key={i}>{tr(x)}</td>))}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>{tr("Who\u2019s on the grid")}</h2>
          {tr(
            s.users
              .filter((u) => u.seasonIds.includes(season.id))
              .map((u) => (
                <div className="member-row" key={u.id}>
                  <span className="mini-avatar">
                    {tr(u.name.slice(0, 2).toUpperCase())}
                  </span>
                  <strong>{u.name}</strong>
                  {u.role !== "player" && (
                    <Pill>
                      {tr(u.role === "admin" ? "Admin" : "Organiser")}
                    </Pill>
                  )}
                </div>
              )),
          )}
          <p className="tiny">
            {tr(
              registrationOpen(season)
                ? "Registration is open. Your organiser closes it manually."
                : "Registration is closed. Ask your organiser to reopen it.",
            )}
          </p>
        </section>
      </div>
      <section className="panel rules-prose">
        <h2>{tr("Fair play, without the guesswork")}</h2>
        <h3>{tr("Deadlines and privacy")}</h3>
        <p>
          {tr(
            "Each prediction set locks one hour before its own qualifying session. Drafts do not score: submit your completed entry. Submitted picks become visible after locking. Season picks close one hour before the opening weekend\u2019s first qualifying session. Player registration is opened and closed manually by your organiser.",
          )}
        </p>
        <h3>{tr("Equal points")}</h3>
        <p>
          {tr(
            "Most weekend wins, then most exact finishing positions, then a shared place. A weekend combines Grand Prix and Sprint prediction points. Tied leaders each earn a win; all-zero or void weekends award none. Shared positions use 1, 1, 3 ranking.",
          )}
        </p>
        <h3>{tr("First retirement")}</h3>
        <p>
          {tr(
            "The first driver permanently out after the race starts. Non-starters, temporary stops and later disqualifications do not count. If the order cannot be established, joint first retirements are accepted. Correctly predicting no retirements earns two points in a race that takes place.",
          )}
        </p>
        <h3>{tr("Disrupted sessions")}</h3>
        <p>
          {tr(
            "Official qualifying schedule changes move deadlines only while entries are still open. Locked entries never reopen for delays or restarts. Race-only schedule changes do not change prediction deadlines. An unexpectedly early session start triggers an immediate lock.",
          )}
        </p>
        <h3>{tr("Cancelled events and corrections")}</h3>
        <p>
          {tr(
            "Only categories with valid results score. Completed qualifying can score pole even when a race is cancelled; grid P1 does not replace a missing qualifying result. Shortened races with an official classification score normal league points. No official Driver of the Day means that category is void. Missing imported data remains pending. Corrected results recalculate everyone\u2019s points.",
          )}
        </p>
      </section>
    </>
  );
}

export default Rules;
