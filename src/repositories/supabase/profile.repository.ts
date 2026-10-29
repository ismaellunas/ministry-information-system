import { AppError } from "@/domain/errors";
import type { Profile, ProfileRole, UserRole } from "@/domain/types";
import type { NewProfile, ProfileRepository } from "@/repositories/profile.repository";
import { toProfile, toRole } from "./mappers";
import type { TypedSupabaseClient } from "./client";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly db: TypedSupabaseClient) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.db.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw new AppError("DB", error.message);
    if (!data) return null;
    const roles = await this.listRoles(id);
    return toProfile(data, roles);
  }

  async listAll(): Promise<Profile[]> {
    const { data, error } = await this.db.from("profiles").select("*").order("last_name");
    if (error) throw new AppError("DB", error.message);
    const { data: roleRows, error: roleError } = await this.db.from("profile_roles").select("*");
    if (roleError) throw new AppError("DB", roleError.message);
    const byProfile = new Map<string, ProfileRole[]>();
    for (const row of roleRows ?? []) {
      const role = toRole(row);
      const list = byProfile.get(role.profileId) ?? [];
      list.push(role);
      byProfile.set(role.profileId, list);
    }
    return (data ?? []).map((row) => toProfile(row, byProfile.get(row.id) ?? []));
  }

  async insert(profile: NewProfile): Promise<Profile> {
    const { data, error } = await this.db
      .from("profiles")
      .insert({
        id: profile.id,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone_number: profile.phoneNumber,
        must_change_password: profile.mustChangePassword,
        is_active: true,
      })
      .select("*")
      .single();
    if (error) throw new AppError("DB", error.message);
    return toProfile(data, []);
  }

  async updateOwn(
    id: string,
    data: Partial<Pick<Profile, "firstName" | "lastName" | "phoneNumber">>
  ): Promise<Profile> {
    const patch: Record<string, unknown> = {};
    if (data.firstName !== undefined) patch.first_name = data.firstName;
    if (data.lastName !== undefined) patch.last_name = data.lastName;
    if (data.phoneNumber !== undefined) patch.phone_number = data.phoneNumber;
    const { data: row, error } = await this.db.from("profiles").update(patch).eq("id", id).select("*").single();
    if (error) throw new AppError("DB", error.message);
    const roles = await this.listRoles(id);
    return toProfile(row, roles);
  }

  async setMustChangePassword(id: string, value: boolean): Promise<void> {
    const { error } = await this.db.from("profiles").update({ must_change_password: value }).eq("id", id);
    if (error) throw new AppError("DB", error.message);
  }

  async setActive(id: string, value: boolean): Promise<void> {
    const { error } = await this.db.from("profiles").update({ is_active: value }).eq("id", id);
    if (error) throw new AppError("DB", error.message);
  }

  async addRole(
    profileId: string,
    role: UserRole,
    churchId?: string | null,
    ministryId?: number | null
  ): Promise<ProfileRole> {
    const { data, error } = await this.db
      .from("profile_roles")
      .insert({
        profile_id: profileId,
        role,
        church_id: churchId ?? null,
        ministry_id: ministryId ?? null,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new AppError("ROLE_TAKEN", "That role is already assigned.");
      }
      throw new AppError("DB", error.message);
    }
    return toRole(data);
  }

  async removeRole(profileId: string, roleId: string): Promise<void> {
    const { error } = await this.db
      .from("profile_roles")
      .delete()
      .eq("id", roleId)
      .eq("profile_id", profileId);
    if (error) throw new AppError("DB", error.message);
  }

  async listRoles(profileId: string): Promise<ProfileRole[]> {
    const { data, error } = await this.db.from("profile_roles").select("*").eq("profile_id", profileId);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toRole);
  }

  async countActiveRepsForChurch(churchId: string): Promise<number> {
    const { data: roles, error } = await this.db
      .from("profile_roles")
      .select("profile_id")
      .eq("role", "CHURCH_REP")
      .eq("church_id", churchId);
    if (error) throw new AppError("DB", error.message);
    const ids = [...new Set((roles ?? []).map((row) => row.profile_id))];
    if (ids.length === 0) return 0;
    const { data: profiles, error: profileError } = await this.db
      .from("profiles")
      .select("id")
      .in("id", ids)
      .eq("is_active", true);
    if (profileError) throw new AppError("DB", profileError.message);
    return profiles?.length ?? 0;
  }

  async countRepRolesForChurch(churchId: string): Promise<number> {
    const { data, error } = await this.db
      .from("profile_roles")
      .select("id")
      .eq("role", "CHURCH_REP")
      .eq("church_id", churchId);
    if (error) throw new AppError("DB", error.message);
    return data?.length ?? 0;
  }

  async deletePushSubscriptions(userId: string): Promise<void> {
    const { error } = await this.db.from("push_subscriptions").delete().eq("user_id", userId);
    if (error) throw new AppError("DB", error.message);
  }
}
