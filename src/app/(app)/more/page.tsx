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
      <h1 className="page-title">More</h1>
      <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">Account</p>
          <p className="page-copy mt-0.5">{user.email}</p>
        </div>
        <div className="px-4 py-3">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
