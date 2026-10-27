"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { State } from "@/lib/model";
import { Save } from "lucide-react";
import { useState } from "react";
import { imageFile } from "./Shared";
function LoginTextEditor({ s, call }: { s: State; call: Call }) {
  const { t: tr } = useLocale();
  const [values, setValues] = useState(s.settings.loginText || {});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const fields = [
    ["eyebrow", "Login introduction", "THE NEXT RACE STARTS WITH YOU"],
    ["headline", "Login headline", "Friends on the grid."],
    ["accent", "Highlighted headline", "Rivals on Sunday."],
    [
      "description",
      "Login description",
      "Make your picks. Follow the points. Own the bragging rights.",
    ],
    ["footer", "Login footer", "Your private Formula 1 prediction league."],
    ["welcome", "Sign-in heading", "Welcome back"],
    ["subtitle", "Sign-in description", "Your next prediction is waiting."],
  ] as const;
  return (
    <section className="panel narrow">
      <h2>{tr("Login screen")}</h2>
      <p className="muted">
        {tr(
          "Leave a field empty to use the default text. Change login fonts in Settings → Appearance using Login headings and Login text.",
        )}
      </p>
      {fields.map(([key, label, fallback]) => (
        <label key={key}>
          {tr(label)}
          <input
            maxLength={500}
            value={values[key] || ""}
            placeholder={tr(fallback)}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          />
        </label>
      ))}
      <button
        className="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await call({ action: "loginText", loginText: values });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {tr(busy ? "Saving…" : "Save login text")}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {tr(error)}
        </p>
      )}
    </section>
  );
}
function BrandingForm({ s, call }: { s: State; call: Call }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [name, setName] = useState(s.settings.name),
    [welcome, setWelcome] = useState(s.settings.welcome),
    [logo, setLogo] = useState(s.settings.logo),
    [err, setErr] = useState("");
  return (
    <section className="panel narrow">
      <h2>{tr("A league with your name on it")}</h2>
      <label>
        {tr("League name")}
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {tr("Welcome message")}
        <textarea
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
        />
      </label>
      <label>
        {tr("League logo")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            try {
              if (e.target.files?.[0]) {
                const img = await imageFile(e.target.files[0]);
                if (img.length > 1500000)
                  throw new Error("Choose a smaller logo (under 1 MB).");
                setLogo(img);
                setErr("");
              }
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
        />
      </label>
      {tr(
        logo && (
          <img className="logo-preview" src={logo} alt={tr("Logo preview")} />
        ),
      )}
      {tr(err && <p className="form-error">{tr(err)}</p>)}
      <div className="button-row">
        <button
          className="primary"
          onClick={() => call({ action: "branding", name, welcome, logo })}
        >
          {tr("Save branding")}
          <Save size={16} />
        </button>
        <button className="secondary" onClick={() => setLogo("")}>
          {tr("Remove logo")}
        </button>
      </div>
    </section>
  );
}

export default function Branding(props: {
  s: State;
  call: Call;
  siteOwner?: boolean;
}) {
  return (
    <>
      <BrandingForm {...props} />
      {props.siteOwner && <LoginTextEditor {...props} />}
    </>
  );
}
