export { themes } from "./theme";
import type { Typography } from "./typography";
import { mappedPicks, type Replacement } from "./enhancements";
export type Theme = {
  name: string;
  background: string;
  surface: string;
  accent: string;
  highlight: string;
  text: string;
  muted: string;
};
export type Driver = { replacementOnly?: boolean; id: string; name: string; team: string; color: string };
export type Picks = {
  order: string[];
  pole: string;
  fastest: string;
  retirement: string;
  dotd: string;
};
export type Result = {
  replacements?: Replacement[];
  provenance?: {
    source: string;
    fetchedAt?: string;
    confirmedAt?: string;
    confirmedBy?: string;
  };
  order: string[];
  pole: string;
  fastest: string;
  retirements: string[];
  dotd: string;
  voids: string[];
  published: boolean;
};
export type Entry = {
  userId: string;
  eventId: string;
  kind: "gp" | "sprint";
  picks: Picks;
  submitted: boolean;
  updatedAt: string;
};
export type Event = {
  location?: { latitude: number; longitude: number };
  calendarSequence?: number;
  calendarModified?: string;
  replacements?: Replacement[];
  id: string;
  seasonId: string;
  name: string;
  circuit: string;
  country: string;
  practice: string;
  practice2?: string;
  practice3?: string;
  qualifying: string;
  race: string;
  sprintQualifying?: string;
  sprintRace?: string;
  practiceRound: boolean;
  length: string;
  laps: number;
  photo: string;
  credit: string;
  focal: number;
  gp?: Result;
  sprint?: Result;
  gpDraft?: Result;
  sprintDraft?: Result;
  lockedGp?: boolean;
  lockedSprint?: boolean;
  gpDeadline?: string;
  sprintDeadline?: string;
  providerCircuitId?: string;
  providerRound?: number;
  raceDate?: string;
  hasSprint?: boolean;
  calendarOverride?: boolean;
  calendarReview?: string;
};
export type ResultCorrection = {
  id: string;
  eventId: string;
  seasonId: string;
  kind: "gp" | "sprint";
  date: string;
  organiser: string;
  reason: string;
  before: Result;
  after: Result;
  changes: { userId: string; name: string; before: number; after: number }[];
};
export type User = {
  calendarSubscriptions?: { seasonId: string; tokenHash: string; language: "en" | "nl"; createdAt: string }[];
  pushEnabled?: boolean;
  passkeys?: {
    id: string;
    publicKey: string;
    counter: number;
    name: string;
    createdAt: string;
  }[];
  id: string;
  email: string;
  name: string;
  password: string;
  role: "admin" | "player";
  active: boolean;
  seasonIds: string[];
  reminders: boolean;
  timezone: string;
  version: number;
};
export type Season = {
  registrationClosed?: boolean;
  id: string;
  year: number;
  name: string;
  drivers: Driver[];
  constructors: string[];
  cutoff: string;
  champions?: { driver: string; constructor: string };
  archived: boolean;
  calendarSync?: {
    enabled: boolean;
    lastAttempt?: string;
    lastSuccess?: string;
    status?: "synced" | "waiting" | "error";
    message?: string;
    changes?: { date: string; message: string }[];
    lease?: string;
    leaseUntil?: number;
  };
};
export type State = {
  resultCorrections?: ResultCorrection[];
  push?: {
    publicKey: string;
    privateKey: string;
    subscriptions: { id: string; userId: string; endpoint: string; keys: {p256dh:string;auth:string}; language: "en"|"nl"; createdAt:string }[];
    deliveries: Record<string, {status:"sending"|"sent";leaseUntil:number;attempts:number;updatedAt:number}>;
  };
  receipts?: {
    status?: "submitted" | "draft";
    driverNames?: Record<string, string>;
    id: string;
    userId: string;
    eventId: string;
    kind: "gp" | "sprint";
    picks: Picks;
    submittedAt: string;
    deadline: string;
  }[];
  passkeyChallenges?: {
    id: string;
    challenge: string;
    userId?: string;
    purpose: "register" | "login";
    expires: number;
  }[];
  backupHealth?: { lastSuccess?: string; lastAttempt?: string; error?: string };
  schema: number;
  settings: {
    loginText?: Partial<Record<"eyebrow" | "headline" | "accent" | "description" | "footer" | "welcome" | "subtitle", string>>;
    name: string;
    welcome: string;
    theme: Theme;
    typography?: Typography;
    logo: string;
    invite: string;
    bannerOverride: string;
    savedBannerPhotos?: { year: number; name: string; circuit: string; photo: string; focal: number; credit: string }[];
    announcements: { id: string; title: string; body: string; date: string }[];
  };
  users: User[];
  seasons: Season[];
  events: Event[];
  entries: Entry[];
  championPicks: {
    userId: string;
    seasonId: string;
    driver: string;
    constructor: string;
  }[];
  audit: { id: string; date: string; actor: string; action: string }[];
};
export const emptyPicks = (n = 10): Picks => ({
  order: Array(n).fill(""),
  pole: "",
  fastest: "",
  retirement: "",
  dotd: "",
});
export const emptyResult = (): Result => ({
  order: [],
  pole: "",
  fastest: "",
  retirements: [],
  dotd: "",
  voids: [],
  published: false,
});
export function cutoff(e: Event, kind: "gp" | "sprint") {
  const saved = kind === "gp" ? e.gpDeadline : e.sprintDeadline;
  if (saved) return saved;
  const time = Date.parse(
    kind === "gp" ? e.qualifying : e.sprintQualifying || "",
  );
  return Number.isFinite(time) ? new Date(time - 3600000).toISOString() : "";
}
export function locked(e: Event, kind: "gp" | "sprint", now = Date.now()) {
  return (
    Boolean(kind === "gp" ? e.lockedGp : e.lockedSprint) ||
    !cutoff(e, kind) ||
    now >= Date.parse(cutoff(e, kind))
  );
}
export function score(p: Picks, r: Result | undefined, kind: "gp" | "sprint") {
  p = mappedPicks(
    p,
    r?.replacements?.filter((rule) => rule.kind === kind),
  );
  const details: {
    label: string;
    points: number;
    possible: number;
    status: string;
  }[] = [];
  let exact = 0;
  const add = (
    label: string,
    category: string,
    match: boolean,
    points: number,
  ) =>
    details.push({
      label,
      points: r?.published && !r.voids.includes(category) && match ? points : 0,
      possible: points,
      status: !r?.published
        ? "pending"
        : r.voids.includes(category)
          ? "void"
          : match
            ? "correct"
            : "missed",
    });
  p.order.forEach((id, i) => {
    const match = Boolean(id) && id === r?.order[i];
    add(`P${i + 1}`, "order", match, 1);
    if (r?.published && !r.voids.includes("order") && match) exact++;
  });
  add(
    "Pole position",
    "pole",
    Boolean(p.pole) && p.pole === r?.pole,
    kind === "gp" ? 3 : 2,
  );
  if (kind === "gp")
    add(
      "Exact podium bonus",
      "podium",
      p.order.length >= 3 &&
        p.order.slice(0, 3).every((id, i) => Boolean(id) && id === r?.order[i]),
      5,
    );
  add(
    "Fastest lap",
    "fastest",
    Boolean(p.fastest) && p.fastest === r?.fastest,
    kind === "gp" ? 2 : 1,
  );
  add(
    "First retirement",
    "retirement",
    Boolean(p.retirement) && Boolean(r?.retirements.includes(p.retirement)),
    kind === "gp" ? 2 : 1,
  );
  if (kind === "gp")
    add("Driver of the Day", "dotd", Boolean(p.dotd) && p.dotd === r?.dotd, 1);
  return { total: details.reduce((a, b) => a + b.points, 0), exact, details };
}
export function standings(s: State, seasonId: string) {
  const events = s.events.filter(
    (e) => e.seasonId === seasonId && !e.practiceRound,
  );
  const rows = s.users
    .filter((u) => u.seasonIds.includes(seasonId))
    .map((u) => {
      const weekends = events.map((e) => {
        let total = 0,
          exact = 0;
        for (const kind of ["gp", "sprint"] as const) {
          const entry = s.entries.find(
            (p) =>
              p.userId === u.id &&
              p.eventId === e.id &&
              p.kind === kind &&
              p.submitted,
          );
          if (entry) {
            const sc = score(entry.picks, e[kind], kind);
            total += sc.total;
            exact += sc.exact;
          }
        }
        return { eventId: e.id, total, exact };
      });
      const pick = s.championPicks.find(
        (p) => p.userId === u.id && p.seasonId === seasonId,
      );
      const champions = s.seasons.find((x) => x.id === seasonId)?.champions;
      const bonus =
        champions && pick
          ? (pick.driver === champions.driver ? 15 : 0) +
            (pick.constructor === champions.constructor ? 10 : 0)
          : 0;
      return {
        id: u.id,
        name: u.name,
        total: weekends.reduce((a, b) => a + b.total, 0) + bonus,
        racePoints: weekends.reduce((a, b) => a + b.total, 0),
        bonus,
        exact: weekends.reduce((a, b) => a + b.exact, 0),
        wins: 0,
        rank: 0,
        weekends,
      };
    });
  for (const e of events) {
    const max = Math.max(
      0,
      ...rows.map((r) => r.weekends.find((w) => w.eventId === e.id)!.total),
    );
    if (max > 0)
      rows.forEach((r) => {
        if (r.weekends.find((w) => w.eventId === e.id)!.total === max) r.wins++;
      });
  }
  rows.sort(
    (a, b) => b.total - a.total || b.wins - a.wins || b.exact - a.exact,
  );
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank =
      prev &&
      r.total === prev.total &&
      r.wins === prev.wins &&
      r.exact === prev.exact
        ? prev.rank
        : i + 1;
  });
  return rows;
}
function bannerRaceDay(event: Event) {
  if (event.raceDate && /^\d{4}-\d{2}-\d{2}$/.test(event.raceDate)) {
    const day = Date.parse(`${event.raceDate}T00:00:00Z`);
    if (Number.isFinite(day)) return day;
  }
  const instant = Date.parse(event.race || event.practice);
  if (!Number.isFinite(instant)) return Infinity;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const value = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return Date.UTC(value("year"), value("month") - 1, value("day"));
}
function bannerMonday(event: Event) {
  const day = bannerRaceDay(event);
  if (!Number.isFinite(day)) return Infinity;
  const weekday = new Date(day).getUTCDay();
  const monday = day + (((8 - weekday) % 7) || 7) * 86400000;
  // Amsterdam's offset at Monday midnight includes the applicable summer/winter time.
  const zone = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", timeZoneName: "shortOffset" }).formatToParts(monday).find(part => part.type === "timeZoneName")!.value;
  const offset = zone.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const minutes = offset ? (Number(offset[2]) * 60 + Number(offset[3] || 0)) * (offset[1] === "+" ? 1 : -1) : 0;
  return monday - minutes * 60000;
}
export function bannerEvent(s: State, seasonId: string, now = Date.now()) {
  const events = s.events
    .filter(event => event.seasonId === seasonId && !event.practiceRound)
    .sort((a, b) => bannerRaceDay(a) - bannerRaceDay(b));
  return events.find(event => event.id === s.settings.bannerOverride)
    || events.find(event => now < bannerMonday(event))
    || events.at(-1);
}
export function complete(p: Picks, kind: "gp" | "sprint") {
  return (
    p.order.length === (kind === "gp" ? 10 : 8) &&
    p.order.every(Boolean) &&
    new Set(p.order).size === p.order.length &&
    Boolean(
      p.pole && p.fastest && p.retirement && (kind === "sprint" || p.dotd),
    )
  );
}
