import type { ResponseContext } from "./response-scope";
export function contextHeaders(
  context: ResponseContext = { scope: "season" },
): Record<string, string> {
  return {
    "X-Apex-Scope": context.scope,
    ...(context.seasonId ? { "X-Apex-Season": context.seasonId } : {}),
    ...(context.leagueId ? { "X-Apex-League": context.leagueId } : {}),
  };
}
