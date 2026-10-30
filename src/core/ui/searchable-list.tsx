"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { matchesSearchQuery } from "@/domain/search";
import { Input } from "./input";
import { Label } from "./label";

export function SearchableList<T>({
  items,
  itemKey,
  getSearchText,
  placeholder,
  label = "Search",
  noneYet,
  noneFound,
  hideRows = false,
  onFiltered,
  searchSlot,
  children,
}: {
  items: T[];
  itemKey: (item: T) => string;
  getSearchText: (item: T) => string;
  placeholder: string;
  label?: string;
  noneYet: string;
  noneFound: (query: string) => string;
  hideRows?: boolean;
  onFiltered?: (items: T[]) => void;
  /** When set, the search field renders into this element instead of above the rows. */
  searchSlot?: HTMLElement | null;
  children: (item: T) => ReactNode;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => items.filter((item) => matchesSearchQuery(getSearchText(item), query)),
    [getSearchText, items, query]
  );
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const notify = useRef(onFiltered);
  notify.current = onFiltered;
  const filteredKey = filtered.map((item) => `${itemKey(item)}\u0000${getSearchText(item)}`).join("\u0001");
  useEffect(() => {
    notify.current?.(filteredRef.current);
  }, [filteredKey]);

  if (items.length === 0) {
    return <p className="page-copy">{noneYet}</p>;
  }

  const search = (
    <form
      role="search"
      className="space-y-1"
      onSubmit={(event) => event.preventDefault()}
    >
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
      />
    </form>
  );

  return (
    <div className="space-y-3">
      {searchSlot ? createPortal(search, searchSlot) : searchSlot === undefined ? search : null}
      {filtered.length === 0 ? (
        <p className="page-copy">{noneFound(query.trim())}</p>
      ) : hideRows ? null : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Fragment key={itemKey(item)}>{children(item)}</Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
