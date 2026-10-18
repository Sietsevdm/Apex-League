import { mergeImportedLineup } from "./season-controls";
import { randomUUID } from "node:crypto";
import { State, Season, Event, cutoff, locked } from "./model";
import { fetchCalendar, fetchLineup } from "./provider";
import { transaction } from "./store";
export type IncomingEvent = Omit<Event, "seasonId">;
export function mergeCalendar(
  s: State,
  season: Season,
  incoming: IncomingEvent[],
  now = Date.now(),
) {
  const changes: string[] = [];
  if (!incoming.length) return changes;
  const seen = new Set<string>();
  for (const source of incoming) {
    const matches = s.events.filter(
      (e) =>
        e.seasonId === season.id &&
        !e.practiceRound &&
        ((e.providerCircuitId &&
          e.providerCircuitId === source.providerCircuitId) ||
          (!e.providerCircuitId && e.circuit === source.circuit)),
    );
    let old =
      matches.length === 1
        ? matches[0]
        : matches.find(
            (e) => e.name === source.name && e.raceDate === source.raceDate,
          );
    if (matches.length > 1 && !old) {
      for (const e of matches) {
        seen.add(e.id);
        e.calendarReview =
          "Multiple races at this circuit: review provider matching.";
      }
      changes.push(`Review required: ambiguous circuit ${source.circuit}`);
      continue;
    }
    if (!old) {
      const id = s.events.some((e) => e.id === source.id)
        ? randomUUID()
        : source.id;
      old = { ...source, id, seasonId: season.id, calendarSequence: 0, calendarModified: new Date(now).toISOString() };
      s.events.push(old);
      seen.add(id);
      changes.push(
        `Added ${source.name}${source.qualifying ? "" : " · session times to be confirmed"}`,
      );
      continue;
    }
    seen.add(old.id);
    old.providerCircuitId = source.providerCircuitId;
    if (source.location) old.location = source.location;
    const review = old.calendarReview;
    delete old.calendarReview;
    if (old.calendarOverride) {
      old.providerRound = source.providerRound;
      if (review)
        changes.push(`${old.name} is present again; manual override retained`);
      continue;
    }
    // Save the actual deadline before a revised schedule can move it.
    if (cutoff(old, "gp") && locked(old, "gp", now)) {
      old.gpDeadline = cutoff(old, "gp");
      old.lockedGp = true;
    }
    if (
      old.sprintQualifying &&
      cutoff(old, "sprint") &&
      locked(old, "sprint", now)
    ) {
      old.sprintDeadline = cutoff(old, "sprint");
      old.lockedSprint = true;
    }
    const scheduleKeys = [
      "name",
      "circuit",
      "country",
      "practice",
      "practice2",
      "practice3",
      "qualifying",
      "race",
      "sprintQualifying",
      "sprintRace",
      "raceDate",
      "providerRound",
    ] as const;
    const updated: string[] = [];
    for (const key of scheduleKeys) {
      const value = source[key];
      if (value !== undefined && value !== "" && old[key] !== value) {
        (old as any)[key] = value;
        updated.push(key);
      }
    }
    if (source.hasSprint) old.hasSprint = true;
    if (old.hasSprint && !source.hasSprint) {
      old.calendarReview =
        "Sprint is missing from the latest schedule. Confirm before changing or voiding it.";
    }
    if (cutoff(old, "gp") && locked(old, "gp", now)) {
      old.gpDeadline = cutoff(old, "gp");
      old.lockedGp = true;
    }
    if (
      old.sprintQualifying &&
      cutoff(old, "sprint") &&
      locked(old, "sprint", now)
    ) {
      old.sprintDeadline = cutoff(old, "sprint");
      old.lockedSprint = true;
    }
    if (updated.length) {
      old.calendarSequence = (old.calendarSequence || 0) + 1;
      old.calendarModified = new Date(now).toISOString();
    }
    if (updated.length)
      changes.push(
        `Updated ${old.name}: ${updated.join(", ")}${old.lockedGp ? " · locked GP deadline preserved" : ""}`,
      );
    else if (review)
      changes.push(`${old.name} is present in the provider calendar again`);
  }
  for (const e of s.events.filter(
    (e) =>
      e.seasonId === season.id &&
      !e.practiceRound &&
      e.providerCircuitId &&
      !seen.has(e.id),
  )) {
    const message =
      "Missing from the provider calendar. Review postponement or cancellation; predictions and results retained.";
    if (e.calendarReview !== message) {
      e.calendarReview = message;
      changes.push(`Review required: ${e.name} is missing from provider`);
    }
  }
  // Never reopen registration, even if opening qualifying moves later.
  if (now < Date.parse(season.cutoff)) {
    const first = s.events
      .filter((e) => e.seasonId === season.id && !e.practiceRound)
      .sort(
        (a, b) =>
          Date.parse(a.raceDate || a.practice || a.race) -
          Date.parse(b.raceDate || b.practice || b.race),
      )[0];
    if (first) {
      const firstDeadline = cutoff(first, first.hasSprint ? "sprint" : "gp");
      if (firstDeadline && firstDeadline !== season.cutoff) {
        season.cutoff = firstDeadline;
        changes.push("Updated registration and championship-pick deadline");
      }
    }
  }
  return changes;
}
export function recordCalendarSync(
  s: State,
  season: Season,
  incoming: IncomingEvent[],
  actor: string,
  now = Date.now(),
) {
  const changes = mergeCalendar(s, season, incoming, now),
    at = new Date(now).toISOString();
  const sync = (season.calendarSync ??= { enabled: false });
  sync.lastAttempt = at;
  sync.lastSuccess = at;
  sync.status = incoming.length ? "synced" : "waiting";
  sync.message = incoming.length
    ? `${incoming.length} races checked; ${changes.length} changes. ${incoming.filter((e) => !e.qualifying || !e.practice || !e.race || (e.hasSprint && !e.sprintQualifying)).length} with incomplete session times.`
    : "Waiting for the provider to publish this season’s calendar.";
  sync.changes = [
    ...changes.map((message) => ({ date: at, message })),
    ...(sync.changes || []),
  ].slice(0, 100);
  if (changes.length) {
    s.audit.unshift({
      id: randomUUID(),
      date: at,
      actor,
      action: `Calendar sync: ${changes.join("; ")}`,
    });
    s.audit = s.audit.slice(0, 1000);
    s.settings.announcements.unshift({
      id: randomUUID(),
      title: `${season.name} calendar updated`,
      body: changes.join("\n"),
      date: at,
    });
    s.settings.announcements = s.settings.announcements.slice(0, 100);
  }
  return changes;
}
export async function syncDueCalendars(
  fetcher = fetchCalendar,
  now = Date.now(),
) {
  const jobs = await transaction((s) =>
    s.seasons
      .filter(
        (season) =>
          !season.archived &&
          season.calendarSync?.enabled &&
          (!season.calendarSync.leaseUntil ||
            season.calendarSync.leaseUntil < now) &&
          (!season.calendarSync.lastAttempt ||
            now - Date.parse(season.calendarSync.lastAttempt) >= 86400000),
      )
      .map((season) => {
        const lease = randomUUID();
        season.calendarSync!.lease = lease;
        season.calendarSync!.leaseUntil = now + 5 * 60000;
        return { id: season.id, year: season.year, lease };
      }),
  );
  const outcomes = [];
  for (const job of jobs) {
    try {
      const [incoming, lineup] = await Promise.all([
        fetcher(job.year),
        fetcher === fetchCalendar ? fetchLineup(job.year).catch(() => undefined) : Promise.resolve(undefined),
      ]);
      const result = await transaction((s) => {
        const season = s.seasons.find((x) => x.id === job.id);
        if (!season || season.calendarSync?.lease !== job.lease)
          return "skipped";
        if (season.calendarSync.enabled && !season.archived) {
          if (lineup) mergeImportedLineup(season, lineup);
          recordCalendarSync(s, season, incoming, "Calendar scheduler", now);
          if (!season.drivers.length) season.calendarSync.message += " Driver lineup unavailable; retrying on the next check.";
        }
        delete season.calendarSync.lease;
        delete season.calendarSync.leaseUntil;
        return season.calendarSync.status;
      });
      outcomes.push({ seasonId: job.id, status: result });
    } catch (e) {
      await transaction((s) => {
        const season = s.seasons.find((x) => x.id === job.id);
        if (!season || season.calendarSync?.lease !== job.lease) return;
        season.calendarSync.lastAttempt = new Date(now).toISOString();
        season.calendarSync.status = "error";
        season.calendarSync.message = (e as Error).message.slice(0, 400);
        delete season.calendarSync.lease;
        delete season.calendarSync.leaseUntil;
      });
      outcomes.push({ seasonId: job.id, status: "error" });
    }
  }
  return outcomes;
}
