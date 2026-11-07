import { AppError } from "@/domain/errors";
import type { Member, MemberBirthday } from "@/domain/types";
import type { MemberInsert, MemberRepository } from "@/repositories/member.repository";
import { toMember, toMemberBirthday } from "./mappers";
import type { TypedSupabaseClient } from "./client";

export class SupabaseMemberRepository implements MemberRepository {
  constructor(private readonly db: TypedSupabaseClient) {}

  async listBirthdaysInMonth(churchId: string, month: number): Promise<MemberBirthday[]> {
    const { data, error } = await this.db
      .from("members")
      .select("id, full_name, birth_month, birth_day")
      .eq("church_id", churchId)
      .eq("birth_month", month)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("birth_day", { ascending: true });
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toMemberBirthday);
  }

  async listForChurch(churchId: string): Promise<Member[]> {
    const { data, error } = await this.db
      .from("members")
      .select("*")
      .eq("church_id", churchId)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toMember);
  }

  async findById(id: string): Promise<Member | null> {
    const { data, error } = await this.db
      .from("members")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new AppError("DB", error.message);
    return data ? toMember(data) : null;
  }

  async create(input: MemberInsert): Promise<Member> {
    const [saved] = await this.createMany([input]);
    return saved;
  }

  async findManyByIds(ids: string[]): Promise<Member[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from("members").select("*").in("id", ids);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toMember);
  }

  async createMany(rows: MemberInsert[]): Promise<Member[]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.db
      .from("members")
      .insert(
        rows.map((input) => ({
          id: input.id,
          church_id: input.churchId,
          ministry_id: input.ministryId,
          full_name: input.fullName,
          birth_month: input.birthMonth,
          birth_day: input.birthDay,
          birth_year: input.birthYear,
          is_active: true,
          deleted_at: null,
          created_by: input.createdBy,
        }))
      )
      .select("*");
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toMember);
  }

  async update(
    id: string,
    patch: {
      fullName: string;
      ministryId: number;
      birthMonth: number | null;
      birthDay: number | null;
      birthYear: number | null;
    }
  ): Promise<Member> {
    const { data, error } = await this.db
      .from("members")
      .update({
        full_name: patch.fullName,
        ministry_id: patch.ministryId,
        birth_month: patch.birthMonth,
        birth_day: patch.birthDay,
        birth_year: patch.birthYear,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError("DB", error.message);
    return toMember(data);
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.db
      .from("members")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id);
    if (error) throw new AppError("DB", error.message);
  }
}
