import type { Church } from "@/domain/types";

const KEY = "west-mis-directory";

export function rememberDirectory(churches: Church[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(churches));
  } catch {
    // A private window or a full disk. The directory that is already open still shows.
  }
}

export function rememberChurch(church: Church) {
  const rest = readDirectory().filter((item) => item.id !== church.id);
  rememberDirectory([...rest, church]);
}

export function readDirectory(): Church[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChurch);
  } catch {
    return [];
  }
}

function isChurch(value: unknown): value is Church {
  if (!value || typeof value !== "object") return false;
  const church = value as Church;
  return typeof church.id === "string" && typeof church.name === "string" && typeof church.isActive === "boolean";
}
