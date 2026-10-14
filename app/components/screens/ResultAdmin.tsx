"use client";
import type { Call } from "@/lib/client-data";
import { driversByConstructor } from "@/lib/driver-order";
import { useLocale } from "@/lib/i18n";
import { Result, Season, State, emptyResult, locked, score } from "@/lib/model";
import { Check, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import DriverLabel from "../DriverLabel";
import { DriverSelect, Empty } from "./Shared";
const CorrectionPreview = dynamic(
  () => import("../LeagueImprovements").then((m) => m.CorrectionPreview),
  { loading: () => null },
);
function ResultAdmin({
  s,
  season,
  call,
}: {
  s: State;
  season: Season;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id);
  const [id, setId] = useState(
      events.find((e) => Date.parse(e.race) < Date.now() && !e.gp?.published)
        ?.id ||
        events[0]?.id ||
        "",
    ),
    [kind, setKind] = useState<"gp" | "sprint">("gp"),
    [r, setR] = useState<Result>(emptyResult()),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false);
  const e = events.find((x) => x.id === id);
  useEffect(() => {
    const result =
      e?.[kind === "gp" ? "gpDraft" : "sprintDraft"] ||
      e?.[kind] ||
      emptyResult();
    setR({
      ...result,
      order: Array.from(
        { length: kind === "gp" ? 10 : 8 },
        (_, i) => result.order[i] || "",
      ),
    });
    setReason("");
  }, [id, kind]);
  if (!e)
    return (
      <Empty
        title={tr("No events to score")}
        body="Add a calendar or a practice round first."
      />
    );
  const preview = s.users
    .filter((u) => u.seasonIds.includes(season.id))
    .map((u) => {
      const p = s.entries.find(
        (x) =>
          x.userId === u.id &&
          x.eventId === id &&
          x.kind === kind &&
          x.submitted,
      );
      return {
        name: u.name,
        points: p
          ? score(
              p.picks,
              {
                ...r,
                published: true,
                replacements: e.replacements?.filter((x) => x.kind === kind),
              },
              kind,
            ).total
          : 0,
        old: p ? score(p.picks, e[kind], kind).total : 0,
      };
    })
    .sort((a, b) => b.points - a.points);
  const voidToggle = (key: string) =>
    setR({
      ...r,
      voids: r.voids.includes(key)
        ? r.voids.filter((x) => x !== key)
        : [...r.voids, key],
    });
  return (
    <>
      <div className="toolbar">
        <select
          value={id}
          onChange={(ev) => {
            setId(ev.target.value);
            setKind("gp");
          }}
          aria-label={tr("Score event")}
        >
          {tr(
            events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            )),
          )}
        </select>
        <div className="segmented">
          <button
            className={kind === "gp" ? "selected" : ""}
            onClick={() => setKind("gp")}
          >
            {tr("GP")}
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
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const d = await call(
                { action: "resultsImport", eventId: id, kind },
                true,
              );
              setR({ ...r, ...d.imported, published: false });
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={16} />
          {tr(busy ? "Fetching…" : "Fetch results")}
        </button>
      </div>
      <div className="info-bar">
        {tr(
          "Confirm first retirement and Driver of the Day manually. Sprint pole and missing fastest-lap data also need confirmation. Fetching results never publishes scores.",
        )}
      </div>
      <CorrectionPreview s={s} event={e} kind={kind} result={r} />
      <div className="two-col">
        <section className="panel">
          <h2>{tr("Confirm the outcome")}</h2>
          <div className="inline">
            <h3>{tr("Finishing positions")}</h3>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={r.voids.includes("order")}
                onChange={() => voidToggle("order")}
              />
              {tr("Void race positions & podium")}
            </label>
          </div>
          <div className="result-input-grid">
            {tr(
              r.order.map((v, i) => (
                <label key={i}>
                  {tr("P")}
                  {tr(i + 1)}
                  <DriverSelect
                    season={season}
                    value={v}
                    disabled={r.voids.includes("order")}
                    onChange={(value) => {
                      const order = [...r.order];
                      order[i] = value;
                      setR({ ...r, order });
                    }}
                  />
                </label>
              )),
            )}
          </div>
          {tr(
            (
              ["pole", "fastest", ...(kind === "gp" ? ["dotd"] : [])] as (
                "pole" | "fastest" | "dotd"
              )[]
            ).map((key) => (
              <div key={key} className="result-field">
                <label>
                  {tr(
                    {
                      pole: "Pole position",
                      fastest: "Fastest lap",
                      dotd: "Driver of the Day",
                    }[key],
                  )}
                  <DriverSelect
                    season={season}
                    value={r[key]}
                    disabled={r.voids.includes(key)}
                    onChange={(value) => setR({ ...r, [key]: value })}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={r.voids.includes(key)}
                    onChange={() => voidToggle(key)}
                  />
                  {tr("Void")}
                </label>
              </div>
            )),
          )}
          <div className="inline">
            <h3>{tr("First retirement")}</h3>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={r.voids.includes("retirement")}
                onChange={() => voidToggle("retirement")}
              />
              {tr("Void")}
            </label>
          </div>
          <p className="tiny">
            {tr(
              "Choose multiple drivers for an unresolved joint retirement, or choose No retirements.",
            )}
          </p>
          <div className="retirement-grid">
            {tr(
              [
                { id: "none", name: "No retirements" },
                ...driversByConstructor(season.drivers),
              ].map((d) => (
                <label className="checkbox" key={d.id}>
                  <input
                    type="checkbox"
                    disabled={r.voids.includes("retirement")}
                    checked={r.retirements.includes(d.id)}
                    onChange={() =>
                      setR({
                        ...r,
                        retirements: r.retirements.includes(d.id)
                          ? r.retirements.filter((x) => x !== d.id)
                          : d.id === "none"
                            ? ["none"]
                            : [
                                ...r.retirements.filter((x) => x !== "none"),
                                d.id,
                              ],
                      })
                    }
                  />
                  <DriverLabel season={season} id={d.id} />
                </label>
              )),
            )}
          </div>
          <label>
            {tr("Publication / correction note")}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tr("Explain a correction or confirm the source.")}
            />
          </label>
          <div className="button-row">
            <button
              className="secondary"
              onClick={() =>
                call({
                  action: "results",
                  eventId: id,
                  kind,
                  result: { ...r, published: false },
                  reason,
                })
              }
            >
              {tr("Save draft")}
            </button>
            <button
              className="primary"
              disabled={!locked(e, kind)}
              onClick={() =>
                call({
                  action: "results",
                  eventId: id,
                  kind,
                  result: { ...r, published: true },
                  reason,
                })
              }
            >
              {tr("Publish all scores")}
              <Check size={17} />
            </button>
          </div>
        </section>
        <section className="panel sticky-panel">
          <h2>{tr("Score preview")}</h2>
          <p className="muted">
            {tr(
              "Review each player\u2019s points before publishing. Missing results must be confirmed or explicitly voided.",
            )}
          </p>
          <table>
            <thead>
              <tr>
                <th>{tr("PLAYER")}</th>
                <th>{tr("CURRENT")}</th>
                <th>{tr("PREVIEW")}</th>
              </tr>
            </thead>
            <tbody>
              {tr(
                preview.map((p) => (
                  <tr key={p.name}>
                    <td>{tr(p.name)}</td>
                    <td>{tr(p.old)}</td>
                    <td className="points accent">{tr(p.points)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
          {tr(
            e.practiceRound && (
              <div className="info-bar">
                {tr("Practice points will not enter the championship.")}
              </div>
            ),
          )}
        </section>
      </div>
    </>
  );
}

export default ResultAdmin;
