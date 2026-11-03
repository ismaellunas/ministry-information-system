"use client";

import { useRouter } from "next/navigation";
import { Pencil, UserPlus, Users } from "lucide-react";
import { HomeActionCard } from "../../_components/HomeActionCard";

export function ChurchChooser({
  churchId,
  onEdit,
  onAddMember,
  showViewMembers = true,
}: {
  churchId: string;
  /** Offline inline use passes callbacks instead of letting this navigate by URL. */
  onEdit?: () => void;
  onAddMember?: () => void;
  /** Viewing members needs a connection — the offline inline use hides this tile. */
  showViewMembers?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => (onEdit ? onEdit() : router.push(`/churches/${churchId}`))}
      >
        <HomeActionCard
          icon={<Pencil className="h-5 w-5" />}
          tint="bg-blue-50 text-blue-500"
          title="Edit church information"
          subtitle="Pastor, address, phone, logo"
        />
      </button>
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => (onAddMember ? onAddMember() : router.push(`/churches/${churchId}/members/new`))}
      >
        <HomeActionCard
          icon={<UserPlus className="h-5 w-5" />}
          tint="bg-emerald-50 text-emerald-500"
          title="Add new member"
          subtitle="Works offline — syncs when you're back online"
        />
      </button>
      {showViewMembers && (
        <button type="button" className="block w-full text-left" onClick={() => router.push(`/churches/${churchId}/members`)}>
          <HomeActionCard
            icon={<Users className="h-5 w-5" />}
            tint="bg-amber-50 text-amber-500"
            title="View members"
            subtitle="By department, date added, or birthday"
          />
        </button>
      )}
    </div>
  );
}
