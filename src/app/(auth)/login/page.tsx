import Image from "next/image";
import { LoginForm } from "./_components/LoginForm";

export const metadata = { title: "Sign In — West Section MIS" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/favicon.jpeg"
            alt="West Section MIS Logo"
            width={72}
            height={72}
            className="mx-auto mb-4 h-18 w-18 rounded-2xl object-cover shadow-theme-xs"
            priority
          />
          <h1 className="page-title">West Section MIS</h1>
          <p className="page-copy mt-1">Northeastern Mindanao District — West</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
