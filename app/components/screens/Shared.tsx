"use client";
import DriverSelect from "../DriverPicker";
import { useLocale } from "@/lib/i18n";
import { Season, standings } from "@/lib/model";
import { Flag } from "lucide-react";
const remaining = (v: string) => {
  const h = Math.max(0, Math.floor((Date.parse(v) - Date.now()) / 3600000));
  return h >= 24
    ? `${Math.floor(h / 24)}d ${h % 24}h`
    : `${h}h ${Math.max(0, Math.floor((Date.parse(v) - Date.now()) / 60000) % 60)}m`;
};
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <div className="page-heading">
      <div>
        {tr(eyebrow && <div className="eyebrow">{tr(eyebrow)}</div>)}
        <h1>{tr(title)}</h1>
        {tr(description && <p>{tr(description)}</p>)}
      </div>
      {tr(children)}
    </div>
  );
}
function Pill({
  children,
  tone = "",
  fontGroup,
}: {
  children: React.ReactNode;
  tone?: string;
  fontGroup?: "labels" | "numbers";
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <span className={`pill ${tone}`} data-font-group={fontGroup}>
      {tr(children)}
    </span>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <div className="empty">
      <Flag size={30} />
      <h3>{tr(title)}</h3>
      <p>{tr(body)}</p>
    </div>
  );
}
function driverName(season: Season, id: string) {
  return id === "none"
    ? "No retirements"
    : season.drivers.find((d) => d.id === id)?.name || "—";
}
function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <div className="metric">
      <div>
        <small>{tr(label)}</small>
        <span>{tr(icon)}</span>
      </div>
      <strong>{tr(value)}</strong>
      <p>{tr(detail)}</p>
    </div>
  );
}
function StandingsTable({
  rows,
  meId,
  movement = {},
}: {
  rows: ReturnType<typeof standings>;
  meId: string;
  movement?: Record<string, number>;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{tr("POS")}</th>
            <th>{tr("PLAYER")}</th>
            <th>{tr("WINS")}</th>
            <th className="right">{tr("POINTS")}</th>
            <th className="right">{tr("CHANGE")}</th>
          </tr>
        </thead>
        <tbody>
          {tr(
            rows.map((r) => (
              <tr className={r.id === meId ? "your-row" : ""} key={r.id}>
                <td>
                  <span className={`rank rank-${r.rank}`}>
                    {tr(String(r.rank).padStart(2, "0"))}
                  </span>
                </td>
                <td>
                  <span className="player-cell">
                    <span className="mini-avatar">
                      {tr(r.name.slice(0, 2).toUpperCase())}
                    </span>
                    <strong>{r.name}</strong>
                    {tr(
                      r.id === meId && (
                        <span className="you-tag">{tr("YOU")}</span>
                      ),
                    )}
                  </span>
                  <div
                    className="standings-progress"
                    role="progressbar"
                    aria-label={`${r.name}: ${r.total} ${tr("points")}`}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, ...rows.map((row) => row.total))}
                    aria-valuenow={r.total}
                  >
                    <span
                      style={{
                        width: `${(Math.max(0, r.total) / Math.max(1, ...rows.map((row) => row.total))) * 100}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="muted">{tr(r.wins)}</td>
                <td className="right points">{tr(r.total)}</td>
                <td
                  className={`right rank-movement ${(movement[r.id] || 0) > 0 ? "up" : (movement[r.id] || 0) < 0 ? "down" : ""}`}
                  title={tr("Change since the previous completed weekend")}
                >
                  <span
                    aria-label={
                      movement[r.id] === undefined
                        ? tr("No previous weekend")
                        : `${tr("Position change")}: ${movement[r.id] > 0 ? "+" : ""}${movement[r.id]}`
                    }
                  >
                    {movement[r.id]
                      ? `${movement[r.id] > 0 ? "▲" : "▼"}${Math.abs(movement[r.id])}`
                      : "—"}
                  </span>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
export {
  DriverSelect,
  Empty,
  Heading,
  Metric,
  Pill,
  StandingsTable,
  download,
  driverName,
  remaining,
};
async function imageFile(file: File): Promise<string> {
  if (file.size > 2000000)
    throw new Error("Choose an image smaller than 2 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP image.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
export { imageFile };
