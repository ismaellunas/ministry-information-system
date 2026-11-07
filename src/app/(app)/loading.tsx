import { DashboardSkeleton } from "./_components/DashboardSkeleton";

/**
 * Loading skeleton shown by Next.js App Router while a server page is fetching.
 * The app shell (header + nav) stays visible; only the <main> content area
 * is replaced with this skeleton during navigation.
 */
export default function AppLoading() {
  return <DashboardSkeleton />;
}
