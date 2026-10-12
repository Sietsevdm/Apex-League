import { State, Season, Event, score, standings } from "./model";
export function recap(s: State, season: Season, e: Event, meId: string) {
  const rows = s.users
    .filter((u) => u.seasonIds.includes(season.id))
    .map((u) => {
      let points = 0,
        exact = 0;
      for (const kind of ["gp", "sprint"] as const) {
        const p = s.entries.find(
          (x) =>
            x.userId === u.id &&
            x.eventId === e.id &&
            x.kind === kind &&
            x.submitted,
        );
        if (p) {
          const scored = score(p.picks, e[kind], kind);
          points += scored.total;
          exact += scored.exact;
        }
      }
      return { id: u.id, name: u.name, points, exact };
    })
    .sort((a, b) => b.points - a.points);
  const eventTime = Date.parse(e.race || e.raceDate || "");
  const through = structuredClone(s);
  through.events = through.events.filter(
    (x) => x.id === e.id || Date.parse(x.race || x.raceDate || "") <= eventTime,
  );
  const after = standings(through, season.id);
  const before = structuredClone(through);
  before.events = before.events.filter((x) => x.id !== e.id);
  // Championship awards occur after the race weekends, not as a race-weekend movement.
  for (const season of before.seasons) delete season.champions;
  for (const season of through.seasons) delete season.champions;
  const raceAfter = standings(through, season.id),
    prior = standings(before, season.id);
  const movement = raceAfter
    .map((x) => ({
      name: x.name,
      places: (prior.find((p) => p.id === x.id)?.rank || x.rank) - x.rank,
    }))
    .sort((a, b) => b.places - a.places);
  const max = rows[0]?.points || 0;
  return {
    rows,
    standings: after,
    winners: rows.filter((x) => max > 0 && x.points === max).map((x) => x.name),
    climbers: movement.filter(
      (x) => movement[0]?.places > 0 && x.places === movement[0].places,
    ),
    podiums: s.entries.filter(
      (x) =>
        x.eventId === e.id &&
        x.kind === "gp" &&
        x.submitted &&
        score(x.picks, e.gp, "gp").details.some(
          (d) => d.label === "Exact podium bonus" && d.points === 5,
        ),
    ).length,
    myPoints: rows.find((x) => x.id === meId)?.points || 0,
    pendingSprint:
      Boolean(e.hasSprint || e.sprintQualifying) && !e.sprint?.published,
  };
}
export const xml = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function cardSvg(s: State, season: Season, e: Event, meId: string) {
  const info = recap(s, season, e, meId),
    t = s.settings.theme;
  const shorten = (str: string, length: number) =>
    xml(str.length > length ? str.slice(0, length - 1) + "…" : str);
  const name = s.users.find((u) => u.id === meId)?.name || "You";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" rx="32" fill="${t.background}"/><path d="M710 0h110L330 1350H220z" fill="${t.accent}" opacity=".035"/><g font-family="Arial, sans-serif"><rect x="64" y="62" width="58" height="58" rx="12" fill="${t.accent}"/><text x="83" y="103" font-size="37" font-weight="bold" fill="${t.background}">A</text><text x="140" y="99" font-size="26" fill="${t.text}" font-weight="bold">${shorten(s.settings.name, 45)}</text><text x="64" y="177" font-size="18" letter-spacing="4" fill="${t.accent}">${e.practiceRound ? "PRACTICE ROUND" : "RACE WEEKEND RECAP"} · ${season.year}</text><text x="64" y="248" font-size="54" font-weight="bold" fill="${t.text}">${shorten(e.name.replace(" Grand Prix", ""), 29)}</text><text x="64" y="288" font-size="24" fill="${t.muted}">${shorten(e.circuit, 65)}</text><rect x="64" y="329" width="952" height="154" rx="18" fill="${t.surface}"/><text x="94" y="367" font-size="17" letter-spacing="3" fill="${t.muted}">WEEKEND WINNER${info.winners.length > 1 ? "S" : ""}</text><text x="94" y="419" font-size="37" font-weight="bold" fill="${t.highlight}">${shorten(info.winners.join(" & ") || "No points awarded", 38)}</text><text x="94" y="452" font-size="20" fill="${t.muted}">${info.rows[0]?.points || 0} points · ${info.pendingSprint ? "Sprint results pending" : "Published session points"}</text><text x="64" y="538" font-size="21" font-weight="bold" fill="${t.text}">THE CHAMPIONSHIP FIGHT</text><text x="1016" y="538" text-anchor="end" font-size="15" fill="${t.muted}">AFTER THIS ROUND</text>${info.standings
    .slice(0, 6)
    .map(
      (r, i) =>
        `<rect x="64" y="${565 + i * 68}" width="952" height="59" rx="8" fill="${r.id === meId ? t.accent : t.surface}" opacity="${r.id === meId ? ".13" : "1"}"/><text x="88" y="${603 + i * 68}" font-size="23" fill="${r.rank === 1 ? t.highlight : t.muted}">${String(r.rank).padStart(2, "0")}</text><text x="151" y="${603 + i * 68}" font-size="24" fill="${t.text}">${shorten(r.name, 32)}</text><text x="980" y="${603 + i * 68}" text-anchor="end" font-size="28" font-weight="bold" fill="${t.text}">${r.total}</text>`,
    )
    .join(
      "",
    )}<rect x="64" y="1002" width="455" height="115" rx="14" fill="${t.surface}"/><rect x="541" y="1002" width="475" height="115" rx="14" fill="${t.surface}"/><text x="89" y="1036" font-size="14" letter-spacing="2" fill="${t.muted}">BIGGEST CLIMBER</text><text x="89" y="1079" font-size="23" fill="${t.accent}">${shorten(info.climbers.map((x) => x.name).join(" & ") || "No movement", 25)}</text><text x="567" y="1036" font-size="14" letter-spacing="2" fill="${t.muted}">PERFECT PODIUM PICKS</text><text x="567" y="1080" font-size="29" fill="${t.highlight}">${info.podiums} player${info.podiums === 1 ? "" : "s"}</text><text x="64" y="1170" font-size="23" fill="${t.text}">${shorten(name, 35)} earned ${info.myPoints} points this weekend.</text><text x="64" y="1210" font-size="17" fill="${t.muted}">${e.practiceRound ? "Practice points do not count towards championship standings." : info.pendingSprint ? "Provisional weekend recap · GP published, Sprint pending." : "Corrected results may change these scores."}</text><path d="M64 1250h952" stroke="${t.muted}" opacity=".2"/><text x="64" y="1296" font-size="16" fill="${t.muted}">Good friends. Bold predictions. Every point counts.</text><text x="1016" y="1296" text-anchor="end" font-size="16" fill="${t.accent}">YOUR GRID. YOUR RULES.</text></g></svg>`;
}
