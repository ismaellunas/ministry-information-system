import { AppError } from "@/domain/errors";
import type { Church } from "@/domain/types";
import type { Database } from "@/lib/supabase/database.types";
import type { ChurchRepUpdateFields, ChurchRepository } from "@/repositories/church.repository";
import { toChurch } from "./mappers";
import type { TypedSupabaseClient } from "./client";

export class SupabaseChurchRepository implements ChurchRepository {
  constructor(private readonly db: TypedSupabaseClient) {}

  async findById(id: string): Promise<Church | null> {
    const { data, error } = await this.db.from("churches").select("*").eq("id", id).maybeSingle();
    if (error) throw new AppError("DB", error.message);
    return data ? toChurch(data) : null;
  }

  async listAll(includeInactive = false): Promise<Church[]> {
    let query = this.db.from("churches").select("*").order("name");
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toChurch);
  }

  async create(data: Omit<Church, "id">): Promise<Church> {
    const { data: row, error } = await this.db
      .from("churches")
      .insert({
        name: data.name,
        pastor_name: data.pastorName,
        pastor_phone: data.pastorPhone,
        address: data.address,
        facebook_page_url: data.facebookPageUrl,
        hotline_number: data.hotlineNumber,
        map_pin_url: data.mapPinUrl,
        logo_url: data.logoUrl,
        is_active: data.isActive,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new AppError("CHURCH_NAME_TAKEN", "A church with this name already exists.");
      throw new AppError("DB", error.message);
    }
    return toChurch(row);
  }

  async adminUpdate(id: string, data: Partial<Omit<Church, "id">>): Promise<Church> {
    const patch: Database["public"]["Tables"]["churches"]["Update"] = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.pastorName !== undefined) patch.pastor_name = data.pastorName;
    if (data.pastorPhone !== undefined) patch.pastor_phone = data.pastorPhone;
    if (data.address !== undefined) patch.address = data.address;
    if (data.facebookPageUrl !== undefined) patch.facebook_page_url = data.facebookPageUrl;
    if (data.hotlineNumber !== undefined) patch.hotline_number = data.hotlineNumber;
    if (data.mapPinUrl !== undefined) patch.map_pin_url = data.mapPinUrl;
    if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    const { data: row, error } = await this.db.from("churches").update(patch).eq("id", id).select("*").single();
    if (error) {
      if (error.code === "23505") throw new AppError("CHURCH_NAME_TAKEN", "A church with this name already exists.");
      throw new AppError("DB", error.message);
    }
    return toChurch(row);
  }

  async repUpdate(id: string, data: ChurchRepUpdateFields): Promise<Church> {
    const patch: Database["public"]["Tables"]["churches"]["Update"] = {};
    if (data.pastorName !== undefined) patch.pastor_name = data.pastorName;
    if (data.pastorPhone !== undefined) patch.pastor_phone = data.pastorPhone;
    if (data.address !== undefined) patch.address = data.address;
    if (data.facebookPageUrl !== undefined) patch.facebook_page_url = data.facebookPageUrl;
    if (data.hotlineNumber !== undefined) patch.hotline_number = data.hotlineNumber;
    if (data.mapPinUrl !== undefined) patch.map_pin_url = data.mapPinUrl;
    if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;
    const { data: row, error } = await this.db.from("churches").update(patch).eq("id", id).select("*").single();
    if (error) throw new AppError("DB", error.message);
    return toChurch(row);
  }

  async updateLogoUrl(id: string, url: string): Promise<void> {
    const { error } = await this.db.from("churches").update({ logo_url: url }).eq("id", id);
    if (error) throw new AppError("DB", error.message);
  }
}
