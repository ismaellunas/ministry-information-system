import { Cake } from "lucide-react";
import { format } from "date-fns";
import { createServices, requireProfile } from "@/composition/server";
import { nearestBirthdayThisMonth, pastorBirthdayReminder } from "@/domain/birthday";
import { todayManila } from "@/domain/time";
import { HomeActionCard } from "./HomeActionCard";

export async function UpcomingBirthdaysCard({ churchId }: { churchId: string }) {
  const actor = await requireProfile();
  const { members, churches } = await createServices(actor);
  const [year, month, day] = todayManila().split("-").map(Number);
  const [memberBirthdays, church] = await Promise.all([
    members.listBirthdaysInMonth(churchId, month),
    churches.get(churchId),
  ]);
  const pastor = pastorBirthdayReminder(
    {
      name: church.pastorName,
      birthMonth: church.pastorBirthMonth,
      birthDay: church.pastorBirthDay,
    },
    month
  );
  const candidates = pastor ? [...memberBirthdays, pastor] : memberBirthdays;
  const nearest = nearestBirthdayThisMonth(candidates, day);

  if (!nearest) {
    return (
      <HomeActionCard
        icon={<Cake className="h-5 w-5" />}
        tint="bg-rose-50 text-rose-500"
        title="Upcoming birthday"
        subtitle="No birthdays this month"
      />
    );
  }

  const civil = `${year}-${String(month).padStart(2, "0")}-${String(nearest.birthDay).padStart(2, "0")}`;
  const display = format(new Date(year, month - 1, nearest.birthDay), "MMM d");

  return (
    <HomeActionCard
      icon={<Cake className="h-5 w-5" />}
      tint="bg-rose-50 text-rose-500"
      title="Upcoming birthday"
      subtitle={`${nearest.fullName} · ${display}`}
      href={`/calendar?from=${civil}`}
    />
  );
}
