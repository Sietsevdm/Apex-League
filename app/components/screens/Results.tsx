"use client";
import { useLocale } from "@/lib/i18n";
import { Season, State, emptyPicks, score, standings } from "@/lib/model";
import { mappedPicks } from "@/lib/enhancements";
import { Download, Flag, Target, TrendingUp, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import DriverLabel from "../DriverLabel";
import { Empty, Heading, Metric, Pill, driverName } from "./Shared";
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
      initialId ||
        events.filter((e) => e.gp?.published).at(-1)?.id ||
        events[0]?.id,
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
  const rows = standings(s, season.id);
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
      exact: ["gp", "sprint"].reduce((total, k) => {
        const entry = s.entries.find(
          (x) =>
            x.eventId === e.id &&
            x.kind === k &&
            x.userId === u.id &&
            x.submitted,
        );
        return (
          total +
          (entry ? score(entry.picks, e[k as "gp"], k as "gp").exact : 0)
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
  const before = structuredClone(s);
  before.events = before.events.filter(
    (x) => x.id !== e.id && Date.parse(x.race) < Date.parse(e.race),
  );
  const prior = standings(before, season.id);
  const moves = rows
    .map((x) => ({
      name: x.name,
      move: (prior.find((p) => p.id === x.id)?.rank || x.rank) - x.rank,
    }))
    .sort((a, b) => b.move - a.move);
  const podiums = s.entries.filter(
    (x) =>
      x.eventId === e.id &&
      x.kind === "gp" &&
      x.submitted &&
      score(x.picks, e.gp, "gp").details.some(
        (d) => d.label === "Exact podium bonus" && d.points === 5,
      ),
  ).length;
  return (
    <>
      <Heading
        eyebrow="THE WEEKEND STORY"
        title={tr("Results & recap")}
        description={tr("A clear explanation of every point earned.")}
      >
        {tr(
          e.gp?.published && (
            <button className="primary" onClick={() => setShareOpen(true)}>
              <Download size={17} />
              {tr("Share results")}
            </button>
          ),
        )}
      </Heading>
      <Provenance result={r} />
      <section
        className="panel weekend-score-summary"
        aria-label={tr("Weekend score")}
      >
        <div>
          <h2>
            {tr(
              playerId === meId
                ? "Your weekend score"
                : "Player's weekend score",
            )}
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
        <div className="weekend-score-sessions">
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
        {sessions.some((session) => !session.published) && (
          <small>
            {tr(
              "Only published sessions are included. Remaining results are pending.",
            )}
          </small>
        )}
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
      <div className="toolbar">
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
        <div className="segmented">
          <button
            className={kind === "gp" ? "selected" : ""}
            onClick={() => setKind("gp")}
          >
            {tr("Grand Prix")}
          </button>
          {tr(
            e.sprintQualifying && (
              <button
                className={kind === "sprint" ? "selected" : ""}
                onClick={() => setKind("sprint")}
              >
                {tr("Sprint")}
              </button>
            ),
          )}
        </div>
        <Pill>{tr(r?.published ? "Published" : "Pending confirmation")}</Pill>
      </div>
      {tr(
        e.practiceRound && (
          <div className="info-bar">
            {tr("Practice scores only \u00B7 excluded from season standings.")}
          </div>
        ),
      )}
      {tr(
        e.gp?.published && (
          <div className="metrics results-metrics">
            <Metric
              label={tr("WEEKEND WINNER")}
              value={
                weekendRows
                  .filter(
                    (x) => x.total === weekendRows[0]?.total && x.total > 0,
                  )
                  .map((x) => x.name)
                  .join(" & ") || "No winner"
              }
              detail={`${weekendRows[0]?.total || 0} points`}
              icon={<Trophy />}
            />
            <Metric
              label={tr("BIGGEST CLIMBER")}
              value={
                moves[0]?.move > 0
                  ? moves
                      .filter((x) => x.move === moves[0].move)
                      .map((x) => x.name)
                      .join(" & ")
                  : "No movement"
              }
              detail={
                moves[0]?.move > 0
                  ? `Up ${moves[0].move} positions`
                  : "Standings unchanged"
              }
              icon={<TrendingUp />}
            />
            <Metric
              label={tr("EXACT POSITION LEADER")}
              value={
                weekendRows
                  .filter(
                    (x) =>
                      x.exact ===
                        Math.max(...weekendRows.map((x) => x.exact)) &&
                      x.exact > 0,
                  )
                  .map((x) => x.name)
                  .join(" & ") || "None"
              }
              detail="Across this weekend"
              icon={<Target />}
            />
            <Metric
              label={tr("PERFECT PODIUM PICKS")}
              value={String(podiums)}
              detail="Players earning the five-point bonus"
              icon={<Flag />}
            />
          </div>
        ),
      )}
      <div className="two-col">
        <section className="panel">
          <div className="section-title">
            <h2>{tr("Player points breakdown")}</h2>
            <strong className="accent score-large">
              {tr(r?.published ? sc.total : "Pending")}
              {r?.published && <small>{tr("pts")}</small>}
            </strong>
          </div>
          <label>
            {tr("Player")}
            <select
              value={playerId}
              onChange={(ev) => setPlayerId(ev.target.value)}
            >
              {s.users
                .filter((user) => user.seasonIds.includes(season.id))
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
          </label>
          {tr(
            !entry && (
              <p className="muted">
                {tr("No submitted prediction for this session.")}
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
        </section>
        <section className="panel">
          <h2>{tr("Confirmed outcome")}</h2>
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
        </section>
      </div>
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
                  <td className="right points">{tr(x.total)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </section>
      <ResultCorrections s={s} season={season} eventId={e.id} kind={kind} />
    </>
  );
}

export default Results;
