import { ChangePasswordForm } from "./_components/ChangePasswordForm";

export const metadata = { title: "Set New Password — West Section MIS" };

export default function ChangePasswordPage() {
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
