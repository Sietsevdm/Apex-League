"use client";
import { useLocale } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { Download, Share2, X } from "lucide-react";
import { State, Season, Event } from "@/lib/model";
import { cardSvg } from "@/lib/recap";
export default function ShareCard({
  s,
  season,
  event,
  meId,
  onClose,
}: {
  s: State;
  season: Season;
  event: Event;
  meId: string;
  onClose: () => void;
}) {
  const { t: tr, language } = useLocale();
  const [image, setImage] = useState(""),
    [error, setError] = useState(""),
    [sharing, setSharing] = useState(false);
  useEffect(() => {
    let live = true;
    const url = URL.createObjectURL(
      new Blob([cardSvg(s, season, event, meId)], { type: "image/svg+xml" }),
    );
    const img = new Image();
    img.onload = () => {
      if (live) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = 1350;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          setImage(canvas.toDataURL("image/png"));
        } catch {
          setError("Could not create the image. Try again.");
        }
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (live) setError("Could not create the image.");
    };
    img.src = url;
    return () => {
      live = false;
      URL.revokeObjectURL(url);
    };
  }, [s, season, event, meId]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  const filename = `${s.settings.name}-${event.name}-results.png`.replace(
    /[^a-zA-Z0-9.-]/g,
    "-",
  );
  return (
    <div className="share-overlay" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={tr("Share race results")}
        className="share-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-title">
          <h2>{tr("Your weekend, ready to share")}</h2>
          <button
            autoFocus
            className="icon-button"
            onClick={onClose}
            aria-label={tr("Close share card")}
          >
            <X />
          </button>
        </div>
        <p className="tiny">
          {tr(
            "Download a PNG for your group chat, or open your device\u2019s share menu.",
          )}
        </p>
        {tr(
          image ? (
            <img
              className="share-image"
              src={image}
              alt={tr(`${event.name} results card`)}
            />
          ) : (
            <p role="status">{tr(error || "Creating your results card…")}</p>
          ),
        )}
        <div className="button-row">
          <button
            className="primary"
            disabled={!image}
            onClick={() => {
              const a = document.createElement("a");
              a.download = filename;
              a.href = image;
              a.click();
            }}
          >
            <Download size={17} />
            {tr("Download PNG")}
          </button>
          <button
            className="secondary"
            disabled={!image || sharing}
            onClick={async () => {
              setSharing(true);
              try {
                const blob = await (await fetch(image)).blob(),
                  file = new File([blob], filename, { type: "image/png" });
                if (!navigator.canShare?.({ files: [file] })) {
                  setError(
                    "Sharing is not supported in this browser. Download the PNG instead.",
                  );
                  return;
                }
                await navigator.share({
                  files: [file],
                  title: `${s.settings.name} · ${event.name}`,
                });
              } catch (e) {
                if ((e as Error).name !== "AbortError")
                  setError(
                    "Could not share the image. Download the PNG instead.",
                  );
              } finally {
                setSharing(false);
              }
            }}
          >
            <Share2 size={17} />
            {tr("Share")}
          </button>
        </div>
        {tr(
          error && image && (
            <p className="tiny" role="status">
              {tr(error)}
            </p>
          ),
        )}
      </section>
    </div>
  );
}
