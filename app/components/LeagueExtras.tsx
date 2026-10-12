"use client";
import { useEffect, useState } from "react";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { useLocale } from "@/lib/i18n";
import { State, Season, Event, Result, Picks } from "@/lib/model";
import {
  defaultFonts,
  resolvedFonts,
  fontFamilies,
  fontGroups,
  FontGroup,
  FontControl,
} from "@/lib/typography";
import {
  deadlineCalendar,
  launchChecklist,
  seasonAwards,
} from "@/lib/league-extras";
type Call = (body: Record<string, unknown>, quiet?: boolean) => Promise<any>;
function saveFile(name: string, contents: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function TypographyEditor({ s, call }: { s: State; call: Call }) {
  const { t: tr } = useLocale();
  const [groups, setGroups] = useState(() =>
    structuredClone(resolvedFonts(s.settings.typography)),
  );
  const [selected, setSelected] = useState<FontGroup>("body");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const examples = {
    body: "Descriptions, announcements, driver names outside tables, circuit details and session dates.",
    heading: "Page titles, panel headings and race names in the calendar.",
    banner: "Grand Prix titles in the race banner and banner preview.",
    navigation:
      "Sidebar links, admin tabs, session tabs, season selector and language selector.",
    buttons:
      "Action buttons, form inputs, driver selectors and expandable section controls.",
    labels:
      "FP1, Qualifying and Race labels, form labels, badges, helper text and footer.",
    tables:
      "Table headings and cells, including player names and prediction history.",
    numbers:
      "Scores, positions, calendar round numbers, points limits and award totals.",
  };
  const v = groups[selected];
  const change = (values: Partial<FontControl>) =>
    setGroups({ ...groups, [selected]: { ...v, ...values } });
  const labels = {
    body: "Body text",
    heading: "Headings",
    banner: "Banner titles",
    navigation: "Navigation",
    buttons: "Buttons & inputs",
    labels: "Labels & helper text",
    tables: "Tables",
    numbers: "Scores & statistics",
  };
  return (
    <section className="panel typography-panel">
      <h2>{tr("Full font control")}</h2>
      <p className="muted">
        {tr(
          "Set the font, size, weight, line height and letter spacing for each part of the app.",
        )}
      </p>
      <div className="admin-tabs">
        {fontGroups.map((key) => (
          <button
            className={selected === key ? "selected" : ""}
            key={key}
            onClick={() => setSelected(key)}
          >
            {tr(labels[key])}
          </button>
        ))}
      </div>
      <p className="tiny">{tr(examples[selected])}</p>
      <div className="font-editor-grid">
        <label>
          {tr("Font family")}
          <select
            value={v.family}
            onChange={(e) =>
              change({ family: e.target.value as FontControl["family"] })
            }
          >
            {Object.keys(fontFamilies).map((key) => (
              <option key={key} value={key}>
                {
                  (
                    {
                      dm: "DM Sans",
                      barlow: "Barlow Condensed",
                      system: "System font",
                      arial: "Arial",
                      georgia: "Georgia",
                      mono: "Monospace",
                    } as Record<string, string>
                  )[key]
                }
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Size (%)")}
          <input
            type="number"
            min={60}
            max={180}
            step={1}
            value={v.size}
            onChange={(e) => change({ size: Number(e.target.value) })}
          />
        </label>
        <label>
          {tr("Font weight")}
          <select
            value={v.weight}
            onChange={(e) => change({ weight: Number(e.target.value) })}
          >
            {[400, 500, 600, 700, 800].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Line height")}
          <input
            type="number"
            min={1}
            max={2}
            step={0.05}
            value={v.lineHeight}
            onChange={(e) => change({ lineHeight: Number(e.target.value) })}
          />
        </label>
        <label>
          {tr("Letter spacing (px)")}
          <input
            type="number"
            min={-3}
            max={3}
            step={0.1}
            value={v.spacing}
            onChange={(e) => change({ spacing: Number(e.target.value) })}
          />
        </label>
      </div>
      <div
        className="font-preview"
        style={{
          fontFamily: fontFamilies[v.family],
          fontSize: `${(18 * v.size) / 100}px`,
          fontWeight: v.weight,
          lineHeight: v.lineHeight,
          letterSpacing: `${v.spacing}px`,
        }}
      >
        {tr("Good friends. Bold predictions. Every point counts.")}
        <br />
        Aa Bb Cc · 0123456789 · P1 +23
      </div>
      <div className="button-row">
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await call({
                action: "typography",
                typography: { text: 100, headings: 100, banner: 100, groups },
              });
              setMessage("Fonts saved");
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {tr("Apply fonts across the app")}
        </button>
        <button
          className="secondary"
          onClick={() =>
            setGroups({ ...groups, [selected]: { ...defaultFonts[selected] } })
          }
        >
          {tr("Reset this group")}
        </button>
        <button
          className="secondary"
          onClick={() => setGroups(structuredClone(defaultFonts))}
        >
          {tr("Reset all fonts")}
        </button>
      </div>
      <p className="tiny">
        {tr(
          "Reset changes the preview. Apply to save. Sizes adapt to mobile layouts. The current colour scheme is retained.",
        )}
      </p>
      <p role="status">{tr(message)}</p>
    </section>
  );
}
export function BackupPanel({
  call,
  compact = false,
}: {
  call: Call;
  compact?: boolean;
}) {
  const { t: tr, date } = useLocale();
  const [data, setData] = useState<any>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [file, setFile] = useState<File>(),
    [confirmation, setConfirmation] = useState(""),
    [password, setPassword] = useState("");
  const refresh = () =>
    call({ action: "backupList" }, true)
      .then(setData)
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    refresh();
  }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <h2>{tr(compact ? "System health" : "Backups & recovery")}</h2>
      <div className="health-grid">
        <div>
          <small>{tr("Database")}</small>
          <strong>{tr(data ? "Connected" : "Checking…")}</strong>
        </div>
        <div>
          <small>{tr("Backup encryption")}</small>
          <strong>
            {tr(
              !data
                ? "Checking…"
                : data.configured
                  ? "Configured"
                  : "Setup required",
            )}
          </strong>
        </div>
        <div>
          <small>{tr("Last successful backup")}</small>
          <strong>
            {data?.health?.lastSuccess
              ? date(data.health.lastSuccess)
              : tr("No backups yet")}
          </strong>
        </div>
        <div>
          <small>{tr("Daily backup")}</small>
          <strong>
            {tr(
              data?.health?.lastSuccess &&
                Date.now() - Date.parse(data.health.lastSuccess) < 36 * 3600000
                ? "Up to date"
                : "Needs attention",
            )}
          </strong>
        </div>
      </div>
      {data?.health?.error && <p className="error">{tr(data.health.error)}</p>}
      {compact ? (
        <p className="tiny">
          {tr(
            "Open Data & history to create, download or restore backups. Calendar sync status appears in Race weekends; unpublished results appear above.",
          )}
        </p>
      ) : (
        <>
          <p className="muted">
            {tr(
              "Encrypted snapshots include accounts, predictions, results, photos and settings. The latest 30 backups are kept on the server. Download a copy for storage away from your VPS.",
            )}
          </p>
          <button
            className="primary"
            disabled={busy || !data?.configured}
            onClick={() =>
              run(async () => {
                const result = await call({ action: "backupCreate" }, true);
                saveFile(result.backup.name, result.backup.content);
                setMessage("Backup created and downloaded");
              })
            }
          >
            {tr("Create & download backup")}
          </button>
          {!data?.configured && (
            <p className="tiny">
              {tr(
                "Set BACKUP_SECRET in Portainer to enable backups. Keep this secret safely: it is required to restore a downloaded backup.",
              )}
            </p>
          )}
          <div className="audit-list">
            {data?.backups?.map((b: any) => (
              <div key={b.name}>
                <span>
                  <strong>{b.name}</strong>
                  <small>{Math.round(b.bytes / 1024)} KB</small>
                </span>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const result = await call(
                        { action: "backupDownload", name: b.name },
                        true,
                      );
                      saveFile(result.backup.name, result.backup.content);
                    })
                  }
                >
                  {tr("Download")}
                </button>
              </div>
            ))}
          </div>
          <details className="restore-panel">
            <summary>{tr("Restore a backup")}</summary>
            <p>
              {tr(
                "Restoring replaces the entire league and signs everyone out. A snapshot of the current league is saved first. Use the same BACKUP_SECRET as the original backup.",
              )}
            </p>
            <label>
              {tr("Encrypted backup file")}
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </label>
            <label>
              {tr("Current password")}
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              {tr("Type RESTORE to confirm")}
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <button
              className="secondary"
              disabled={
                busy || !file || confirmation !== "RESTORE" || !data?.configured
              }
              onClick={() =>
                run(async () => {
                  if (!file) return;
                  if (file.size > 100_000_000)
                    throw new Error("Backup is too large.");
                  await call(
                    {
                      action: "backupRestore",
                      content: await file.text(),
                      confirmation,
                      password,
                    },
                    true,
                  );
                  location.reload();
                })
              }
            >
              {tr("Restore league")}
            </button>
          </details>
        </>
      )}
      <p role="status">{tr(message)}</p>
    </section>
  );
}
export function LaunchChecklist({ s, season }: { s: State; season: Season }) {
  const { t: tr } = useLocale();
  const checks =
    (
      s as State & {
        launchChecks?: Record<string, ReturnType<typeof launchChecklist>>;
      }
    ).launchChecks?.[season.id] || launchChecklist(s, season);
  return (
    <section className="panel">
      <h2>{tr("Season launch checklist")}</h2>
      <p className="tiny">
        {tr(
          "Readiness guidance; registration and prediction deadlines remain enforced automatically.",
        )}
      </p>
      <div className="checklist">
        {checks.map((c) => (
          <div key={c.label}>
            <span className={`pill ${c.ready ? "good" : ""}`}>
              {tr(c.ready ? "Ready" : "Pending")}
            </span>
            <span>{tr(c.label)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
export function Awards({ s, season }: { s: State; season: Season }) {
  const { t: tr } = useLocale();
  return (
    <section className="panel">
      <h2>{tr("Season awards")}</h2>
      <p className="tiny">
        {tr(
          "Based on published GP and Sprint results. Tied winners share the award. Awards do not add league points.",
        )}
      </p>
      <div className="awards-grid">
        {seasonAwards(s, season.id).map((a) => (
          <div key={a.label}>
            <small>{tr(a.label)}</small>
            <strong>{a.winners.join(" · ") || tr("To be decided")}</strong>
            <span>{a.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
export function CalendarDownload({ s, season }: { s: State; season: Season }) {
  const { t: tr, language } = useLocale();
  return (
    <section className="panel">
      <h2>{tr("Deadline reminders")}</h2>
      <p className="tiny">
        {tr(
          "Add GP and Sprint deadlines to your calendar with reminders 24 hours and 1 hour before closing. Re-import after schedule changes; your calendar app controls notifications.",
        )}
      </p>
      <button
        className="secondary"
        onClick={() =>
          saveFile(
            `league-${season.year}-deadlines.ics`,
            deadlineCalendar(s, season, language),
            "text/calendar;charset=utf-8",
          )
        }
      >
        {tr("Download reminder calendar")}
      </button>
    </section>
  );
}
export function PredictionExtras({
  s,
  season,
  meId,
  event,
  kind,
  onCopy,
  disabled,
}: {
  s: State;
  season: Season;
  meId: string;
  event: Event;
  kind: "gp" | "sprint";
  onCopy: (p: Picks) => void;
  disabled: boolean;
}) {
  const { t: tr, date } = useLocale();
  const [message, setMessage] = useState("");
  const previous = s.entries
    .filter(
      (p) =>
        p.userId === meId &&
        p.kind === kind &&
        p.submitted &&
        p.eventId !== event.id &&
        s.events.some(
          (e) =>
            e.id === p.eventId &&
            e.seasonId === season.id &&
            Date.parse(e.race) < Date.parse(event.race),
        ),
    )
    .sort(
      (a, b) =>
        Date.parse(s.events.find((e) => e.id === b.eventId)!.race) -
        Date.parse(s.events.find((e) => e.id === a.eventId)!.race),
    )[0];
  const receipts = (s.receipts || [])
    .filter(
      (r) => r.userId === meId && r.eventId === event.id && r.kind === kind,
    )
    .slice()
    .reverse();
  const latest = receipts[0];
  const name = (id: string) =>
    id === "none"
      ? tr("No retirements")
      : season.drivers.find((d) => d.id === id)?.name || id || "—";
  return (
    <div className="prediction-tools">
      <div className="button-row">
        <button
          className="secondary"
          disabled={disabled || !previous}
          onClick={() => {
            if (!previous) return;
            const ids = season.drivers.map((d) => d.id);
            const picks = structuredClone(previous.picks);
            picks.order = picks.order.map((id) => (ids.includes(id) ? id : ""));
            for (const key of [
              "pole",
              "fastest",
              "dotd",
              "retirement",
            ] as const)
              if (
                !ids.includes(picks[key]) &&
                !(key === "retirement" && picks[key] === "none")
              )
                picks[key] = "";
            onCopy(picks);
            setMessage(
              "Previous picks copied as a draft. Review and submit to enter.",
            );
          }}
        >
          {tr("Copy previous picks")}
        </button>
      </div>
      {message && <span role="status" className="tiny">{tr(message)}</span>}
      <details className="receipt-menu">
        <summary>{tr("Submission receipts")}</summary>
        <div className="receipt-content">
      {latest ? (
        <>
          <p className="tiny">
            {tr("Latest submission")}: {date(latest.submittedAt)} ·{" "}
            {tr("Receipt")} {latest.id.slice(0, 8)}
          </p>
          <details>
            <summary>{tr("View receipt history")}</summary>
            {receipts.map((receipt) => (
              <div className="receipt" key={receipt.id}>
                <strong>{date(receipt.submittedAt)}</strong>
                <small>
                  {tr("Deadline")}: {date(receipt.deadline)}
                </small>
                <p>
                  {receipt.picks.order
                    .map((id, i) => `P${i + 1}: ${name(id)}`)
                    .join(" · ")}
                </p>
                <p>
                  {tr("Pole position")}: {name(receipt.picks.pole)} ·{" "}
                  {tr("Fastest lap")}: {name(receipt.picks.fastest)} ·{" "}
                  {tr("First retirement")}: {name(receipt.picks.retirement)}
                  {kind === "gp"
                    ? ` · ${tr("Driver of the Day")}: ${name(receipt.picks.dotd)}`
                    : ""}
                </p>
                <button
                  className="secondary"
                  onClick={() =>
                    saveFile(
                      `prediction-receipt-${receipt.id}.json`,
                      JSON.stringify(
                        { ...receipt, event: event.name },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  {tr("Download receipt")}
                </button>
              </div>
            ))}
          </details>
          <p className="tiny">
            {tr(
              "Receipts preserve submitted picks. If you edit afterwards, submit again; the current entry status decides whether picks score.",
            )}
          </p>
        </>
      ) : (
        <p className="tiny">
          {tr(
            "A timestamped receipt appears after you submit. Drafts do not receive receipts.",
          )}
        </p>
      )}
        </div>
      </details>
    </div>
  );
}
export function Provenance({ result }: { result?: Result }) {
  const { t: tr, date } = useLocale();
  if (!result?.published) return null;
  const p = result.provenance;
  return (
    <div className="info-bar provenance">
      <span>
        {tr("Result source")}: {p?.source || tr("Organiser entry")}
      </span>
      {p?.fetchedAt && (
        <span>
          {tr("Fetched")}: {date(p.fetchedAt)}
        </span>
      )}
      {p?.confirmedAt && (
        <span>
          {tr("Confirmed")}: {date(p.confirmedAt)} · {p.confirmedBy}
        </span>
      )}
    </div>
  );
}
export function PasskeyLogin({
  call,
  onError,
}: {
  call: Call;
  onError: (message: string) => void;
}) {
  const { t: tr } = useLocale();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="secondary passkey-login"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (!window.PublicKeyCredential)
            throw new Error("Passkeys are not supported by this browser.");
          const d = await call({ action: "passkeyLoginOptions" }, true);
          const response = await startAuthentication({
            optionsJSON: d.options,
          });
          await call({ action: "passkeyLoginVerify", response }, true);
        } catch (e) {
          onError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {tr("Sign in with a passkey")}
    </button>
  );
}
export function PasskeyPanel({
  me,
  call,
}: {
  me: State["users"][0];
  call: Call;
}) {
  const { t: tr, date } = useLocale();
  const [name, setName] = useState("My passkey"),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await work();
      setPassword("");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel narrow">
      <h2>{tr("Passkeys")}</h2>
      <p className="tiny">
        {tr(
          "Sign in using your device fingerprint, face or PIN. Keep your password as a recovery option. Passkeys are tied to this website domain.",
        )}
      </p>
      <label>
        {tr("Passkey name")}
        <input
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        {tr("Current password")}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button
        className="secondary"
        disabled={busy || !password}
        onClick={() =>
          run(async () => {
            if (!window.PublicKeyCredential)
              throw new Error("Passkeys are not supported by this browser.");
            const d = await call(
              { action: "passkeyRegisterOptions", password },
              true,
            );
            const response = await startRegistration({
              optionsJSON: d.options,
            });
            await call(
              { action: "passkeyRegisterVerify", response, name },
              true,
            );
            setMessage("Passkey added");
          })
        }
      >
        {tr("Add passkey")}
      </button>
      <div className="audit-list">
        {me.passkeys?.map((k) => (
          <div key={k.id}>
            <span>
              <strong>{k.name}</strong>
              <small>{date(k.createdAt)}</small>
            </span>
            <button
              className="secondary"
              disabled={busy || !password}
              onClick={() =>
                run(async () => {
                  await call(
                    { action: "removePasskey", id: k.id, password },
                    true,
                  );
                  setMessage("Passkey removed");
                })
              }
            >
              {tr("Remove")}
            </button>
          </div>
        ))}
      </div>
      <p role="status">{tr(message)}</p>
    </section>
  );
}
