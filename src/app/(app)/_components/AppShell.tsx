"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Building2, Bell, Home, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/domain/types";
import { SyncEngine, SyncStatusLine } from "./SyncEngine";

interface AppShellProps {
  profile: { id: string; firstName: string; lastName: string };
  roles: Array<{ id: string; role: UserRole; church_id: string | null; ministry_id: number | null }>;
  children: React.ReactNode;
}

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/churches", label: "Directory", icon: Building2 },
  { href: "/notifications", label: "Inbox", icon: Bell },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

function NavLink({
  item,
  pathname,
  online,
  layout,
}: {
  item: (typeof NAV)[number];
  pathname: string;
  online: boolean;
  layout: "sidebar" | "tabs";
}) {
  const { href, label, icon: Icon } = item;
  const active = isActive(pathname, href);
  const calendarOnly = !online && href !== "/calendar";
  const className = cn(
    layout === "sidebar"
      ? "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium"
      : "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium",
    calendarOnly
      ? "text-gray-300"
      : active
        ? layout === "sidebar"
          ? "bg-brand-50 text-brand-500"
          : "text-brand-500"
        : layout === "sidebar"
          ? "text-gray-700 hover:bg-gray-100"
          : "text-gray-500"
  );
  if (calendarOnly) {
    return (
      <span aria-disabled="true" className={className}>
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/more") return pathname.startsWith("/more") || pathname.startsWith("/admin");
  return pathname.startsWith(href);
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

export function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname();
  const online = useOnline();

  useEffect(() => {
    if (online || pathname.startsWith("/calendar")) return;
    window.location.assign("/calendar");
  }, [online, pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <SyncEngine />
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-gray-200 md:bg-white">
        <div className="px-5 py-5 text-base font-semibold text-gray-900">West MIS</div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} online={online} layout="sidebar" />
          ))}
        </nav>
        <p className="mt-auto px-5 py-4 text-sm text-gray-500">
          {profile.firstName} {profile.lastName}
        </p>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-14 max-w-screen-lg items-center justify-between px-4 md:px-6">
            <span className="text-base font-semibold text-gray-900 md:sr-only">West MIS</span>
            <div className="ml-auto flex items-center gap-3">
              <SyncStatusLine />
              <span className="hidden text-sm font-medium text-gray-700 sm:block">
                {profile.firstName} {profile.lastName}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-lg flex-1 px-4 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="flex">
            {NAV.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} online={online} layout="tabs" />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
