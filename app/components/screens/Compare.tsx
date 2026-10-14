"use client";
import { useLocale } from "@/lib/i18n";
import { Season, State, cutoff, locked } from "@/lib/model";
import { useState } from "react";
import DriverLabel from "../DriverLabel";
import { Empty, Heading } from "./Shared";
function Compare({
  s,
  season,
  meId,
}: {
  s: State;
  season: Season;
  meId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id),
    [id, setId] = useState(
      events.find((e) => locked(e, "gp"))?.id || events[0]?.id,
    ),
    [kind, setKind] = useState<"gp" | "sprint">("gp"),
    [rival, setRival] = useState(
      s.users.find((u) => u.id !== meId && u.seasonIds.includes(season.id))
        ?.id || "",
    );
  const e = events.find((e) => e.id === id);
  if (!e)
    return (
      <Empty
        title={tr("Find your rival")}
        body="Comparisons appear once your league has a calendar."
      />
    );
  const mine = s.entries.find(
      (x) =>
        x.userId === meId && x.eventId === id && x.kind === kind && x.submitted,
    ),
    other = s.entries.find(
      (x) =>
        x.userId === rival &&
        x.eventId === id &&
        x.kind === kind &&
        x.submitted,
    );
  const labels = [
    "pole",
    "fastest",
    "retirement",
    ...(kind === "gp" ? ["dotd"] : []),
  ];
  return (
    <>
      <Heading
        eyebrow="FRIENDS UNTIL LIGHTS OUT"
        title={tr("Head to head")}
        description={tr(
          "See where your predictions agree\u2014and where the battle will be won.",
        )}
      />
      <div className="toolbar">
        <select
          value={id}
          onChange={(ev) => {
            setId(ev.target.value);
            setKind("gp");
          }}
          aria-label={tr("Comparison weekend")}
        >
          {tr(
            events.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            )),
          )}
        </select>
        <select
          value={rival}
          onChange={(e) => setRival(e.target.value)}
          aria-label={tr("Select rival")}
        >
          {tr(
            s.users
              .filter((u) => u.id !== meId && u.seasonIds.includes(season.id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              )),
          )}
        </select>
        <div className="segmented">
          <button
            className={kind === "gp" ? "selected" : ""}
            onClick={() => setKind("gp")}
          >
            {tr("GP")}
          </button>
          {tr(
            e.sprintQualifying && (
              <button
                className={kind === "sprint" ? "selected" : ""}
                onClick={() => setKind("sprint")}
              >
                {tr("Sprint")}
              </button>
            ),
          )}
        </div>
      </div>
      {tr(
        !locked(e, kind) ? (
          <Empty
            title={tr("The grid is still secret")}
            body={tr(
              `Everyone’s submitted picks become visible after ${date(cutoff(e, kind))}.`,
            )}
          />
        ) : (
          <section className="panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{tr("PREDICTION")}</th>
                    <th>{tr("YOU")}</th>
                    <th>
                      {tr(
                        s.users.find((u) => u.id === rival)?.name.toUpperCase(),
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tr(
                    Array.from({ length: kind === "gp" ? 10 : 8 }, (_, i) => (
                      <tr
                        key={i}
                        className={
                          mine?.picks.order[i] !== other?.picks.order[i]
                            ? "different"
                            : ""
                        }
                      >
                        <td>
                          {tr("P")}
                          {tr(i + 1)}
                        </td>
                        <td>
                          {
                            <DriverLabel
                              season={season}
                              id={mine?.picks.order[i] || ""}
                            />
                          }
                        </td>
                        <td>
                          {
                            <DriverLabel
                              season={season}
                              id={other?.picks.order[i] || ""}
                            />
                          }
                        </td>
                      </tr>
                    )),
                  )}
                  {tr(
                    labels.map((k) => (
                      <tr
                        key={k}
                        className={
                          mine?.picks[k as "pole"] !== other?.picks[k as "pole"]
                            ? "different"
                            : ""
                        }
                      >
                        <td>
                          {tr(
                            (
                              {
                                pole: "Pole position",
                                fastest: "Fastest lap",
                                retirement: "First retirement",
                                dotd: "Driver of the Day",
                              } as any
                            )[k],
                          )}
                        </td>
                        <td>
                          <DriverLabel
                            season={season}
                            id={mine?.picks[k as "pole"] || ""}
                          />
                        </td>
                        <td>
                          <DriverLabel
                            season={season}
                            id={other?.picks[k as "pole"] || ""}
                          />
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            <p className="tiny">
              {tr(
                "Highlighted rows are different picks. A dash means no submitted selection.",
              )}
            </p>
            <details>
              <summary>{tr("Compare the whole grid")}</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("PLAYER")}</th>
                      {tr(
                        Array.from(
                          { length: kind === "gp" ? 10 : 8 },
                          (_, i) => (
                            <th key={i}>
                              {tr("P")}
                              {tr(i + 1)}
                            </th>
                          ),
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tr(
                      s.users
                        .filter((u) => u.seasonIds.includes(season.id))
                        .map((u) => {
                          const p = s.entries.find(
                            (x) =>
                              x.userId === u.id &&
                              x.eventId === id &&
                              x.kind === kind &&
                              x.submitted,
                          );
                          return (
                            <tr key={u.id}>
                              <td>{u.name}</td>
                              {tr(
                                Array.from(
                                  { length: kind === "gp" ? 10 : 8 },
                                  (_, i) => (
                                    <td key={i}>
                                      {tr(p?.picks.order[i] || "—")}
                                    </td>
                                  ),
                                ),
                              )}
                            </tr>
                          );
                        }),
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        ),
      )}
    </>
  );
}

export default Compare;
