"use client";
import { useEffect, useState } from "react";
import { Lightbulb, ArrowUpRight } from "lucide-react";
import type { Event } from "@/lib/model";
import { useLocale } from "@/lib/i18n";
import {
  createFactPicker,
  factsForEvent,
  type GrandPrixFact,
} from "@/lib/gp-facts";

let pagePicker: ReturnType<typeof createFactPicker> | undefined;
export default function GrandPrixFact({ event }: { event: Event }) {
  const { t } = useLocale();
  const pack = factsForEvent(event);
  const [selection, setSelection] = useState<{
    key: string;
    fact: GrandPrixFact;
  }>();
  useEffect(() => {
    if (!pack) return;
    if (!pagePicker) {
      let storage: Storage | undefined;
      try {
        storage = window.sessionStorage;
      } catch {
        /* Storage is optional. */
      }
      pagePicker = createFactPicker(storage);
    }
    const fact = pagePicker(pack);
    if (fact) setSelection({ key: pack.key, fact });
  }, [pack]);
  if (!pack) return null;
  const fact = selection?.key === pack.key ? selection.fact : undefined;
  return (
    <section
      className="panel gp-fact"
      aria-labelledby="gp-fact-title"
      aria-busy={!fact}
    >
      <div className="gp-fact-icon" aria-hidden="true">
        <Lightbulb size={23} />
      </div>
      <div className="gp-fact-copy">
        <div className="gp-fact-heading">
          <h2 id="gp-fact-title">{t("Did you know?")}</h2>
          <span>{t(event.name)}</span>
        </div>
        {fact ? (
          <p lang="en" data-fact-id={fact.id}>
            {fact.text}
          </p>
        ) : (
          <p className="muted">{t("Loading this week's GP fact…")}</p>
        )}
        {fact && (
          <a
            href={fact.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="gp-fact-source"
          >
            {t("Source")}: {fact.source.title}
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}
