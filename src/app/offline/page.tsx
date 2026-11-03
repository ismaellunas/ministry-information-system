import Image from "next/image";

export const metadata = { title: "West Section MIS" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-screen-sm flex-col justify-center gap-4 bg-gray-50 px-4 py-8">
      <div className="flex items-center gap-3">
        <Image
          src="/favicon.jpeg"
          alt="West MIS Logo"
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl object-cover"
        />
        <h1 className="page-title">West MIS</h1>
      </div>
      <p className="page-copy">The calendar opens after this phone has loaded it once.</p>
      <a
        href="/calendar"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white"
      >
        Calendar
      </a>
      <a
        href="/login"
        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
      >
        Sign in
      </a>
    </main>
  );
}
