"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Church } from "@/domain/types";
import { splitDirectoryChurches } from "@/domain/directory";
import { searchableText } from "@/domain/search";
import { SearchableList } from "@/core/ui/searchable-list";
import { rememberDirectory, rememberMinistries } from "@/lib/directory-cache";
import { ChurchChooser } from "./ChurchChooser";
import { MemberForm } from "./MemberForm";

interface ChurchListMinistry {
  id: number;
  name: string;
}

interface OpenedView {
  church: Church;
  mode: "menu" | "read" | "add-member";
}

export function ChurchList({
  churches,
  repChurchIds,
  ministries,
}: {
  churches: Church[];
  repChurchIds: string[];
  ministries: ChurchListMinistry[];
}) {
  const [opened, setOpened] = useState<OpenedView | null>(null);

  useEffect(() => {
    rememberDirectory(churches);
  }, [churches]);

  useEffect(() => {
    if (ministries.length > 0) rememberMinistries(ministries);
  }, [ministries]);

  if (opened) {
    return (
      <div className="space-y-4">
        <button type="button" className="min-h-11 text-sm font-medium text-brand-500" onClick={() => setOpened(null)}>
          Directory
        </button>
        {opened.mode === "menu" && (
          <ChurchChooser
            churchId={opened.church.id}
            onEdit={() => setOpened({ church: opened.church, mode: "read" })}
            onAddMember={() => setOpened({ church: opened.church, mode: "add-member" })}
            showViewMembers={false}
          />
        )}
        {opened.mode === "read" && <ChurchReadView church={opened.church} />}
        {opened.mode === "add-member" && <MemberForm churchId={opened.church.id} ministries={ministries} />}
      </div>
    );
  }

  const { represented, others } = splitDirectoryChurches(churches, repChurchIds);

  return (
    <div className="space-y-3">
      {represented.length > 0 && (
        <div className="space-y-3">
          {represented.map((church) => (
            <ChurchCard key={church.id} church={church} isRep onOpen={setOpened} />
          ))}
        </div>
      )}
      <SearchableList
        items={others}
        itemKey={(church) => church.id}
        getSearchText={churchSearchText}
        placeholder="Church, pastor, phone, or address"
        noneYet={represented.length > 0 ? "No other churches." : "No churches yet."}
        noneFound={(query) => `No churches match “${query}”.`}
      >
        {(church) => (
          <ChurchCard
            church={church}
            isRep={repChurchIds.includes(church.id)}
            onOpen={setOpened}
          />
        )}
      </SearchableList>
    </div>
  );
}

function churchSearchText(church: Church): string {
  return searchableText([
    church.name,
    church.pastorName,
    church.pastorFirstName,
    church.pastorLastName,
    church.pastorPhone,
    church.hotlineNumber,
    church.address,
    church.isActive ? "active" : "closed",
  ]);
}

function ChurchCard({
  church,
  isRep,
  onOpen,
}: {
  church: Church;
  isRep: boolean;
  onOpen: (view: OpenedView) => void;
}) {
  return (
    <Link
      href={isRep ? `/churches/${church.id}/choose` : `/churches/${church.id}`}
      className={`block rounded-2xl bg-white p-4 shadow-theme-xs ${
        church.isActive ? "border border-gray-200" : "border-2 border-destructive"
      }`}
      onClick={(event) => {
        if (navigator.onLine) return;
        event.preventDefault();
        onOpen({ church, mode: isRep ? "menu" : "read" });
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
          {!church.isActive && <p className="text-sm font-bold text-destructive">CLOSED</p>}
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
  );
}

function ChurchReadView({ church }: { church: Church }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{church.name}</h1>
        {!church.isActive && <p className="mt-1 text-sm font-bold text-destructive">CLOSED</p>}
      </div>
      {church.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={church.logoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
      )}
      <div
        className={`space-y-2 rounded-2xl bg-white p-4 shadow-theme-xs ${
          church.isActive ? "border border-gray-200" : "border-2 border-destructive"
        }`}
      >
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
