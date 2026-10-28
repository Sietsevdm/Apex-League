"use client";
import { CheckCircle2, Circle, FilePenLine, LockKeyhole } from "lucide-react";
import { useLocale } from "@/lib/i18n";
export default function PredictionStatus({ submitted, exists, locked = false }: { submitted?: boolean; exists?: boolean; locked?: boolean }) {
  const { t } = useLocale();
  const label = submitted ? "Submitted" : exists ? "Draft" : "Not started";
  const Icon = locked ? LockKeyhole : submitted ? CheckCircle2 : exists ? FilePenLine : Circle;
  return <span className={`prediction-status ${locked ? "locked" : submitted ? "submitted" : exists ? "draft" : "not-started"}`}><Icon size={13} aria-hidden="true" />{t(label)}{locked && <> · {t("Locked")}</>}</span>;
}
