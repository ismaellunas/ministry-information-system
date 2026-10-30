import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./_components/ChangePasswordForm";

export const metadata = { title: "Set New Password — West Section MIS" };

export default async function ChangePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as { must_change_password: boolean } | null;

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!profile.must_change_password) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="page-title">Set your password</h1>
          <p className="page-copy mt-1">You must set a new password before continuing.</p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
