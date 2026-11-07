import { Banknote, CalendarCheck, Library } from "lucide-react";
import { HomeActionCard } from "./HomeActionCard";

const LINKS = [
  {
    title: "Event Attendance",
    href: "https://ncmdcaog.org/attendance.php",
    icon: CalendarCheck,
    tint: "bg-blue-50 text-blue-500",
  },
  {
    title: "Finances",
    href: "https://ncmdcaog.org/finances.php",
    icon: Banknote,
    tint: "bg-emerald-50 text-emerald-500",
  },
  {
    title: "District Resources",
    href: "https://ncmdcaog.org/resources.php",
    icon: Library,
    tint: "bg-brand-50 text-brand-500",
  },
] as const;

export function DistrictLinks() {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Helpful District Links</h2>
      <div className="space-y-3">
        {LINKS.map((link) => (
          <HomeActionCard
            key={link.href}
            icon={<link.icon className="h-5 w-5" />}
            tint={link.tint}
            title={link.title}
            subtitle="ncmdcaog.org"
            href={link.href}
            external
          />
        ))}
      </div>
    </section>
  );
}
