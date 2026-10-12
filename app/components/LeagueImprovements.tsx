"use client";
import { useEffect, useState } from "react";
import { State, Season, Event, Result, Picks, locked } from "@/lib/model";
import { resultImpact, submissionOverview } from "@/lib/enhancements";
import { useLocale } from "@/lib/i18n";
import { LaunchChecklist } from "./LeagueExtras";
type Call = (body: Record<string, unknown>, quiet?: boolean) => Promise<any>;

export function SubmissionOverview({
  s,
  event,
  kind,
}: {
  s: State;
  event: Event;
  kind: "gp" | "sprint";
}) {
  const { t } = useLocale();
  const rows =
    (
      s as State & {
        submissionOverview?: Record<
          string,
          Record<string, ReturnType<typeof submissionOverview>>
        >;
      }
    ).submissionOverview?.[event.id]?.[kind] || [];
  return (
    <section className="panel">
      <h2>{t("Submission overview")}</h2>
      <p className="muted">
        {t(
          "Only entry status is shown here. Predictions remain private until the deadline.",
        )}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("PLAYER")}</th>
              <th>{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>{r.name}</td>
                <td>{t(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function ReplacementNotice({
  event,
  season,
  kind,
  picks,
}: {
  event: Event;
  season: Season;
  kind: "gp" | "sprint";
  picks?: Picks;
}) {
  const { t } = useLocale();
  const rules = event.replacements?.filter((r) => r.kind === kind) || [];
  if (!rules.length) return null;
  const name = (id: string) =>
    season.drivers.find((d) => d.id === id)?.name || id;
  return (
    <div className="info-bar" role="status">
      {rules.map((r) => (
        <p key={r.from}>
          {name(r.from)} → {name(r.to)}:{" "}
          {t(
            r.policy === "carry"
              ? "Original picks follow the replacement driver for this session."
              : "Original picks remain with the original driver for this session.",
          )}{" "}
          {r.note}
          {picks &&
            [
              ...picks.order,
              picks.pole,
              picks.fastest,
              picks.retirement,
              picks.dotd,
            ].includes(r.from) && (
              <strong> · {t("Your predictions include this driver.")}</strong>
            )}
        </p>
      ))}
    </div>
  );
}
export function ReplacementAdmin({
  s,
  season,
  call,
}: {
  s: State;
  season: Season;
  call: Call;
}) {
  const { t } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id);
  const [id, setId] = useState(
      events.find((e) => !e.practiceRound && Date.parse(e.race) > Date.now())
        ?.id ||
        events[0]?.id ||
        "",
    ),
    [kind, setKind] = useState<"gp" | "sprint">("gp");
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [name, setName] = useState(""),
    [team, setTeam] = useState(""),
    [policy, setPolicy] = useState("keep"),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const event = events.find((e) => e.id === id);
  const affected = ((s as any).replacementCounts?.[id]?.[kind]?.[from] ||
    0) as number;
  return (
    <section className="panel">
      <h2>{t("Driver replacements")}</h2>
      <p className="muted">
        {t(
          "Set a session policy before publishing results. Original predictions and receipts are preserved; championship picks stay unchanged.",
        )}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await call({
              action: "replacement",
              eventId: id,
              kind,
              from,
              to,
              name,
              team,
              policy,
              note,
            });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            {t("Race weekend")}
            <select
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setKind("gp");
              }}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Session")}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "gp" | "sprint")}
            >
              <option value="gp">GP</option>
              {event?.sprintQualifying && (
                <option value="sprint">Sprint</option>
              )}
            </select>
          </label>
          <label>
            {t("Original driver")}
            <select
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              <option value="">{t("Choose a driver")}</option>
              {season.drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Replacement driver ID")}
            <input
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              list="replacement-drivers"
            />
            <datalist id="replacement-drivers">
              {season.drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </datalist>
          </label>
          <label>
            {t("New driver name")}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!season.drivers.some((d) => d.id === to)}
            />
          </label>
          <label>
            {t("Team")}
            <input value={team} onChange={(e) => setTeam(e.target.value)} />
          </label>
          <label>
            {t("Scoring policy")}
            <select value={policy} onChange={(e) => setPolicy(e.target.value)}>
              <option value="keep">{t("Keep original driver picks")}</option>
              <option value="carry">{t("Picks follow replacement")}</option>
            </select>
          </label>
          <label>
            {t("Explanation")}
            <textarea
              required
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
        <p>
          {t("Affected entries")}:{" "}
          {event && locked(event, kind)
            ? affected
            : t("Available after predictions lock")}
        </p>
        {event && (
          <ReplacementNotice event={event} season={season} kind={kind} />
        )}
        <p className="tiny">
          {t(
            "Review the policy with your league. Choosing carry applies equally to all picks for the original driver, without reopening the deadline.",
          )}
        </p>
        {error && <p role="alert">{t(error)}</p>}
        <button
          className="primary"
          disabled={busy || !event || event[kind]?.published}
        >
          {t("Confirm replacement")}
        </button>
      </form>
    </section>
  );
}
export function CorrectionPreview({
  s,
  event,
  kind,
  result,
}: {
  s: State;
  event: Event;
  kind: "gp" | "sprint";
  result: Result;
}) {
  const { t } = useLocale();
  if (!locked(event, kind))
    return (
      <p className="info-bar">
        {t("Standings preview becomes available after predictions lock.")}
      </p>
    );
  const rows = resultImpact(s, event, kind, result);
  return (
    <section className="panel">
      <h2>{t("Championship impact")}</h2>
      <p className="muted">
        {t(
          "Live preview only. Includes weekend wins and exact-position tie-breaks; practice rounds do not change the championship.",
        )}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("PLAYER")}</th>
              <th>{t("CURRENT")}</th>
              <th>{t("PREVIEW")}</th>
              <th>{t("Change")}</th>
              <th>{t("Place")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.before}</td>
                <td>{r.after}</td>
                <td>
                  {r.delta > 0 ? "+" : ""}
                  {r.delta}
                </td>
                <td>
                  {r.oldRank} → {r.rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function SeasonWizard({
  s,
  season,
  call,
}: {
  s: State;
  season?: Season;
  call: Call;
}) {
  const { t } = useLocale();
  const [step, setStep] = useState(0),
    [year, setYear] = useState(
      Math.max(new Date().getFullYear(), ...s.seasons.map((x) => x.year)) + 1,
    ),
    [name, setName] = useState(""),
    [cutoff, setCutoff] = useState(""),
    [copy, setCopy] = useState(season?.id || ""),
    [created, setCreated] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const selected = s.seasons.find((x) => x.id === created);
  const steps = ["Season details", "Import calendar", "Review and launch"];
  return (
    <section className="panel">
      <h2>{t("Season setup wizard")}</h2>
      <ol className="wizard-steps">
        {steps.map((v, i) => (
          <li key={v} aria-current={step === i ? "step" : undefined}>
            {t(v)}
          </li>
        ))}
      </ol>
      {step === 0 && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const response = await call({
                action: "createSeason",
                year,
                name,
                cutoff,
                copyId: copy,
              });
              const latest = response.state.seasons.at(-1);
              setCreated(latest.id);
              setStep(1);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <label>
              {t("Year")}
              <input
                type="number"
                min={1950}
                max={2100}
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <label>
              {t("Season name")}
              <input
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              {t("Initial championship-pick deadline")}
              <input
                type="datetime-local"
                required
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
              />
            </label>
            <label>
              {t("Copy lineup from")}
              <select value={copy} onChange={(e) => setCopy(e.target.value)}>
                <option value="">{t("Start empty")}</option>
                {s.seasons.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="primary" disabled={busy}>
            {t("Create season and continue")}
          </button>
        </form>
      )}
      {step === 1 && selected && (
        <>
          <p>
            {t(
              "Fetch the published calendar. Missing dates stay pending; existing picks and driver lineups are preserved.",
            )}
          </p>
          <div className="button-row">
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await call({ action: "calendarImport", seasonId: created });
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("Fetch calendar")}
            </button>
            <button className="secondary" onClick={() => setStep(2)}>
              {t("Continue to review")}
            </button>
          </div>
          <p role="status">{selected.calendarSync?.message}</p>
        </>
      )}
      {step === 2 && selected && (
        <>
          <LaunchChecklist s={s} season={selected} />
          <p>
            {t(
              "Finish missing items in Race weekends, Members and Banners. The season is created; registration is controlled manually in Members.",
            )}
          </p>
          <button
            className="secondary"
            onClick={() => {
              setStep(0);
              setCreated("");
            }}
          >
            {t("Start another setup")}
          </button>
        </>
      )}
      {error && <p role="alert">{t(error)}</p>}
    </section>
  );
}
type InstallEvent = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallApp() {
  const { t } = useLocale();
  const [prompt, setPrompt] = useState<InstallEvent>(),
    [installed, setInstalled] = useState(false),
    [online, setOnline] = useState(true);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setOnline(navigator.onLine);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const capture = (e: globalThis.Event) => {
      e.preventDefault();
      setPrompt(e as unknown as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(undefined);
    };
    const connection = () => setOnline(navigator.onLine);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);
  return (
    <section className="panel">
      <h2>{t("Install the app")}</h2>
      {!online && (
        <p role="alert">
          {t(
            "You are offline. Reconnect before editing or submitting predictions.",
          )}
        </p>
      )}
      {installed ? (
        <p>{t("The league is running as an installed app.")}</p>
      ) : (
        <>
          <p>
            {t(
              "Add the league to your home screen for quick access. An internet connection is required to view and submit predictions.",
            )}
          </p>
          {prompt ? (
            <button
              className="primary"
              onClick={async () => {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(undefined);
              }}
            >
              {t("Install app")}
            </button>
          ) : (
            <p className="tiny">
              {t(
                "On iPhone or iPad: open in Safari, tap Share, then Add to Home Screen. In other browsers, use the browser’s Install app menu when available.",
              )}
            </p>
          )}
        </>
      )}
    </section>
  );
}
