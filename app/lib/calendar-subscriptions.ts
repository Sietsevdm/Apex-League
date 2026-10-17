import { createHash, randomBytes } from "node:crypto";
import type { State, User } from "./model";
export const calendarTokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function calendarSubscriptionAction(
  s: State,
  user: User,
  body: Record<string, unknown>,
) {
  const season = s.seasons.find((season) => season.id === body.seasonId);
  if (!season || !user.seasonIds.includes(season.id) || !user.active)
    throw Object.assign(
      new Error("Join this season to subscribe to its calendar."),
      { status: 403 },
    );
  const existing = user.calendarSubscriptions?.find(
    (sub) => sub.seasonId === season.id,
  );
  if (body.action === "calendarSubscriptionStatus")
    return { calendarSubscription: { active: Boolean(existing) } };
  user.calendarSubscriptions = (user.calendarSubscriptions || []).filter(
    (sub) => sub.seasonId !== season.id,
  );
  if (body.action === "calendarSubscriptionRevoke")
    return { calendarSubscription: { active: false } };
  const token = randomBytes(32).toString("base64url");
  user.calendarSubscriptions.push({
    seasonId: season.id,
    tokenHash: calendarTokenHash(token),
    language: body.language === "nl" ? "nl" : "en",
    createdAt: new Date().toISOString(),
  });
  return {
    calendarSubscription: {
      active: true,
      path: `/api/calendar?token=${token}`,
    },
  };
}
export function subscribedCalendar(s: State, token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  const hash = calendarTokenHash(token);
  for (const user of s.users) {
    if (!user.active) continue;
    const subscription = user.calendarSubscriptions?.find(
      (sub) => sub.tokenHash === hash && user.seasonIds.includes(sub.seasonId),
    );
    const season = s.seasons.find(
      (season) => season.id === subscription?.seasonId,
    );
    if (subscription && season)
      return { season, language: subscription.language };
  }
}
