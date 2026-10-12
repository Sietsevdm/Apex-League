import { State, Season, cutoff, score, standings } from "./model";
function escapeICS(v: string) {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
const stamp = (v: string) =>
  new Date(v)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
export function deadlineCalendar(s: State, season: Season, language = "en") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Apex League//Prediction deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of s.events.filter(
    (e) => e.seasonId === season.id && !e.practiceRound,
  )) {
    for (const kind of ["gp", "sprint"] as const) {
      if (kind === "sprint" && !e.sprintQualifying) continue;
      const deadline = cutoff(e, kind);
      if (!deadline || !Number.isFinite(Date.parse(deadline))) continue;
      const title = `${e.name} · ${kind.toUpperCase()} · ${language === "nl" ? "voorspellingen sluiten" : "predictions close"}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${escapeICS(e.id)}-${kind}@apex-league`,
        `DTSTAMP:${stamp(new Date().toISOString())}`,
        `DTSTART:${stamp(deadline)}`,
        `DTEND:${stamp(new Date(Date.parse(deadline) + 60000).toISOString())}`,
        `SUMMARY:${escapeICS(title)}`,
        `DESCRIPTION:${escapeICS(language === "nl" ? "Dien je voorspellingen in vóór deze deadline. Importeer de kalender opnieuw na wijzigingen." : "Submit your predictions before this deadline. Re-import this calendar after schedule changes.")}`,
      );
      for (const duration of ["-PT24H", "-PT1H"])
        lines.push(
          "BEGIN:VALARM",
          `TRIGGER:${duration}`,
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeICS(title)}`,
          "END:VALARM",
        );
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  // RFC 5545 folds by UTF-8 octets, without splitting a multibyte character.
  return (
    lines
      .map((line) => {
        let out = "",
          current = "",
          bytes = 0;
        for (const char of line) {
          const length = new TextEncoder().encode(char).length;
          if (bytes + length > 74) {
            out += current + "\r\n ";
            current = "";
            bytes = 1;
          }
          current += char;
          bytes += length;
        }
        return out + current;
      })
      .join("\r\n") + "\r\n"
  );
}
export function launchChecklist(s: State, season: Season) {
  const events = s.events.filter(
    (e) => e.seasonId === season.id && !e.practiceRound,
  );
  return [
    { label: "Calendar added", ready: events.length > 0 },
    {
      label: "All qualifying times confirmed",
      ready:
        events.length > 0 &&
        events.every(
          (e) => !!cutoff(e, "gp") && (!e.hasSprint || !!cutoff(e, "sprint")),
        ),
    },
    {
      label: "Driver and constructor lineup ready",
      ready: season.drivers.length >= 10 && season.constructors.length > 0,
    },
    {
      label: "Players enrolled",
      ready:
        s.users.filter((u) => u.active && u.seasonIds.includes(season.id))
          .length >= 2,
    },
    {
      label: "Banner photos ready",
      ready: events.length > 0 && events.every((e) => !!e.photo),
    },
    {
      label: "Championship picks submitted",
      ready: s.users
        .filter((u) => u.active && u.seasonIds.includes(season.id))
        .every((u) =>
          s.championPicks.some(
            (p) => p.seasonId === season.id && p.userId === u.id,
          ),
        ),
    },
  ];
}
export function seasonAwards(s: State, seasonId: string) {
  const rows = standings(s, seasonId);
  const events = s.events.filter(
    (e) => e.seasonId === seasonId && !e.practiceRound,
  );
  const stats = rows.map((row) => {
    let podiums = 0,
      perfect = 0,
      completed = 0,
      streak = 0,
      longest = 0;
    for (const e of [...events].sort(
      (a, b) => Date.parse(a.race) - Date.parse(b.race),
    )) {
      let participated = false;
      for (const kind of ["gp", "sprint"] as const) {
        if (!e[kind]?.published) continue;
        const entry = s.entries.find(
          (p) =>
            p.userId === row.id &&
            p.eventId === e.id &&
            p.kind === kind &&
            p.submitted,
        );
        if (!entry) continue;
        participated = true;
        completed++;
        const sc = score(entry.picks, e[kind], kind);
        if (
          sc.details.some(
            (d) => d.label === "Exact podium bonus" && d.points === 5,
          )
        )
          podiums++;
        if (sc.total === (kind === "gp" ? 23 : 12)) perfect++;
      }
      if (e.gp?.published || e.sprint?.published) {
        streak = participated ? streak + 1 : 0;
        longest = Math.max(longest, streak);
      }
    }
    return { ...row, podiums, perfect, completed, longest };
  });
  return (
    [
      ["Weekend winner", "wins"],
      ["Position specialist", "exact"],
      ["Podium expert", "podiums"],
      ["Perfect sessions", "perfect"],
      ["Longest participation streak", "longest"],
    ] as const
  ).map(([label, key]) => {
    const value = Math.max(0, ...stats.map((r) => r[key]));
    return {
      label,
      value,
      winners:
        value > 0
          ? stats.filter((r) => r[key] === value).map((r) => r.name)
          : [],
    };
  });
}
