"use client";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";
type Call = (body: Record<string, unknown>, quiet?: boolean) => Promise<any>;
export default function PasskeyLogin({
  call,
  onError,
}: {
  call: Call;
  onError: (message: string) => void;
}) {
  const { t: tr } = useLocale();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="secondary passkey-login"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (!window.PublicKeyCredential)
            throw new Error("Passkeys are not supported by this browser.");
          const d = await call({ action: "passkeyLoginOptions" }, true);
          const { startAuthentication } = await import("@simplewebauthn/browser");
          const response = await startAuthentication({
            optionsJSON: d.options,
          });
          await call({ action: "passkeyLoginVerify", response }, true);
        } catch (e) {
          onError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {tr("Sign in with a passkey")}
    </button>
  );
}
