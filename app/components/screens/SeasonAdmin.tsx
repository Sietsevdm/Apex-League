"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { Season, State } from "@/lib/model";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DriverSelect, Pill } from "./Shared";
const SeasonWizard = dynamic(
  () => import("../LeagueImprovements").then((m) => m.SeasonWizard),
  { loading: () => null },
);
function SeasonAdmin({
  s,
  season,
  call,
}: {
  s: State;
  season?: Season;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [lineup, setLineup] = useState(
      JSON.stringify(season?.drivers || [], null, 2),
    ),
    [constructors, setConstructors] = useState(
      season?.constructors.join("\n") || "",
    ),
    [driver, setDriver] = useState(""),
    [constructor, setConstructor] = useState(""),
    [err, setErr] = useState("");
  useEffect(() => {
    setLineup(JSON.stringify(season?.drivers || [], null, 2));
    setConstructors(season?.constructors.join("\n") || "");
  }, [season?.id]);
  return (
    <>
      <SeasonWizard s={s} season={season} call={call} />
      {tr(
        season && (
          <>
            <section className="panel">
              <div className="section-title">
                <h2>
                  {season.name}
                  {tr("\u00B7 driver lineup")}
                </h2>
                <Pill>
                  {tr(
                    Date.now() < Date.parse(season.cutoff)
                      ? "Editable preseason"
                      : "Locked",
                  )}
                </Pill>
              </div>
              <p className="tiny">
                {tr(
                  "Import through Race weekends, or edit the lineup below. Driver records use id, name, team and color. This advanced editor is for initial setup.",
                )}
              </p>
              <div className="form-grid">
                <label>
                  {tr("Drivers (JSON)")}
                  <textarea
                    className="code-editor"
                    value={lineup}
                    onChange={(e) => setLineup(e.target.value)}
                  />
                </label>
                <label>
                  {tr("Constructors (one per line)")}
                  <textarea
                    className="code-editor"
                    value={constructors}
                    onChange={(e) => setConstructors(e.target.value)}
                  />
                </label>
              </div>
              {tr(err && <p className="form-error">{tr(err)}</p>)}
              <button
                className="secondary"
                disabled={Date.now() >= Date.parse(season.cutoff)}
                onClick={async () => {
                  try {
                    await call({
                      action: "lineup",
                      seasonId: season.id,
                      drivers: JSON.parse(lineup),
                      constructors: constructors
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    });
                    setErr("");
                  } catch (e) {
                    setErr((e as Error).message);
                  }
                }}
              >
                {tr("Save lineup")}
              </button>
            </section>
            <section className="panel">
              <h2>{tr("Confirm the season champions")}</h2>
              <p className="muted">
                {tr(
                  "Use final official standings at season end. This awards 15 driver points and 10 constructor points to correct picks.",
                )}
              </p>
              <div className="form-grid">
                <label>
                  {tr("Driver champion")}
                  <DriverSelect
                    season={season}
                    value={driver}
                    onChange={setDriver}
                  />
                </label>
                <label>
                  {tr("Constructor champion")}
                  <select
                    value={constructor}
                    onChange={(e) => setConstructor(e.target.value)}
                  >
                    <option value="">{tr("Choose a constructor")}</option>
                    {tr(
                      season.constructors.map((c) => (
                        <option key={c}>{tr(c)}</option>
                      )),
                    )}
                  </select>
                </label>
              </div>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={!driver || !constructor}
                  onClick={() =>
                    call({
                      action: "champions",
                      seasonId: season.id,
                      driver,
                      constructor,
                    })
                  }
                >
                  {tr("Award championship points")}
                </button>
              </div>
            </section>
          </>
        ),
      )}
    </>
  );
}

export default SeasonAdmin;
