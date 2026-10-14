"use client";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { pickChanges } from "@/lib/player-history";
import type { State, Season } from "@/lib/model";

export default function ReceiptHistory({
  s,
  season,
  meId,
}: {
  s: State;
  season: Season;
  meId: string;
}) {
  const { t, date } = useLocale();
  const [eventId, setEventId] = useState("");
  const events = s.events.filter((e) => e.seasonId === season.id);
  const history = (s.receipts || []).filter(
    (r) => r.userId === meId && events.some((e) => e.id === r.eventId),
  );
  const name = (id: string, receipt: (typeof history)[number]) =>
    receipt.driverNames?.[id] ||
    season.drivers.find((d) => d.id === id)?.name ||
    (id === "none" ? t("No retirements") : id || "—");
  return (
    <section className="panel">
      <h2>{t("Prediction receipt history")}</h2>
      <p className="muted">
        {t(
          "Every submission is preserved. Later saved edits appear as drafts until you submit again.",
        )}
      </p>
      <label>
        {t("Race weekend")}
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">{t("All weekends")}</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      {!history.length && <p>{t("No prediction receipts yet.")}</p>}
      <div className="receipt-timeline">
        {history
          .map((receipt, index) => ({ receipt, index }))
          .filter(({ receipt }) => !eventId || receipt.eventId === eventId)
          .reverse()
          .map(({ receipt, index }) => {
            const event = events.find((e) => e.id === receipt.eventId)!;
            const previous = history
              .slice(0, index)
              .reverse()
              .find(
                (r) => r.eventId === receipt.eventId && r.kind === receipt.kind,
              );
            const changes = pickChanges(previous?.picks, receipt.picks);
            const fields = [
              ...receipt.picks.order.map((value, i) => ({
                label: `P${i + 1}`,
                value,
              })),
              { label: "Pole position", value: receipt.picks.pole },
              { label: "Fastest lap", value: receipt.picks.fastest },
              { label: "First retirement", value: receipt.picks.retirement },
              ...(receipt.kind === "gp"
                ? [{ label: "Driver of the Day", value: receipt.picks.dotd }]
                : []),
            ];
            return (
              <details key={receipt.id} className="receipt-record">
                <summary>
                  {event.name} · {receipt.kind.toUpperCase()} ·{" "}
                  {t(receipt.status === "draft" ? "Draft" : "Submitted")} ·{" "}
                  {date(receipt.submittedAt)}
                </summary>
                <p className="tiny">
                  {t("Receipt")}: {receipt.id}
                  <br />
                  <time dateTime={receipt.submittedAt}>
                    {receipt.submittedAt}
                  </time>
                  <br />
                  {t("Deadline")}: {date(receipt.deadline)}
                </p>
                {previous && (
                  <>
                    <h3>{t("Changes since previous save")}</h3>
                    {!changes.length ? (
                      <p>{t("Picks unchanged; submission status recorded.")}</p>
                    ) : (
                      <ul>
                        {changes.map((change) => (
                          <li key={change.label}>
                            {t(change.label)}: {name(change.before, previous)} →{" "}
                            {name(change.after, receipt)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Category")}</th>
                        <th>{t("Your pick")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field) => (
                        <tr key={field.label}>
                          <td>{t(field.label)}</td>
                          <td>{name(field.value, receipt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
      </div>
    </section>
  );
}
