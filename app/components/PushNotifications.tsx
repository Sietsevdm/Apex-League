"use client";
import { useEffect, useState } from "react";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";

export default function PushNotifications({
  call,
  userId,
}: {
  call: Call;
  userId: string;
}) {
  const { t, language } = useLocale();
  const [key, setKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [devices, setDevices] = useState(0);
  useEffect(() => {
    let alive = true;
    const supported =
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(supported);
    void (async () => {
      try {
        const registration = supported
          ? await navigator.serviceWorker.getRegistration()
          : undefined;
        const sub = await registration?.pushManager.getSubscription();
        const result = await call(
          { action: "pushStatus", endpoint: sub?.endpoint },
          true,
        );
        if (alive) {
          setKey(result.push.publicKey);
          setEnabled(result.push.subscribed);
          setDevices(result.push.devices);
        }
      } catch {
        if (alive)
          setMessage(
            "Could not load notification settings. Reopen your profile to try again.",
          );
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);
  const disable = async (all = false) => {
    setBusy(true);
    setMessage("");
    try {
      const registration =
        "serviceWorker" in navigator
          ? await navigator.serviceWorker.getRegistration()
          : undefined;
      const sub = await registration?.pushManager?.getSubscription();
      const result = await call(
        { action: "pushUnsubscribe", endpoint: sub?.endpoint, all },
        true,
      );
      if (sub) await sub.unsubscribe();
      setEnabled(false);
      setDevices(result.push.devices);
      setMessage("Push reminders disabled.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const enable = async () => {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notifications are blocked. Allow them in your browser settings to enable reminders.",
        );
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      const bytes = Uint8Array.from(
        atob(key.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      );
      if (
        sub &&
        sub.options.applicationServerKey &&
        Array.from(new Uint8Array(sub.options.applicationServerKey)).join() !==
          Array.from(bytes).join()
      ) {
        await sub.unsubscribe();
        sub = null;
      }
      sub ||= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes,
      });
      const result = await call(
        { action: "pushSubscribe", subscription: sub.toJSON(), language },
        true,
      );
      setEnabled(true);
      setDevices(result.push.devices);
      setMessage("Push reminders enabled on this device.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const sub = await registration?.pushManager.getSubscription();
      await call({ action: "pushTest", endpoint: sub?.endpoint }, true);
      setMessage("Test notification sent. Check this device's notifications.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <h2>{t("Push notifications")}</h2>
      <p>
        {t(
          "Get a reminder within 24 hours and 1 hour of each prediction deadline, only if you have not submitted. No email server is needed.",
        )}
      </p>
      <p className="tiny">
        {t(
          "On iPhone or iPad, add this site to your Home Screen and open it there before enabling notifications. Delivery depends on your browser, connection and device settings.",
        )}
      </p>
      {!supported ? (
        <p>
          {t(
            "Push is unavailable in this browser. Try a supported browser or install the app on your Home Screen.",
          )}
        </p>
      ) : (
        <div className="button-row">
          <button
            className={enabled ? "secondary" : "primary"}
            disabled={busy || !key}
            onClick={() => (enabled ? void disable() : void enable())}
          >
            {t(
              enabled
                ? "Disable push on this device"
                : "Enable push on this device",
            )}
          </button>
          {enabled && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void test()}
            >
              {t("Send test notification")}
            </button>
          )}
        </div>
      )}
      {devices > 0 && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void disable(true)}
        >
          {t("Disable push on all devices")}
        </button>
      )}
      {message && <p role="status">{t(message)}</p>}
    </section>
  );
}
