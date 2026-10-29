import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "./_components/SignOutButton";

export const metadata = { title: "More — West Section MIS" };

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">More</h1>
      <div className="divide-y rounded-lg border bg-card">
        <div className="px-4 py-3">
          <p className="text-sm font-medium">Account</p>
          <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
        </div>
        <div className="px-4 py-3">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
