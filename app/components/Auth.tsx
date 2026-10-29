"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { ClientData as Data, Call } from "@/lib/client-data";
import PasskeyLogin from "./PasskeyLogin";
export default function Auth({
  data,
  call,
  error,
  setError,
  invitation = "",
}: {
  data: Data;
  call: Call;
  error: string;
  setError: (v: string) => void;
  invitation?: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [mode, setMode] = useState<"login" | "join" | "create">(
      invitation ? "join" : "login",
    ),
    [busy, setBusy] = useState(false),
    [available, setAvailable] = useState<any[]>([]);
  const register = mode !== "login";
  const creating = mode === "create";
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setError("");
  };
  const [form, setForm] = useState({
    name: "",
    leagueName: "",
    email: "",
    password: "",
    invite: invitation,
    seasonId: "",
  });
  useEffect(() => {
    if (mode !== "join") return;
    let active = true;
    const invite =
      form.invite || new URLSearchParams(location.search).get("invite") || "";
    call({ action: "publicInfo", invite }, true)
      .then((d) => {
        if (!active) return;
        setAvailable(d.seasons);
        setForm((f) => ({
          ...f,
          seasonId: d.seasons.at(-1)?.id || "",
          invite: f.invite || invite,
        }));
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [mode, form.invite]);
  return (
    <main className="auth-shell"
      style={{
        "--login-image": `url("${data.loginImage || "/login-garage.webp"}")`,
        "--login-mobile-image": `url("${data.loginMobileImage || data.loginImage || "/login-garage-mobile.webp"}")`,
      } as React.CSSProperties}
    >
      <link
        rel="preload"
        as="image"
        href={data.loginMobileImage || data.loginImage || "/login-garage-mobile.webp"}
        media="(max-width: 760px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={data.loginImage || "/login-garage.webp"}
        media="(min-width: 761px)"
        fetchPriority="high"
      />
      <div
        className="auth-story"
      >
        <div className="brand">
          <span className="brand-mark"><img src="/apex-logo.svg" alt="A" /></span>
          {tr(data.name || "Apex League")}
        </div>
        <div>
          <div className="eyebrow">
            {tr(data.loginText?.eyebrow || "THE NEXT RACE STARTS WITH YOU")}
          </div>
          <h1>
            {tr(data.loginText?.headline || "Friends in the Paddock.")}
            <br />
            <em>{tr(data.loginText?.accent || "Rivals on the Grid.")}</em>
          </h1>
          <p>
            {tr(
              data.loginText?.description ||
                "Make your picks. Follow the points. Own the bragging rights.",
            )}
          </p>
        </div>
        <small>
          {tr(
            data.loginText?.footer ||
              "Your private Formula 1 prediction league.",
          )}
        </small>
      </div>
      <div className="auth-card">
        <h2>
          {tr(
            register
              ? creating
                ? "Create your own league"
                : "Join your friends"
              : data.loginText?.welcome || "Welcome back",
          )}
        </h2>
        <p>
          {tr(
            register
              ? creating
                ? "Start a league, invite your friends and run the championship."
                : "You need an invitation and an open season."
              : data.loginText?.subtitle || "Your next prediction is waiting.",
          )}
        </p>
        {!register && <PasskeyLogin call={call} onError={setError} />}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await call({
                action: creating
                  ? "registerLeague"
                  : register
                    ? "register"
                    : "login",
                ...form,
              });
            } catch (reason) {
              setError((reason as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {tr(
            register && (
              <label>
                {tr("Display name")}
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
            ),
          )}
          <label>
            {tr("Email")}
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            {tr("Password")}
            <input
              type="password"
              required
              minLength={register ? 12 : 1}
              autoComplete={register ? "new-password" : "current-password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {creating && (
            <label>
              {tr("League name")}
              <input
                required
                maxLength={80}
                value={form.leagueName}
                onChange={(e) =>
                  setForm({ ...form, leagueName: e.target.value })
                }
              />
            </label>
          )}
          {tr(
            mode === "join" && (
              <>
                <label>
                  {tr("Invitation code")}
                  <input
                    required
                    value={form.invite}
                    onChange={(e) =>
                      setForm({ ...form, invite: e.target.value })
                    }
                  />
                </label>
                <label>
                  {tr("Season")}
                  <select
                    value={form.seasonId}
                    onChange={(e) =>
                      setForm({ ...form, seasonId: e.target.value })
                    }
                  >
                    {tr(
                      available.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                          {tr(
                            x.registrationClosed
                              ? " · Registration closed"
                              : "",
                          )}
                        </option>
                      )),
                    )}
                  </select>
                </label>
              </>
            ),
          )}
          <button className="primary" disabled={busy}>
            {tr(
              busy
                ? "Please wait…"
                : creating
                  ? "Create account & league"
                  : register
                    ? "Join the grid"
                    : "Sign in",
            )}
            <ArrowUpRight size={18} />
          </button>
        </form>
        {tr(error && <p className="form-error">{tr(error)}</p>)}
        {register ? (
          <button className="text-button" onClick={() => changeMode("login")}>
            {tr("Already a member? Sign in")}
          </button>
        ) : (
          <div className="auth-options">
            <button className="text-button" onClick={() => changeMode("join")}>
              {tr("Have an invitation? Join the league")}
            </button>
            <button
              className="text-button"
              onClick={() => changeMode("create")}
            >
              {tr("Create your own league")}
            </button>
          </div>
        )}
        <p className="tiny">
          {tr("Forgot your password? Ask your organiser to reset your access.")}
        </p>
      </div>
    </main>
  );
}
