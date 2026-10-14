"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { State } from "@/lib/model";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
function Announcements({ s, call }: { s: State; call: Call }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  return (
    <>
      <section className="panel narrow">
        <h2>{tr("A message to your grid")}</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await call({ action: "announcement", title, body });
            setTitle("");
            setBody("");
          }}
        >
          <label>
            {tr("Title")}
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            {tr("Message")}
            <textarea
              required
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button className="primary">
            {tr("Publish announcement")}
            <ArrowUpRight size={17} />
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>{tr("Published announcements")}</h2>
        {tr(
          s.settings.announcements.map((a) => (
            <article className="announcement" key={a.id}>
              <div className="section-title">
                <h3>{a.title}</h3>
                <button
                  className="text-button"
                  onClick={() =>
                    call({ action: "deleteAnnouncement", id: a.id })
                  }
                >
                  {tr("Remove")}
                </button>
              </div>
              <p>{a.body}</p>
              <small>{tr(date(a.date))}</small>
            </article>
          )),
        )}
      </section>
    </>
  );
}

export default Announcements;
