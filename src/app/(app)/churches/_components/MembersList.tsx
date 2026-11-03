"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { Member } from "@/domain/types";
import { Label } from "@/core/ui/label";
import { Select } from "@/core/ui/select";

type SortOption = "alphabetical" | "date-added" | "birthday";

export function MembersList({
  churchId,
  members,
  ministries,
  initialMinistryId,
}: {
  churchId: string;
  members: Member[];
  ministries: Array<{ id: number; name: string }>;
  initialMinistryId: number | null;
}) {
  const [ministryFilter, setMinistryFilter] = useState(
    initialMinistryId != null ? String(initialMinistryId) : "all"
  );
  const [sort, setSort] = useState<SortOption>("alphabetical");

  const ministryName = useMemo(() => new Map(ministries.map((ministry) => [ministry.id, ministry.name])), [ministries]);

  const filtered = useMemo(() => {
    if (ministryFilter === "all") return members;
    const id = Number(ministryFilter);
    return members.filter((member) => member.ministryId === id);
  }, [members, ministryFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "alphabetical") {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName, "en", { sensitivity: "base" }));
    } else if (sort === "date-added") {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      list.sort(
        (a, b) =>
          birthSortKey(a) - birthSortKey(b) || a.fullName.localeCompare(b.fullName, "en", { sensitivity: "base" })
      );
    }
    return list;
  }, [filtered, sort]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ministry_filter">Department</Label>
          <Select id="ministry_filter" value={ministryFilter} onChange={(event) => setMinistryFilter(event.target.value)}>
            <option value="all">All departments</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sort_order">Sort by</Label>
          <Select id="sort_order" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
            <option value="alphabetical">Alphabetical (A–Z)</option>
            <option value="date-added">Date added (newest first)</option>
            <option value="birthday">Birthday (oldest first)</option>
          </Select>
        </div>
      </div>

      <p className="page-copy">
        {sorted.length} {sorted.length === 1 ? "member" : "members"}
      </p>

      {sorted.length === 0 ? (
        <p className="page-copy">No members yet.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((member) => (
            <Link
              key={member.id}
              href={`/churches/${churchId}/members/${member.id}`}
              className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs"
            >
              <p className="text-sm font-semibold text-gray-900">{member.fullName}</p>
              {ministryFilter === "all" && (
                <p className="page-copy">{ministryName.get(member.ministryId) ?? "—"}</p>
              )}
              <p className="page-copy">{formatBirthday(member)}</p>
              <p className="page-copy">Added {format(new Date(member.createdAt), "MMM d, yyyy")}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function birthSortKey(member: Member): number {
  if (member.birthYear == null || member.birthMonth == null || member.birthDay == null) {
    return Number.POSITIVE_INFINITY;
  }
  return member.birthYear * 10000 + member.birthMonth * 100 + member.birthDay;
}

function formatBirthday(member: Member): string {
  if (member.birthMonth == null || member.birthDay == null) return "Birthday not on file";
  const monthName = format(new Date(2000, member.birthMonth - 1, 1), "MMM");
  return member.birthYear ? `${monthName} ${member.birthDay}, ${member.birthYear}` : `${monthName} ${member.birthDay}`;
}
