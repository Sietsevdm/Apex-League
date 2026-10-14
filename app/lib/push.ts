import webpush from "web-push";
import { randomUUID } from "node:crypto";
import { cutoff, locked, type State, type User } from "./model";
import { transaction } from "./store";

export function pushSettings(s: State) {
  if (!s.push)
    s.push = {
      ...webpush.generateVAPIDKeys(),
      subscriptions: [],
      deliveries: {},
    };
  return s.push;
}
export function validSubscription(value: any) {
  const invalid = () => {
    throw Object.assign(new Error("Invalid push subscription."), {
      status: 400,
    });
  };
  if (
    !value ||
    typeof value.endpoint !== "string" ||
    value.endpoint.length > 4096
  )
    return invalid();
  let url: URL;
  try {
    url = new URL(value.endpoint);
  } catch {
    return invalid();
  }
  const host = url.hostname;
  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username ||
    url.password ||
    url.hash ||
    !(
      host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host === "web.push.apple.com" ||
      host.endsWith(".push.apple.com") ||
      host.endsWith(".notify.windows.com")
    )
  )
    return invalid();
  if (
    !value.keys ||
    typeof value.keys.p256dh !== "string" ||
    typeof value.keys.auth !== "string" ||
    !/^[\w-]{87}$/.test(value.keys.p256dh) ||
    !/^[\w-]{22}$/.test(value.keys.auth) ||
    Buffer.from(value.keys.p256dh, "base64url").length !== 65 ||
    Buffer.from(value.keys.auth, "base64url").length !== 16
  )
    return invalid();
  return {
    endpoint: value.endpoint,
    keys: { p256dh: value.keys.p256dh, auth: value.keys.auth },
  };
}
export function pushAction(s: State, u: User, body: any) {
  const config = pushSettings(s);
  if (body.action === "pushSubscribe") {
    const subscription = validSubscription(body.subscription);
    const mine = config.subscriptions.filter(
      (item) => item.userId === u.id && item.endpoint !== subscription.endpoint,
    );
    if (mine.length >= 5)
      throw Object.assign(
        new Error("Disable push on another device before adding a new one."),
        { status: 400 },
      );
    config.subscriptions = config.subscriptions.filter(
      (item) => item.endpoint !== subscription.endpoint,
    );
    config.subscriptions.push({
      id: randomUUID(),
      userId: u.id,
      ...subscription,
      language: body.language === "nl" ? "nl" : "en",
      createdAt: new Date().toISOString(),
    });
  }
  if (body.action === "pushUnsubscribe")
    config.subscriptions = config.subscriptions.filter(
      (item) =>
        !(
          item.userId === u.id &&
          (body.all || item.endpoint === body.endpoint)
        ),
    );
  return {
    push: {
      publicKey: config.publicKey,
      devices: config.subscriptions.filter((item) => item.userId === u.id)
        .length,
      subscribed: config.subscriptions.some(
        (item) => item.userId === u.id && item.endpoint === body.endpoint,
      ),
    },
  };
}

