import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./_components/AppShell";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileRoleRow = Database["public"]["Tables"]["profile_roles"]["Row"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as ProfileRow | null;

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?reason=deactivated");
  }

  if (profile.must_change_password) {
    redirect("/change-password");
  }

  const { data: rolesData } = await supabase
    .from("profile_roles")
    .select("*")
    .eq("profile_id", user.id);

  const roles = (rolesData ?? []) as ProfileRoleRow[];

  return (
    <AppShell
      profile={{ id: profile.id, firstName: profile.first_name, lastName: profile.last_name }}
      roles={roles}
    >
      {children}
    </AppShell>
  );
}
