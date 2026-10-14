import type { State } from "./model";
import { themes } from "./theme";

export type PublicSettings = Pick<
  State["settings"],
  "name" | "loginText" | "typography" | "theme"
>;

/** Explicit public allowlist: never serialize the stored settings or league state. */
export function publicLoginData(
  settings?: Partial<PublicSettings>,
  demo = false,
) {
  return {
    authenticated: false as const,
    demo,
    name: settings?.name || "Apex League",
    loginText: settings?.loginText,
    typography: settings?.typography,
    theme: settings?.theme || themes[0],
  };
}
