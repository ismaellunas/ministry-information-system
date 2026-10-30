import Link from "next/link";

export const metadata = { title: "Offline — West Section MIS" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-screen-sm flex-col justify-center gap-4 bg-gray-50 px-4 py-8">
      <h1 className="page-title">You are offline</h1>
      <p className="page-copy">
        Events already on this phone stay in the calendar. A new event waits here until the signal comes back. Open the app again after you reconnect.
      </p>
      <Link
        href="/calendar"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white"
      >
        Try the calendar
      </Link>
      <Link
        href="/login"
        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
      >
        Sign in
      </Link>
    </main>
  );
}
