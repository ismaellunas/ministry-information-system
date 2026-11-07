import Link from "next/link";

/** Shared with `loading.tsx`. White card, gray bars, the same pulse as route loading. */
export function DashboardCardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
      <div className="h-4 w-3/5 rounded bg-gray-200" />
      <div className="h-3 w-4/5 rounded bg-gray-100" />
      <div className="h-3 w-2/5 rounded bg-gray-100" />
    </div>
  );
}

export function DashboardCardStack({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <DashboardCardSkeleton key={index} />
      ))}
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-7 w-40 rounded-lg bg-gray-200" />
      <div className="space-y-4">
        <DashboardCardStack count={3} />
      </div>
    </div>
  );
}

export function PulseCard() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <DashboardCardSkeleton />
    </div>
  );
}

export function PulseCardStack({ count }: { count: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <DashboardCardStack count={count} />
    </div>
  );
}

export function MembershipCountsFrame() {
  return (
    <section className="space-y-3" aria-busy="true">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Membership counts</h2>
        <span className="inline-block h-4 w-24 animate-pulse rounded bg-gray-200" aria-hidden="true" />
      </div>
      <PulseCardStack count={4} />
    </section>
  );
}

export function MissingDepartmentsFrame() {
  return (
    <section className="space-y-3" aria-busy="true">
      <h2 className="text-base font-semibold text-gray-900">Missing department counts</h2>
      <PulseCard />
    </section>
  );
}

export function AdminToolsFrame() {
  return (
    <div className="space-y-6" aria-busy="true">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Never signed in</h2>
        <PulseCard />
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Recent audit</h2>
          <Link href="/admin/audit" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-500">
            See all
          </Link>
        </div>
        <PulseCard />
      </section>
    </div>
  );
}
