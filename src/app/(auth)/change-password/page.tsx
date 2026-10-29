import { ChangePasswordForm } from "./_components/ChangePasswordForm";

export const metadata = { title: "Set New Password — West Section MIS" };

export default function ChangePasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Set your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            You must set a new password before continuing.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
