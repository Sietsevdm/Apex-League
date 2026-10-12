"use client";
import { registrationOpen, predictionDrivers } from "@/lib/season-controls";
import { useLocale, LocaleProvider } from "@/lib/i18n";
import { useEffect, useState, useCallback, useRef } from "react";
import ShareCard from "./ShareCard";
import UpdateNotice from "./UpdateNotice";
import {
  SubmissionOverview,
  ReplacementNotice,
  ReplacementAdmin,
  CorrectionPreview,
  SeasonWizard,
  InstallApp,
} from "./LeagueImprovements";
import {
  TypographyEditor,
  BackupPanel,
  LaunchChecklist,
  Awards,
  CalendarDownload,
  PredictionExtras,
  Provenance,
  PasskeyPanel,
  PasskeyLogin,
} from "./LeagueExtras";
import { fontFamilies, resolvedFonts, fontGroups } from "@/lib/typography";
import CalendarSync from "./CalendarSync";
import {
  Flag,
  LayoutDashboard,
  ListOrdered,
  Trophy,
  CalendarDays,
  Users,
  Settings,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Check,
  Clock,
  Menu,
  X,
  LogOut,
  Palette,
  Image as ImageIcon,
  Shield,
  Download,
  Plus,
  CheckCircle2,
  Info,
  TrendingUp,
  Target,
  MapPin,
  Save,
  Eye,
  Copy,
  Bell,
  RefreshCw,
} from "lucide-react";
import {
  State,
  Event,
  Season,
  Picks,
  Result,
  Theme,
  themes,
  emptyPicks,
  emptyResult,
  cutoff,
  locked,
  score,
  standings,
  bannerEvent,
  complete,
} from "@/lib/model";
type Data = {
  loginImage?: string;
  loginMobileImage?: string;
  authenticated: boolean;
  demo: boolean;
  userId?: string;
  state?: State;
  name?: string;
  typography?: State["settings"]["typography"];
  theme?: Theme;
};
type Call = (body: Record<string, unknown>, quiet?: boolean) => Promise<any>;
const remaining = (v: string) => {
  const h = Math.max(0, Math.floor((Date.parse(v) - Date.now()) / 3600000));
  return h >= 24
    ? `${Math.floor(h / 24)}d ${h % 24}h`
    : `${h}h ${Math.max(0, Math.floor((Date.parse(v) - Date.now()) / 60000) % 60)}m`;
};
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <div className="page-heading">
      <div>
        {tr(eyebrow && <div className="eyebrow">{tr(eyebrow)}</div>)}
        <h1>{tr(title)}</h1>
        {tr(description && <p>{tr(description)}</p>)}
      </div>
      {tr(children)}
    </div>
  );
}
function Pill({
  children,
  tone = "",
  fontGroup,
}: {
  children: React.ReactNode;
  tone?: string;
  fontGroup?: "labels" | "numbers";
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <span className={`pill ${tone}`} data-font-group={fontGroup}>
      {tr(children)}
    </span>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <div className="empty">
      <Flag size={30} />
      <h3>{tr(title)}</h3>
      <p>{tr(body)}</p>
    </div>
  );
}
function DriverSelect({
  value,
  onChange,
  season,
  none = false,
  disabled = false,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  season: Season;
  none?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <select
      aria-label={tr(label || "Select driver")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{tr("Choose a driver")}</option>
      {tr(none && <option value="none">{tr("No retirements")}</option>)}
      {tr(
        season.drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {tr(d.name)}
            {tr(d.team ? ` · ${d.team}` : "")}
          </option>
        )),
      )}
    </select>
  );
}
function driverName(season: Season, id: string) {
  return id === "none"
    ? "No retirements"
    : season.drivers.find((d) => d.id === id)?.name || "—";
}
function LeagueContent() {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [data, setData] = useState<Data>();
  const [page, setPage] = useState("home");
  const [seasonId, setSeasonId] = useState("");
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
  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/league", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    reload();
    const timer = setInterval(reload, 60000);
    return () => clearInterval(timer);
  }, [reload]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const call: Call = async (body, quiet = false) => {
    const r = await fetch("/api/league", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) {
      if (!quiet) setError(d.error);
      throw new Error(d.error);
    }
    if ("authenticated" in d) setData(d);
    if (!quiet) setNotice("Changes saved");
    return d;
  };
  const s = data?.state;
  const season =
    s?.seasons.find((x) => x.id === seasonId) ||
    s?.seasons.filter((x) => !x.archived).at(-1) ||
    s?.seasons.at(-1);
  const me = s?.users.find((u) => u.id === data?.userId);
  const go = (p: string, id?: string) => {
    setPage(p);
    if (id) setEventId(id);
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
  const theme = s?.settings.theme || data?.theme || themes[0];
  const style = {
    "--bg": theme.background,
    "--surface": theme.surface,
    "--accent": theme.accent,
    "--gold": theme.highlight,
    "--text": theme.text,
    "--muted": theme.muted,
    "--font-scale":
      ((s?.settings.typography || data?.typography)?.groups?.body?.size ||
        (s?.settings.typography || data?.typography)?.text ||
        100) / 100,
    "--heading-scale":
      ((s?.settings.typography || data?.typography)?.groups?.heading?.size ||
        (s?.settings.typography || data?.typography)?.headings ||
        100) / 100,
    "--banner-scale":
      ((s?.settings.typography || data?.typography)?.groups?.banner?.size ||
        (s?.settings.typography || data?.typography)?.banner ||
        100) / 100,
    ...Object.fromEntries(
      fontGroups.flatMap((key) => {
        const v = resolvedFonts(s?.settings.typography || data?.typography)[
          key
        ];
        return [
          [`--${key}-family`, fontFamilies[v.family]],
          [`--${key}-size`, v.size / 100],
          [`--${key}-weight`, v.weight],
          [`--${key}-height`, v.lineHeight],
          [`--${key}-spacing`, `${v.spacing}px`],
        ];
      }),
    ),
  } as React.CSSProperties;
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
              onChange={(e) => setSeasonId(e.target.value)}
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
        <main id="main-content" tabIndex={-1}>
          {tr(
            !season && page !== "admin" && page !== "profile" && page !== "archive" ? (
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
              <Archive s={s} call={call} isAdmin={me.role === "admin" && !preview} onSelect={(id) => { setSeasonId(id); go("leaderboard"); }} />
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
                        key={`${season.id}-${eventId}-${me.id}`}
                        s={s}
                        season={season}
                        meId={me.id}
                        initialId={eventId}
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
                      <Calendar s={s} season={season} go={go} />
                    ),
                  )}
                  {tr(
                    page === "results" && (
                      <Results
                        s={s}
                        season={season}
                        meId={me.id}
                        initialId={eventId}
                      />
                    ),
                  )}
                  {tr(
                    page === "compare" && (
                      <Compare s={s} season={season} meId={me.id} />
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
export function Auth({
  data,
  call,
  error,
  setError,
}: {
  data: Data;
  call: Call;
  error: string;
  setError: (v: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [available, setAvailable] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    invite: "",
    seasonId: "",
  });
  useEffect(() => {
    call({ action: "publicInfo" }, true)
      .then((d) => {
        setAvailable(d.seasons);
        setForm((f) => ({
          ...f,
          seasonId: d.seasons.at(-1)?.id || "",
          invite: new URLSearchParams(location.search).get("invite") || "",
        }));
      })
      .catch(() => {});
  }, []);
  return (
    <div className="auth-shell">
      <div
        className="auth-story"
        style={
          {
            "--login-image": `url("${data.loginImage || "/login-race.svg"}")`,
            "--login-mobile-image": `url("${data.loginMobileImage || data.loginImage || "/login-race.svg"}")`,
          } as React.CSSProperties
        }
      >
        <div className="brand">
          <span className="brand-mark">{tr("A")}</span>
          {tr(data.name || "Apex League")}
        </div>
        <div>
          <div className="eyebrow">{tr("THE NEXT RACE STARTS WITH YOU")}</div>
          <h1>
            {tr("Friends on the grid.")}
            <br />
            <em>{tr("Rivals on Sunday.")}</em>
          </h1>
          <p>
            {tr("Make your picks. Follow the points. Own the bragging rights.")}
          </p>
        </div>
        <small>{tr("Your private Formula 1 prediction league.")}</small>
      </div>
      <div className="auth-card">
        <h2>{tr(register ? "Join your friends" : "Welcome back")}</h2>
        <p>
          {tr(
            register
              ? "You need an invitation and an open season."
              : "Your next prediction is waiting.",
          )}
        </p>
        {!register && <PasskeyLogin call={call} onError={setError} />}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await call({ action: register ? "register" : "login", ...form });
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          {tr(
            register && (
              <label>
                {tr("Display name")}
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
            ),
          )}
          <label>
            {tr("Email")}
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            {tr("Password")}
            <input
              type="password"
              required
              minLength={register ? 12 : 1}
              autoComplete={register ? "new-password" : "current-password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {tr(
            register && (
              <>
                <label>
                  {tr("Invitation code")}
                  <input
                    required
                    value={form.invite}
                    onChange={(e) =>
                      setForm({ ...form, invite: e.target.value })
                    }
                  />
                </label>
                <label>
                  {tr("Season")}
                  <select
                    value={form.seasonId}
                    onChange={(e) =>
                      setForm({ ...form, seasonId: e.target.value })
                    }
                  >
                    {tr(
                      available.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                          {tr(
                            x.registrationClosed
                              ? " · Registration closed"
                              : "",
                          )}
                        </option>
                      )),
                    )}
                  </select>
                </label>
              </>
            ),
          )}
          <button className="primary" disabled={busy}>
            {tr(busy ? "Please wait…" : register ? "Join the grid" : "Sign in")}
            <ArrowUpRight size={18} />
          </button>
        </form>
        {tr(error && <p className="form-error">{tr(error)}</p>)}
        <button className="text-button" onClick={() => setRegister(!register)}>
          {tr(
            register
              ? "Already a member? Sign in"
              : "Have an invitation? Join the league",
          )}
        </button>
        <p className="tiny">
          {tr("Forgot your password? Ask your organiser to reset your access.")}
        </p>
      </div>
    </div>
  );
}
function Banner({
  s,
  season,
  go,
}: {
  s: State;
  season: Season;
  go: (p: string, id?: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const e = bannerEvent(s, season.id);
  if (!e)
    return (
      <Empty
        title={tr("Your next race awaits")}
        body="Add the calendar in Admin studio to begin."
      />
    );
  const gpLocked = locked(e, "gp"),
    spLocked = e.sprintQualifying ? locked(e, "sprint") : false;
  const published = e.gp?.published;
  const status = published
    ? "Results published"
    : !cutoff(e, "gp")
      ? "Session times to be confirmed"
      : Date.now() >= Date.parse(e.race)
        ? "Race day"
        : gpLocked
          ? "Grand Prix picks locked"
          : Date.now() < Date.parse(e.practice)
            ? "Coming up"
            : "Race weekend";
  return (
    <section
      className="hero"
      style={{
        backgroundImage: `linear-gradient(90deg,rgba(7,13,25,.96) 0%,rgba(7,13,25,.76) 40%,rgba(7,13,25,.12) 100%),url("${e.photo || "/circuit-night.svg"}")`,
        backgroundPosition: `0 0,center ${e.focal}%`,
      }}
    >
      <div className="hero-top">
        <Pill>
          <span className="live-dot" />
          {tr(status)}
        </Pill>
        {tr(
          (e.hasSprint || e.sprintQualifying) && (
            <Pill>
              {tr("Sprint weekend")}
              {tr(spLocked ? "· Sprint locked" : "")}
            </Pill>
          ),
        )}
      </div>
      <div className="hero-copy">
        <div className="eyebrow">
          {tr(season.year)} {tr("WORLD CHAMPIONSHIP \u00B7 YOUR LEAGUE")}
        </div>
        <h2>
          {tr(e.name.replace(" Grand Prix", ""))}
          <br />
          <span>{tr("Grand Prix")}</span>
        </h2>
        <p>
          <MapPin size={15} />
          {e.circuit}
          {" · "}
          {e.country}
        </p>
        <div className="hero-bottom">
          <button
            className="primary"
            onClick={() => go(published ? "results" : "predict", e.id)}
          >
            {tr(
              published
                ? "Explore the results"
                : gpLocked
                  ? "View your picks"
                  : "Make your predictions",
            )}
            <ArrowUpRight size={18} />
          </button>
          <div>
            <small>
              {tr(gpLocked ? "RACE START" : "GP PREDICTIONS CLOSE")}
            </small>
            <strong>{tr(date(gpLocked ? e.race : cutoff(e, "gp")))}</strong>
          </div>
        </div>
      </div>

      <div className="banner-circuit-facts">
        <div className="facts">
          <div>
            <small>{tr("CIRCUIT")}</small>
            <strong>{e.circuit}</strong>
          </div>
          <div>
            <small>{tr("LENGTH")}</small>
            <strong>
              {tr(e.length ? `${e.length} km` : "To be confirmed")}
            </strong>
          </div>
          <div>
            <small>{tr("RACE LAPS")}</small>
            <strong>{tr(e.laps || "To be confirmed")}</strong>
          </div>
          <div>
            <small>{tr("FIRST PRACTICE")}</small>
            <strong>{tr(date(e.practice))}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
function Home({
  s,
  season,
  meId,
  go,
}: {
  s: State;
  season: Season;
  meId: string;
  go: (p: string, id?: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const rows = standings(s, season.id),
    me = rows.find((r) => r.id === meId),
    banner = bannerEvent(s, season.id);
  const next = s.events
    .filter(
      (e) =>
        e.seasonId === season.id &&
        !e.practiceRound &&
        Date.now() < Date.parse(cutoff(e, "gp")),
    )
    .sort((a, b) => Date.parse(a.qualifying) - Date.parse(b.qualifying))[0];
  const recent = s.events
    .filter(
      (e) => e.seasonId === season.id && !e.practiceRound && e.gp?.published,
    )
    .sort((a, b) => Date.parse(b.race) - Date.parse(a.race))[0];
  const submission = banner
    ? s.entries.find(
        (x) => x.eventId === banner.id && x.userId === meId && x.kind === "gp",
      )
    : undefined;
  return (
    <>
      <Heading
        eyebrow="WELCOME TO YOUR PADDOCK"
        title={tr(`Let’s race, ${s.users.find((u) => u.id === meId)?.name}.`)}
        description={tr(s.settings.welcome)}
      >
        <Pill>{season.name}</Pill>
      </Heading>
      <Banner s={s} season={season} go={go} />
      <div className="metrics">
        <Metric
          label={tr("YOUR POSITION")}
          value={me ? `P${me.rank}` : "—"}
          detail={`${rows.length} players on the grid`}
          icon={<Trophy />}
        />
        <Metric
          label={tr("SEASON POINTS")}
          value={String(me?.total || 0)}
          detail={`${rows[0]?.total - (me?.total || 0) || 0} points to the leader`}
          icon={<TrendingUp />}
        />
        <Metric
          label={tr("WEEKEND ENTRY")}
          value={
            submission?.submitted
              ? "Submitted"
              : submission
                ? "Draft"
                : "Not entered"
          }
          detail={
            banner
              ? `${banner.name.replace(" Grand Prix", "")} · Grand Prix`
              : "No event scheduled"
          }
          icon={<CheckCircle2 />}
        />
        <Metric
          label={tr("NEXT DEADLINE")}
          value={next ? remaining(cutoff(next, "gp")) : "—"}
          detail={next ? next.name : "All entries locked"}
          icon={<Clock />}
        />
      </div>
      <div className="two-col">
        <section className="panel">
          <div className="section-title">
            <h2>{tr("The championship fight")}</h2>
            <button className="text-button" onClick={() => go("leaderboard")}>
              {tr("Full standings")}
              <ChevronRight size={16} />
            </button>
          </div>
          <StandingsTable rows={rows.slice(0, 5)} meId={meId} />
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>{tr("From the paddock")}</h2>
            <Bell size={18} />
          </div>
          {tr(
            s.settings.announcements.slice(0, 3).map((a) => (
              <article className="announcement" key={a.id}>
                <small>
                  {tr(date(a.date, { day: "numeric", month: "short" }))}
                </small>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </article>
            )),
          )}
          {tr(
            !s.settings.announcements.length && (
              <p className="muted">
                {tr("Your organiser\u2019s updates will appear here.")}
              </p>
            ),
          )}
          {tr(
            recent && (
              <button
                className="recap-link"
                onClick={() => go("results", recent.id)}
              >
                <Flag size={20} />
                <span>
                  <strong>
                    {tr(recent.name.replace(" Grand Prix", ""))}
                    {tr(" recap")}
                  </strong>
                  <small>{tr("Your latest race story is ready.")}</small>
                </span>
                <ArrowUpRight size={20} />
              </button>
            ),
          )}
        </section>
      </div>
      <section className="practice-callout">
        <div>
          <Pill>{tr("NO PRESSURE. NO POINTS.")}</Pill>
          <h3>{tr("Warm up before lights out.")}</h3>
          <p>
            {tr(
              "Try the practice round. Your championship standings stay untouched.",
            )}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            const e = s.events.find(
              (x) => x.seasonId === season.id && x.practiceRound,
            );
            if (e) go("predict", e.id);
            else go("calendar");
          }}
        >
          {tr("Explore practice")}
          <ArrowUpRight size={17} />
        </button>
      </section>
    </>
  );
}
function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <div className="metric">
      <div>
        <small>{tr(label)}</small>
        <span>{tr(icon)}</span>
      </div>
      <strong>{tr(value)}</strong>
      <p>{tr(detail)}</p>
    </div>
  );
}
function StandingsTable({
  rows,
  meId,
}: {
  rows: ReturnType<typeof standings>;
  meId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{tr("POS")}</th>
            <th>{tr("PLAYER")}</th>
            <th>{tr("WINS")}</th>
            <th className="right">{tr("POINTS")}</th>
          </tr>
        </thead>
        <tbody>
          {tr(
            rows.map((r) => (
              <tr className={r.id === meId ? "your-row" : ""} key={r.id}>
                <td>
                  <span className={`rank rank-${r.rank}`}>
                    {tr(String(r.rank).padStart(2, "0"))}
                  </span>
                </td>
                <td>
                  <span className="player-cell">
                    <span className="mini-avatar">
                      {tr(r.name.slice(0, 2).toUpperCase())}
                    </span>
                    <strong>{r.name}</strong>
                    {tr(
                      r.id === meId && (
                        <span className="you-tag">{tr("YOU")}</span>
                      ),
                    )}
                  </span>
                </td>
                <td className="muted">{tr(r.wins)}</td>
                <td className="right points">{tr(r.total)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
function Predictions({
  s,
  season,
  meId,
  initialId,
  call,
}: {
  s: State;
  season: Season;
  meId: string;
  initialId: string;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id);
  const start =
    events.find((e) => e.id === initialId) ||
    events.find((e) => !locked(e, "gp") && !e.practiceRound) ||
    events.at(-1);
  const [id, setId] = useState(start?.id || ""),
    [kind, setKind] = useState<"gp" | "sprint">("gp");
  const e = events.find((x) => x.id === id);
  const entry = s.entries.find(
    (x) => x.eventId === id && x.kind === kind && x.userId === meId,
  );
  const [p, setP] = useState<Picks>(entry?.picks || emptyPicks());
  const [status, setStatus] = useState(
      entry?.submitted ? "Submitted" : "Draft",
    ),
    [saving, setSaving] = useState(false);
  const dirty = useRef(false),
    revision = useRef(0),
    saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    revision.current++;
    dirty.current = false;
    clearTimeout(saveTimer.current);
    const item = s.entries.find(
      (x) => x.eventId === id && x.kind === kind && x.userId === meId,
    );
    setP(item?.picks || emptyPicks(kind === "gp" ? 10 : 8));
    setStatus(item?.submitted ? "Submitted" : "Draft");
  }, [id, kind]);
  useEffect(() => {
    if (!dirty.current || !e || locked(e, kind)) return;
    const rev = ++revision.current;
    setStatus("Unsaved changes");
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await call(
          { action: "predict", eventId: id, kind, picks: p, submitted: false },
          true,
        );
        if (revision.current === rev) setStatus("Draft saved");
      } catch (err) {
        if (revision.current === rev)
          setStatus(`Save failed: ${(err as Error).message}`);
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => clearTimeout(saveTimer.current);
  }, [p]);
  if (!e)
    return (
      <Empty
        title={tr("No weekends yet")}
        body="Your organiser will add the race calendar."
      />
    );
  const predictionSeason = { ...season, drivers: predictionDrivers(s, season, e, kind) };
  const isLocked = locked(e, kind);
  const member = s.users
    .find((u) => u.id === meId)
    ?.seasonIds.includes(season.id);
  const change = (key: keyof Picks, value: any) => {
    dirty.current = true;
    setP({ ...p, [key]: value });
  };
  return (
    <>
      <Heading
        eyebrow="MAKE YOUR CALL"
        title={tr("Your predictions")}
        description={tr(
          "Pick the grid. Trust your instincts. Beat your friends.",
        )}
      />
      <div className="toolbar">
        <select
          value={id}
          onChange={(ev) => {
            setId(ev.target.value);
            setKind("gp");
          }}
          aria-label={tr("Prediction weekend")}
        >
          {tr(
            events.map((x) => (
              <option key={x.id} value={x.id}>
                {tr(x.practiceRound ? "Practice · " : "")}
                {x.name}
              </option>
            )),
          )}
        </select>
        <div className="segmented">
          <button
            className={kind === "gp" ? "selected" : ""}
            onClick={() => setKind("gp")}
          >
            {tr("Grand Prix")}
          </button>
          {tr(
            e.sprintQualifying && (
              <button
                className={kind === "sprint" ? "selected" : ""}
                onClick={() => setKind("sprint")}
              >
                {tr("Sprint")}
              </button>
            ),
          )}
        </div>
        <Pill tone={isLocked ? "" : "accent"}>
          <Clock size={13} />
          {tr(isLocked ? "Locked" : `Closes in ${remaining(cutoff(e, kind))}`)}
        </Pill>
      <PredictionExtras
        s={s}
        season={predictionSeason}
        meId={meId}
        event={e}
        kind={kind}
        onCopy={(picks) => {
          dirty.current = true;
          setP(picks);
          setStatus("Unsaved changes");
        }}
        disabled={isLocked || !member || saving}
      />
      </div>
      <ReplacementNotice event={e} season={season} kind={kind} picks={p} />
      <SubmissionOverview s={s} event={e} kind={kind} />
      {tr(
        e.practiceRound && (
          <div className="info-bar">
            {tr(
              "Practice round \u00B7 excluded from championship points and tie-breaks.",
            )}
          </div>
        ),
      )}
      {tr(
        !member && (
          <div className="info-bar">
            {tr(
              "You are not registered for this season. Ask your organiser before registration closes.",
            )}
          </div>
        ),
      )}
      <div className="prediction-layout">
        <section className="panel">
          <div className="section-title">
            <h2>{tr("Finishing order")}</h2>
            <Pill>
              {tr(kind === "gp" ? "10" : "8")}
              {tr("points available")}
            </Pill>
          </div>
          <p className="muted">
            {tr("One point for each driver in the exact position.")}
            {tr(
              kind === "gp"
                ? " A perfect top three adds five bonus points."
                : "",
            )}
          </p>
          <div className="prediction-grid">
            {tr(
              p.order.map((v, i) => (
                <div className="position-pick" key={i}>
                  <span className={i < 3 ? "podium-number" : ""}>
                    {tr(String(i + 1).padStart(2, "0"))}
                  </span>
                  <div>
                    <label>
                      {tr(
                        i < 3
                          ? ["WINNER", "SECOND PLACE", "THIRD PLACE"][i]
                          : `POSITION ${i + 1}`,
                      )}
                    </label>
                    <DriverSelect
                      value={v}
                      season={predictionSeason}
                      label={tr(`Position ${i + 1}`)}
                      disabled={isLocked || !member}
                      onChange={(value) => {
                        const order = [...p.order];
                        const other = order.indexOf(value);
                        if (value && other !== i && other >= 0)
                          order[other] = order[i];
                        order[i] = value;
                        change("order", order);
                      }}
                    />
                  </div>
                  <div className="reorder">
                    <button
                      disabled={isLocked || i === 0 || !member}
                      aria-label={tr(`Move position ${i + 1} up`)}
                      onClick={() => {
                        const order = [...p.order];
                        [order[i], order[i - 1]] = [order[i - 1], order[i]];
                        change("order", order);
                      }}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      disabled={isLocked || i === p.order.length - 1 || !member}
                      aria-label={tr(`Move position ${i + 1} down`)}
                      onClick={() => {
                        const order = [...p.order];
                        [order[i], order[i + 1]] = [order[i + 1], order[i]];
                        change("order", order);
                      }}
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                </div>
              )),
            )}
          </div>
        </section>
        <section className="panel bonus-panel">
          <div className="section-title">
            <h2>{tr("The extra edge")}</h2>
            <Target size={20} />
          </div>
          {tr(
            (
              [
                ["pole", "Pole position", kind === "gp" ? 3 : 2],
                ["fastest", "Fastest lap", kind === "gp" ? 2 : 1],
                ["retirement", "First retirement", kind === "gp" ? 2 : 1],
                ...(kind === "gp" ? [["dotd", "Driver of the Day", 1]] : []),
              ] as [keyof Picks, string, number][]
            ).map(([key, label, points]) => (
              <label key={key}>
                <span>
                  {tr(label)}
                  <small>
                    {tr("+")}
                    {tr(points)} {tr(points === 1 ? "point" : "points")}
                  </small>
                </span>
                <DriverSelect
                  value={p[key] as string}
                  season={predictionSeason}
                  none={key === "retirement"}
                  disabled={isLocked || !member}
                  label={tr(label)}
                  onChange={(v) => change(key, v)}
                />
              </label>
            )),
          )}
          <div className="prediction-note">
            <Shield size={18} />
            <p>
              {tr(
                "Your picks stay private until the deadline. All entries lock one hour before qualifying.",
              )}
            </p>
          </div>
          <div className="max-points">
            <small>{tr("PERFECT WEEKEND SCORE")}</small>
            <strong>
              {tr(kind === "gp" ? 23 : 12)}
              <span>{tr("pts")}</span>
            </strong>
          </div>
        </section>
      </div>
      <div className="submit-bar">
        <div>
          <CheckCircle2 size={18} />
          <span>
            {tr(
              saving
                ? "Saving…"
                : isLocked
                  ? entry?.submitted
                    ? "Submitted · locked"
                    : "No submitted entry"
                  : status,
            )}
            <small>
              {tr(
                isLocked
                  ? "Entries cannot be changed"
                  : `Deadline: ${date(cutoff(e, kind))}`,
              )}
            </small>
          </span>
        </div>
        <button
          className="primary"
          disabled={isLocked || !member || saving || !complete(p, kind)}
          onClick={async () => {
            clearTimeout(saveTimer.current);
            dirty.current = false;
            setSaving(true);
            revision.current++;
            try {
              await call({
                action: "predict",
                eventId: id,
                kind,
                picks: p,
                submitted: true,
              });
              setStatus("Submitted");
            } finally {
              setSaving(false);
            }
          }}
        >
          {tr(isLocked ? "Predictions locked" : "Submit predictions")}
          <Check size={17} />
        </button>
      </div>
    </>
  );
}
function Leaderboard({
  s,
  season,
  meId,
}: {
  s: State;
  season: Season;
  meId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const rows = standings(s, season.id);
  return (
    <>
      <Heading
        eyebrow="THE CHAMPIONSHIP"
        title={tr("Every point counts.")}
        description={tr(
          "Weekend wins and exact positions settle ties. If still equal, share the glory.",
        )}
      />
      <div className="podium-cards">
        {tr(
          rows.slice(0, 3).map((r) => (
            <div className={`podium-card place-${r.rank}`} key={r.id}>
              <span>
                {tr("POSITION")}
                {tr(r.rank)}
              </span>
              <Trophy size={25} />
              <h2>{r.name}</h2>
              <strong>
                {tr(r.total)}
                <small>{tr("points")}</small>
              </strong>
              <p>
                {tr(r.wins)}{" "}
                {tr("weekend wins \u00B7")}{" "}
                {tr(r.exact)}{" "}
                {tr("exact positions")}
              </p>
            </div>
          )),
        )}
      </div>
      <section className="panel">
        <StandingsTable rows={rows} meId={meId} />
      </section>
      <section className="panel">
        <h2>{tr("Where the points come from")}</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tr("PLAYER")}</th>
                <th>{tr("RACE POINTS")}</th>
                <th>{tr("CHAMPIONSHIP BONUS")}</th>
                <th>{tr("EXACT POSITIONS")}</th>
              </tr>
            </thead>
            <tbody>
              {tr(
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{tr(r.racePoints)}</td>
                    <td>{tr(r.bonus)}</td>
                    <td>{tr(r.exact)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function Calendar({
  s,
  season,
  go,
}: {
  s: State;
  season: Season;
  go: (p: string, id?: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <>
      <Heading
        eyebrow="YOUR SEASON, AT A GLANCE"
        title={tr("The race calendar")}
        description={tr(
          "All session times are shown in your device\u2019s local timezone.",
        )}
      />
      <CalendarDownload s={s} season={season} />
      <div className="calendar-list">
        {tr(
          s.events
            .filter((e) => e.seasonId === season.id)
            .sort((a, b) => Date.parse(a.practice) - Date.parse(b.practice))
            .map((e, i) => (
              <section className="calendar-card" key={e.id}>
                <div className="calendar-round">
                  <div className="round-number">
                    {tr(e.practiceRound ? "P" : String(i + 1).padStart(2, "0"))}
                  </div>
                  {e.sprintQualifying && <Pill>{tr("Sprint")}</Pill>}
                </div>
                <div className="calendar-info">
                  <div className="inline">
                    <h2>{e.name}</h2>
                    {tr(e.practiceRound && <Pill>{tr("Practice")}</Pill>)}
                  </div>
                  <p>
                    {e.circuit}
                    {" · "}
                    {e.country}
                  </p>
                  <div className="schedule">
                    <span>
                      {tr("FP1")}
                      <strong>{tr(date(e.practice))}</strong>
                    </span>
                    {tr(
                      e.sprintQualifying && (
                        <span>
                          {tr("Sprint qualifying")}
                          <strong>{tr(date(e.sprintQualifying))}</strong>
                        </span>
                      ),
                    )}
                    <span>
                      {tr("Qualifying")}
                      <strong>{tr(date(e.qualifying))}</strong>
                    </span>
                    <span>
                      {tr("Race")}
                      <strong>{tr(date(e.race))}</strong>
                    </span>
                  </div>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    go(e.gp?.published ? "results" : "predict", e.id)
                  }
                >
                  {tr(e.gp?.published ? "Results" : "Predictions")}
                  <ChevronRight size={16} />
                </button>
              </section>
            )),
        )}
      </div>
    </>
  );
}
function Results({
  s,
  season,
  meId,
  initialId,
}: {
  s: State;
  season: Season;
  meId: string;
  initialId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [shareOpen, setShareOpen] = useState(false);
  const events = s.events.filter((e) => e.seasonId === season.id);
  const [id, setId] = useState(
      initialId ||
        events.filter((e) => e.gp?.published).at(-1)?.id ||
        events[0]?.id,
    ),
    [kind, setKind] = useState<"gp" | "sprint">("gp");
  const e = events.find((e) => e.id === id);
  if (!e)
    return (
      <Empty
        title={tr("Results will land here")}
        body="Your organiser will publish scores after the first event."
      />
    );
  const rows = standings(s, season.id);
  const weekendRows = s.users
    .filter((u) => u.seasonIds.includes(season.id))
    .map((u) => ({
      name: u.name,
      id: u.id,
      total: ["gp", "sprint"].reduce((total, k) => {
        const entry = s.entries.find(
          (x) =>
            x.eventId === e.id &&
            x.kind === k &&
            x.userId === u.id &&
            x.submitted,
        );
        return (
          total +
          (entry ? score(entry.picks, e[k as "gp"], k as "gp").total : 0)
        );
      }, 0),
      exact: ["gp", "sprint"].reduce((total, k) => {
        const entry = s.entries.find(
          (x) =>
            x.eventId === e.id &&
            x.kind === k &&
            x.userId === u.id &&
            x.submitted,
        );
        return (
          total +
          (entry ? score(entry.picks, e[k as "gp"], k as "gp").exact : 0)
        );
      }, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const entry = s.entries.find(
      (x) =>
        x.eventId === e.id &&
        x.userId === meId &&
        x.kind === kind &&
        x.submitted,
    ),
    r = e[kind];
  const sc = score(entry?.picks || emptyPicks(kind === "gp" ? 10 : 8), r, kind);
  const before = structuredClone(s);
  before.events = before.events.filter(
    (x) => x.id !== e.id && Date.parse(x.race) < Date.parse(e.race),
  );
  const prior = standings(before, season.id);
  const moves = rows
    .map((x) => ({
      name: x.name,
      move: (prior.find((p) => p.id === x.id)?.rank || x.rank) - x.rank,
    }))
    .sort((a, b) => b.move - a.move);
  const podiums = s.entries.filter(
    (x) =>
      x.eventId === e.id &&
      x.kind === "gp" &&
      x.submitted &&
      score(x.picks, e.gp, "gp").details.some(
        (d) => d.label === "Exact podium bonus" && d.points === 5,
      ),
  ).length;
  return (
    <>
      <Heading
        eyebrow="THE WEEKEND STORY"
        title={tr("Results & recap")}
        description={tr("A clear explanation of every point earned.")}
      >
        {tr(
          e.gp?.published && (
            <button className="primary" onClick={() => setShareOpen(true)}>
              <Download size={17} />
              {tr("Share results")}
            </button>
          ),
        )}
      </Heading>
      <Provenance result={r} />
      {tr(
        shareOpen && (
          <ShareCard
            s={s}
            season={season}
            event={e}
            meId={meId}
            onClose={() => setShareOpen(false)}
          />
        ),
      )}
      <div className="toolbar">
        <select
          value={id}
          onChange={(ev) => {
            setId(ev.target.value);
            setKind("gp");
          }}
          aria-label={tr("Results weekend")}
        >
          {tr(
            events.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            )),
          )}
        </select>
        <div className="segmented">
          <button
            className={kind === "gp" ? "selected" : ""}
            onClick={() => setKind("gp")}
          >
            {tr("Grand Prix")}
          </button>
          {tr(
            e.sprintQualifying && (
              <button
                className={kind === "sprint" ? "selected" : ""}
                onClick={() => setKind("sprint")}
              >
                {tr("Sprint")}
              </button>
            ),
          )}
        </div>
        <Pill>{tr(r?.published ? "Published" : "Pending confirmation")}</Pill>
      </div>
      {tr(
        e.practiceRound && (
          <div className="info-bar">
            {tr("Practice scores only \u00B7 excluded from season standings.")}
          </div>
        ),
      )}
      {tr(
        e.gp?.published && (
          <div className="metrics">
            <Metric
              label={tr("WEEKEND WINNER")}
              value={
                weekendRows
                  .filter(
                    (x) => x.total === weekendRows[0]?.total && x.total > 0,
                  )
                  .map((x) => x.name)
                  .join(" & ") || "No winner"
              }
              detail={`${weekendRows[0]?.total || 0} points`}
              icon={<Trophy />}
            />
            <Metric
              label={tr("BIGGEST CLIMBER")}
              value={
                moves[0]?.move > 0
                  ? moves
                      .filter((x) => x.move === moves[0].move)
                      .map((x) => x.name)
                      .join(" & ")
                  : "No movement"
              }
              detail={
                moves[0]?.move > 0
                  ? `Up ${moves[0].move} positions`
                  : "Standings unchanged"
              }
              icon={<TrendingUp />}
            />
            <Metric
              label={tr("EXACT POSITION LEADER")}
              value={
                weekendRows
                  .filter(
                    (x) =>
                      x.exact ===
                        Math.max(...weekendRows.map((x) => x.exact)) &&
                      x.exact > 0,
                  )
                  .map((x) => x.name)
                  .join(" & ") || "None"
              }
              detail="Across this weekend"
              icon={<Target />}
            />
            <Metric
              label={tr("PERFECT PODIUM PICKS")}
              value={String(podiums)}
              detail="Players earning the five-point bonus"
              icon={<Flag />}
            />
          </div>
        ),
      )}
      <div className="two-col">
        <section className="panel">
          <div className="section-title">
            <h2>{tr("Your points breakdown")}</h2>
            <strong className="accent score-large">
              {tr(sc.total)}
              <small>{tr("pts")}</small>
            </strong>
          </div>
          {tr(
            !entry && (
              <p className="muted">
                {tr("No submitted prediction for this session.")}
              </p>
            ),
          )}
          <div className="score-list">
            {tr(
              sc.details.map((d) => (
                <div key={d.label}>
                  <span>{tr(d.label)}</span>
                  <Pill
                    fontGroup={
                      d.status === "pending" || d.status === "void"
                        ? "labels"
                        : "numbers"
                    }
                    tone={d.status === "correct" ? "accent" : ""}
                  >
                    {tr(
                      d.status === "pending"
                        ? "Pending"
                        : d.status === "void"
                          ? "Void"
                          : `${d.points} / ${d.possible}`,
                    )}
                  </Pill>
                </div>
              )),
            )}
          </div>
        </section>
        <section className="panel">
          <h2>{tr("Confirmed outcome")}</h2>
          {tr(
            !r?.published ? (
              <Empty
                title={tr("Awaiting results")}
                body="Missing data stays pending until your organiser confirms it."
              />
            ) : (
              <>
                <ol className="result-order">
                  {tr(
                    r.order.map((id, i) => (
                      <li key={i}>
                        <span>{tr(i + 1)}</span>
                        {tr(driverName(season, id))}
                      </li>
                    )),
                  )}
                </ol>
                {tr(
                  [
                    ["Pole", r.pole],
                    ["Fastest lap", r.fastest],
                    [
                      "First retirement",
                      r.retirements
                        .map((x) => driverName(season, x))
                        .join(" / "),
                    ],
                    ...(kind === "gp" ? [["Driver of the Day", r.dotd]] : []),
                  ].map(([label, id]) => (
                    <div className="result-extra" key={label}>
                      <span>{tr(label)}</span>
                      <strong>
                        {tr(
                          label === "First retirement"
                            ? id
                            : driverName(season, id),
                        )}
                      </strong>
                    </div>
                  )),
                )}
              </>
            ),
          )}
        </section>
      </div>
      <section className="panel">
        <h2>{tr("Weekend standings")}</h2>
        <table>
          <thead>
            <tr>
              <th>{tr("PLAYER")}</th>
              <th className="right">{tr("POINTS")}</th>
            </tr>
          </thead>
          <tbody>
            {tr(
              weekendRows.map((x) => (
                <tr className={x.id === meId ? "your-row" : ""} key={x.id}>
                  <td>{x.name}</td>
                  <td className="right points">{tr(x.total)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
function Compare({
  s,
  season,
  meId,
}: {
  s: State;
  season: Season;
  meId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id),
    [id, setId] = useState(
      events.find((e) => locked(e, "gp"))?.id || events[0]?.id,
    ),
    [kind, setKind] = useState<"gp" | "sprint">("gp"),
    [rival, setRival] = useState(
      s.users.find((u) => u.id !== meId && u.seasonIds.includes(season.id))
        ?.id || "",
    );
  const e = events.find((e) => e.id === id);
  if (!e)
    return (
      <Empty
        title={tr("Find your rival")}
        body="Comparisons appear once your league has a calendar."
      />
    );
  const mine = s.entries.find(
      (x) =>
        x.userId === meId && x.eventId === id && x.kind === kind && x.submitted,
    ),
    other = s.entries.find(
      (x) =>
        x.userId === rival &&
        x.eventId === id &&
        x.kind === kind &&
        x.submitted,
    );
  const labels = [
    "pole",
    "fastest",
    "retirement",
    ...(kind === "gp" ? ["dotd"] : []),
  ];
  return (
    <>
      <Heading
        eyebrow="FRIENDS UNTIL LIGHTS OUT"
        title={tr("Head to head")}
        description={tr(
          "See where your predictions agree\u2014and where the battle will be won.",
        )}
      />
      <div className="toolbar">
        <select
          value={id}
          onChange={(ev) => {
            setId(ev.target.value);
            setKind("gp");
          }}
          aria-label={tr("Comparison weekend")}
        >
          {tr(
            events.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            )),
          )}
        </select>
        <select
          value={rival}
          onChange={(e) => setRival(e.target.value)}
          aria-label={tr("Select rival")}
        >
          {tr(
            s.users
              .filter((u) => u.id !== meId && u.seasonIds.includes(season.id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              )),
          )}
        </select>
        <div className="segmented">
          <button
            className={kind === "gp" ? "selected" : ""}
            onClick={() => setKind("gp")}
          >
            {tr("GP")}
          </button>
          {tr(
            e.sprintQualifying && (
              <button
                className={kind === "sprint" ? "selected" : ""}
                onClick={() => setKind("sprint")}
              >
                {tr("Sprint")}
              </button>
            ),
          )}
        </div>
      </div>
      {tr(
        !locked(e, kind) ? (
          <Empty
            title={tr("The grid is still secret")}
            body={tr(
              `Everyone’s submitted picks become visible after ${date(cutoff(e, kind))}.`,
            )}
          />
        ) : (
          <section className="panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{tr("PREDICTION")}</th>
                    <th>{tr("YOU")}</th>
                    <th>
                      {tr(
                        s.users.find((u) => u.id === rival)?.name.toUpperCase(),
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tr(
                    Array.from({ length: kind === "gp" ? 10 : 8 }, (_, i) => (
                      <tr
                        key={i}
                        className={
                          mine?.picks.order[i] !== other?.picks.order[i]
                            ? "different"
                            : ""
                        }
                      >
                        <td>
                          {tr("P")}
                          {tr(i + 1)}
                        </td>
                        <td>
                          {tr(driverName(season, mine?.picks.order[i] || ""))}
                        </td>
                        <td>
                          {tr(driverName(season, other?.picks.order[i] || ""))}
                        </td>
                      </tr>
                    )),
                  )}
                  {tr(
                    labels.map((k) => (
                      <tr
                        key={k}
                        className={
                          mine?.picks[k as "pole"] !== other?.picks[k as "pole"]
                            ? "different"
                            : ""
                        }
                      >
                        <td>
                          {tr(
                            (
                              {
                                pole: "Pole position",
                                fastest: "Fastest lap",
                                retirement: "First retirement",
                                dotd: "Driver of the Day",
                              } as any
                            )[k],
                          )}
                        </td>
                        <td>
                          {tr(
                            driverName(season, mine?.picks[k as "pole"] || ""),
                          )}
                        </td>
                        <td>
                          {tr(
                            driverName(season, other?.picks[k as "pole"] || ""),
                          )}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            <p className="tiny">
              {tr(
                "Highlighted rows are different picks. A dash means no submitted selection.",
              )}
            </p>
            <details>
              <summary>{tr("Compare the whole grid")}</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("PLAYER")}</th>
                      {tr(
                        Array.from(
                          { length: kind === "gp" ? 10 : 8 },
                          (_, i) => (
                            <th key={i}>
                              {tr("P")}
                              {tr(i + 1)}
                            </th>
                          ),
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tr(
                      s.users
                        .filter((u) => u.seasonIds.includes(season.id))
                        .map((u) => {
                          const p = s.entries.find(
                            (x) =>
                              x.userId === u.id &&
                              x.eventId === id &&
                              x.kind === kind &&
                              x.submitted,
                          );
                          return (
                            <tr key={u.id}>
                              <td>{u.name}</td>
                              {tr(
                                Array.from(
                                  { length: kind === "gp" ? 10 : 8 },
                                  (_, i) => (
                                    <td key={i}>
                                      {tr(p?.picks.order[i] || "—")}
                                    </td>
                                  ),
                                ),
                              )}
                            </tr>
                          );
                        }),
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        ),
      )}
    </>
  );
}
function Champions({
  s,
  season,
  meId,
  call,
}: {
  s: State;
  season: Season;
  meId: string;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const mine = s.championPicks.find(
    (p) => p.userId === meId && p.seasonId === season.id,
  );
  const [driver, setDriver] = useState(mine?.driver || ""),
    [constructor, setConstructor] = useState(mine?.constructor || "");
  const closed = Date.now() >= Date.parse(season.cutoff);
  return (
    <>
      <Heading
        eyebrow="THE LONG GAME"
        title={tr("Pick your champions")}
        description={tr("Two predictions. A whole season of anticipation.")}
      />
      <div className="info-bar">
        <Clock size={17} />
        {tr(
          closed
            ? "Season picks are locked."
            : `Entries close ${date(season.cutoff)}. Your picks stay private until then.`,
        )}
      </div>
      <div className="two-col">
        <section className="panel champion-card">
          <Trophy size={40} />
          <Pill>{tr("15 POINTS")}</Pill>
          <h2>{tr("Drivers\u2019 champion")}</h2>
          <p>{tr("Who will own the season?")}</p>
          <DriverSelect
            season={season}
            value={driver}
            onChange={setDriver}
            disabled={closed}
          />
        </section>
        <section className="panel champion-card">
          <Flag size={40} />
          <Pill>{tr("10 POINTS")}</Pill>
          <h2>{tr("Constructors\u2019 champion")}</h2>
          <p>{tr("Which team will come out on top?")}</p>
          <select
            disabled={closed}
            value={constructor}
            onChange={(e) => setConstructor(e.target.value)}
            aria-label={tr("Constructor champion")}
          >
            <option value="">{tr("Choose a constructor")}</option>
            {tr(
              season.constructors.map((c) => <option key={c}>{tr(c)}</option>),
            )}
          </select>
        </section>
      </div>
      <button
        className="primary"
        disabled={closed || !driver || !constructor}
        onClick={() =>
          call({
            action: "championPick",
            seasonId: season.id,
            driver,
            constructor,
          })
        }
      >
        {tr("Save season picks")}
        <Check size={17} />
      </button>
      {tr(
        closed && (
          <section className="panel">
            <h2>{tr("The league\u2019s title contenders")}</h2>
            <table>
              <thead>
                <tr>
                  <th>{tr("PLAYER")}</th>
                  <th>{tr("DRIVER")}</th>
                  <th>{tr("CONSTRUCTOR")}</th>
                </tr>
              </thead>
              <tbody>
                {tr(
                  s.users
                    .filter((u) => u.seasonIds.includes(season.id))
                    .map((u) => {
                      const p = s.championPicks.find(
                        (x) => x.userId === u.id && x.seasonId === season.id,
                      );
                      return (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{tr(driverName(season, p?.driver || ""))}</td>
                          <td>{tr(p?.constructor || "—")}</td>
                        </tr>
                      );
                    }),
                )}
              </tbody>
            </table>
            <p className="tiny">
              {tr(
                "Championship points are awarded after final official standings are confirmed.",
              )}
            </p>
          </section>
        ),
      )}
    </>
  );
}
function Stats({
  s,
  season,
  meId,
}: {
  s: State;
  season: Season;
  meId: string;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const me = standings(s, season.id).find((r) => r.id === meId);
  const weeks = me?.weekends || [];
  const best = Math.max(0, ...weeks.map((w) => w.total));
  return (
    <>
      <Heading
        eyebrow="YOUR SEASON STORY"
        title={tr("Progress through the grid")}
      />
      <Awards s={s} season={season} />
      <div className="metrics">
        <Metric
          label={tr("TOTAL POINTS")}
          value={String(me?.total || 0)}
          detail="Includes confirmed title bonuses"
          icon={<Trophy />}
        />
        <Metric
          label={tr("EXACT POSITIONS")}
          value={String(me?.exact || 0)}
          detail="GP and Sprint positions"
          icon={<Target />}
        />
        <Metric
          label={tr("WEEKEND WINS")}
          value={String(me?.wins || 0)}
          detail="Shared wins count too"
          icon={<Flag />}
        />
        <Metric
          label={tr("BEST WEEKEND")}
          value={String(best)}
          detail="Your highest points haul"
          icon={<TrendingUp />}
        />
      </div>
      <section className="panel">
        <h2>{tr("Your points by weekend")}</h2>
        <div className="bar-chart">
          {tr(
            weeks.map((w) => (
              <div className="bar-row" key={w.eventId}>
                <span>
                  {tr(
                    s.events
                      .find((e) => e.id === w.eventId)
                      ?.name.replace(" Grand Prix", ""),
                  )}
                </span>
                <div>
                  <i
                    style={{ width: `${best ? (w.total / best) * 100 : 0}%` }}
                  />
                </div>
                <strong>{tr(w.total)}</strong>
              </div>
            )),
          )}
        </div>
      </section>
      <section className="panel">
        <h2>{tr("Prediction history")}</h2>
        <table>
          <thead>
            <tr>
              <th>{tr("EVENT")}</th>
              <th>{tr("ENTRY")}</th>
              <th>{tr("STATUS")}</th>
              <th>{tr("POINTS")}</th>
            </tr>
          </thead>
          <tbody>
            {tr(
              s.entries
                .filter(
                  (x) =>
                    x.userId === meId &&
                    s.events.some(
                      (e) => e.id === x.eventId && e.seasonId === season.id,
                    ),
                )
                .map((x) => {
                  const e = s.events.find((e) => e.id === x.eventId)!;
                  return (
                    <tr key={`${x.eventId}-${x.kind}`}>
                      <td>
                        {e.name}
                        {tr(e.practiceRound ? " · Practice" : "")}
                      </td>
                      <td>{tr(x.kind.toUpperCase())}</td>
                      <td>{tr(x.submitted ? "Submitted" : "Draft")}</td>
                      <td>{tr(score(x.picks, e[x.kind], x.kind).total)}</td>
                    </tr>
                  );
                }),
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
function Rules({ s, season }: { s: State; season: Season }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  return (
    <>
      <Heading
        eyebrow="SAME GRID. SAME RULES."
        title={tr("Your league")}
        description={tr(s.settings.welcome)}
      />
      <div className="two-col">
        <section className="panel">
          <h2>{tr("The points system")}</h2>
          <table>
            <thead>
              <tr>
                <th>{tr("PREDICTION")}</th>
                <th>{tr("GP")}</th>
                <th>{tr("SPRINT")}</th>
              </tr>
            </thead>
            <tbody>
              {tr(
                [
                  ["Exact finishing position", "1 × 10", "1 × 8"],
                  ["Pole position", "3", "2"],
                  ["Exact ordered podium bonus", "5", "—"],
                  ["Fastest lap", "2", "1"],
                  ["First retirement / none", "2", "1"],
                  ["Official Driver of the Day", "1", "—"],
                  ["Maximum", "23", "12"],
                  ["Driver champion", "15", "—"],
                  ["Constructor champion", "10", "—"],
                ].map((r) => (
                  <tr key={r[0]}>
                    {tr(r.map((x, i) => <td key={i}>{tr(x)}</td>))}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>{tr("Who\u2019s on the grid")}</h2>
          {tr(
            s.users
              .filter((u) => u.seasonIds.includes(season.id))
              .map((u) => (
                <div className="member-row" key={u.id}>
                  <span className="mini-avatar">
                    {tr(u.name.slice(0, 2).toUpperCase())}
                  </span>
                  <strong>{u.name}</strong>
                  {tr(u.role === "admin" && <Pill>{tr("Organiser")}</Pill>)}
                </div>
              )),
          )}
          <p className="tiny">
            {tr("Registration closes")}
            {tr(date(season.cutoff))}
            {tr(". No new players can join after that deadline.")}
          </p>
        </section>
      </div>
      <section className="panel rules-prose">
        <h2>{tr("Fair play, without the guesswork")}</h2>
        <h3>{tr("Deadlines and privacy")}</h3>
        <p>
          {tr(
            "Each prediction set locks one hour before its own qualifying session. Drafts do not score: submit your completed entry. Submitted picks become visible after locking. Season picks close one hour before the opening weekend\u2019s first qualifying session. Player registration is opened and closed manually by your organiser.",
          )}
        </p>
        <h3>{tr("Equal points")}</h3>
        <p>
          {tr(
            "Most weekend wins, then most exact finishing positions, then a shared place. A weekend combines Grand Prix and Sprint prediction points. Tied leaders each earn a win; all-zero or void weekends award none. Shared positions use 1, 1, 3 ranking.",
          )}
        </p>
        <h3>{tr("First retirement")}</h3>
        <p>
          {tr(
            "The first driver permanently out after the race starts. Non-starters, temporary stops and later disqualifications do not count. If the order cannot be established, joint first retirements are accepted. Correctly predicting no retirements earns two points in a race that takes place.",
          )}
        </p>
        <h3>{tr("Disrupted sessions")}</h3>
        <p>
          {tr(
            "Official qualifying schedule changes move deadlines only while entries are still open. Locked entries never reopen for delays or restarts. Race-only schedule changes do not change prediction deadlines. An unexpectedly early session start triggers an immediate lock.",
          )}
        </p>
        <h3>{tr("Cancelled events and corrections")}</h3>
        <p>
          {tr(
            "Only categories with valid results score. Completed qualifying can score pole even when a race is cancelled; grid P1 does not replace a missing qualifying result. Shortened races with an official classification score normal league points. No official Driver of the Day means that category is void. Missing imported data remains pending. Corrected results recalculate everyone\u2019s points.",
          )}
        </p>
      </section>
    </>
  );
}
function Archive({
  s,
  onSelect,
  call,
  isAdmin,
}: {
  s: State;
  onSelect: (id: string) => void;
  call: Call;
  isAdmin: boolean;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [purging, setPurging] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Heading
        eyebrow="THE LEAGUE LEGACY"
        title={tr("Season archive")}
        description={tr("The title fights and bragging rights live on.")}
      />
      <div className="archive-grid">
        {tr(
          s.seasons.map((season) => {
            const rows = standings(s, season.id);
            return (
              <section className="panel archive-item" key={season.id}>
              <button
                className="archive-card"
                onClick={() => onSelect(season.id)}
              >
                <CalendarDays />
                <span>
                  {tr(season.archived ? "ARCHIVED" : "ACTIVE SEASON")}
                </span>
                <h2>{season.name}</h2>
                <p>
                  {tr(season.archived ? "Champion" : "Current leader")}
                  {tr(":")}
                  {tr(" ")}
                  {tr(
                    rows
                      .filter((x) => x.rank === 1)
                      .map((x) => x.name)
                      .join(" & ") || "To be decided",
                  )}
                </p>
                <strong>
                  {tr(rows[0]?.total || 0)}{" "}
                  {tr("points")}
                  <ArrowUpRight size={18} />
                </strong>
              </button>
              {isAdmin && <>
                <div className="button-row archive-actions">
                  <button className="secondary" disabled={busy} onClick={() => call({ action: "archive", seasonId: season.id, archived: !season.archived })}>
                    {tr(season.archived ? "Reopen season" : "Archive season")}
                  </button>
                  <button className="secondary" disabled={busy} onClick={() => { setPurging(season.id); setConfirmation(""); setError(""); }}>{tr("Purge")}</button>
                </div>
                {purging === season.id && <div className="season-purge">
                  <p className="muted">{tr("Remove this season and its races, predictions, results and receipts. Accounts, settings and banners are kept. An encrypted backup is created first.")}</p>
                  <label>{tr("Type the season name to confirm")}
                    <input value={confirmation} disabled={busy} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" />
                  </label>
                  <div className="button-row">
                    <button className="secondary" disabled={busy || confirmation !== season.name} onClick={async () => {
                      setBusy(true); setError("");
                      try { await call({ action: "purgeSeason", seasonId: season.id, confirmation }); setPurging(null); setConfirmation(""); }
                      catch (e) { setError((e as Error).message); }
                      finally { setBusy(false); }
                    }}>{tr(busy ? "Saving…" : "Confirm purge")}</button>
                    <button className="secondary" disabled={busy} onClick={() => setPurging(null)}>{tr("Cancel")}</button>
                  </div>
                  {error && <p className="form-error" role="alert">{tr(error)}</p>}
                </div>}
              </>}
              </section>
            );
          }),
        )}
      </div>
    </>
  );
}
function Profile({ me, call }: { me: State["users"][0]; call: Call }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [form, setForm] = useState({
    name: me.name,
    timezone: me.timezone || "Europe/Amsterdam",
    reminders: me.reminders,
    password: "",
    currentPassword: "",
  });
  return (
    <>
      <Heading
        title={tr("Your profile")}
        description={tr("Your identity in the paddock.")}
      />
      <InstallApp />
      <PasskeyPanel me={me} call={call} />
      <section className="panel narrow">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            call({ action: "profile", ...form });
          }}
        >
          <label>
            {tr("Display name")}
            <input
              value={form.name}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            {tr("Email")}
            <input value={me.email || ""} disabled />
          </label>
          <label>
            {tr("Timezone")}
            <input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.reminders}
              onChange={(e) =>
                setForm({ ...form, reminders: e.target.checked })
              }
            />
            {tr("Opt in to deadline reminders")}
          </label>
          <p className="tiny">
            {tr(
              "Email delivery will require the organiser\u2019s mail service configuration.",
            )}
          </p>
          <label>
            {tr("Current password")}
            <input
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) =>
                setForm({ ...form, currentPassword: e.target.value })
              }
            />
          </label>
          <label>
            {tr("New password (optional)")}
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <button className="primary">
            {tr("Save profile")}
            <Save size={17} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => call({ action: "logout" })}
        >
          <LogOut size={16} />
          {tr("Sign out")}
        </button>
      </section>
    </>
  );
}
function Admin({
  s,
  season,
  meId,
  call,
  go,
  onPreview,
}: {
  s: State;
  season?: Season;
  meId: string;
  call: Call;
  go: (p: string, id?: string) => void;
  onPreview: () => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [tab, setTab] = useState("overview");
  const tabs = [
    ["overview", "Overview"],
    ["appearance", "Appearance"],
    ["banners", "Banners"],
    ["branding", "Branding"],
    ["events", "Race weekends"],
    ["results", "Results & scoring"],
    ["members", "Members"],
    ["seasons", "Seasons & lineup"],
    ["announcements", "Announcements"],
    ["data", "Data & history"],
  ];
  const groups = [
    { id: "overview", label: "Overview", tabs: ["overview"] },
    { id: "racing", label: "Racing", tabs: ["events", "results", "seasons"] },
    { id: "players", label: "Players", tabs: ["members", "announcements"] },
    { id: "settings", label: "Settings", tabs: ["banners", "branding", "appearance", "data"] },
  ];
  const group = groups.find(g => g.tabs.includes(tab))!;
  const events = s.events.filter((e) => e.seasonId === season?.id);
  const unresolved = events.filter(
    (e) => Date.parse(e.race) < Date.now() && !e.gp?.published,
  );
  return (
    <>
      <Heading
        eyebrow="YOUR LEAGUE, UNDER CONTROL"
        title={tr("Admin studio")}
        description={tr("More racing. Less spreadsheet work.")}
      >
        <button className="secondary" onClick={onPreview}>
          <Eye size={16} />
          {tr("Preview as player")}
        </button>
      </Heading>
      {tab === "overview" && <UpdateNotice />}
      <nav className="admin-navigation" aria-label={tr("Admin navigation")}>
        <div className="admin-tabs">
          {groups.map(g => <button key={g.id} className={group.id === g.id ? "selected" : ""} onClick={() => setTab(g.tabs[0])}>{tr(g.label)}</button>)}
        </div>
        {group.tabs.length > 1 && <div className="admin-tabs admin-subtabs">
          {tabs.filter(([id]) => group.tabs.includes(id)).map(([id, label]) => <button key={id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}>{tr(label)}</button>)}
        </div>}
      </nav>
      {tr(
        tab === "overview" && (
          <>
            <div className="metrics">
              <Metric
                label={tr("LEAGUE MEMBERS")}
                value={String(s.users.filter((x) => x.active).length)}
                detail="Active accounts"
                icon={<Users />}
              />
              <Metric
                label={tr("RACE WEEKENDS")}
                value={String(events.filter((x) => !x.practiceRound).length)}
                detail={season?.name || "No season yet"}
                icon={<CalendarDays />}
              />
              <Metric
                label={tr("AWAITING RESULTS")}
                value={String(unresolved.length)}
                detail="Review and publish scores"
                icon={<Flag />}
              />
              <Metric
                label={tr("REGISTRATION")}
                value={
                  season && registrationOpen(season)
                    ? "Open"
                    : "Closed"
                }
                detail={season ? "Controlled manually in Members" : "Create a season first"}
                icon={<Shield />}
              />
            </div>
            <section className="panel">
              <h2>{tr("Needs your attention")}</h2>
              {tr(
                unresolved.length ? (
                  unresolved.map((e) => (
                    <div className="attention-row" key={e.id}>
                      <span>
                        <strong>{e.name}</strong>
                        <small>
                          {tr(
                            e.practiceRound
                              ? "Practice round"
                              : "Race completed · results not published",
                          )}
                        </small>
                      </span>
                      <button
                        className="secondary"
                        onClick={() => setTab("results")}
                      >
                        {tr("Review results")}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    {tr(
                      "You\u2019re up to date. Upcoming weekends appear below.",
                    )}
                  </p>
                ),
              )}
            </section>
            <section className="panel">
              <h2>{tr("Entry tracker")}</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("EVENT")}</th>
                      <th>{tr("GP SUBMISSIONS")}</th>
                      <th>{tr("SPRINT SUBMISSIONS")}</th>
                      <th>{tr("DEADLINE")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tr(
                      events
                        .filter((e) => !e.practiceRound)
                        .map((e) => (
                          <tr key={e.id}>
                            <td>{e.name}</td>
                            <td>
                              {tr(
                                s.entries.filter(
                                  (p) =>
                                    p.eventId === e.id &&
                                    p.kind === "gp" &&
                                    p.submitted,
                                ).length,
                              )}
                              {tr(" ")}
                              {tr("/")}
                              {tr(" ")}
                              {tr(
                                s.users.filter((u) =>
                                  u.seasonIds.includes(e.seasonId),
                                ).length,
                              )}
                            </td>
                            <td>
                              {tr(
                                e.sprintQualifying
                                  ? s.entries.filter(
                                      (p) =>
                                        p.eventId === e.id &&
                                        p.kind === "sprint" &&
                                        p.submitted,
                                    ).length
                                  : "—",
                              )}
                            </td>
                            <td>{tr(date(cutoff(e, "gp")))}</td>
                          </tr>
                        )),
                    )}
                  </tbody>
                </table>
              </div>
              <p className="tiny">
                {tr(
                  "Only your own drafts are visible. Other players\u2019 picks remain private until locking, including for organisers.",
                )}
              </p>
            </section>
          </>
        ),
      )}
      {tab === "overview" && <BackupPanel call={call} compact />}
      {tab === "overview" && season && (
        <>
          <LaunchChecklist s={s} season={season} />

        </>
      )}
      {tr(tab === "appearance" && <Appearance s={s} call={call} />)}
      {tr(tab === "banners" && <Banners s={s} season={season} call={call} />)}
      {tr(tab === "branding" && <Branding s={s} call={call} />)}
      {tr(
        tab === "events" &&
          (season ? (
            <EventAdmin s={s} season={season} call={call} />
          ) : (
            <Empty
              title={tr("Create a season first")}
              body="Open Seasons & lineup to get started."
            />
          )),
      )}
      {tab === "events" && season && <ReplacementAdmin s={s} season={season} call={call} />}
      {tr(
        tab === "results" &&
          (season ? (
            <ResultAdmin s={s} season={season} call={call} />
          ) : (
            <Empty
              title={tr("No season yet")}
              body="Create a season and calendar first."
            />
          )),
      )}
      {tr(
        tab === "members" && (
          <Members s={s} season={season} meId={meId} call={call} />
        ),
      )}
      {tr(
        tab === "seasons" && <SeasonAdmin s={s} season={season} call={call} />,
      )}
      {tr(tab === "announcements" && <Announcements s={s} call={call} />)}
      {tr(
        tab === "data" && (
          <>
            <BackupPanel call={call} />
            <section className="panel">
              <h2>{tr("Your league data")}</h2>
              <p className="muted">
                {tr(
                  "Export predictions, results, seasons and standings. Passwords and invitation secrets are excluded.",
                )}
              </p>
              <button
                className="primary"
                onClick={async () => {
                  const result = await call({ action: "export" }, true);
                  download(
                    `apex-league-${new Date().toISOString().slice(0, 10)}.json`,
                    result.export,
                  );
                }}
              >
                <Download size={17} />
                {tr("Export league JSON")}
              </button>
              <p className="tiny">
                {tr("Encrypted, restorable backups are available above.")}
              </p>
            </section>
            <section className="panel">
              <h2>{tr("Change history")}</h2>
              <div className="audit-list">
                {tr(
                  s.audit.map((a) => (
                    <div key={a.id}>
                      <span>
                        <strong>{tr(a.action)}</strong>
                        <small>{tr(a.actor)}</small>
                      </span>
                      <time>{tr(date(a.date))}</time>
                    </div>
                  )),
                )}
              </div>
              {tr(
                !s.audit.length && (
                  <p className="muted">
                    {tr("Admin changes will be recorded here.")}
                  </p>
                ),
              )}
            </section>
          </>
        ),
      )}
    </>
  );
}
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function HexEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [input, setInput] = useState(value);
  useEffect(() => setInput(value), [value]);
  return (
    <input
      aria-label={tr(label)}
      value={input}
      maxLength={7}
      onChange={(e) => {
        setInput(e.target.value);
        if (/^#[\da-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
      }}
      onBlur={() => {
        if (!/^#[\da-f]{6}$/i.test(input)) setInput(value);
      }}
    />
  );
}
function Appearance({ s, call }: { s: State; call: Call }) {
  return <TypographyEditor s={s} call={call} />;
}
async function imageFile(file: File): Promise<string> {
  if (file.size > 2000000)
    throw new Error("Choose an image smaller than 2 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP image.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function Banners({
  s,
  season,
  call,
}: {
  s: State;
  season?: Season;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season?.id);
  const [id, setId] = useState(events[0]?.id || "");
  const e = events.find((x) => x.id === id);
  const [photo, setPhoto] = useState(e?.photo || ""),
    [focal, setFocal] = useState(e?.focal || 50),
    [credit, setCredit] = useState(e?.credit || ""),
    [override, setOverride] = useState(Boolean(s.settings.bannerOverride)),
    [err, setErr] = useState("");
  useEffect(() => {
    const x = events.find((x) => x.id === id);
    setPhoto(x?.photo || "");
    setFocal(x?.focal ?? 50);
    setCredit(x?.credit || "");
  }, [id]);
  if (!e)
    return (
      <Empty
        title={tr("Add a calendar first")}
        body="Each event can have its own circuit photograph."
      />
    );
  return (
    <>
      <section className="panel">
        <h2>{tr("The track takes centre stage")}</h2>
        <div className="info-bar">
          {tr(
            "The 2027 banners are included automatically. Add custom images to the VPS image folder to override them; manual uploads take priority.",
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr("Race weekend")}</th>
                <th>{tr("Suggested filename")}</th>
                <th>{tr("Image source")}</th>
              </tr>
            </thead>
            <tbody>
              {((s as any).imageMatches || [])
                .filter((row: any) =>
                  events.some((event) => event.id === row.eventId),
                )
                .map((row: any) => (
                  <tr key={row.eventId}>
                    <td>{row.name}</td>
                    <td>{row.file || row.expected}</td>
                    <td>{tr(row.source)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="tiny">
          {tr(
            "Use login.webp for the login screen and login-mobile.webp for an optional portrait image. Folder images must be backed up separately.",
          )}
        </p>
        <p className="muted">
          {tr(
            "The banner switches at first practice, then stays until the next weekend\u2019s first practice starts.",
          )}
        </p>
        <label>
          {tr("Race weekend")}
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {tr(
              events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              )),
            )}
          </select>
        </label>
        <div
          className="banner-upload-preview"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(7,13,25,.9),rgba(7,13,25,.1)),url("${photo || "/circuit-night.svg"}")`,
            backgroundPosition: `center ${focal}%`,
          }}
        >
          <small>{tr("YOUR LEAGUE \u00B7 YOUR TRACK")}</small>
          <h2>{e.name}</h2>
          <p>{e.circuit}</p>
        </div>
        <div className="form-grid">
          <label>
            {tr("Circuit photograph")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (ev) => {
                if (ev.target.files?.[0])
                  try {
                    setPhoto(await imageFile(ev.target.files[0]));
                    setErr("");
                  } catch (e) {
                    setErr((e as Error).message);
                  }
              }}
            />
            <small>
              {tr(
                "JPEG, PNG or WebP \u00B7 maximum 2 MB \u00B7 use a photo you own or may reuse.",
              )}
            </small>
          </label>
          <label>
            {tr("Photo credit")}
            <input value={credit} onChange={(e) => setCredit(e.target.value)} />
          </label>
          <label>
            {tr("Vertical focal point \u00B7")}
            {tr(focal)}
            {tr("%")}
            <input
              type="range"
              min="0"
              max="100"
              value={focal}
              onChange={(e) => setFocal(Number(e.target.value))}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
            />
            {tr("Keep this event as a manual banner override")}
          </label>
        </div>
        {tr(err && <p className="form-error">{tr(err)}</p>)}
        <button
          className="secondary"
          onClick={async () => {
            const d = await call({
              action: "banner",
              eventId: id,
              photo: "",
              focal,
              credit,
              override,
            });
            setPhoto(
              d.state.events.find((x: Event) => x.id === id)?.photo || "",
            );
          }}
        >
          {tr("Use automatic banner image")}
        </button>
        <button
          className="primary"
          onClick={() =>
            call({
              action: "banner",
              eventId: id,
              ...(photo.startsWith("data:") || photo === "" ? { photo } : {}),
              focal,
              credit,
              override,
            })
          }
        >
          {tr("Save banner")}
          <Save size={17} />
        </button>
      </section>
      <p className="tiny">
        {tr(
          "The preview adapts to your screen width. Check it on mobile before saving.",
        )}
      </p>
    </>
  );
}
function Branding({ s, call }: { s: State; call: Call }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [name, setName] = useState(s.settings.name),
    [welcome, setWelcome] = useState(s.settings.welcome),
    [logo, setLogo] = useState(s.settings.logo),
    [err, setErr] = useState("");
  return (
    <section className="panel narrow">
      <h2>{tr("A league with your name on it")}</h2>
      <label>
        {tr("League name")}
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {tr("Welcome message")}
        <textarea
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
        />
      </label>
      <label>
        {tr("League logo")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            try {
              if (e.target.files?.[0]) {
                const img = await imageFile(e.target.files[0]);
                if (img.length > 1500000)
                  throw new Error("Choose a smaller logo (under 1 MB).");
                setLogo(img);
                setErr("");
              }
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
        />
      </label>
      {tr(
        logo && (
          <img className="logo-preview" src={logo} alt={tr("Logo preview")} />
        ),
      )}
      {tr(err && <p className="form-error">{tr(err)}</p>)}
      <div className="button-row">
        <button
          className="primary"
          onClick={() => call({ action: "branding", name, welcome, logo })}
        >
          {tr("Save branding")}
          <Save size={16} />
        </button>
        <button className="secondary" onClick={() => setLogo("")}>
          {tr("Remove logo")}
        </button>
      </div>
    </section>
  );
}
function localInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function EventAdmin({
  s,
  season,
  call,
}: {
  s: State;
  season: Season;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id);
  const fresh = {
    id: "",
    name: "",
    circuit: "",
    country: "",
    practice: "",
    qualifying: "",
    race: "",
    sprintQualifying: "",
    sprintRace: "",
    length: "",
    laps: 0,
    practiceRound: false,
    calendarOverride: true,
  };
  const [form, setForm] = useState(fresh),
    [busy, setBusy] = useState(false);
  const edit = (e: Event) =>
    setForm({
      ...fresh,
      ...e,
      calendarOverride: true,
      practice: localInput(e.practice),
      qualifying: localInput(e.qualifying),
      race: localInput(e.race),
      sprintQualifying: localInput(e.sprintQualifying || ""),
      sprintRace: localInput(e.sprintRace || ""),
    });
  return (
    <>
      <CalendarSync s={s} season={season} call={call} />
      <section className="panel">
        <div className="section-title">
          <h2>{tr("Race weekends")}</h2>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await call({ action: "calendarImport", seasonId: season.id });
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw size={16} />
            {tr(busy ? "Importing…" : "Import Jolpica calendar")}
          </button>
        </div>
        <p className="tiny">
          {tr(
            "Calendar checks work before and during the season. Missing session times remain pending. Existing driver lineups are preserved; review them before inviting players.",
          )}
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tr("EVENT")}</th>
                <th>{tr("GP DEADLINE")}</th>
                <th>{tr("STATUS")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tr(
                events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.name}
                      {tr(e.practiceRound ? " · Practice" : "")}
                    </td>
                    <td>{tr(date(cutoff(e, "gp")))}</td>
                    <td>{tr(locked(e, "gp") ? "Locked" : "Open")}</td>
                    <td>
                      <button className="text-button" onClick={() => edit(e)}>
                        {tr("Edit")}
                      </button>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>{tr(form.id ? "Edit weekend" : "Add a weekend")}</h2>
          <button className="text-button" onClick={() => setForm(fresh)}>
            <Plus size={16} />
            {tr("New event")}
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await call({ action: "event", seasonId: season.id, ...form });
            setForm(fresh);
          }}
        >
          <div className="form-grid">
            {tr(
              (["name", "circuit", "country", "length"] as const).map((k) => (
                <label key={k}>
                  {tr(
                    {
                      name: "Grand Prix name",
                      circuit: "Circuit",
                      country: "Location",
                      length: "Track length (km)",
                    }[k],
                  )}
                  <input
                    value={form[k]}
                    required={k === "name"}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </label>
              )),
            )}
            {tr(
              (
                [
                  "practice",
                  "qualifying",
                  "race",
                  "sprintQualifying",
                  "sprintRace",
                ] as const
              ).map((k) => (
                <label key={k}>
                  {tr(
                    {
                      practice: "First practice",
                      qualifying: "GP qualifying",
                      race: "Grand Prix race",
                      sprintQualifying: "Sprint qualifying (optional)",
                      sprintRace: "Sprint race (optional)",
                    }[k],
                  )}
                  <input
                    type="datetime-local"
                    value={form[k]}
                    required={["practice", "qualifying", "race"].includes(k)}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </label>
              )),
            )}
            <label>
              {tr("Race laps")}
              <input
                type="number"
                min="0"
                value={form.laps}
                onChange={(e) =>
                  setForm({ ...form, laps: Number(e.target.value) })
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.practiceRound}
                disabled={Boolean(form.id)}
                onChange={(e) =>
                  setForm({ ...form, practiceRound: e.target.checked })
                }
              />
              {tr("Practice round (excluded from real standings)")}
            </label>
            {tr(
              s.events.find((e) => e.id === form.id)?.providerCircuitId && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.calendarOverride}
                    onChange={(e) =>
                      setForm({ ...form, calendarOverride: e.target.checked })
                    }
                  />
                  {tr("Protect this manual schedule from automatic updates")}
                </label>
              ),
            )}
          </div>
          <p className="tiny">
            {tr(
              "Times use your device\u2019s timezone. Open deadlines follow qualifying changes. Locked entries stay locked. The first real event sets the championship deadline. Player registration is controlled manually.",
            )}
          </p>
          <button className="primary">
            {tr("Save weekend")}
            <Save size={17} />
          </button>
        </form>
      </section>
    </>
  );
}
function ResultAdmin({
  s,
  season,
  call,
}: {
  s: State;
  season: Season;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const events = s.events.filter((e) => e.seasonId === season.id);
  const [id, setId] = useState(
      events.find((e) => Date.parse(e.race) < Date.now() && !e.gp?.published)
        ?.id ||
        events[0]?.id ||
        "",
    ),
    [kind, setKind] = useState<"gp" | "sprint">("gp"),
    [r, setR] = useState<Result>(emptyResult()),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false);
  const e = events.find((x) => x.id === id);
  useEffect(() => {
    const result =
      e?.[kind === "gp" ? "gpDraft" : "sprintDraft"] ||
      e?.[kind] ||
      emptyResult();
    setR({
      ...result,
      order: Array.from(
        { length: kind === "gp" ? 10 : 8 },
        (_, i) => result.order[i] || "",
      ),
    });
    setReason("");
  }, [id, kind]);
  if (!e)
    return (
      <Empty
        title={tr("No events to score")}
        body="Add a calendar or a practice round first."
      />
    );
  const preview = s.users
    .filter((u) => u.seasonIds.includes(season.id))
    .map((u) => {
      const p = s.entries.find(
        (x) =>
          x.userId === u.id &&
          x.eventId === id &&
          x.kind === kind &&
          x.submitted,
      );
      return {
        name: u.name,
        points: p
          ? score(
              p.picks,
              {
                ...r,
                published: true,
                replacements: e.replacements?.filter((x) => x.kind === kind),
              },
              kind,
            ).total
          : 0,
        old: p ? score(p.picks, e[kind], kind).total : 0,
      };
    })
    .sort((a, b) => b.points - a.points);
  const voidToggle = (key: string) =>
    setR({
      ...r,
      voids: r.voids.includes(key)
        ? r.voids.filter((x) => x !== key)
        : [...r.voids, key],
    });
  return (
    <>
      <div className="toolbar">
        <select
          value={id}
          onChange={(ev) => {
            setId(ev.target.value);
            setKind("gp");
          }}
          aria-label={tr("Score event")}
        >
          {tr(
            events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            )),
          )}
        </select>
        <div className="segmented">
          <button
            className={kind === "gp" ? "selected" : ""}
            onClick={() => setKind("gp")}
          >
            {tr("GP")}
          </button>
          {tr(
            e.sprintQualifying && (
              <button
                className={kind === "sprint" ? "selected" : ""}
                onClick={() => setKind("sprint")}
              >
                {tr("Sprint")}
              </button>
            ),
          )}
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const d = await call(
                { action: "resultsImport", eventId: id, kind },
                true,
              );
              setR({ ...r, ...d.imported, published: false });
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={16} />
          {tr(busy ? "Fetching…" : "Fetch results")}
        </button>
      </div>
      <div className="info-bar">
        {tr(
          "Confirm first retirement and Driver of the Day manually. Sprint pole and missing fastest-lap data also need confirmation. Fetching results never publishes scores.",
        )}
      </div>
      <CorrectionPreview s={s} event={e} kind={kind} result={r} />
      <div className="two-col">
        <section className="panel">
          <h2>{tr("Confirm the outcome")}</h2>
          <div className="inline">
            <h3>{tr("Finishing positions")}</h3>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={r.voids.includes("order")}
                onChange={() => voidToggle("order")}
              />
              {tr("Void race positions & podium")}
            </label>
          </div>
          <div className="result-input-grid">
            {tr(
              r.order.map((v, i) => (
                <label key={i}>
                  {tr("P")}
                  {tr(i + 1)}
                  <DriverSelect
                    season={season}
                    value={v}
                    disabled={r.voids.includes("order")}
                    onChange={(value) => {
                      const order = [...r.order];
                      order[i] = value;
                      setR({ ...r, order });
                    }}
                  />
                </label>
              )),
            )}
          </div>
          {tr(
            (
              ["pole", "fastest", ...(kind === "gp" ? ["dotd"] : [])] as (
                "pole" | "fastest" | "dotd"
              )[]
            ).map((key) => (
              <div key={key} className="result-field">
                <label>
                  {tr(
                    {
                      pole: "Pole position",
                      fastest: "Fastest lap",
                      dotd: "Driver of the Day",
                    }[key],
                  )}
                  <DriverSelect
                    season={season}
                    value={r[key]}
                    disabled={r.voids.includes(key)}
                    onChange={(value) => setR({ ...r, [key]: value })}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={r.voids.includes(key)}
                    onChange={() => voidToggle(key)}
                  />
                  {tr("Void")}
                </label>
              </div>
            )),
          )}
          <div className="inline">
            <h3>{tr("First retirement")}</h3>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={r.voids.includes("retirement")}
                onChange={() => voidToggle("retirement")}
              />
              {tr("Void")}
            </label>
          </div>
          <p className="tiny">
            {tr(
              "Choose multiple drivers for an unresolved joint retirement, or choose No retirements.",
            )}
          </p>
          <div className="retirement-grid">
            {tr(
              [{ id: "none", name: "No retirements" }, ...season.drivers].map(
                (d) => (
                  <label className="checkbox" key={d.id}>
                    <input
                      type="checkbox"
                      disabled={r.voids.includes("retirement")}
                      checked={r.retirements.includes(d.id)}
                      onChange={() =>
                        setR({
                          ...r,
                          retirements: r.retirements.includes(d.id)
                            ? r.retirements.filter((x) => x !== d.id)
                            : d.id === "none"
                              ? ["none"]
                              : [
                                  ...r.retirements.filter((x) => x !== "none"),
                                  d.id,
                                ],
                        })
                      }
                    />
                    {tr(d.name)}
                  </label>
                ),
              ),
            )}
          </div>
          <label>
            {tr("Publication / correction note")}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tr("Explain a correction or confirm the source.")}
            />
          </label>
          <div className="button-row">
            <button
              className="secondary"
              onClick={() =>
                call({
                  action: "results",
                  eventId: id,
                  kind,
                  result: { ...r, published: false },
                  reason,
                })
              }
            >
              {tr("Save draft")}
            </button>
            <button
              className="primary"
              disabled={!locked(e, kind)}
              onClick={() =>
                call({
                  action: "results",
                  eventId: id,
                  kind,
                  result: { ...r, published: true },
                  reason,
                })
              }
            >
              {tr("Publish all scores")}
              <Check size={17} />
            </button>
          </div>
        </section>
        <section className="panel sticky-panel">
          <h2>{tr("Score preview")}</h2>
          <p className="muted">
            {tr(
              "Review each player\u2019s points before publishing. Missing results must be confirmed or explicitly voided.",
            )}
          </p>
          <table>
            <thead>
              <tr>
                <th>{tr("PLAYER")}</th>
                <th>{tr("CURRENT")}</th>
                <th>{tr("PREVIEW")}</th>
              </tr>
            </thead>
            <tbody>
              {tr(
                preview.map((p) => (
                  <tr key={p.name}>
                    <td>{tr(p.name)}</td>
                    <td>{tr(p.old)}</td>
                    <td className="points accent">{tr(p.points)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
          {tr(
            e.practiceRound && (
              <div className="info-bar">
                {tr("Practice points will not enter the championship.")}
              </div>
            ),
          )}
        </section>
      </div>
    </>
  );
}
function Members({
  s,
  season,
  meId,
  call,
}: {
  s: State;
  season?: Season;
  meId: string;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [copied, setCopied] = useState(false);
  const open = season && registrationOpen(season);
  return (
    <>
      <section className="panel">
        <h2>{tr("Invite your friends")}</h2>
        <p className="muted">
          {tr(
            open
              ? "Registration is open until you close it."
              : "Registration is closed. Reopen it to invite more players.",
          )}
        </p>
        {season && !season.archived && <button className="secondary" onClick={() => call({ action: "registration", seasonId: season.id, closed: Boolean(open) })}>
          {tr(open ? "Close registration" : "Open registration")}
        </button>}
        <div className="invite-box">
          <code>
            {tr(
              typeof location !== "undefined"
                ? `${location.origin}/?invite=${s.settings.invite}`
                : "",
            )}
          </code>
          <button
            className="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(
                `${location.origin}/?invite=${s.settings.invite}`,
              );
              setCopied(true);
            }}
          >
            <Copy size={15} />
            {tr(copied ? "Copied" : "Copy link")}
          </button>
        </div>
        <button
          className="text-button"
          onClick={() => call({ action: "rotateInvite" })}
        >
          {tr("Revoke this link and create a new one")}
        </button>
      </section>
      <section className="panel">
        <h2>{tr("Manage the grid")}</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tr("PLAYER")}</th>
                <th>{tr("EMAIL")}</th>
                <th>{tr("ROLE")}</th>
                <th>{tr("ACCESS")}</th>
                <th>{tr("SEASON")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tr(
                s.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{tr(u.email)}</td>
                    <td>
                      <select
                        disabled={u.id === meId}
                        value={u.role}
                        onChange={(e) =>
                          call({
                            action: "member",
                            id: u.id,
                            role: e.target.value,
                          })
                        }
                      >
                        <option value="player">{tr("Player")}</option>
                        <option value="admin">{tr("Organiser")}</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        disabled={u.id === meId}
                        onClick={() =>
                          call({
                            action: "member",
                            id: u.id,
                            active: !u.active,
                          })
                        }
                      >
                        {tr(u.active ? "Active · revoke" : "Revoked · restore")}
                      </button>
                    </td>
                    <td>
                      {tr(
                        u.seasonIds.includes(season?.id || "") ? (
                          "Registered"
                        ) : (
                          <button
                            className="text-button"
                            disabled={!open}
                            onClick={() =>
                              call({
                                action: "member",
                                id: u.id,
                                seasonId: season?.id,
                              })
                            }
                          >
                            {tr("Add to season")}
                          </button>
                        ),
                      )}
                    </td>
                    <td>
                      {tr(
                        u.id !== meId && (
                          <button
                            className="text-button"
                            onClick={() => {
                              const password = window.prompt(
                                `Enter a new temporary password for ${u.name} (at least 12 characters). Share it with them privately.`,
                              );
                              if (password)
                                call({
                                  action: "resetPassword",
                                  id: u.id,
                                  password,
                                });
                            }}
                          >
                            {tr("Reset access")}
                          </button>
                        ),
                      )}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>{tr("Missing-entry reminder list")}</h2>
        <p className="muted">
          {tr(
            "Players who opted into reminders and have not submitted for an open event.",
          )}
        </p>
        {tr(
          s.events
            .filter(
              (e) =>
                e.seasonId === season?.id &&
                !e.practiceRound &&
                !locked(e, "gp"),
            )
            .map((e) => (
              <div className="announcement" key={e.id}>
                <h3>{e.name}</h3>
                <p>
                  {tr(
                    s.users
                      .filter(
                        (u) =>
                          u.active &&
                          u.reminders &&
                          u.seasonIds.includes(e.seasonId) &&
                          !s.entries.some(
                            (p) =>
                              p.userId === u.id &&
                              p.eventId === e.id &&
                              p.kind === "gp" &&
                              p.submitted,
                          ),
                      )
                      .map((u) => u.name)
                      .join(", ") || "Nobody needs a reminder.",
                  )}
                </p>
              </div>
            )),
        )}
        <p className="tiny">
          {tr(
            "Automatic email sending is not connected yet. This list can be used immediately.",
          )}
        </p>
      </section>
    </>
  );
}
function SeasonAdmin({
  s,
  season,
  call,
}: {
  s: State;
  season?: Season;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [lineup, setLineup] = useState(
      JSON.stringify(season?.drivers || [], null, 2),
    ),
    [constructors, setConstructors] = useState(
      season?.constructors.join("\n") || "",
    ),
    [driver, setDriver] = useState(""),
    [constructor, setConstructor] = useState(""),
    [err, setErr] = useState("");
  useEffect(() => {
    setLineup(JSON.stringify(season?.drivers || [], null, 2));
    setConstructors(season?.constructors.join("\n") || "");
  }, [season?.id]);
  return (
    <>
      <SeasonWizard s={s} season={season} call={call} />
      {tr(
        season && (
          <>
            <section className="panel">
              <div className="section-title">
                <h2>
                  {season.name}
                  {tr("\u00B7 driver lineup")}
                </h2>
                <Pill>
                  {tr(
                    Date.now() < Date.parse(season.cutoff)
                      ? "Editable preseason"
                      : "Locked",
                  )}
                </Pill>
              </div>
              <p className="tiny">
                {tr(
                  "Import through Race weekends, or edit the lineup below. Driver records use id, name, team and color. This advanced editor is for initial setup.",
                )}
              </p>
              <div className="form-grid">
                <label>
                  {tr("Drivers (JSON)")}
                  <textarea
                    className="code-editor"
                    value={lineup}
                    onChange={(e) => setLineup(e.target.value)}
                  />
                </label>
                <label>
                  {tr("Constructors (one per line)")}
                  <textarea
                    className="code-editor"
                    value={constructors}
                    onChange={(e) => setConstructors(e.target.value)}
                  />
                </label>
              </div>
              {tr(err && <p className="form-error">{tr(err)}</p>)}
              <button
                className="secondary"
                disabled={Date.now() >= Date.parse(season.cutoff)}
                onClick={async () => {
                  try {
                    await call({
                      action: "lineup",
                      seasonId: season.id,
                      drivers: JSON.parse(lineup),
                      constructors: constructors
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    });
                    setErr("");
                  } catch (e) {
                    setErr((e as Error).message);
                  }
                }}
              >
                {tr("Save lineup")}
              </button>
            </section>
            <section className="panel">
              <h2>{tr("Confirm the season champions")}</h2>
              <p className="muted">
                {tr(
                  "Use final official standings at season end. This awards 15 driver points and 10 constructor points to correct picks.",
                )}
              </p>
              <div className="form-grid">
                <label>
                  {tr("Driver champion")}
                  <DriverSelect
                    season={season}
                    value={driver}
                    onChange={setDriver}
                  />
                </label>
                <label>
                  {tr("Constructor champion")}
                  <select
                    value={constructor}
                    onChange={(e) => setConstructor(e.target.value)}
                  >
                    <option value="">{tr("Choose a constructor")}</option>
                    {tr(
                      season.constructors.map((c) => (
                        <option key={c}>{tr(c)}</option>
                      )),
                    )}
                  </select>
                </label>
              </div>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={!driver || !constructor}
                  onClick={() =>
                    call({
                      action: "champions",
                      seasonId: season.id,
                      driver,
                      constructor,
                    })
                  }
                >
                  {tr("Award championship points")}
                </button>
              </div>
            </section>
          </>
        ),
      )}
    </>
  );
}
function Announcements({ s, call }: { s: State; call: Call }) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  return (
    <>
      <section className="panel narrow">
        <h2>{tr("A message to your grid")}</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await call({ action: "announcement", title, body });
            setTitle("");
            setBody("");
          }}
        >
          <label>
            {tr("Title")}
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            {tr("Message")}
            <textarea
              required
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button className="primary">
            {tr("Publish announcement")}
            <ArrowUpRight size={17} />
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>{tr("Published announcements")}</h2>
        {tr(
          s.settings.announcements.map((a) => (
            <article className="announcement" key={a.id}>
              <div className="section-title">
                <h3>{a.title}</h3>
                <button
                  className="text-button"
                  onClick={() =>
                    call({ action: "deleteAnnouncement", id: a.id })
                  }
                >
                  {tr("Remove")}
                </button>
              </div>
              <p>{a.body}</p>
              <small>{tr(date(a.date))}</small>
            </article>
          )),
        )}
      </section>
    </>
  );
}
export default function LeagueApp() {
  return (
    <LocaleProvider>
      <LeagueContent />
    </LocaleProvider>
  );
}
