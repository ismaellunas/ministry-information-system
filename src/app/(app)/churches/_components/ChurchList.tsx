"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Church } from "@/domain/types";
import { searchableText } from "@/domain/search";
import { SearchableList } from "@/core/ui/searchable-list";
import { rememberDirectory } from "@/lib/directory-cache";

export function ChurchList({ churches }: { churches: Church[] }) {
  const [opened, setOpened] = useState<Church | null>(null);

  useEffect(() => {
    rememberDirectory(churches);
  }, [churches]);

  if (opened) {
    return (
      <div className="space-y-4">
        <button type="button" className="min-h-11 text-sm font-medium text-brand-500" onClick={() => setOpened(null)}>
          Directory
        </button>
        <ChurchReadView church={opened} />
      </div>
    );
  }

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
          onClick={(event) => {
            if (navigator.onLine) return;
            event.preventDefault();
            setOpened(church);
          }}
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

function ChurchReadView({ church }: { church: Church }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{church.name}</h1>
        {!church.isActive && <p className="page-copy mt-1">Closed — listed for the record.</p>}
      </div>
      {church.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={church.logoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
      )}
      <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
        <Row label="Pastor" value={church.pastorName} />
        <Row label="Pastor phone" value={church.pastorPhone} />
        <Row label="Hotline" value={church.hotlineNumber} />
        <Row label="Address" value={church.address} multiline />
        {church.facebookPageUrl && <p className="page-copy">Facebook page</p>}
        {church.mapPinUrl && <p className="page-copy">Map pin</p>}
      </div>
    </div>
  );
}

function Row({ label, value, multiline = false }: { label: string; value: string | null; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm text-gray-900${multiline ? " whitespace-pre-line" : ""}`}>{value}</p>
    </div>
  );
}
