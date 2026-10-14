import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendDuePush } from "@/lib/push";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const secret = process.env.CALENDAR_SYNC_SECRET;
  if (!secret || secret.length < 32)
    return NextResponse.json(
      { error: "Scheduler is not configured." },
      { status: 503 },
    );
  const actual = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  try {
    return NextResponse.json(await sendDuePush(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Push reminder check failed." },
      { status: 500 },
    );
  }
}
