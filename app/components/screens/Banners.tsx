"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { Event, Season, State } from "@/lib/model";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Empty, imageFile } from "./Shared";
function Banners({
  s,
  season,
  call,
}: {
  s: State;
  season?: Season;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season?.id);
  const [id, setId] = useState(events[0]?.id || "");
  const e = events.find((x) => x.id === id);
  const [previewCondition, setPreviewCondition] = useState("original");
  const [variant, setVariant] = useState<{ id: string; condition: string; base: string; photo: string | null } | null>(null);
  const [photo, setPhoto] = useState(e?.photo || ""),
    [focal, setFocal] = useState(e?.focal || 50),
    [credit, setCredit] = useState(e?.credit || ""),
    [override, setOverride] = useState(Boolean(s.settings.bannerOverride)),
    [err, setErr] = useState("");
  useEffect(() => {
    const x = events.find((x) => x.id === id);
    setPhoto(x?.photo || "");
    setFocal(x?.focal ?? 50);
    setCredit(x?.credit || "");
  }, [id]);
  useEffect(() => {
    if (!id || previewCondition === "original" || photo.startsWith("data:")) return;
    const controller = new AbortController();
    fetch(`/api/banner-weather?eventId=${encodeURIComponent(id)}&preview=${previewCondition}`, { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() : { photo: null })
      .then(data => { if (!controller.signal.aborted) setVariant({ id, condition: previewCondition, base: photo, photo: data.photo }); })
      .catch(() => { if (!controller.signal.aborted) setVariant({ id, condition: previewCondition, base: photo, photo: null }); });
    return () => controller.abort();
  }, [id, previewCondition, photo]);
  const selectedVariant = variant?.id === id && variant.condition === previewCondition && variant.base === photo ? variant : null;
  if (!e)
    return (
      <Empty
        title={tr("Add a calendar first")}
        body="Each event can have its own circuit photograph."
      />
    );
  return (
    <>
      <section className="panel">
        <h2>{tr("The track takes centre stage")}</h2>
        <div className="info-bar">
          {tr(
            "The 2027 banners are included automatically. Add custom images to the VPS image folder to override them; manual uploads take priority.",
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr("Race weekend")}</th>
                <th>{tr("Suggested filename")}</th>
                <th>{tr("Image source")}</th>
              </tr>
            </thead>
            <tbody>
              {((s as any).imageMatches || [])
                .filter((row: any) =>
                  events.some((event) => event.id === row.eventId),
                )
                .map((row: any) => (
                  <tr key={row.eventId}>
                    <td>{row.name}</td>
                    <td>{row.file || row.expected}</td>
                    <td>{tr(row.source)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="tiny">
          {tr(
            "Use login.webp for the login screen and login-mobile.webp for an optional portrait image. Folder images must be backed up separately.",
          )}
        </p>
        <p className="muted">
          {tr(
            "The banner switches to the next race at midnight on Monday after the current race weekend (Amsterdam time).",
          )}
        </p>
        <label>
          {tr("Race weekend")}
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {tr(
              events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              )),
            )}
          </select>
        </label>
        <div
          className="banner-upload-preview"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(7,13,25,.9),rgba(7,13,25,.1)),url("${(previewCondition !== "original" && !photo.startsWith("data:") && selectedVariant?.photo) || photo || "/circuit-night.svg"}")`,
            backgroundPosition: `center ${focal}%`,
          }}
        >
          <small>{tr("YOUR LEAGUE \u00B7 YOUR TRACK")}</small>
          <h2>{e.name}</h2>
          <p>{e.circuit}</p>
        </div>
        <label>
          {tr("Weather image preview")}
          <select value={previewCondition} onChange={ev => setPreviewCondition(ev.target.value)} disabled={photo.startsWith("data:")}>
            <option value="original">{tr("Original image")}</option>
            {["Sunny", "Cloudy", "Rainy", "Night"].map(condition => <option key={condition} value={condition.toLowerCase()}>{tr(condition)}</option>)}
          </select>
          <small>{tr("Preview only. The overview selects an image automatically using current circuit weather and daylight.")}</small>
        </label>
        {previewCondition !== "original" && selectedVariant && !selectedVariant.photo && <p className="muted">{tr("No matching weather image; showing the original banner.")}</p>}
        <div className="form-grid">
          <label>
            {tr("Circuit photograph")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (ev) => {
                if (ev.target.files?.[0])
                  try {
                    setPhoto(await imageFile(ev.target.files[0]));
                    setErr("");
                  } catch (e) {
                    setErr((e as Error).message);
                  }
              }}
            />
            <small>
              {tr(
                "JPEG, PNG or WebP \u00B7 maximum 2 MB \u00B7 use a photo you own or may reuse.",
              )}
            </small>
          </label>
          <label>
            {tr("Photo credit")}
            <input value={credit} onChange={(e) => setCredit(e.target.value)} />
          </label>
          <label>
            {tr("Vertical focal point \u00B7")}
            {tr(focal)}
            {tr("%")}
            <input
              type="range"
              min="0"
              max="100"
              value={focal}
              onChange={(e) => setFocal(Number(e.target.value))}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
            />
            {tr("Keep this event as a manual banner override")}
          </label>
        </div>
        {tr(err && <p className="form-error">{tr(err)}</p>)}
        <button
          className="secondary"
          onClick={async () => {
            const d = await call({
              action: "banner",
              eventId: id,
              photo: "",
              focal,
              credit,
              override,
            });
            setPhoto(
              d.state.events.find((x: Event) => x.id === id)?.photo || "",
            );
          }}
        >
          {tr("Use automatic banner image")}
        </button>
        <button
          className="primary"
          onClick={() =>
            call({
              action: "banner",
              eventId: id,
              ...(photo.startsWith("data:") || photo === "" ? { photo } : {}),
              focal,
              credit,
              override,
            })
          }
        >
          {tr("Save banner")}
          <Save size={17} />
        </button>
      </section>
      <p className="tiny">
        {tr(
          "The preview adapts to your screen width. Check it on mobile before saving.",
        )}
      </p>
    </>
  );
}

export default Banners;
