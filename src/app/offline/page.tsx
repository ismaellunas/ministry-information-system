export const metadata = { title: "West Section MIS" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-screen-sm flex-col justify-center gap-4 bg-gray-50 px-4 py-8">
      <h1 className="page-title">West MIS</h1>
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
