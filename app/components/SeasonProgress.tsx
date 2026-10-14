"use client";
import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { seasonProgress } from "@/lib/player-history";
import type { State, Season } from "@/lib/model";
const colors = [
  "#55dec9",
  "#ffad66",
  "#95bfff",
  "#f8a4d4",
  "#e5d770",
  "#b7a4ff",
];
export default function SeasonProgress({
  s,
  season,
  meId,
}: {
  s: State;
  season: Season;
  meId: string;
}) {
  const { t } = useLocale();
  const [metric, setMetric] = useState<"rank" | "gap">("rank");
  const [player, setPlayer] = useState(meId);
  const points = useMemo(() => seasonProgress(s, season.id), [s, season.id]);
  const players = points.at(-1)?.rows || [];
  const selectedPlayer = players.some((row) => row.id === player)
    ? player
    : players[0]?.id;
  const max =
    metric === "rank"
      ? Math.max(2, players.length)
      : Math.max(1, ...points.flatMap((p) => p.rows.map((r) => r.gap)));
  const x = (i: number) =>
    65 + (points.length === 1 ? 335 : (i / (points.length - 1)) * 670);
  const y = (value: number) =>
    metric === "rank"
      ? 35 + ((value - 1) / (max - 1)) * 220
      : 35 + (value / max) * 220;
  return (
    <section className="panel">
      <h2>{t("Championship progress")}</h2>
      <p className="muted">
        {t(
          "Published results only. Practice rounds are excluded; confirmed title bonuses appear as a separate checkpoint. Corrected results recalculate the timeline.",
        )}
      </p>
      {!points.length ? (
        <p>{t("Publish a result to start the championship chart.")}</p>
      ) : (
        <>
          <div className="toolbar">
            <label>
              {t("Chart metric")}
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as typeof metric)}
              >
                <option value="rank">{t("Championship position")}</option>
                <option value="gap">{t("Points behind leader")}</option>
              </select>
            </label>
            <label>
              {t("Highlight player")}
              <select
                value={selectedPlayer || ""}
                onChange={(e) => setPlayer(e.target.value)}
              >
                {players.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <svg
            className="progress-chart"
            viewBox="0 0 780 305"
            role="img"
            aria-label={t(
              metric === "rank"
                ? "Championship position"
                : "Points behind leader",
            )}
          >
            <title>{t("Championship progress")}</title>
            <desc>
              {t("Full chart values are available in the table below.")}
            </desc>
            {[
              ...new Set(
                [0, 1, 2, 3, 4].map((i) =>
                  Math.round(
                    metric === "rank" ? 1 + ((max - 1) * i) / 4 : (max * i) / 4,
                  ),
                ),
              ),
            ].map((value) => {
              return (
                <g key={value}>
                  <line
                    x1="65"
                    x2="735"
                    y1={y(value)}
                    y2={y(value)}
                    stroke="currentColor"
                    opacity=".15"
                  />
                  <text
                    x="48"
                    y={y(value) + 5}
                    textAnchor="end"
                    fill="currentColor"
                    fontSize="13"
                  >
                    {Number(value.toFixed(1))}
                  </text>
                </g>
              );
            })}
            {players.map((row, index) => {
              const coords = points.map((p, i) => ({
                x: x(i),
                y: y(p.rows.find((r) => r.id === row.id)?.[metric] || 0),
                p: p.rows.find((r) => r.id === row.id)!,
              }));
              return (
                <g key={row.id} opacity={row.id === selectedPlayer ? 1 : 0.22}>
                  <polyline
                    points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
                    fill="none"
                    stroke={colors[index % colors.length]}
                    strokeWidth={row.id === selectedPlayer ? 4 : 2}
                  />
                  {coords.map((c, i) => (
                    <circle
                      key={i}
                      cx={c.x}
                      cy={c.y}
                      r={row.id === selectedPlayer ? 5 : 3}
                      fill={colors[index % colors.length]}
                    >
                      <title>{`${row.name} · ${points[i].label}: ${c.p[metric]}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
            {points
              .filter(
                (_, i) =>
                  i === 0 || i === points.length - 1 || points.length <= 8,
              )
              .map((point) => {
                const i = points.indexOf(point);
                return (
                  <text
                    key={point.id}
                    x={x(i)}
                    y="285"
                    textAnchor="middle"
                    fill="currentColor"
                    fontSize="12"
                  >
                    {i + 1}
                  </text>
                );
              })}
          </svg>
          <p className="tiny">
            {players.find((r) => r.id === selectedPlayer)?.name} ·{" "}
            {t(
              metric === "rank"
                ? "Championship position"
                : "Points behind leader",
            )}
          </p>
          <details>
            <summary>{t("View chart data")}</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("Race weekend")}</th>
                    <th>{t("Player")}</th>
                    <th>{t("Position")}</th>
                    <th>{t("Points")}</th>
                    <th>{t("Points behind leader")}</th>
                  </tr>
                </thead>
                <tbody>
                  {points.flatMap((point, i) =>
                    point.rows.map((row) => (
                      <tr key={`${point.id}-${row.id}`}>
                        <td>
                          {i + 1}. {t(point.label)}
                          {point.partial ? ` · ${t("Sprint only")}` : ""}
                        </td>
                        <td>{row.name}</td>
                        <td>{row.rank}</td>
                        <td>{row.total}</td>
                        <td>{row.gap}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
