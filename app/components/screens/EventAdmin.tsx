"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { Event, Season, State, cutoff, locked } from "@/lib/model";
import { Plus, RefreshCw, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
const CalendarSync = dynamic(() => import("../CalendarSync"), {
  loading: () => null,
});
function localInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function EventAdmin({
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
  const fresh = {
    id: "",
    name: "",
    circuit: "",
    country: "",
    practice: "",
    qualifying: "",
    race: "",
    sprintQualifying: "",
    sprintRace: "",
    length: "",
    laps: 0,
    practiceRound: false,
    calendarOverride: true,
  };
  const [form, setForm] = useState(fresh),
    [busy, setBusy] = useState(false),
    [editorOpen, setEditorOpen] = useState(false);
  const edit = (e: Event) => {
    setEditorOpen(true);
    setForm({
      ...fresh,
      ...e,
      calendarOverride: true,
      practice: localInput(e.practice),
      qualifying: localInput(e.qualifying),
      race: localInput(e.race),
      sprintQualifying: localInput(e.sprintQualifying || ""),
      sprintRace: localInput(e.sprintRace || ""),
    });
  };
  return (
    <>
      <CalendarSync s={s} season={season} call={call} />
      <section className="panel">
        <div className="section-title">
          <h2>{tr("Race weekends")}</h2>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await call({ action: "calendarImport", seasonId: season.id });
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw size={16} />
            {tr(busy ? "Importing…" : "Import Jolpica calendar")}
          </button>
        </div>
        <p className="tiny">
          {tr(
            "Calendar checks work before and during the season. Missing session times remain pending. Existing driver lineups are preserved; review them before inviting players.",
          )}
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tr("EVENT")}</th>
                <th>{tr("GP DEADLINE")}</th>
                <th>{tr("STATUS")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tr(
                events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.name}
                      {tr(e.practiceRound ? " · Practice" : "")}
                    </td>
                    <td>{tr(date(cutoff(e, "gp")))}</td>
                    <td>{tr(locked(e, "gp") ? "Locked" : "Open")}</td>
                    <td>
                      <button className="text-button" onClick={() => edit(e)}>
                        {tr("Edit")}
                      </button>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>{tr(form.id ? "Edit weekend" : "Add a weekend")}</h2>
          <button
            className="text-button"
            onClick={() => {
              setForm(fresh);
              setEditorOpen(!editorOpen);
            }}
            aria-expanded={editorOpen}
          >
            <Plus size={16} />
            {tr(editorOpen ? "Close editor" : "New event")}
          </button>
        </div>
        {editorOpen && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await call({ action: "event", seasonId: season.id, ...form });
              setForm(fresh);
              setEditorOpen(false);
            }}
          >
            <div className="form-grid">
              {tr(
                (["name", "circuit", "country", "length"] as const).map((k) => (
                  <label key={k}>
                    {tr(
                      {
                        name: "Grand Prix name",
                        circuit: "Circuit",
                        country: "Location",
                        length: "Track length (km)",
                      }[k],
                    )}
                    <input
                      value={form[k]}
                      required={k === "name"}
                      onChange={(e) =>
                        setForm({ ...form, [k]: e.target.value })
                      }
                    />
                  </label>
                )),
              )}
              {tr(
                (
                  [
                    "practice",
                    "qualifying",
                    "race",
                    "sprintQualifying",
                    "sprintRace",
                  ] as const
                ).map((k) => (
                  <label key={k}>
                    {tr(
                      {
                        practice: "First practice",
                        qualifying: "GP qualifying",
                        race: "Grand Prix race",
                        sprintQualifying: "Sprint qualifying (optional)",
                        sprintRace: "Sprint race (optional)",
                      }[k],
                    )}
                    <input
                      type="datetime-local"
                      value={form[k]}
                      required={["practice", "qualifying", "race"].includes(k)}
                      onChange={(e) =>
                        setForm({ ...form, [k]: e.target.value })
                      }
                    />
                  </label>
                )),
              )}
              <label>
                {tr("Race laps")}
                <input
                  type="number"
                  min="0"
                  value={form.laps}
                  onChange={(e) =>
                    setForm({ ...form, laps: Number(e.target.value) })
                  }
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.practiceRound}
                  disabled={Boolean(form.id)}
                  onChange={(e) =>
                    setForm({ ...form, practiceRound: e.target.checked })
                  }
                />
                {tr("Practice round (excluded from real standings)")}
              </label>
              {tr(
                s.events.find((e) => e.id === form.id)?.providerCircuitId && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={form.calendarOverride}
                      onChange={(e) =>
                        setForm({ ...form, calendarOverride: e.target.checked })
                      }
                    />
                    {tr("Protect this manual schedule from automatic updates")}
                  </label>
                ),
              )}
            </div>
            <p className="tiny">
              {tr(
                "Times use your device\u2019s timezone. Open deadlines follow qualifying changes. Locked entries stay locked. The first real event sets the championship deadline. Player registration is controlled manually.",
              )}
            </p>
            <button className="primary">
              {tr("Save weekend")}
              <Save size={17} />
            </button>
          </form>
        )}
      </section>
    </>
  );
}

export default EventAdmin;
