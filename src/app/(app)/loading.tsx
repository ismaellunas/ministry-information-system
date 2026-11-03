"use client";

/**
 * Loading skeleton shown by Next.js App Router while a server page is fetching.
 * The app shell (header + nav) stays visible; only the <main> content area
 * is replaced with this skeleton during navigation.
 */
export default function AppLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      {/* Page title bar */}
      <div className="h-7 w-40 rounded-lg bg-gray-200" />

      {/* Card skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs space-y-3"
        >
          <div className="h-4 w-3/5 rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-100" />
          <div className="h-3 w-2/5 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
