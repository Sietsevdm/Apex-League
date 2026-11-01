"use client";
import type { Season } from "@/lib/model";
import { driverCode } from "@/lib/weekend-social";
import { driverOptionStyle } from "@/lib/driver-order";
import { teamLogo } from "@/lib/team-logos";
import { useLocale } from "@/lib/i18n";

export default function TimingDriver({ season, id }: { season: Season; id: string }) {
  const { t } = useLocale();
  const driver = season.drivers.find(d => d.id === id);
  if (!driver) return <span className="timing-driver neutral" title={t(id === "none" ? "No retirements" : "No submitted selection")} aria-label={t(id === "none" ? "No retirements" : "No submitted selection")}>{id === "none" ? t("NONE") : "—"}</span>;
  const logo = teamLogo(driver.team);
  return <span className="timing-driver" style={driverOptionStyle(driver.color)} title={`${driver.name} · ${driver.team}`} aria-label={`${driver.name} · ${driver.team}`}>
    {logo ? <img src={logo} alt="" width={22} height={16} /> : <span className="timing-team-fallback" aria-hidden="true" />}
    <span>{driverCode(driver)}</span>
  </span>;
}
