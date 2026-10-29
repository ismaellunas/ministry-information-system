import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRoleRow = Database["public"]["Tables"]["profile_roles"]["Row"];

export const metadata = { title: "Home — West Section MIS" };

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rolesData } = await supabase
    .from("profile_roles")
    .select("*")
    .eq("profile_id", user.id);

  const roles = (rolesData ?? []) as ProfileRoleRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Home</h1>
      <p className="text-muted-foreground text-sm">
        Welcome to the Northeastern Mindanao District — West Section Ministry Information System.
      </p>
      <div className="rounded-lg border p-4 bg-muted/30">
        <p className="text-sm font-medium">Your roles</p>
        <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
          {roles.length === 0 && <li>No roles assigned. Contact your administrator.</li>}
          {roles.map((r) => <li key={r.id}>{r.role}</li>)}
        </ul>
      </div>
    </div>
  );
}
