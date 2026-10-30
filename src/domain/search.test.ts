import { describe, expect, it } from "vitest";
import { matchesSearchQuery, searchableText } from "./search";

describe("searchableText", () => {
  it("joins fields and keeps phone digits", () => {
    expect(searchableText(["AG Baikingon", "Juan Dela Cruz", "(0917) 1234 567"])).toContain(
      "09171234567"
    );
  });
});

describe("matchesSearchQuery", () => {
  const haystack = searchableText([
    "AG Baikingon",
    "Juan Dela Cruz",
    "(0917) 1234 567",
    "Purok 1, Baikingon",
  ]);

  it("matches everything when the query is blank", () => {
    expect(matchesSearchQuery(haystack, "  ")).toBe(true);
  });

  it("is case-insensitive and requires every token", () => {
    expect(matchesSearchQuery(haystack, "juan baikingon")).toBe(true);
    expect(matchesSearchQuery(haystack, "juan manila")).toBe(false);
  });

  it("matches formatted phone digits", () => {
    expect(matchesSearchQuery(haystack, "0917")).toBe(true);
    expect(matchesSearchQuery(haystack, "09171234567")).toBe(true);
  });
});