export function dueReminders(s: State, now = Date.now()) {
  if (!s.push) return [];
  const jobs: {
    key: string;
    subscriptionId: string;
    eventId: string;
    kind: "gp" | "sprint";
    hours: number;
  }[] = [];
  for (const sub of s.push.subscriptions) {
    const user = s.users.find((u) => u.id === sub.userId);
    if (!user?.active) continue;
    for (const event of s.events) {
      if (
        event.practiceRound ||
        !user.seasonIds.includes(event.seasonId) ||
        s.seasons.find((season) => season.id === event.seasonId)?.archived
      )
        continue;
      for (const kind of ["gp", "sprint"] as const) {
        if (kind === "sprint" && !event.sprintQualifying) continue;
        const remaining = Date.parse(cutoff(event, kind)) - now;
        if (
          !Number.isFinite(remaining) ||
          remaining <= 0 ||
          remaining > 24 * 3600000 ||
          locked(event, kind, now) ||
          s.entries.some(
            (e) =>
              e.userId === user.id &&
              e.eventId === event.id &&
              e.kind === kind &&
              e.submitted,
          )
        )
          continue;
        const hours = remaining <= 3600000 ? 1 : 24;
        const key = `${sub.id}:${event.id}:${kind}:${hours}`;
        const delivery = s.push.deliveries[key];
        if (
          delivery?.status === "sent" ||
          (delivery && (delivery.leaseUntil > now || delivery.attempts >= 5))
        )
          continue;
        jobs.push({
          key,
          subscriptionId: sub.id,
          eventId: event.id,
          kind,
          hours,
        });
      }
    }
  }
  return jobs.slice(0, 20);
}
export type PushSender = (
  subscription: webpush.PushSubscription,
  payload: string,
  options: webpush.RequestOptions,
) => Promise<unknown>;
export function preparePushTest(s: State, u: User, endpoint: unknown) {
  const sub = s.push?.subscriptions.find(
    (item) => item.userId === u.id && item.endpoint === endpoint,
  );
  if (!sub)
    throw Object.assign(new Error("Enable push on this device first."), {
      status: 400,
    });
  return { sub, publicKey: s.push!.publicKey, privateKey: s.push!.privateKey };
}
export async function sendPushTest(
  job: ReturnType<typeof preparePushTest>,
  send: PushSender = webpush.sendNotification,
) {
  try {
    validSubscription(job.sub);
    await send(
      job.sub,
      JSON.stringify({
        title: "Apex League",
        body:
          job.sub.language === "nl"
            ? "Pushmeldingen werken op dit apparaat."
            : "Push notifications are working on this device.",
        tag: "apex-push-test",
      }),
      {
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT || process.env.APP_URL!,
          publicKey: job.publicKey,
          privateKey: job.privateKey,
        },
        TTL: 60,
        timeout: 10000,
      },
    );
  } catch {
    throw Object.assign(
      new Error(
        "Could not deliver the test notification. Disable and re-enable push, then try again.",
      ),
      { status: 502 },
    );
  }
}
export async function sendDuePush(
  send: PushSender = webpush.sendNotification,
  now = Date.now(),
) {
  const jobs = await transaction((s) => {
    const jobs = dueReminders(s, now);
    if (s.push) {
      for (const [key, value] of Object.entries(s.push.deliveries))
        if (value.updatedAt < now - 30 * 86400000)
          delete s.push.deliveries[key];
      for (const job of jobs)
        s.push.deliveries[job.key] = {
          status: "sending",
          leaseUntil: now + 180000,
          attempts: (s.push.deliveries[job.key]?.attempts || 0) + 1,
          updatedAt: now,
        };
    }
    return jobs;
  });
  let sent = 0,
    failed = 0;
  for (let offset = 0; offset < jobs.length; offset += 4)
    await Promise.all(
      jobs.slice(offset, offset + 4).map(async (job) => {
        // Recheck just before external delivery; saves never wait on the push provider.
        const prepared = await transaction((s) => {
          const sub = s.push?.subscriptions.find(
            (item) => item.id === job.subscriptionId,
          );
          const event = s.events.find((item) => item.id === job.eventId);
          const user = s.users.find((item) => item.id === sub?.userId);
          if (
            !sub ||
            !event ||
            !user?.active ||
            !user.seasonIds.includes(event.seasonId) ||
            s.seasons.find((item) => item.id === event.seasonId)?.archived ||
            locked(event, job.kind) ||
            s.entries.some(
              (entry) =>
                entry.userId === user.id &&
                entry.eventId === event.id &&
                entry.kind === job.kind &&
                entry.submitted,
            )
          )
            return undefined;
          if (
            Date.parse(cutoff(event, job.kind)) - Date.now() >
            job.hours * 3600000
          )
            return undefined;
          validSubscription(sub);
          const nl = sub.language === "nl";
          return {
            sub,
            keys: {
              publicKey: s.push!.publicKey,
              privateKey: s.push!.privateKey,
            },
            payload: JSON.stringify({
              title: nl
                ? "Je voorspelling ontbreekt"
                : "Your prediction is missing",
              body: `${event.name} · ${job.kind.toUpperCase()} · ${nl ? `Sluit binnen ${job.hours} uur` : `Closes within ${job.hours} hour${job.hours === 1 ? "" : "s"}`}`,
              tag: job.key,
              url: "/",
            }),
            ttl: Math.max(
              0,
              Math.min(
                3600,
                Math.floor(
                  (Date.parse(cutoff(event, job.kind)) - Date.now()) / 1000,
                ),
              ),
            ),
          };
        });
        if (!prepared || prepared.ttl <= 0) return;
        try {
          await send(prepared.sub, prepared.payload, {
            vapidDetails: {
              subject: process.env.VAPID_SUBJECT || process.env.APP_URL!,
              ...prepared.keys,
            },
            TTL: prepared.ttl,
            timeout: 10000,
            urgency: "normal",
          });
          await transaction((s) => {
            if (s.push?.deliveries[job.key])
              s.push.deliveries[job.key] = {
                ...s.push.deliveries[job.key],
                status: "sent",
                leaseUntil: 0,
              };
          });
          sent++;
        } catch (error) {
          failed++;
          await transaction((s) => {
            if (!s.push) return;
            if (
              [404, 410].includes((error as { statusCode: number }).statusCode)
            )
              s.push.subscriptions = s.push.subscriptions.filter(
                (sub) => sub.id !== job.subscriptionId,
              );
            if (s.push.deliveries[job.key])
              s.push.deliveries[job.key].leaseUntil = Date.now() + 5 * 60000;
          });
        }
      }),
    );
  return { sent, failed };
}
