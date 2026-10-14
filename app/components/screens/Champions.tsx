"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { Season, State } from "@/lib/model";
import { Check, Clock, Flag, Trophy } from "lucide-react";
import { useState } from "react";
import DriverLabel from "../DriverLabel";
import { DriverSelect, Heading, Pill } from "./Shared";
function Champions({
  s,
  season,
  meId,
  call,
}: {
  s: State;
  season: Season;
  meId: string;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const mine = s.championPicks.find(
    (p) => p.userId === meId && p.seasonId === season.id,
  );
  const [driver, setDriver] = useState(mine?.driver || ""),
    [constructor, setConstructor] = useState(mine?.constructor || "");
  const closed = Date.now() >= Date.parse(season.cutoff);
  return (
    <>
      <Heading
        eyebrow="THE LONG GAME"
        title={tr("Pick your champions")}
        description={tr("Two predictions. A whole season of anticipation.")}
      />
      <div className="info-bar">
        <Clock size={17} />
        {tr(
          closed
            ? "Season picks are locked."
            : `Entries close ${date(season.cutoff)}. Your picks stay private until then.`,
        )}
      </div>
      <div className="two-col">
        <section className="panel champion-card">
          <Trophy size={40} />
          <Pill>{tr("15 POINTS")}</Pill>
          <h2>{tr("Drivers\u2019 champion")}</h2>
          <p>{tr("Who will own the season?")}</p>
          <DriverSelect
            season={season}
            value={driver}
            onChange={setDriver}
            disabled={closed}
          />
        </section>
        <section className="panel champion-card">
          <Flag size={40} />
          <Pill>{tr("10 POINTS")}</Pill>
          <h2>{tr("Constructors\u2019 champion")}</h2>
          <p>{tr("Which team will come out on top?")}</p>
          <select
            disabled={closed}
            value={constructor}
            onChange={(e) => setConstructor(e.target.value)}
            aria-label={tr("Constructor champion")}
          >
            <option value="">{tr("Choose a constructor")}</option>
            {tr(
              season.constructors.map((c) => <option key={c}>{tr(c)}</option>),
            )}
          </select>
        </section>
      </div>
      <button
        className="primary"
        disabled={closed || !driver || !constructor}
        onClick={() =>
          call({
            action: "championPick",
            seasonId: season.id,
            driver,
            constructor,
          })
        }
      >
        {tr("Save season picks")}
        <Check size={17} />
      </button>
      {tr(
        closed && (
          <section className="panel">
            <h2>{tr("The league\u2019s title contenders")}</h2>
            <table>
              <thead>
                <tr>
                  <th>{tr("PLAYER")}</th>
                  <th>{tr("DRIVER")}</th>
                  <th>{tr("CONSTRUCTOR")}</th>
                </tr>
              </thead>
              <tbody>
                {tr(
                  s.users
                    .filter((u) => u.seasonIds.includes(season.id))
                    .map((u) => {
                      const p = s.championPicks.find(
                        (x) => x.userId === u.id && x.seasonId === season.id,
                      );
                      return (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>
                            {
                              <DriverLabel
                                season={season}
                                id={p?.driver || ""}
                              />
                            }
                          </td>
                          <td>{tr(p?.constructor || "—")}</td>
                        </tr>
                      );
                    }),
                )}
              </tbody>
            </table>
            <p className="tiny">
              {tr(
                "Championship points are awarded after final official standings are confirmed.",
              )}
            </p>
          </section>
        ),
      )}
    </>
  );
}

export default Champions;
