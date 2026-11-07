import type { Church } from "@/domain/types";

const KEY = "west-mis-directory";
const MINISTRIES_KEY = "west-mis-directory-ministries";

export interface DirectoryMinistry {
  id: number;
  name: string;
}

export function rememberDirectory(churches: Church[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(churches.map(withoutPastorBirthday)));
  } catch {
    // A private window or a full disk. The directory that is already open still shows.
  }
}

function withoutPastorBirthday(church: Church): Church {
  return { ...church, pastorBirthMonth: null, pastorBirthDay: null, pastorBirthYear: null };
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

/** Ministries a church rep can assign a new member to — static reference data, safe to cache long-term. */
export function rememberMinistries(ministries: DirectoryMinistry[]) {
  try {
    localStorage.setItem(MINISTRIES_KEY, JSON.stringify(ministries));
  } catch {
    // A private window or a full disk. The form that is already open still shows.
  }
}

export function readMinistries(): DirectoryMinistry[] {
  try {
    const raw = localStorage.getItem(MINISTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDirectoryMinistry);
  } catch {
    return [];
  }
}

function isDirectoryMinistry(value: unknown): value is DirectoryMinistry {
  if (!value || typeof value !== "object") return false;
  const ministry = value as DirectoryMinistry;
  return typeof ministry.id === "number" && typeof ministry.name === "string";
}
