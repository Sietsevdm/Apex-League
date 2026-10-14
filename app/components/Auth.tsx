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
}: {
  data: Data;
  call: Call;
  error: string;
  setError: (v: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [available, setAvailable] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    invite: "",
    seasonId: "",
  });
  useEffect(() => {
    if (!register) return;
    let active = true;
    call({ action: "publicInfo" }, true)
      .then((d) => {
        if (!active) return;
        setAvailable(d.seasons);
        setForm((f) => ({
          ...f,
          seasonId: d.seasons.at(-1)?.id || "",
          invite: new URLSearchParams(location.search).get("invite") || "",
        }));
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [register]);
  return (
    <main className="auth-shell">
      <link
        rel="preload"
        as="image"
        href={data.loginMobileImage || data.loginImage || "/login-race.svg"}
        media="(max-width: 760px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={data.loginImage || "/login-race.svg"}
        media="(min-width: 761px)"
        fetchPriority="high"
      />
      <div
        className="auth-story"
        style={
          {
            "--login-image": `url("${data.loginImage || "/login-race.svg"}")`,
            "--login-mobile-image": `url("${data.loginMobileImage || data.loginImage || "/login-race.svg"}")`,
          } as React.CSSProperties
        }
      >
        <div className="brand">
          <span className="brand-mark">{tr("A")}</span>
          {tr(data.name || "Apex League")}
        </div>
        <div>
          <div className="eyebrow">
            {tr(data.loginText?.eyebrow || "THE NEXT RACE STARTS WITH YOU")}
          </div>
          <h1>
            {tr(data.loginText?.headline || "Friends on the grid.")}
            <br />
            <em>{tr(data.loginText?.accent || "Rivals on Sunday.")}</em>
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
              ? "Join your friends"
              : data.loginText?.welcome || "Welcome back",
          )}
        </h2>
        <p>
          {tr(
            register
              ? "You need an invitation and an open season."
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
              await call({ action: register ? "register" : "login", ...form });
            } catch {
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
          {tr(
            register && (
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
            {tr(busy ? "Please wait…" : register ? "Join the grid" : "Sign in")}
            <ArrowUpRight size={18} />
          </button>
        </form>
        {tr(error && <p className="form-error">{tr(error)}</p>)}
        <button className="text-button" onClick={() => setRegister(!register)}>
          {tr(
            register
              ? "Already a member? Sign in"
              : "Have an invitation? Join the league",
          )}
        </button>
        <p className="tiny">
          {tr("Forgot your password? Ask your organiser to reset your access.")}
        </p>
      </div>
    </main>
  );
}
