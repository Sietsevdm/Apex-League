"use client";
import { Season } from "@/lib/model";
import { useLocale } from "@/lib/i18n";

export default function DriverLabel({ season, id }: { season: Season; id: string }) {
  const { t } = useLocale();
  const driver = season.drivers.find(d => d.id === id);
  const name = id === "none" ? t("No retirements") : driver?.name || "—";
  return (
    <span className="driver-label">
      {driver && <span className="driver-color" aria-hidden="true" style={{ backgroundColor: driver.color }} />}
      {name}
    </span>
  );
}
