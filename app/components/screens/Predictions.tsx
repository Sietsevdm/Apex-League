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
import { startVisibleTicker } from "@/lib/visible-timer";
import PredictionStatus from "../PredictionStatus";
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
  initialKind = "gp",
  call,
}: {
  s: State;
  season: Season;
  meId: string;
  initialId: string;
  initialKind?: "gp" | "sprint";
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id);
  const start =
    events.find((e) => e.id === initialId) ||
    events.find((e) => !locked(e, "gp") && !e.practiceRound) ||
    events.at(-1);
  const [id, setId] = useState(start?.id || ""),
    [kind, setKind] = useState<"gp" | "sprint">(
      initialKind === "sprint" && (start?.hasSprint || start?.sprintQualifying)
        ? "sprint"
        : "gp",
    );
  const e = events.find((x) => x.id === id);
  const [now, setNow] = useState(Date.now);
  const [editing, setEditing] = useState(false);
  useEffect(() => startVisibleTicker(() => setNow(Date.now())), []);
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
    setEditing(false);
    clearTimeout(saveTimer.current);
    const item = s.entries.find(
      (x) => x.eventId === id && x.kind === kind && x.userId === meId,
    );
    setP(item?.picks || emptyPicks(kind === "gp" ? 10 : 8));
    setStatus(item?.submitted ? "Submitted" : "Draft");
  }, [id, kind]);
  useEffect(() => {
    // Keep the submitted entry intact until the complete edited set is saved.
    if (!dirty.current || !e || locked(e, kind) || entry?.submitted) return;
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
  useEffect(() => {
    if (!e || !editing || !locked(e, kind, now)) return;
    clearTimeout(saveTimer.current);
    dirty.current = false;
    setP(entry?.picks || emptyPicks(kind === "gp" ? 10 : 8));
    setEditing(false);
    setStatus(entry?.submitted ? "Submitted" : "Draft");
  }, [now, editing, id, kind]);
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
  const isLocked = locked(e, kind, now);
  const readOnly = isLocked || Boolean(entry?.submitted && !editing);
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
          disabled={saving}
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
            disabled={saving}
            onClick={() => setKind("gp")}
          >
            {tr("Grand Prix")}
          </button>
          {tr(
            e.sprintQualifying && (
              <button
                className={kind === "sprint" ? "selected" : ""}
                disabled={saving}
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
          disabled={readOnly || !member || saving}
        />
      </div>
      <ReplacementNotice event={e} season={season} kind={kind} picks={p} />
      <section className="prediction-guide" aria-label={tr("Prediction status")}>
        <PredictionStatus submitted={entry?.submitted} exists={Boolean(entry)} locked={isLocked} />
        <div><strong>{tr(isLocked ? "Your picks are locked" : entry?.submitted ? editing ? "Make your changes" : "You're on the grid" : "Build your prediction")}</strong>
          <p>{tr(isLocked ? "The deadline has passed. Your saved entry cannot be changed." : entry?.submitted ? editing ? "Your last submitted picks still count. Save changes to replace them before the deadline." : "Your predictions are submitted. You can edit them until the deadline." : "Drafts save automatically. Submit your complete picks before the deadline to take part.")}</p>
        </div>
        {entry?.submitted && !isLocked && !editing && <button className="secondary" onClick={() => setEditing(true)}>{tr("Edit predictions")}</button>}
      </section>
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
                      disabled={readOnly || saving || !member}
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
                      disabled={readOnly || saving || i === 0 || !member}
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
                      disabled={readOnly || saving || i === p.order.length - 1 || !member}
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
                  disabled={readOnly || saving || !member}
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
        <div role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>
            {tr(
              saving
                ? "Saving…"
                : isLocked
                  ? entry?.submitted
                    ? "Submitted · locked"
                    : "No submitted entry"
                  : status.startsWith("Save failed:") ? status : editing ? dirty.current ? "Unsaved changes" : "Editing submitted picks" : status,
            )}
            <small>
              {tr(
                isLocked
                  ? "Entries cannot be changed"
                  : `${tr("Editable until")}: ${date(cutoff(e, kind))}`,
              )}
            </small>
          </span>
        </div>
        <div className="prediction-save-actions">
        {editing && !isLocked && <button className="secondary" disabled={saving} onClick={() => { setP(entry?.picks || emptyPicks(kind === "gp" ? 10 : 8)); dirty.current = false; setEditing(false); setStatus("Submitted"); }}>{tr("Cancel changes")}</button>}
        <button
          className="primary"
          disabled={isLocked || !member || saving || (!(entry?.submitted && !editing) && !complete(p, kind))}
          onClick={async () => {
            if (entry?.submitted && !editing) { setEditing(true); return; }
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
              setStatus(editing ? "Changes saved · submitted" : "Submitted");
              setEditing(false);
            } catch (err) {
              setStatus(`Save failed: ${(err as Error).message}`);
            } finally {
              setSaving(false);
            }
          }}
        >
          {tr(isLocked ? "Predictions locked" : entry?.submitted ? editing ? "Save changes" : "Edit predictions" : "Submit predictions")}
          <Check size={17} />
        </button>
        </div>
      </div>
    </>
  );
}

export default Predictions;
