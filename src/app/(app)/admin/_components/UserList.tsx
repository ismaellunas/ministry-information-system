"use client";

import Link from "next/link";
import type { Profile } from "@/domain/types";
import { roleLabel } from "@/domain/roles";
import { searchableText } from "@/domain/search";
import { SearchableList } from "@/core/ui/searchable-list";

export function UserList({
  users,
}: {
  users: Array<{ profile: Profile; email: string }>;
}) {
  return (
    <SearchableList
      items={users}
      itemKey={(user) => user.profile.id}
      getSearchText={(user) =>
        searchableText([
          user.profile.firstName,
          user.profile.lastName,
          user.email,
          user.profile.phoneNumber,
          ...user.profile.roles.map((role) => roleLabel(role.role)),
          user.profile.isActive ? "active" : "deactivated",
        ])
      }
      placeholder="Name, email, phone, or role"
      noneYet="No users yet."
      noneFound={(query) => `No users match “${query}”.`}
    >
      {(user) => (
        <Link
          href={`/admin/users/${user.profile.id}`}
          className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs"
        >
          <p className="text-sm font-semibold text-gray-900">
            {user.profile.firstName} {user.profile.lastName}
          </p>
          <p className="page-copy">{user.email}</p>
          <p className="page-copy">
            {user.profile.roles.map((role) => roleLabel(role.role)).join(" · ") || "No roles"}
            {!user.profile.isActive ? " · Deactivated" : ""}
          </p>
        </Link>
      )}
    </SearchableList>
  );
}
