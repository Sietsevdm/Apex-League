import { cutoff, locked, type Event, type State } from "./model";

export function weekendTasks(
  s: State,
  event: Event,
  userId: string,
  now = Date.now(),
) {
  return (
    [
      "gp",
      ...(event.hasSprint || event.sprintQualifying ? ["sprint"] : []),
    ] as ("gp" | "sprint")[]
  ).map((kind) => {
    const entry = s.entries.find(
      (p) => p.eventId === event.id && p.kind === kind && p.userId === userId,
    );
    return {
      kind,
      submitted: Boolean(entry?.submitted),
      draft: Boolean(entry && !entry.submitted),
      locked: locked(event, kind, now),
      deadline: cutoff(event, kind),
    };
  });
}

export function organiserTasks(s: State, seasonId: string, now = Date.now()) {
  const season = s.seasons.find((season) => season.id === seasonId);
  if (!season || season.archived) return [];
  const events = s.events.filter(
    (e) => e.seasonId === seasonId && !e.practiceRound,
  );
  const valid = (value?: string) =>
    Boolean(value && Number.isFinite(Date.parse(value)));
  const tasks: {
    key: string;
    title: string;
    detail: string;
    count: number;
    tab: "events" | "results" | "members";
  }[] = [];
  const incomplete = events.filter(
    (e) =>
      !valid(e.practice) ||
      !valid(e.qualifying) ||
      !valid(e.race) ||
      ((e.hasSprint || e.sprintQualifying || e.sprintRace) &&
        (!valid(e.sprintQualifying) || !valid(e.sprintRace))),
  );
  if (!events.length || incomplete.length)
    tasks.push({
      key: "calendar",
      title: "Complete calendar details",
      detail: !events.length
        ? "Add your race calendar to open predictions."
        : incomplete.map((e) => e.name).join(" · "),
      count: incomplete.length || 1,
      tab: "events",
    });
  const pending = events.flatMap((e) =>
    (["gp", "sprint"] as const)
      .filter((kind) => {
        const time = kind === "gp" ? e.race : e.sprintRace;
        return (
          valid(time) &&
          Date.parse(time!) <= now &&
          !(kind === "gp" ? e.gp : e.sprint)?.published
        );
      })
      .map((kind) => `${e.name} · ${kind === "gp" ? "GP" : "Sprint"}`),
  );
  if (pending.length)
    tasks.push({
      key: "results",
      title: "Review outstanding results",
      detail: pending.join(" · "),
      count: pending.length,
      tab: "results",
    });
  const next = events
    .filter(
      (e) =>
        !locked(e, "gp", now) ||
        ((e.hasSprint || e.sprintQualifying) && !locked(e, "sprint", now)),
    )
    .sort((a, b) => Date.parse(a.practice) - Date.parse(b.practice))[0];
  const overview = (
    s as State & {
      submissionOverview?: Record<
        string,
        Record<string, { status: string; userId: string }[]>
      >;
    }
  ).submissionOverview;
  if (next && overview?.[next.id])
    for (const kind of [
      "gp",
      ...(next.hasSprint || next.sprintQualifying ? ["sprint"] : []),
    ] as ("gp" | "sprint")[]) {
      if (locked(next, kind, now)) continue;
      const rows = overview[next.id][kind] || [];
      const active = new Set(
        s.users
          .filter((u) => u.active && u.seasonIds.includes(seasonId))
          .map((u) => u.id),
      );
      const missing = rows.filter(
        (row) => active.has(row.userId) && row.status !== "Submitted",
      ).length;
      if (missing)
        tasks.push({
          key: `entries-${kind}`,
          title:
            kind === "gp"
              ? "GP entries still needed"
              : "Sprint entries still needed",
          detail: next.name,
          count: missing,
          tab: "members",
        });
    }
  return tasks;
}
