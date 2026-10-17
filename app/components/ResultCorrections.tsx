"use client";
import { useLocale } from "@/lib/i18n";
import type { State, Season, Result } from "@/lib/model";
export default function ResultCorrections({
  s,
  season,
  eventId,
  kind,
}: {
  s: State;
  season: Season;
  eventId: string;
  kind: "gp" | "sprint";
}) {
  const { t, date } = useLocale();
  const records = (s.resultCorrections || []).filter(
    (record) => record.eventId === eventId && record.kind === kind,
  );
  const name = (id: string) =>
    id === "none"
      ? t("No retirements")
      : season.drivers.find((d) => d.id === id)?.name || id || "—";
  const values = (result: Result) => [
    { label: "Finishing positions", value: result.order.map(name).join(", ") },
    { label: "Pole position", value: name(result.pole) },
    { label: "Fastest lap", value: name(result.fastest) },
    {
      label: "Retirements",
      value: result.retirements.map(name).join(", ") || "—",
    },
    ...(kind === "gp"
      ? [{ label: "Driver of the Day", value: name(result.dotd) }]
      : []),
    { label: "Void categories", value: result.voids.map(key => t(({order:"Finishing positions",podium:"Exact podium bonus",pole:"Pole position",fastest:"Fastest lap",retirement:"First retirement",dotd:"Driver of the Day"} as Record<string,string>)[key] || key)).join(", ") || "—" },
    {
      label: "Replacement policy",
      value:
        (result.replacements || [])
          .map((rule) => `${name(rule.from)} → ${name(rule.to)}`)
          .join(", ") || "—",
    },
  ];
  return (
    <section className="panel correction-history">
      <h2>{t("Result correction history")}</h2>
      {!records.length ? (
        <p className="muted">
          {t("No result corrections recorded for this session.")}
        </p>
      ) : (
        records.map((record) => {
          const before = values(record.before),
            after = values(record.after);
          return (
            <details key={record.id}>
              <summary>
                {date(record.date)} · {record.organiser}
              </summary>
              <p>{record.reason}</p>
              <dl>
                {after
                  .filter((field, i) => field.value !== before[i].value)
                  .map((field) => {
                    const old = before.find(
                      (item) => item.label === field.label,
                    )!;
                    return (
                      <div key={field.label}>
                        <dt>{t(field.label)}</dt>
                        <dd>
                          <del>{old.value}</del> →{" "}
                          <strong>{field.value}</strong>
                        </dd>
                      </div>
                    );
                  })}
              </dl>
              {!record.changes.length ? (
                <p className="muted">{t("No player points changed.")}</p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Player")}</th>
                        <th>{t("Before")}</th>
                        <th>{t("After")}</th>
                        <th>{t("Change")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.changes.map((change) => (
                        <tr key={change.userId}>
                          <td>{change.name}</td>
                          <td>{change.before}</td>
                          <td>{change.after}</td>
                          <td>
                            {change.after - change.before > 0 ? "+" : ""}
                            {change.after - change.before}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          );
        })
      )}
    </section>
  );
}
