import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncDueCalendars } from "@/lib/calendar-sync";
import { syncDueReplacements } from "@/lib/automatic-replacements";
import { syncDueResults } from "@/lib/automatic-results";
import { transaction } from "@/lib/store";
import { createBackup } from "@/lib/backups";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const secret = process.env.CALENDAR_SYNC_SECRET;
  if (!secret || secret.length < 32)
    return NextResponse.json(
      { error: "Calendar scheduler is not configured." },
      { status: 503 },
    );
  const a = Buffer.from(req.headers.get("authorization") || ""),
    b = Buffer.from(`Bearer ${secret}`);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  try {
    const outcomes = await syncDueCalendars();
    const replacements = await syncDueReplacements();
    const results = await syncDueResults();
    const backup = await transaction(async (s) => {
      if (!process.env.BACKUP_SECRET || process.env.BACKUP_SECRET.length < 32)
        return "not configured";
      if (
        s.backupHealth?.lastSuccess &&
        Date.now() - Date.parse(s.backupHealth.lastSuccess) < 24 * 3600000
      )
        return "up to date";
      try {
        await createBackup(s);
        return "created";
      } catch {
        return "failed";
      }
    });
    return NextResponse.json({ outcomes, replacements, results, backup });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Calendar sync failed." },
      { status: 500 },
    );
  }
}
