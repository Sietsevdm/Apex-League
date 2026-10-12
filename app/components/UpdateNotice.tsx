"use client";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
type Info = { current: string; latest?: string; status: string; url?: string; notes?: string; image?: string };
export default function UpdateNotice() {
  const { t: tr } = useLocale();
  const [info, setInfo] = useState<Info>();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function check() {
    setBusy(true); setError("");
    try { const r = await fetch("/api/updates", { cache: "no-store" }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setInfo(data); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => { void check(); }, []);
  return <section className="panel">
    <div className="section-title"><h2>{tr("App updates")}</h2><button className="secondary" onClick={check} disabled={busy}>{tr(busy ? "Checking…" : "Check for updates")}</button></div>
    {info && <p>{tr("Installed version")}: {info.current}</p>}
    {info?.status === "available" && <>
      <p><strong>{tr("Update available")}: {info.latest}</strong></p>
      <p>{tr("Create a backup, then update APEX_IMAGE in your existing Portainer stack to the image below and choose Update the stack with image pulling enabled.")}</p>
      <code className="update-image">{info.image}</code>
      <a href={info.url} target="_blank" rel="noopener noreferrer">{tr("View release notes")}</a>
      <details><summary>{tr("Release notes")}</summary><p className="update-notes">{info.notes}</p></details>
    </>}
    {info?.status === "current" && <p>{tr("You are running the latest stable release.")}</p>}
    {info?.status === "unconfigured" && <p className="muted">{tr("Update checks are not configured yet. Set UPDATES_REPOSITORY to your public GitHub release repository in Portainer.")}</p>}
    {info?.status === "unavailable" && <p className="muted">{tr("No public release is available yet, or the repository cannot be accessed.")}</p>}
    <p className="tiny">{tr("Updates are installed through Portainer. Your accounts, settings, banners and database stay in their existing storage.")}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
