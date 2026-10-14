"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { State } from "@/lib/model";
import { LogOut, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Heading } from "./Shared";
const InstallApp = dynamic(
  () => import("../LeagueImprovements").then((m) => m.InstallApp),
  { loading: () => null },
);
const PasskeyPanel = dynamic(
  () => import("../LeagueExtras").then((m) => m.PasskeyPanel),
  { loading: () => null },
);
function Profile({ me, call }: { me: State["users"][0]; call: Call }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [form, setForm] = useState({
    name: me.name,
    timezone: me.timezone || "Europe/Amsterdam",
    reminders: me.reminders,
    password: "",
    currentPassword: "",
  });
  return (
    <>
      <Heading
        title={tr("Your profile")}
        description={tr("Your identity in the paddock.")}
      />
      <InstallApp />
      <PasskeyPanel me={me} call={call} />
      <section className="panel narrow">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            call({ action: "profile", ...form });
          }}
        >
          <label>
            {tr("Display name")}
            <input
              value={form.name}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            {tr("Email")}
            <input value={me.email || ""} disabled />
          </label>
          <label>
            {tr("Timezone")}
            <input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.reminders}
              onChange={(e) =>
                setForm({ ...form, reminders: e.target.checked })
              }
            />
            {tr("Opt in to deadline reminders")}
          </label>
          <p className="tiny">
            {tr(
              "Email delivery will require the organiser\u2019s mail service configuration.",
            )}
          </p>
          <label>
            {tr("Current password")}
            <input
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) =>
                setForm({ ...form, currentPassword: e.target.value })
              }
            />
          </label>
          <label>
            {tr("New password (optional)")}
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <button className="primary">
            {tr("Save profile")}
            <Save size={17} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => call({ action: "logout" })}
        >
          <LogOut size={16} />
          {tr("Sign out")}
        </button>
      </section>
    </>
  );
}

export default Profile;
