import { NextRequest, NextResponse } from "next/server";
import { readState } from "@/lib/store";
import { subscribedCalendar } from "@/lib/calendar-subscriptions";
import { deadlineCalendar } from "@/lib/league-extras";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const token = req.nextUrl.searchParams.get("token") || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      return new NextResponse("Calendar subscription unavailable.", {status: 404, headers});
    const s = await readState();
    const subscription = subscribedCalendar(s, token);
    if (!subscription)
      return new NextResponse("Calendar subscription unavailable.", {
        status: 404,
        headers,
      });
    return new NextResponse(
      deadlineCalendar(s, subscription.season, subscription.language, true),
      {
        headers: {
          ...headers,
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'inline; filename="prediction-deadlines.ics"',
        },
      },
    );
  } catch {
    return new NextResponse("Calendar temporarily unavailable.", {
      status: 503,
      headers,
    });
  }
}
