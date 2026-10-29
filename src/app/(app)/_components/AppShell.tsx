"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Building2, Bell, Home, MoreHorizontal, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/domain/types";

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

export function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="flex items-center justify-between h-14 px-4 max-w-screen-lg mx-auto">
          <span className="font-semibold text-sm">West MIS</span>
          <span className="text-sm text-muted-foreground hidden sm:block">
            {profile.firstName} {profile.lastName}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-screen-lg mx-auto w-full px-4 py-4 pb-20 sm:pb-4">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background sm:hidden z-40">
        <div className="flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs min-h-[56px] justify-center transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
