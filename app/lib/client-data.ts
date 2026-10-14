import type { State, Theme } from "./model";
import type { ResponseContext } from "./response-scope";

export type ClientData = {
  context?: ResponseContext;
  loginImage?: string;
  loginMobileImage?: string;
  loginText?: State["settings"]["loginText"];
  authenticated: boolean;
  demo: boolean;
  userId?: string;
  state?: State;
  name?: string;
  typography?: State["settings"]["typography"];
  theme?: Theme;
};
export type Call = (
  body: Record<string, unknown>,
  quiet?: boolean,
) => Promise<any>;
