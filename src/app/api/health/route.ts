import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    // Touch DB to keep Supabase free project alive (blueprint §4)
    const { error } = await supabase.from("ministries").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 503 }
    );
  }
}
