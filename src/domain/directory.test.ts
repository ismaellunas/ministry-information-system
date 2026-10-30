import { describe, expect, it } from "vitest";
import {
  canonicalMapPinUrl,
  decodePastorName,
  encodePastorName,
  extractGoogleMapsPin,
  formatPhoneInput,
  parseAddress,
  parseFacebookPageUrl,
  parsePastorNames,
  parsePhone,
  sortDirectoryChurches,
  toProperCase,
} from "./directory";

describe("sortDirectoryChurches", () => {
  it("lists open churches alphabetically and closed churches after them", () => {
    const sorted = sortDirectoryChurches([
      { name: "Zion Chapel", isActive: false },
      { name: "beta church", isActive: true },
      { name: "Alpha Assembly", isActive: false },
      { name: "Gamma Church", isActive: true },
    ]);
    expect(sorted.map((church) => church.name)).toEqual([
      "beta church",
      "Gamma Church",
      "Alpha Assembly",
      "Zion Chapel",
    ]);
  });
});

describe("toProperCase", () => {
  it("title-cases names and hyphenated parts", () => {
    expect(toProperCase("  juan dela CRUZ ")).toBe("Juan Dela Cruz");
    expect(toProperCase("mae-ANN")).toBe("Mae-Ann");
  });
});

describe("encode/decode pastor name", () => {
  it("round-trips first and last", () => {
    const stored = encodePastorName("Juan", "Dela Cruz");
    expect(decodePastorName(stored)).toEqual({
      firstName: "Juan",
      lastName: "Dela Cruz",
      display: "Juan Dela Cruz",
    });
  });

  it("reads a legacy single string", () => {
    expect(decodePastorName("GEWCI Pastor")).toEqual({
      firstName: "GEWCI",
      lastName: "Pastor",
      display: "GEWCI Pastor",
    });
  });
});

describe("parsePastorNames", () => {
  it("allows both blank", () => {
    expect(parsePastorNames("", "  ")).toEqual({ firstName: null, lastName: null });
  });

  it("requires both when one is filled", () => {
    expect(() => parsePastorNames("Juan", "")).toThrow(/both first and last name/);
  });

  it("stores proper case", () => {
    expect(parsePastorNames("juan", "dela cruz")).toEqual({
      firstName: "Juan",
      lastName: "Dela Cruz",
    });
  });
});

describe("phone format", () => {
  it("masks while typing", () => {
    expect(formatPhoneInput("0917")).toBe("(0917");
    expect(formatPhoneInput("09171234")).toBe("(0917) 1234");
    expect(formatPhoneInput("09171234567")).toBe("(0917) 1234 567");
  });

  it("accepts the full pattern", () => {
    expect(parsePhone("09171234567")).toBe("(0917) 1234 567");
    expect(parsePhone("(0917) 1234 567")).toBe("(0917) 1234 567");
  });

  it("rejects a short number", () => {
    expect(() => parsePhone("0917123")).toThrow(/\(0917\) 1234 567/);
  });
});

describe("facebook page", () => {
  it("accepts facebook.com pages", () => {
    expect(parseFacebookPageUrl("https://www.facebook.com/gewci")).toBe(
      "https://www.facebook.com/gewci"
    );
  });

  it("rejects a non-Facebook host", () => {
    expect(() => parseFacebookPageUrl("https://example.com/gewci")).toThrow(/facebook.com/);
  });

  it("rejects facebook.com with no page", () => {
    expect(() => parseFacebookPageUrl("https://www.facebook.com/")).toThrow(/page name/);
  });
});

describe("address", () => {
  it("keeps multiple lines and trims", () => {
    expect(parseAddress("  Purok 1  \n\n  Butuan City  \n")).toBe("Purok 1\n\nButuan City");
  });
});

describe("google maps pin", () => {
  it("reads @lat,lng", () => {
    expect(
      extractGoogleMapsPin("https://www.google.com/maps/place/Church/@8.2289,125.1234,17z")
    ).toEqual({ lat: 8.2289, lng: 125.1234 });
  });

  it("reads q=lat,lng", () => {
    expect(extractGoogleMapsPin("https://www.google.com/maps?q=8.2,125.1")).toEqual({
      lat: 8.2,
      lng: 125.1,
    });
  });

  it("builds a pin URL that opens Google Maps", () => {
    expect(canonicalMapPinUrl(8.2, 125.1)).toBe("https://www.google.com/maps?q=8.2,125.1");
  });
});
