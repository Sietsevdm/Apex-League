import { NextRequest, NextResponse } from "next/server";
import { transaction, demoMode } from "@/lib/store";
import { readSession } from "@/lib/auth";
import { checkUpdates } from "@/lib/updates";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const authorised = await transaction((s) => {
    const token = readSession(req.cookies.get("apex_session")?.value || "");
    const id = demoMode ? req.cookies.get("apex_demo")?.value || "demo-admin" : token?.id;
    return s.users.some((u) => u.id === id && u.active && u.role === "admin" && (demoMode || u.version === token?.version));
  });
  if (!authorised) return NextResponse.json({ error: "Organiser access required." }, { status: 403 });
  try { return NextResponse.json(await checkUpdates(), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 502 }); }
}
