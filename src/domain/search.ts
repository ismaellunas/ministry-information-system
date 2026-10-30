/** Join visible list fields into one string the search box can match. */
export function searchableText(parts: Array<string | null | undefined>): string {
  const raw = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  const digits = raw.map((part) => part.replace(/\D/g, "")).filter((part) => part.length >= 3);
  return [...raw, ...digits].join(" ");
}

/** True when every whitespace-separated token in `query` appears in `haystack`. */
export function matchesSearchQuery(haystack: string, query: string): boolean {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const text = haystack.toLowerCase();
  const compact = text.replace(/[\s()[\].,+/-]/g, "");
  return tokens.every((token) => text.includes(token) || compact.includes(token.replace(/\D/g, "") || token));
}
