"use client";

import Link from "next/link";
import type { Church } from "@/domain/types";
import { searchableText } from "@/domain/search";
import { SearchableList } from "@/core/ui/searchable-list";

export function ChurchList({ churches }: { churches: Church[] }) {
  return (
    <SearchableList
      items={churches}
      itemKey={(church) => church.id}
      getSearchText={(church) =>
        searchableText([
          church.name,
          church.pastorName,
          church.pastorFirstName,
          church.pastorLastName,
          church.pastorPhone,
          church.hotlineNumber,
          church.address,
          church.isActive ? "active" : "closed",
        ])
      }
      placeholder="Church, pastor, phone, or address"
      noneYet="No churches yet."
      noneFound={(query) => `No churches match “${query}”.`}
    >
      {(church) => (
        <Link
          href={`/churches/${church.id}`}
          className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs"
        >
          <div className="flex items-start gap-3">
            {church.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={church.logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-100" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{church.name}</p>
              {!church.isActive && <p className="page-copy">Closed</p>}
              {church.pastorName && <p className="page-copy">{church.pastorName}</p>}
              {church.pastorPhone && <p className="page-copy">{church.pastorPhone}</p>}
              {church.hotlineNumber && <p className="page-copy">{church.hotlineNumber}</p>}
              {church.address && (
                <p className="page-copy whitespace-pre-line">{church.address}</p>
              )}
              {church.facebookPageUrl && (
                <p className="page-copy">
                  <span className="text-brand-500">Facebook page</span>
                </p>
              )}
              {church.mapPinUrl && (
                <p className="page-copy">
                  <span className="text-brand-500">Map pin</span>
                </p>
              )}
            </div>
          </div>
        </Link>
      )}
    </SearchableList>
  );
}
