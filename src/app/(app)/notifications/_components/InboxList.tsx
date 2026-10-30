"use client";

import { useRouter } from "next/navigation";
import { searchableText } from "@/domain/search";
import { SearchableList } from "@/core/ui/searchable-list";
import { markNotificationReadAction } from "../actions";

export function InboxList({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    body: string | null;
    createdAt: string;
    readAt: string | null;
    eventId: string | null;
  }>;
}) {
  const router = useRouter();
  return (
    <SearchableList
      items={items}
      itemKey={(item) => item.id}
      getSearchText={(item) => searchableText([item.title, item.body, item.createdAt])}
      placeholder="Clash or date"
      noneYet="No notices yet."
      noneFound={(query) => `No notices match “${query}”.`}
    >
      {(item) => (
        <button
          type="button"
          className="block min-h-11 w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-theme-xs"
          onClick={async () => {
            await markNotificationReadAction(item.id);
            if (item.eventId) router.push(`/calendar/${item.eventId}`);
            else router.refresh();
          }}
        >
          <p className={item.readAt ? "page-copy" : "text-sm font-semibold text-gray-900"}>{item.title}</p>
          {item.body && <p className="page-copy">{item.body}</p>}
          <p className="page-copy">{new Date(item.createdAt).toLocaleString("en-PH")}</p>
        </button>
      )}
    </SearchableList>
  );
}
