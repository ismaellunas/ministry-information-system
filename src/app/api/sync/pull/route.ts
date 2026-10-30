import { NextResponse } from "next/server";
import { createServices, getCurrentProfile } from "@/composition/server";
import { activityToWire, type SyncCursor } from "@/domain/sync";

export const dynamic = "force-dynamic";

function cursorFrom(url: URL): SyncCursor | null {
  const updatedAt = url.searchParams.get("since");
  const id = url.searchParams.get("sinceId");
  if (!updatedAt && !id) return null;
  if (!updatedAt || !id || Number.isNaN(Date.parse(updatedAt))) {
    throw new Error("Send both since and sinceId, or neither.");
  }
  return { updatedAt, id };
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!profile.isActive) return NextResponse.json({ error: "deactivated" }, { status: 401 });

  let cursor: SyncCursor | null;
  try {
    cursor = cursorFrom(new URL(request.url));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid cursor." }, { status: 400 });
  }

  const { sync } = await createServices(profile);
  const page = await sync.pull(cursor);
  return NextResponse.json(
    {
      activities: page.activities.map(activityToWire),
      cursor: page.cursor,
      more: page.more,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
