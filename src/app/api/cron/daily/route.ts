import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

/**
 * Daily cron handler — called by pg_cron + pg_net or GitHub Actions backup pinger.
 * Bearer auth required: Authorization: Bearer <CRON_SECRET>
 * Phases 3–5 add birthday logic and activity cleanup here.
 */
export async function POST(request: Request) {
  const { CRON_SECRET } = getServerEnv();
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // Constant-time comparison (blueprint §12.1)
  if (!timingSafeEqual(token, CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO Phase 5: birthday job
  // TODO Phase 3: overlap_ended_at cleanup

  return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
