"use client";
import { CheckCircle2, Circle, FilePenLine, CircleX, CircleHelp } from "lucide-react";
import type { Event, State } from "@/lib/model";
import { weekendSubmission } from "@/lib/weekend-submission";
import { useLocale } from "@/lib/i18n";
export default function WeekendSubmission({s, event, userId}: {s:State; event:Event; userId:string}) {
  const { t } = useLocale();
  return <span className="weekend-submission">{weekendSubmission(s,event,userId).map(({kind,status})=>{
    const Icon = status === "Submitted" ? CheckCircle2 : status === "Draft" ? FilePenLine : status === "Missed" ? CircleX : status === "Unavailable" ? CircleHelp : Circle;
    const label = `${kind === "gp" ? "GP" : t("Sprint")}: ${t(status)}`;
    return <span key={kind} className={`weekend-submission-item ${status === "Submitted" ? "submitted" : status === "Draft" ? "draft" : "pending"}`} title={label} aria-label={label}><span>{kind === "gp" ? "GP" : t("Sprint")}</span><Icon size={17} aria-hidden="true" /></span>;
  })}</span>;
}
