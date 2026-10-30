import { AppError } from "./errors";

const PHONE_DIGITS = 11;
export const PHONE_PATTERN = /^\(\d{4}\) \d{4} \d{3}$/;

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.com",
  "www.fb.com",
  "fb.me",
  "www.fb.me",
]);

const MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "www.maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
  "g.page",
]);

export function sortDirectoryChurches<T extends { name: string; isActive: boolean }>(churches: T[]): T[] {
  return [...churches].sort((left, right) => {
    if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
    return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
  });
}

export function toProperCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
        )
        .join("-")
    )
    .join(" ");
}

export function formatPastorName(
  firstName: string | null,
  lastName: string | null
): string | null {
  const composed = [firstName, lastName].filter(Boolean).join(" ").trim();
  return composed.length > 0 ? composed : null;
}

/** Persist first/last in pastor_name until the dedicated columns are applied. */
export function encodePastorName(
  firstName: string | null,
  lastName: string | null
): string | null {
  if (!firstName && !lastName) return null;
  return JSON.stringify({ first: firstName, last: lastName });
}

export function decodePastorName(raw: string | null): {
  firstName: string | null;
  lastName: string | null;
  display: string | null;
} {
  if (!raw) return { firstName: null, lastName: null, display: null };
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { first?: unknown; last?: unknown };
      const firstName = typeof parsed.first === "string" ? parsed.first : null;
      const lastName = typeof parsed.last === "string" ? parsed.last : null;
      if (firstName || lastName) {
        return { firstName, lastName, display: formatPastorName(firstName, lastName) };
      }
    } catch {
      // Fall through to legacy plain-text names.
    }
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
    display: trimmed,
  };
}

export function parsePastorNames(
  firstName: string,
  lastName: string
): { firstName: string | null; lastName: string | null } {
  const first = toProperCase(firstName);
  const last = toProperCase(lastName);
  if (!first && !last) return { firstName: null, lastName: null };
  if (!first || !last) {
    throw new AppError(
      "VALIDATION",
      "Enter both first and last name for the pastor, or leave both blank."
    );
  }
  return { firstName: first, lastName: last };
}

/** Formats digits as (XXXX) XXXX XXX while typing. */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, PHONE_DIGITS);
  if (digits.length === 0) return "";
  if (digits.length <= 4) return `(${digits}`;
  if (digits.length <= 8) return `(${digits.slice(0, 4)}) ${digits.slice(4)}`;
  return `(${digits.slice(0, 4)}) ${digits.slice(4, 8)} ${digits.slice(8)}`;
}

export function parsePhone(value: string, label = "Phone"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const formatted = formatPhoneInput(trimmed);
  if (!PHONE_PATTERN.test(formatted)) {
    throw new AppError("VALIDATION", `${label} must look like (0917) 1234 567.`);
  }
  return formatted;
}

export function parseFacebookPageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new AppError(
      "VALIDATION",
      "Facebook page must be a full link, like https://www.facebook.com/yourpage."
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("VALIDATION", "Facebook page must be an https link.");
  }
  const host = url.hostname.toLowerCase();
  if (!FACEBOOK_HOSTS.has(host)) {
    throw new AppError(
      "VALIDATION",
      "Facebook page must be a facebook.com or fb.com link."
    );
  }
  if (!url.pathname || url.pathname === "/") {
    throw new AppError("VALIDATION", "Facebook page must include the page name in the link.");
  }
  url.protocol = "https:";
  return url.toString();
}

export function parseAddress(value: string): string | null {
  const lines = value.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim());
  while (lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const collapsed: string[] = [];
  for (const line of lines) {
    if (line === "" && collapsed[collapsed.length - 1] === "") continue;
    collapsed.push(line);
  }
  const text = collapsed.join("\n");
  return text.length > 0 ? text : null;
}

export function isGoogleMapsUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl" || host === "g.page") return true;
  if (host === "goo.gl" || host === "www.goo.gl") {
    return url.pathname.toLowerCase().startsWith("/maps");
  }
  if (host === "maps.google.com" || host === "www.maps.google.com") return true;
  if (host === "google.com" || host === "www.google.com") {
    return url.pathname.toLowerCase().startsWith("/maps");
  }
  return false;
}

export function isShortMapsUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.page";
}

export function extractGoogleMapsPin(urlString: string): { lat: number; lng: number } | null {
  const at = urlString.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (at) return toPin(at[1], at[2]);
  const bang = urlString.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (bang) return toPin(bang[1], bang[2]);
  try {
    const url = new URL(urlString);
    for (const key of ["q", "query", "ll", "destination", "center"]) {
      const value = url.searchParams.get(key);
      if (!value) continue;
      const pair = value.match(/^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
      if (pair) return toPin(pair[1], pair[2]);
    }
  } catch {
    return null;
  }
  return null;
}

export function canonicalMapPinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function parseGoogleMapsUrl(value: string): URL {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError("VALIDATION", "Map pin is empty.");
  }
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new AppError(
      "VALIDATION",
      "Map pin must be a Google Maps link. Open Google Maps, drop a pin, and paste the share link."
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("VALIDATION", "Map pin must be an https Google Maps link.");
  }
  if (!isGoogleMapsUrl(url)) {
    throw new AppError(
      "VALIDATION",
      "Map pin must be a Google Maps link. Open Google Maps, drop a pin, and paste the share link."
    );
  }
  url.protocol = "https:";
  return url;
}

function toPin(latRaw: string, lngRaw: string): { lat: number; lng: number } | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
