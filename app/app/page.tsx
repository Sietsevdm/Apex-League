import { cookies } from "next/headers";
import AppEntry from "@/components/AppEntry";
import { readPublicSettings, demoMode } from "@/lib/store";
import { publicLoginData } from "@/lib/public-login";
import { readSession } from "@/lib/auth";
import { decorateImages } from "@/lib/banner-images";

export const dynamic = "force-dynamic";
export default async function Page() {
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
      initialData={data}
      hasSession={hasSession}
      initialError={initialError}
    />
  );
}
