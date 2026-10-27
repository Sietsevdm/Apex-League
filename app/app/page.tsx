import { cookies } from "next/headers";
import AppEntry from "@/components/AppEntry";
import { readPublicSettings, demoMode } from "@/lib/store";
import { publicLoginData } from "@/lib/public-login";
import { readSession } from "@/lib/auth";
import { decorateImages } from "@/lib/banner-images";

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const params = await searchParams;
  const invitation =
    (Array.isArray(params.invite) ? params.invite[0] : params.invite)?.trim() ||
    "";
  const cookieStore = await cookies();
  // This hint selects the loading UI only. The API still validates the user/version.
  const hasSession =
    demoMode ||
    Boolean(readSession(cookieStore.get("apex_session")?.value || ""));
  let initialData = publicLoginData(undefined, demoMode);
  let initialError = "";
  try {
    initialData = await readPublicSettings();
  } catch (error) {
    console.error("Could not read public login settings", error);
    initialError =
      "The server could not load league settings. Please refresh or try again.";
  }
  const data = await decorateImages(initialData);
  return (
    <AppEntry
      invitation={invitation}
      initialData={data}
      hasSession={hasSession}
      initialError={initialError}
    />
  );
}
