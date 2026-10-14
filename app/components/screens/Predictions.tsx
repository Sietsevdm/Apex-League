"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import {
  Picks,
  Season,
  State,
  complete,
  cutoff,
  emptyPicks,
  locked,
} from "@/lib/model";
import { predictionDrivers } from "@/lib/season-controls";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock,
  Shield,
  Target,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { DriverSelect, Empty, Heading, Pill, remaining } from "./Shared";
const SubmissionOverview = dynamic(
  () => import("../LeagueImprovements").then((m) => m.SubmissionOverview),
  { loading: () => null },
);
const ReplacementNotice = dynamic(
  () => import("../LeagueImprovements").then((m) => m.ReplacementNotice),
  { loading: () => null },
);
const PredictionExtras = dynamic(
  () => import("../LeagueExtras").then((m) => m.PredictionExtras),
  { loading: () => null },
);
function Predictions({
  s,
  season,
  meId,
  initialId,
  call,
}: {
  s: State;
  season: Season;
  meId: string;
  initialId: string;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id);
  const start =
    events.find((e) => e.id === initialId) ||
    events.find((e) => !locked(e, "gp") && !e.practiceRound) ||
    events.at(-1);
  const [id, setId] = useState(start?.id || ""),
    [kind, setKind] = useState<"gp" | "sprint">("gp");
  const e = events.find((x) => x.id === id);
  const entry = s.entries.find(
    (x) => x.eventId === id && x.kind === kind && x.userId === meId,
  );
  const [p, setP] = useState<Picks>(entry?.picks || emptyPicks());
  const [status, setStatus] = useState(
      entry?.submitted ? "Submitted" : "Draft",
    ),
    [saving, setSaving] = useState(false);
  const dirty = useRef(false),
    revision = useRef(0),
    saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    revision.current++;
    dirty.current = false;
    clearTimeout(saveTimer.current);
    const item = s.entries.find(
      (x) => x.eventId === id && x.kind === kind && x.userId === meId,
    );
    setP(item?.picks || emptyPicks(kind === "gp" ? 10 : 8));
    setStatus(item?.submitted ? "Submitted" : "Draft");
  }, [id, kind]);
  useEffect(() => {
    if (!dirty.current || !e || locked(e, kind)) return;
    const rev = ++revision.current;
    setStatus("Unsaved changes");
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await call(
          { action: "predict", eventId: id, kind, picks: p, submitted: false },
          true,
        );
        if (revision.current === rev) setStatus("Draft saved");
      } catch (err) {
        if (revision.current === rev)
          setStatus(`Save failed: ${(err as Error).message}`);
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => clearTimeout(saveTimer.current);
  }, [p]);
  if (!e)
    return (
      <Empty
        title={tr("No weekends yet")}
        body="Your organiser will add the race calendar."
      />
    );
  const predictionSeason = {
    ...season,
    drivers: predictionDrivers(s, season, e, kind),
  };
  const isLocked = locked(e, kind);
  const member = s.users
    .find((u) => u.id === meId)
    ?.seasonIds.includes(season.id);
  const change = (key: keyof Picks, value: any) => {
    dirty.current = true;
    setP({ ...p, [key]: value });
  };
  return (
    <>
      <Heading
        eyebrow="MAKE YOUR CALL"
        title={tr("Your predictions")}
        description={tr(
          "Pick the grid. Trust your instincts. Beat your friends.",
        )}
      />
      <div className="toolbar">
        <select
          value={id}
          onChange={(ev) => {
            setId(ev.target.value);
            setKind("gp");
          }}
          aria-label={tr("Prediction weekend")}
        >
          {tr(
            events.map((x) => (
              <option key={x.id} value={x.id}>
                {tr(x.practiceRound ? "Practice · " : "")}
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
        <Pill tone={isLocked ? "" : "accent"}>
          <Clock size={13} />
          {tr(isLocked ? "Locked" : `Closes in ${remaining(cutoff(e, kind))}`)}
        </Pill>
        <PredictionExtras
          s={s}
          season={predictionSeason}
          meId={meId}
          event={e}
          kind={kind}
          onCopy={(picks) => {
            dirty.current = true;
            setP(picks);
            setStatus("Unsaved changes");
          }}
          disabled={isLocked || !member || saving}
        />
      </div>
      <ReplacementNotice event={e} season={season} kind={kind} picks={p} />
      <SubmissionOverview s={s} event={e} kind={kind} />
      {tr(
        e.practiceRound && (
          <div className="info-bar">
            {tr(
              "Practice round \u00B7 excluded from championship points and tie-breaks.",
            )}
          </div>
        ),
      )}
      {tr(
        !member && (
          <div className="info-bar">
            {tr(
              "You are not registered for this season. Ask your organiser before registration closes.",
            )}
          </div>
        ),
      )}
      <div className="prediction-layout">
        <section className="panel">
          <div className="section-title">
            <h2>{tr("Finishing order")}</h2>
            <Pill>
              {tr(kind === "gp" ? "10" : "8")}
              {tr("points available")}
            </Pill>
          </div>
          <p className="muted">
            {tr("One point for each driver in the exact position.")}
            {tr(
              kind === "gp"
                ? " A perfect top three adds five bonus points."
                : "",
            )}
          </p>
          <div className="prediction-grid">
            {tr(
              p.order.map((v, i) => (
                <div className="position-pick" key={i}>
                  <span className={i < 3 ? "podium-number" : ""}>
                    {tr(String(i + 1).padStart(2, "0"))}
                  </span>
                  <div>
                    <label>
                      {tr(
                        i < 3
                          ? ["WINNER", "SECOND PLACE", "THIRD PLACE"][i]
                          : `POSITION ${i + 1}`,
                      )}
                    </label>
                    <DriverSelect
                      value={v}
                      season={predictionSeason}
                      label={tr(`Position ${i + 1}`)}
                      disabled={isLocked || !member}
                      onChange={(value) => {
                        const order = [...p.order];
                        const other = order.indexOf(value);
                        if (value && other !== i && other >= 0)
                          order[other] = order[i];
                        order[i] = value;
                        change("order", order);
                      }}
                    />
                  </div>
                  <div className="reorder">
                    <button
                      disabled={isLocked || i === 0 || !member}
                      aria-label={tr(`Move position ${i + 1} up`)}
                      onClick={() => {
                        const order = [...p.order];
                        [order[i], order[i - 1]] = [order[i - 1], order[i]];
                        change("order", order);
                      }}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      disabled={isLocked || i === p.order.length - 1 || !member}
                      aria-label={tr(`Move position ${i + 1} down`)}
                      onClick={() => {
                        const order = [...p.order];
                        [order[i], order[i + 1]] = [order[i + 1], order[i]];
                        change("order", order);
                      }}
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                </div>
              )),
            )}
          </div>
        </section>
        <section className="panel bonus-panel">
          <div className="section-title">
            <h2>{tr("The extra edge")}</h2>
            <Target size={20} />
          </div>
          {tr(
            (
              [
                ["pole", "Pole position", kind === "gp" ? 3 : 2],
                ["fastest", "Fastest lap", kind === "gp" ? 2 : 1],
                ["retirement", "First retirement", kind === "gp" ? 2 : 1],
                ...(kind === "gp" ? [["dotd", "Driver of the Day", 1]] : []),
              ] as [keyof Picks, string, number][]
            ).map(([key, label, points]) => (
              <label key={key}>
                <span>
                  {tr(label)}
                  <small>
                    {tr("+")}
                    {tr(points)} {tr(points === 1 ? "point" : "points")}
                  </small>
                </span>
                <DriverSelect
                  value={p[key] as string}
                  season={predictionSeason}
                  none={key === "retirement"}
                  disabled={isLocked || !member}
                  label={tr(label)}
                  onChange={(v) => change(key, v)}
                />
              </label>
            )),
          )}
          <div className="prediction-note">
            <Shield size={18} />
            <p>
              {tr(
                "Your picks stay private until the deadline. All entries lock one hour before qualifying.",
              )}
            </p>
          </div>
          <div className="max-points">
            <small>{tr("PERFECT WEEKEND SCORE")}</small>
            <strong>
              {tr(kind === "gp" ? 23 : 12)}
              <span>{tr("pts")}</span>
            </strong>
          </div>
        </section>
      </div>
      <div className="submit-bar">
        <div>
          <CheckCircle2 size={18} />
          <span>
            {tr(
              saving
                ? "Saving…"
                : isLocked
                  ? entry?.submitted
                    ? "Submitted · locked"
                    : "No submitted entry"
                  : status,
            )}
            <small>
              {tr(
                isLocked
                  ? "Entries cannot be changed"
                  : `Deadline: ${date(cutoff(e, kind))}`,
              )}
            </small>
          </span>
        </div>
        <button
          className="primary"
          disabled={isLocked || !member || saving || !complete(p, kind)}
          onClick={async () => {
            clearTimeout(saveTimer.current);
            dirty.current = false;
            setSaving(true);
            revision.current++;
            try {
              await call({
                action: "predict",
                eventId: id,
                kind,
                picks: p,
                submitted: true,
              });
              setStatus("Submitted");
            } finally {
              setSaving(false);
            }
          }}
        >
          {tr(isLocked ? "Predictions locked" : "Submit predictions")}
          <Check size={17} />
        </button>
      </div>
    </>
  );
}

export default Predictions;
