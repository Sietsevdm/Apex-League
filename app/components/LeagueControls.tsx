"use client";
import { useState } from "react";
import type { Call } from "@/lib/client-data";
import type { State, User } from "@/lib/model";
import { useLocale } from "@/lib/i18n";
export default function LeagueControls({
  s,
  me,
  call,
  onSelect,
  onChanged,
}: {
  s: State;
  me: User;
  call: Call;
  onSelect: (id: string) => void;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(""),
    [invite, setInvite] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (action: "leagueCreate" | "joinLeague") => {
    setBusy(true);
    setError("");
    try {
      let token = invite.trim();
      if (token.includes("?")) {
        try {
          token = new URL(token).searchParams.get("invite") || token;
        } catch {}
      }
      await call({ action, name, invite: token });
      setName("");
      setInvite("");
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="league-controls" aria-label={t("Your leagues")}>
      <label>
        {t("League")}
        <select
          aria-label={t("Select league")}
          value={s.selectedLeagueId || ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {!s.leagues?.length && <option value="">{t("No league yet")}</option>}
          {s.leagues?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>{t(me.role === "player" ? "Join another league" : "Create or join a league")}</summary>
        {me.role !== "player" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit("leagueCreate");
            }}
          >
            <label>
              {t("New league name")}
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="secondary" disabled={busy}>
              {t("Create league")}
            </button>
          </form>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit("joinLeague");
          }}
        >
          <label>
            {t("Invitation link or code")}
            <input
              required
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
            />
          </label>
          <button className="secondary" disabled={busy}>
            {t("Join league")}
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {t(error)}
          </p>
        )}
      </details>
    </section>
  );
}
