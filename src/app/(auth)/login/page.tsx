import { LoginForm } from "./_components/LoginForm";

export const metadata = { title: "Sign In — West Section MIS" };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">West Section MIS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Northeastern Mindanao District — West
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
