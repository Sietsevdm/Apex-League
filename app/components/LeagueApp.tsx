"use client";
import { appearanceStyle } from "@/lib/appearance";
import { backgroundRefresh } from "@/lib/background-refresh";
import type { Call, ClientData as Data } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { contextHeaders } from "@/lib/request-context";
import type { ResponseContext } from "@/lib/response-scope";
import { applyDelta } from "@/lib/state-delta";
import {
  ArrowUpRight,
  CalendarDays,
  Bell,
  CheckCircle2,
  ChevronRight,
  Eye,
  Flag,
  Info,
  LayoutDashboard,
  ListOrdered,
  Menu,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Auth from "./Auth";
import { Heading } from "./screens/Shared";
const Home = dynamic(() => import("./screens/Home"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Predictions = dynamic(() => import("./screens/Predictions"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Leaderboard = dynamic(() => import("./screens/Leaderboard"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Calendar = dynamic(() => import("./screens/Calendar"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Results = dynamic(() => import("./screens/Results"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Compare = dynamic(() => import("./screens/Compare"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Champions = dynamic(() => import("./screens/Champions"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Stats = dynamic(() => import("./screens/Stats"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Rules = dynamic(() => import("./screens/Rules"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Announcements = dynamic(() => import("./screens/LeagueAnnouncements"), {
  loading: () => <section className="panel" role="status">…</section>,
});
const Archive = dynamic(() => import("./screens/Archive"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Profile = dynamic(() => import("./screens/Profile"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
const Admin = dynamic(() => import("./screens/Admin"), {
  loading: () => (
    <section className="panel" role="status">
      …
    </section>
  ),
});
type LeagueProps = { initialData: Data; onSignedOut: (data: Data) => void };
function LeagueContent({ initialData, onSignedOut }: LeagueProps) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [data, updateData] = useState<Data>(initialData);
  const dataRef = useRef(initialData);
  const [seasonId, setSeasonId] = useState(initialData.context?.seasonId || "");
  const contextRef = useRef<ResponseContext>(
    initialData.context || { scope: "season" },
  );
  const navigationVersion = useRef(0);
  const navigationRequest = useRef<AbortController | undefined>(undefined);
  const [scopeLoading, setScopeLoading] = useState(false);
  useEffect(
    () => () => {
      navigationVersion.current++;
      navigationRequest.current?.abort();
    },
    [],
  );
  const setData = useCallback(
    (next: Data) => {
      dataRef.current = next;
      if (!next.authenticated) onSignedOut(next);
      if (next.context) {
        if (next.context.seasonId !== contextRef.current.seasonId)
          setEventId("");
        contextRef.current = next.context;
        setSeasonId(next.context.seasonId || "");
      }
      updateData(next);
    },
    [onSignedOut],
  );
  const [page, setPage] = useState("home");
  const [eventId, setEventId] = useState("");
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const panel = document.querySelector<HTMLElement>(".sidebar");
    const controls = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          "button, a[href], input, select",
        ) || [],
      ).filter(
        (el) => el.getClientRects().length && !el.hasAttribute("disabled"),
      );
    const previous = document.activeElement as HTMLElement | null;
    controls()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
      }
      if (event.key === "Tab") {
        const items = controls(),
          first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [menu]);
  const refreshController = useRef<
    ReturnType<typeof backgroundRefresh<Data | undefined>> | undefined
  >(undefined);
  useEffect(() => {
    const controller = backgroundRefresh<Data | undefined>({
      load: async (signal) => {
        const response = await fetch("/api/league", {
          cache: "no-store",
          signal,
          headers: {
            ...contextHeaders(contextRef.current),
            ...(dataRef.current.revision
              ? { "If-None-Match": `"${dataRef.current.revision}"` }
              : {}),
          },
        });
        if (response.status === 304) return undefined;
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      },
      onData: (next) => {
        if (next) setData(next);
      },
      onError: (error) => setError(error.message),
      active: () => document.visibilityState === "visible" && navigator.onLine,
      subscribe: (changed) => {
        document.addEventListener("visibilitychange", changed);
        window.addEventListener("online", changed);
        window.addEventListener("offline", changed);
        window.addEventListener("focus", changed);
        return () => {
          document.removeEventListener("visibilitychange", changed);
          window.removeEventListener("online", changed);
          window.removeEventListener("offline", changed);
          window.removeEventListener("focus", changed);
        };
      },
    });
    refreshController.current = controller;
    return () => {
      controller.dispose();
      refreshController.current = undefined;
    };
  }, [setData]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const call: Call = async (body, quiet = false) => {
    const finish = refreshController.current?.beginWrite();
    let fresh = false;
    const version = navigationVersion.current;
    try {
      if (body.action === "logout" && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) body = {...body,pushEndpoint:subscription.endpoint};
        } catch { /* Logout remains available when browser push APIs are unavailable. */ }
      }
      const r = await fetch("/api/league", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(dataRef.current.revision
            ? { "X-Apex-Base-Version": dataRef.current.revision }
            : {}),
          ...contextHeaders(
            body.action === "demoUser"
              ? { scope: "season", seasonId: contextRef.current.seasonId }
              : contextRef.current,
          ),
        },
        body: JSON.stringify(body),
      });
      let d = await r.json();
      if (!r.ok) {
        if (!quiet) setError(d.error);
        throw new Error(d.error);
      }
      if (d.delta && version === navigationVersion.current) {
        const merged = applyDelta(dataRef.current, d);
        if (merged) d = merged;
        else {
          const response = await fetch("/api/league", {
            cache: "no-store",
            headers: contextHeaders(contextRef.current),
          });
          d = await response.json();
          if (!response.ok) throw new Error(d.error);
        }
      }
      if (
        "authenticated" in d &&
        (!d.authenticated || version === navigationVersion.current)
      ) {
        setData(d);
        if (body.action === "demoUser") setPage("home");
        fresh = true;
      }
      if (!quiet) setNotice("Changes saved");
      return d;
    } finally {
      finish?.(fresh);
    }
  };
  const loadScope = async (context: ResponseContext, targetPage?: string) => {
    const version = ++navigationVersion.current;
    navigationRequest.current?.abort();
    const controller = new AbortController();
    navigationRequest.current = controller;
    const finish = refreshController.current?.beginWrite();
    let fresh = false;
    setScopeLoading(true);
    try {
      const response = await fetch("/api/league", {
        cache: "no-store",
        headers: contextHeaders(context),
        signal: controller.signal,
      });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error);
      if (controller.signal.aborted || version !== navigationVersion.current)
        return;
      setData(next);
      if (targetPage) setPage(targetPage);
      fresh = true;
    } catch (error) {
      if (!controller.signal.aborted && version === navigationVersion.current)
        setError((error as Error).message);
    } finally {
      finish?.(fresh);
      if (version === navigationVersion.current) setScopeLoading(false);
    }
  };
  const s = data?.state;
  const season =
    s?.seasons.find((x) => x.id === seasonId) ||
    s?.seasons.filter((x) => !x.archived).at(-1) ||
    s?.seasons.at(-1);
  const me = s?.users.find((u) => u.id === data?.userId);
  const [eventKind, setEventKind] = useState<"gp" | "sprint">("gp");
  const go = (p: string, id?: string, kind: "gp" | "sprint" = "gp") => {
    const scope =
      p === "admin" ? "admin" : p === "archive" ? "archive" : "season";
    if (scope !== contextRef.current.scope || scopeLoading)
      void loadScope({ ...contextRef.current, scope }, p);
    else setPage(p);
    if (id) setEventId(id);
    if (p === "predict") setEventKind(kind);
    setMenu(false);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    );
  };
  const style = appearanceStyle({
    theme: s?.settings.theme || data.theme,
    typography: s?.settings.typography || data.typography,
  });
  if (!data)
    return (
      <main className="app loading" style={style}>
        <div className="brand-mark">{tr("A")}</div>
        <h2>{tr("Preparing your grid\u2026")}</h2>
        {tr(error && <p>{tr(error)}</p>)}
      </main>
    );
  if (!data.authenticated || !s || !me)
    return (
      <div style={style}>
        <Auth data={data} call={call} error={error} setError={setError} />
      </div>
    );
  const nav = [
    ["home", "Overview", LayoutDashboard],
    ["predict", "Predictions", ListOrdered],
    ["leaderboard", "Standings", Trophy],
    ["calendar", "Race calendar", CalendarDays],
    ["results", "Results & recap", Flag],
    ["compare", "Head to head", Users],
    ["champions", "Season picks", Target],
    ["stats", "My season", TrendingUp],
    ["league", "League & rules", Info],
    ["archive", "Season archive", CalendarDays],
    ["announcements", "Announcements", Bell],
  ] as const;
  return (
    <div className="app" style={style}>
      <a className="skip-link" href="#main-content">
        {tr("Skip to content")}
      </a>
      <aside
        className={`sidebar ${menu ? "open" : ""}`}
        role={menu ? "dialog" : undefined}
        aria-modal={menu ? true : undefined}
        aria-label={tr("Navigation")}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          {tr(
            s.settings.logo ? (
              <img src={s.settings.logo} alt={tr("League logo")} />
            ) : (
              <span className="brand-mark">{tr("A")}</span>
            ),
          )}
          <span>
            {s.settings.name}
            <small>{tr("PREDICTION LEAGUE")}</small>
          </span>
        </a>
        <button
          className="close-menu icon-button"
          onClick={() => setMenu(false)}
          aria-label={tr("Close menu")}
        >
          <X />
        </button>
        <div className="nav-label">{tr("YOUR PADDOCK")}</div>
        <nav>
          {tr(
            nav.map(([id, label, Icon]) => (
              <button
                key={id}
                aria-current={page === id ? "page" : undefined}
                className={page === id ? "active" : ""}
                onClick={() => go(id)}
              >
                <Icon size={18} />
                {tr(label)}
                {tr(page === id && <span className="nav-dot" />)}
              </button>
            )),
          )}
        </nav>
        {tr(
          me.role === "admin" && !preview && (
            <>
              <div className="nav-label">{tr("MANAGE THE LEAGUE")}</div>
              <button
                className={`admin-link ${page === "admin" ? "active" : ""}`}
                onClick={() => go("admin")}
              >
                <Shield size={18} />
                {tr("Admin studio")}
              </button>
            </>
          ),
        )}
        <div className="sidebar-bottom">
          <span className="live-dot" />
          {tr("YOUR GRID. YOUR RULES.")}
          <p>{tr("Built for the entire season.")}</p>
        </div>
      </aside>
      {tr(menu && <div className="scrim" onClick={() => setMenu(false)} />)}
      <div className="main-shell" inert={menu}>
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(true)}
            aria-label={tr("Open menu")}
            aria-expanded={menu}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            {tr("Your paddock")}
            <ChevronRight size={14} />
            {tr(" ")}
            <strong>
              {tr(
                page === "admin"
                  ? "Admin studio"
                  : nav.find((x) => x[0] === page)?.[1] || "Profile",
              )}
            </strong>
          </div>
          <div className="topbar-actions">
            <select
              className="season-select"
              value={season?.id || ""}
              onChange={(e) =>
                void loadScope({
                  ...contextRef.current,
                  seasonId: e.target.value,
                })
              }
              disabled={scopeLoading}
              aria-label={tr("Select season")}
            >
              {tr(
                s.seasons.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                )),
              )}
            </select>
            <select
              className="language-select"
              aria-label={tr("Language")}
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "nl")}
            >
              <option value="en">English</option>
              <option value="nl">Nederlands</option>
            </select>
            <button
              className="avatar"
              onClick={() => go("profile")}
              aria-label={tr("Open profile")}
            >
              {tr(me.name.slice(0, 2).toUpperCase())}
            </button>
          </div>
        </header>
        {tr(
          data.demo && (
            <div className="demo-strip">
              <span>
                <Info size={14} />
                {tr(
                  "Interactive demo \u00B7 sample calendar, drivers and results",
                )}
              </span>
              <select
                aria-label={tr("Demo account")}
                value={me.id}
                onChange={(e) =>
                  call({ action: "demoUser", id: e.target.value })
                }
              >
                {tr(
                  s.users
                    .filter((x) => x.active)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {tr("View as ")}
                        {x.name}
                        {tr(x.role === "admin" ? " (organiser)" : "")}
                      </option>
                    )),
                )}
              </select>
            </div>
          ),
        )}
        {tr(
          preview && (
            <div className="demo-strip">
              <span>
                <Eye size={14} />
                {tr("Player preview \u00B7 admin controls hidden")}
              </span>
              <button
                onClick={() => {
                  setPreview(false);
                  go("admin");
                }}
              >
                {tr("Exit preview")}
              </button>
            </div>
          ),
        )}
        {scopeLoading && (
          <div className="info-bar" role="status">
            {tr("Preparing your grid…")}
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          aria-busy={scopeLoading}
          inert={scopeLoading}
        >
          {tr(
            !season &&
              page !== "admin" &&
              page !== "profile" &&
              page !== "archive" &&
              page !== "announcements" ? (
              <>
                <Heading
                  title={tr("Welcome to your league")}
                  description={tr("Set up your first season to open the grid.")}
                />
                {tr(
                  me.role === "admin" && (
                    <button className="primary" onClick={() => go("admin")}>
                      {tr("Create first season")}
                      <ArrowUpRight size={17} />
                    </button>
                  ),
                )}
              </>
            ) : page === "admin" ? (
              <Admin
                s={s}
                season={season}
                meId={me.id}
                call={call}
                go={go}
                onPreview={() => {
                  setPreview(true);
                  go("home");
                }}
              />
            ) : page === "archive" ? (
              <Archive
                s={s}
                call={call}
                isAdmin={me.role === "admin" && !preview}
                onSelect={(id) => {
                  void loadScope(
                    { scope: "season", seasonId: id },
                    "leaderboard",
                  );
                }}
              />
            ) : page === "announcements" ? (
              <Announcements s={s} />
            ) : page === "profile" ? (
              <Profile me={me} call={call} />
            ) : (
              season && (
                <>
                  {tr(
                    page === "home" && (
                      <Home s={s} season={season} meId={me.id} go={go} />
                    ),
                  )}
                  {tr(
                    page === "predict" && (
                      <Predictions
                        key={`${season.id}-${eventId}-${me.id}-${eventKind}`}
                        s={s}
                        season={season}
                        meId={me.id}
                        initialId={eventId}
                        initialKind={eventKind}
                        call={call}
                      />
                    ),
                  )}
                  {tr(
                    page === "leaderboard" && (
                      <Leaderboard s={s} season={season} meId={me.id} />
                    ),
                  )}
                  {tr(
                    page === "calendar" && (
                      <Calendar s={s} season={season} go={go} call={call} />
                    ),
                  )}
                  {tr(
                    page === "results" && (
                      <Results
                        key={`${season.id}-${eventId}-${me.id}`}
                        s={s}
                        season={season}
                        meId={me.id}
                        initialId={eventId}
                      />
                    ),
                  )}
                  {tr(
                    page === "compare" && (
                      <Compare
                        key={`${season.id}-${me.id}`}
                        s={s}
                        season={season}
                        meId={me.id}
                      />
                    ),
                  )}
                  {tr(
                    page === "champions" && (
                      <Champions
                        key={`${season.id}-${me.id}`}
                        s={s}
                        season={season}
                        meId={me.id}
                        call={call}
                      />
                    ),
                  )}
                  {tr(
                    page === "stats" && (
                      <Stats s={s} season={season} meId={me.id} />
                    ),
                  )}
                  {tr(page === "league" && <Rules s={s} season={season} />)}
                </>
              )
            ),
          )}
        </main>
        <footer>
          <span>
            {s.settings.name}
            {tr("\u00B7 Made for race weekends.")}
          </span>
          <span>
            {tr("Independent fan league \u00B7 Not affiliated with Formula 1")}
          </span>
        </footer>
      </div>
      {tr(
        notice && (
          <div role="status" className="toast">
            <CheckCircle2 size={18} />
            {tr(notice)}
          </div>
        ),
      )}
      {tr(
        error && (
          <div className="error-toast" role="alert">
            <span>{tr(error)}</span>
            <button
              onClick={() => setError("")}
              aria-label={tr("Dismiss error")}
            >
              <X size={18} />
            </button>
          </div>
        ),
      )}
    </div>
  );
}
export default function LeagueApp(props: LeagueProps) {
  return <LeagueContent {...props} />;
}
