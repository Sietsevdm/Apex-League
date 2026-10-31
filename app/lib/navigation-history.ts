"use client";
import { useEffect, useRef } from "react";
import type { ResponseContext } from "./response-scope";
export type AppLocation = { page: string; eventId: string; kind: "gp" | "sprint"; context: ResponseContext };
const pages = new Set(["home", "predict", "calendar", "results", "leaderboard", "compare", "champions", "stats", "league", "archive", "announcements", "admin", "profile"]);
export function historyLocation(state: unknown): AppLocation | undefined {
  const r = (state as { apexLocation?: AppLocation } | null)?.apexLocation;
  if (!r || !pages.has(r.page) || typeof r.eventId !== "string" || !["gp", "sprint"].includes(r.kind) ||
      !r.context || !["season", "admin", "archive"].includes(r.context.scope) ||
      [r.context.seasonId, r.context.leagueId].some(x => x !== undefined && typeof x !== "string")) return;
  return r;
}
const key = (r: AppLocation) => JSON.stringify([r.page,r.eventId,r.kind,r.context.scope,r.context.seasonId || "",r.context.leagueId || ""]);

/** Record screen transitions; a history restore never creates a new entry. */
export function useNavigationHistory(location: AppLocation, restore: (r: AppLocation) => Promise<boolean>) {
  const current = useRef(location), apply = useRef(restore);
  current.current = location; apply.current = restore;
  const last = useRef(""), restoring = useRef<string | undefined>(undefined), sequence = useRef(0);
  useEffect(() => {
    const load = (r: AppLocation) => {
      const version = ++sequence.current;
      restoring.current = key(r); last.current = key(r);
      void apply.current(r).then(ok => {
        if (version !== sequence.current || ok) return;
        restoring.current = undefined;
        last.current = key(current.current);
        window.history.replaceState({ ...window.history.state, apexLocation: current.current }, "");
      });
    };
    const saved = historyLocation(window.history.state);
    if (saved && key(saved) !== key(current.current)) load(saved);
    else {
      last.current = key(current.current);
      window.history.replaceState({ ...window.history.state, apexLocation: current.current }, "");
    }
    const pop = (event: PopStateEvent) => { const r = historyLocation(event.state); if (r) load(r); };
    window.addEventListener("popstate", pop);
    return () => { sequence.current++; window.removeEventListener("popstate", pop); };
  }, []);
  const locationKey = key(location);
  useEffect(() => {
    if (restoring.current) {
      if (restoring.current !== locationKey) return;
      restoring.current = undefined;
    }
    if (last.current === locationKey) return;
    last.current = locationKey;
    window.history.pushState({ ...window.history.state, apexLocation: location }, "");
  }, [locationKey]);
}
