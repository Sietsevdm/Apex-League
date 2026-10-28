"use client";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";

export default function DeadlineTime({
  value,
  timezone,
  label,
}: {
  value: string;
  timezone?: string;
  label?: string;
}) {
  const { language, t } = useLocale();
  const [localZone, setLocalZone] = useState("UTC");
  useEffect(() => {
    setLocalZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  let zone = timezone || localZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
  } catch {
    zone = localZone;
  }
  const valid = Number.isFinite(Date.parse(value));
  return (
    <div className="deadline-time">
      <span>
        {label && <strong>{t(label)} · </strong>}
        {valid ? (
          <time dateTime={value}>
            {new Intl.DateTimeFormat(language === "nl" ? "nl-NL" : "en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: zone,
              timeZoneName: "short",
            }).format(new Date(value))}
          </time>
        ) : (
          t("Time to be confirmed")
        )}
      </span>
      {valid && <small>{zone}</small>}
    </div>
  );
}
