"use client";
import { useLocale } from "@/lib/i18n";
import { Season, State, emptyPicks, predictionsVisible, score } from "@/lib/model";
import { resultsEvent } from "@/lib/results-event";
import { mappedPicks } from "@/lib/enhancements";
import { Download, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import DriverLabel from "../DriverLabel";
import { Empty, Heading, Pill, driverName } from "./Shared";
const WeekendAwards = dynamic(() => import("../WeekendAwards"));
const ResultCorrections = dynamic(() => import("../ResultCorrections"), {
  loading: () => null,
});
const ShareCard = dynamic(() => import("../ShareCard"), {
  loading: () => null,
});
const Provenance = dynamic(
  () => import("../LeagueExtras").then((m) => m.Provenance),
  { loading: () => null },
);
function Results({
  s,
  season,
  meId,
  initialId,
}: {
  s: State;
  season: Season;
  meId: string;
  initialId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [shareOpen, setShareOpen] = useState(false);
  const [playerId, setPlayerId] = useState(meId);
  const events = s.events.filter((e) => e.seasonId === season.id);
  const [id, setId] = useState(
      resultsEvent(s, season, initialId)?.id,
    ),
    [kind, setKind] = useState<"gp" | "sprint">("gp");
  const e = events.find((e) => e.id === id);
  if (!e)
    return (
      <Empty
        title={tr("Results will land here")}
        body="Your organiser will publish scores after the first event."
      />
    );
  const weekendRows = s.users
    .filter((u) => u.seasonIds.includes(season.id))
    .map((u) => ({
      name: u.name,
      id: u.id,
      total: ["gp", "sprint"].reduce((total, k) => {
        const entry = s.entries.find(
          (x) =>
            x.eventId === e.id &&
            x.kind === k &&
            x.userId === u.id &&
            x.submitted,
        );
        return (
          total +
          (entry ? score(entry.picks, e[k as "gp"], k as "gp").total : 0)
        );
      }, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const entry = s.entries.find(
      (x) =>
        x.eventId === e.id &&
        x.userId === playerId &&
        x.kind === kind &&
        x.submitted,
    ),
    r = e[kind];
  const sc = score(entry?.picks || emptyPicks(kind === "gp" ? 10 : 8), r, kind);
  const sessions = (
    ["gp", ...(e.hasSprint || e.sprintQualifying ? ["sprint"] : [])] as (
      "gp" | "sprint"
    )[]
  ).map((sessionKind) => {
    const saved = s.entries.find(
      (p) =>
        p.eventId === e.id &&
        p.userId === playerId &&
        p.kind === sessionKind &&
        p.submitted,
    );
    const result = sessionKind === "gp" ? e.gp : e.sprint;
    return {
      kind: sessionKind,
      published: Boolean(result?.published),
      points: saved ? score(saved.picks, result, sessionKind).total : 0,
    };
  });
  const original = entry?.picks || emptyPicks(kind === "gp" ? 10 : 8);
  const mapped = mappedPicks(
    original,
    r?.replacements?.filter((rule) => rule.kind === kind),
  );
  const pickFor = (label: string, picks = original) =>
    label.startsWith("P") && /^P\d+$/.test(label)
      ? [picks.order[Number(label.slice(1)) - 1]]
      : label === "Exact podium bonus"
        ? picks.order.slice(0, 3)
        : [
            picks[
              (
                {
                  "Pole position": "pole",
                  "Fastest lap": "fastest",
                  "First retirement": "retirement",
                  "Driver of the Day": "dotd",
                } as const
              )[label as "Pole position"]
            ] || "",
          ];
  const outcomeFor = (label: string) =>
    /^P\d+$/.test(label)
      ? [r?.order[Number(label.slice(1)) - 1] || ""]
      : label === "Exact podium bonus"
        ? r?.order.slice(0, 3) || []
        : label === "First retirement"
          ? r?.retirements || []
          : [
              r?.[
                (
                  {
                    "Pole position": "pole",
                    "Fastest lap": "fastest",
                    "Driver of the Day": "dotd",
                  } as const
                )[label as "Pole position"]
              ] || "",
            ];
  const names = (ids: string[]) =>
    ids
      .map((id) =>
        id === "none"
          ? tr("No retirements")
          : season.drivers.find((driver) => driver.id === id)?.name ||
            id ||
            "—",
      )
      .join(" · ");
  const published = sessions.some(session => session.published);
  const winnerPoints = weekendRows[0]?.total || 0;
  const winners = weekendRows.filter(row => winnerPoints > 0 && row.total === winnerPoints).map(row => row.name);
  return (
    <>
      <Heading
        eyebrow="THE WEEKEND STORY"
        title={tr("Results & recap")}
        description={tr("A clear explanation of every point earned.")}
      >
        {tr(
          e.gp?.published && (
            <button className="secondary" onClick={() => setShareOpen(true)}>
              <Download size={17} />
              {tr("Share results")}
            </button>
          ),
        )}
      </Heading>
      <div className="toolbar results-controls">
        <select
          value={id}
          onChange={(ev) => {
            setId(ev.target.value);
            setKind("gp");
          }}
          aria-label={tr("Results weekend")}
        >
          {tr(
            events.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            )),
          )}
        </select>
        <label className="results-player-select"><span>{tr("Player")}</span><select aria-label={tr("Results player")} value={playerId} onChange={ev => setPlayerId(ev.target.value)}>
          {s.users.filter(user => user.seasonIds.includes(season.id)).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select></label>
      </div>
      <section
        className="panel weekend-score-summary results-summary"
        aria-label={tr("Weekend score")}
      >
        <div>
          <h2>
            {tr(
              playerId === meId
                ? "Your weekend score"
                : "Player's weekend score",
            )}
            <Pill>{tr(r?.published ? "Published" : "Pending confirmation")}</Pill>
          </h2>
          <p>
            {e.name} · {s.users.find((user) => user.id === playerId)?.name}
          </p>
        </div>
        <div className="weekend-score-total">
          <strong>
            {sessions.some((session) => session.published)
              ? sessions.reduce(
                  (total, session) =>
                    total + (session.published ? session.points : 0),
                  0,
                )
              : "—"}
          </strong>
          <span>{tr("points earned")}</span>
        </div>
        <div className="results-summary-footer">
          <div className="weekend-score-sessions" aria-label={tr("Select result session")}>
          {sessions.map((session) => (
            <button
              className={`secondary ${kind === session.kind ? "selected" : ""}`}
              key={session.kind}
              onClick={() => setKind(session.kind)}
            >
              {session.kind === "gp" ? "GP" : tr("Sprint")} ·{" "}
              {session.published
                ? `${session.points} ${tr("pts")}`
                : tr("Pending")}
            </button>
          ))}
          </div>
          {published && <div className="results-winner"><Trophy size={15} aria-hidden="true" /><span>{tr(sessions.every(session => session.published) ? "Weekend winner" : "Weekend leader")}<strong>{winners.join(" & ") || tr("No points awarded")}</strong></span>{winnerPoints > 0 && <small>{winnerPoints} {tr("pts")}</small>}</div>}
        {sessions.some((session) => !session.published) && (
          <small>
            {tr(
              "Only published sessions are included. Remaining results are pending.",
            )}
          </small>
        )}
        </div>
      </section>
      {tr(
        shareOpen && (
          <ShareCard
            s={s}
            season={season}
            event={e}
            meId={meId}
            onClose={() => setShareOpen(false)}
          />
        ),
      )}
      <WeekendAwards s={s} season={season} event={e} />
      {tr(
        e.practiceRound && (
          <div className="info-bar">
            {tr("Practice scores only \u00B7 excluded from season standings.")}
          </div>
        ),
      )}
      <section className="panel">
        <h2>{tr("Weekend standings")}</h2>
        <table>
          <thead>
            <tr>
              <th>{tr("PLAYER")}</th>
              <th className="right">{tr("POINTS")}</th>
            </tr>
          </thead>
          <tbody>
            {tr(
              weekendRows.map((x) => (
                <tr className={x.id === meId ? "your-row" : ""} key={x.id}>
                  <td>{x.name}</td>
                  <td className="right points">{published ? tr(x.total) : tr("Pending")}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </section>
      <div className="two-col results-detail-grid">
        <details className="panel results-disclosure" key={`breakdown-${id}-${kind}`}>
          <summary><span>{tr("Prediction breakdown")}</span><small>{kind === "gp" ? "GP" : tr("Sprint")} · {r?.published ? `${sc.total} ${tr("pts")}` : tr("Pending")}</small></summary>
          <div className="results-disclosure-body">
          {tr(
            !entry && (
              <p className="muted">
                {tr(playerId !== meId && !predictionsVisible(e, kind) ? "Submitted predictions become visible here after qualifying (scheduled start plus one hour)." : "No submitted prediction for this session.")}
              </p>
            ),
          )}
          <div
            className="score-table-wrap"
            tabIndex={0}
            role="region"
            aria-label={tr("Score breakdown")}
          >
            <table className="score-breakdown-table">
              <caption>
                {tr("Your pick → Actual result → Points earned")}
              </caption>
              <thead>
                <tr>
                  <th>{tr("Category")}</th>
                  <th>
                    {tr(playerId === meId ? "Your pick" : "Player's pick")}
                  </th>
                  <th>{tr("Actual result")}</th>
                  <th>{tr("Points earned")}</th>
                </tr>
              </thead>
              <tbody>
                {tr(
                  sc.details.map((d) => (
                    <tr key={d.label}>
                      <th scope="row">{tr(d.label)}</th>
                      <td>
                        <span>{names(pickFor(d.label))}</span>
                        {names(pickFor(d.label)) !==
                          names(pickFor(d.label, mapped)) && (
                          <small>
                            {tr("Scored as")}: {names(pickFor(d.label, mapped))}
                          </small>
                        )}
                      </td>
                      <td>
                        {d.status === "void"
                          ? tr("Void")
                          : r?.published
                            ? names(outcomeFor(d.label))
                            : tr("Pending")}
                      </td>
                      <td>
                        <Pill
                          fontGroup={
                            d.status === "pending" || d.status === "void"
                              ? "labels"
                              : "numbers"
                          }
                          tone={d.status === "correct" ? "accent" : ""}
                        >
                          {tr(
                            d.status === "pending"
                              ? "Pending"
                              : d.status === "void"
                                ? "Void"
                                : `${d.points} / ${d.possible}`,
                          )}
                        </Pill>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>{tr("Session total")}</th>
                  <td>
                    <strong>{r?.published ? sc.total : tr("Pending")}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
        </details>
        <details className="panel results-disclosure" key={`outcome-${id}-${kind}`}>
          <summary><span>{tr("Confirmed outcome")}</span><small>{tr(r?.published ? "Published" : "Pending")}</small></summary>
          <div className="results-disclosure-body">
          <Provenance result={r} />
          {tr(
            !r?.published ? (
              <Empty
                title={tr("Awaiting results")}
                body="Results will appear after the race once official data is available. Your submitted predictions are kept safe while scores are being confirmed."
              />
            ) : (
              <>
                <ol className="result-order">
                  {tr(
                    r.order.map((id, i) => (
                      <li key={i}>
                        <span>{tr(i + 1)}</span>
                        {<DriverLabel season={season} id={id} />}
                      </li>
                    )),
                  )}
                </ol>
                {tr(
                  [
                    ["Pole", r.pole],
                    ["Fastest lap", r.fastest],
                    [
                      "First retirement",
                      r.retirements
                        .map((x) => driverName(season, x))
                        .join(" / "),
                    ],
                    ...(kind === "gp" ? [["Driver of the Day", r.dotd]] : []),
                  ].map(([label, id]) => (
                    <div className="result-extra" key={label}>
                      <span>{tr(label)}</span>
                      <strong>
                        {tr(
                          label === "First retirement"
                            ? id
                            : driverName(season, id),
                        )}
                      </strong>
                    </div>
                  )),
                )}
              </>
            ),
          )}
          <details className="results-correction-details"><summary>{tr("Result correction history")}</summary><ResultCorrections s={s} season={season} eventId={e.id} kind={kind} /></details>
          </div>
        </details>
      </div>
    </>
  );
}

export default Results;
