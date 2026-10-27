import { NextRequest, NextResponse } from "next/server";
import { readState, demoMode } from "@/lib/store";
import { readSession } from "@/lib/auth";
import { bannerWeather } from "@/lib/banner-weather";
import { canManageSeason, leagueSettings } from "@/lib/leagues";
import { imageSlug, weatherBannerPhoto } from "@/lib/banner-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const headers = {
    "Cache-Control": "private, no-store",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const s = await readState();
    const token = demoMode
      ? null
      : readSession(req.cookies.get("apex_session")?.value || "");
    const user = s.users.find(
      (u) =>
        u.active &&
        (demoMode
          ? u.id === (req.cookies.get("apex_demo")?.value || "demo-admin")
          : token && u.id === token.id && u.version === token.version),
    );
    if (!user)
      return NextResponse.json(
        { error: "Sign in required." },
        { status: 401, headers },
      );
    const event = s.events.find(
      (e) => e.id === req.nextUrl.searchParams.get("eventId"),
    );
    const season = s.seasons.find((season) => season.id === event?.seasonId);
    if (
      !event ||
      !season ||
      (!canManageSeason(s, user, season.id) &&
        !user.seasonIds.includes(season.id))
    )
      return NextResponse.json(
        { error: "Race unavailable." },
        { status: 404, headers },
      );
    const saved = leagueSettings(s, season.leagueId).savedBannerPhotos?.find(
      (p) =>
        p.year === season.year &&
        imageSlug(p.name) === imageSlug(event.name) &&
        imageSlug(p.circuit) === imageSlug(event.circuit),
    );
    const effectiveEvent =
      saved &&
      (!event.photo ||
        ["/circuit-night.svg", "/circuit-day.svg"].includes(event.photo))
        ? { ...event, photo: saved.photo }
        : event;
    const preview = req.nextUrl.searchParams.get("preview");
    if (preview) {
      if (!canManageSeason(s, user, season.id))
        return NextResponse.json(
          { error: "Organiser access required." },
          { status: 403, headers },
        );
      if (!["sunny", "cloudy", "rainy", "night"].includes(preview))
        return NextResponse.json(
          { error: "Unknown weather preview." },
          { status: 400, headers },
        );
      const photo = await weatherBannerPhoto(
        effectiveEvent,
        season.year,
        preview as "sunny" | "cloudy" | "rainy" | "night",
      );
      return NextResponse.json(
        { eventId: event.id, weather: null, photo },
        { headers },
      );
    }
    // Archives and practice rounds retain their original artwork.
    const weather =
      season.archived || event.practiceRound
        ? null
        : await bannerWeather.current(event);
    const photo = weather
      ? await weatherBannerPhoto(effectiveEvent, season.year, weather.condition)
      : null;
    return NextResponse.json(
      { eventId: event.id, weather, photo },
      { headers },
    );
  } catch {
    return NextResponse.json({ weather: null, photo: null }, { headers });
  }
}
