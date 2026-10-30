"use client";

import { searchableText } from "@/domain/search";
import { SearchableList } from "@/core/ui/searchable-list";
import { EventCard, type CalendarItem } from "../calendar/_components/CalendarBoard";

export function UpcomingList({ items }: { items: CalendarItem[] }) {
  return (
    <SearchableList
      items={items}
      itemKey={(item) => item.id}
      getSearchText={(item) =>
        searchableText([item.title, item.churchName, item.ministryName, item.location, item.clashMessage])
      }
      placeholder="Title, church, or place"
      noneYet="Nothing on the calendar for the next 30 days."
      noneFound={(query) => `No events match “${query}”.`}
    >
      {(item) => <EventCard item={item} />}
    </SearchableList>
  );
}
