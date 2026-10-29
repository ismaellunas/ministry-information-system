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
      <h1 className="page-title">Home</h1>
      <p className="page-copy">
        Welcome to the Northeastern Mindanao District — West Section Ministry Information System.
      </p>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs">
        <p className="text-sm font-semibold text-gray-900">Your roles</p>
        <ul className="mt-2 list-inside list-disc text-sm text-gray-500">
          {roles.length === 0 && <li>No roles assigned. Contact your administrator.</li>}
          {roles.map((r) => <li key={r.id}>{r.role}</li>)}
        </ul>
      </div>
    </div>
  );
}
