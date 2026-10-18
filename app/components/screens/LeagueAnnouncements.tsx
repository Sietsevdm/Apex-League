"use client";
import type { State } from "@/lib/model";
import { useLocale } from "@/lib/i18n";
import { Empty, Heading } from "./Shared";

export default function Announcements({ s }: { s: State }) {
  const { t: tr, date } = useLocale();
  const messages = [...s.settings.announcements].sort((a, b) =>
    (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  return <>
    <Heading title={tr("Announcements")} description={tr("Updates from your league organiser.")} />
    {messages.length ? <section className="panel announcements-page" aria-label={tr("Announcements")}>
      {messages.map(message => <article className="announcement" key={message.id}>
        <time dateTime={message.date}>{date(message.date)}</time>
        <h2>{message.title}</h2>
        <p>{message.body}</p>
      </article>)}
    </section> : <Empty title={tr("No announcements yet")} body={tr("Your organiser’s updates will appear here.")} />}
  </>;
}
