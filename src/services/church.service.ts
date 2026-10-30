import {
  canonicalMapPinUrl,
  encodePastorName,
  extractGoogleMapsPin,
  isShortMapsUrl,
  parseAddress,
  parseFacebookPageUrl,
  parseGoogleMapsUrl,
  parsePastorNames,
  parsePhone,
} from "@/domain/directory";
import { AppError } from "@/domain/errors";
import type { Church, Profile } from "@/domain/types";
import type { AuditRepository } from "@/repositories/audit.repository";
import type { ChurchRepUpdateFields, ChurchRepository } from "@/repositories/church.repository";
import type { ProfileRepository } from "@/repositories/profile.repository";
import type { TypedSupabaseClient } from "@/repositories/supabase/client";

const LOGO_TYPES = new Set(["image/webp", "image/png", "image/jpeg"]);
const LOGO_MAX_BYTES = 204800;

export class ChurchService {
  constructor(
    private readonly actor: Profile,
    private readonly churches: ChurchRepository,
    private readonly profiles: ProfileRepository,
    private readonly audit: AuditRepository,
    private readonly storage: TypedSupabaseClient
  ) {}

  list(includeInactive = true): Promise<Church[]> {
    return this.churches.listAll(includeInactive);
  }

  async get(id: string): Promise<Church> {
    const church = await this.churches.findById(id);
    if (!church) throw new AppError("NOT_FOUND", "Church not found.");
    return church;
  }

  async create(name: string): Promise<Church> {
    this.assertAdmin();
    const trimmed = name.trim();
    if (!trimmed) throw new AppError("VALIDATION", "Church name is required.");
    const church = await this.churches.create({
      name: trimmed,
      pastorFirstName: null,
      pastorLastName: null,
      pastorName: null,
      pastorPhone: null,
      address: null,
      facebookPageUrl: null,
      hotlineNumber: null,
      mapPinUrl: null,
      logoUrl: null,
      isActive: true,
    });
    await this.audit.record(this.actor.id, "church.create", "church", church.id, { name: trimmed });
    return church;
  }

  async rename(id: string, name: string): Promise<Church> {
    this.assertAdmin();
    const trimmed = name.trim();
    if (!trimmed) throw new AppError("VALIDATION", "Church name is required.");
    const church = await this.churches.adminUpdate(id, { name: trimmed });
    await this.audit.record(this.actor.id, "church.rename", "church", id, null);
    return church;
  }

  async close(id: string): Promise<Church> {
    this.assertAdmin();
    const remaining = await this.profiles.countRepRolesForChurch(id);
    if (remaining > 0) {
      throw new AppError(
        "HAS_REPS",
        "Reassign this church's representatives before closing it."
      );
    }
    const church = await this.churches.adminUpdate(id, { isActive: false });
    await this.audit.record(this.actor.id, "church.close", "church", id, null);
    return church;
  }

  async updateDirectory(id: string, data: ChurchRepUpdateFields): Promise<Church> {
    const church = await this.get(id);
    if (!this.canEditDirectory(church.id)) {
      throw new AppError("FORBIDDEN", "You cannot edit this church's directory.");
    }
    const patch = await sanitizeDirectory(data);
    const updated = this.isAdmin()
      ? await this.churches.adminUpdate(id, patch)
      : await this.churches.repUpdate(id, patch);
    await this.audit.record(this.actor.id, "church.directory.update", "church", id, null);
    return updated;
  }

  async uploadLogo(id: string, file: File): Promise<Church> {
    await this.get(id);
    if (!this.canEditDirectory(id)) {
      throw new AppError("FORBIDDEN", "You cannot change this church's logo.");
    }
    if (!LOGO_TYPES.has(file.type)) {
      throw new AppError("VALIDATION", "Logo must be a WebP, PNG, or JPEG image.");
    }
    if (file.size > LOGO_MAX_BYTES) {
      throw new AppError("VALIDATION", "Logo must be 200 KB or smaller.");
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `churches/${id}/logo.${ext}`;
    const { error } = await this.storage.storage.from("church-logos").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw new AppError("STORAGE", error.message);
    const { data } = this.storage.storage.from("church-logos").getPublicUrl(path);
    await this.churches.updateLogoUrl(id, data.publicUrl);
    await this.audit.record(this.actor.id, "church.logo.update", "church", id, null);
    return this.get(id);
  }

  canEditDirectory(churchId: string): boolean {
    return this.isAdmin() || this.actor.roles.some(
      (role) => role.role === "CHURCH_REP" && role.churchId === churchId
    );
  }

  private isAdmin() {
    return this.actor.roles.some((role) => role.role === "ADMIN");
  }

  private assertAdmin() {
    if (!this.isAdmin()) throw new AppError("FORBIDDEN", "Only Admin can do that.");
  }
}

async function sanitizeDirectory(data: ChurchRepUpdateFields): Promise<ChurchRepUpdateFields> {
  const names =
    data.pastorFirstName !== undefined || data.pastorLastName !== undefined
      ? parsePastorNames(data.pastorFirstName ?? "", data.pastorLastName ?? "")
      : undefined;
  return {
    pastorFirstName: names?.firstName,
    pastorLastName: names?.lastName,
    pastorName: names
      ? encodePastorName(names.firstName, names.lastName)
      : undefined,
    pastorPhone:
      data.pastorPhone === undefined ? undefined : parsePhone(data.pastorPhone ?? "", "Pastor phone"),
    address: data.address === undefined ? undefined : parseAddress(data.address ?? ""),
    facebookPageUrl:
      data.facebookPageUrl === undefined
        ? undefined
        : parseFacebookPageUrl(data.facebookPageUrl ?? ""),
    hotlineNumber:
      data.hotlineNumber === undefined ? undefined : parsePhone(data.hotlineNumber ?? "", "Hotline"),
    mapPinUrl: data.mapPinUrl === undefined ? undefined : await resolveMapPin(data.mapPinUrl ?? ""),
    logoUrl: data.logoUrl,
  };
}

async function resolveMapPin(value: string): Promise<string | null> {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = parseGoogleMapsUrl(trimmed);
  const direct = extractGoogleMapsPin(url.toString());
  if (direct) return canonicalMapPinUrl(direct.lat, direct.lng);
  if (!isShortMapsUrl(url)) {
    return url.toString();
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "WestSectionMIS/1.0" },
    });
    clearTimeout(timer);
    const finalUrl = response.url || url.toString();
    const pin = extractGoogleMapsPin(finalUrl);
    if (pin) return canonicalMapPinUrl(pin.lat, pin.lng);
    return finalUrl;
  } catch {
    throw new AppError(
      "VALIDATION",
      "Could not read that Google Maps link. Open the pin and paste the full maps.google.com URL."
    );
  }
}
