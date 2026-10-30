import { AppError } from "@/domain/errors";
import type { ConflictRepository, StoredConflict } from "@/repositories/conflict.repository";
import type { TypedSupabaseClient } from "./client";

export class SupabaseConflictRepository implements ConflictRepository {
  constructor(private readonly admin: TypedSupabaseClient) {}

  async findById(id: string) {
    const { data, error } = await this.admin.from("activity_conflicts").select("*").eq("id", id).maybeSingle();
    if (error) throw new AppError("DB", error.message);
    return data ? toStored(data) : null;
  }

  async findPair(a: string, b: string) {
    const { data, error } = await this.admin
      .from("activity_conflicts")
      .select("*")
      .or(`and(activity_id.eq.${a},other_activity_id.eq.${b}),and(activity_id.eq.${b},other_activity_id.eq.${a})`)
      .maybeSingle();
    if (error) throw new AppError("DB", error.message);
    return data ? toStored(data) : null;
  }

  async listForActivities(ids: string[]) {
    if (ids.length === 0) return [];
    const { data, error } = await this.admin
      .from("activity_conflicts")
      .select("*")
      .or(`activity_id.in.(${ids.join(",")}),other_activity_id.in.(${ids.join(",")})`);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toStored);
  }

  async insert(row: { activityId: string; otherActivityId: string; message: string }) {
    const { data, error } = await this.admin
      .from("activity_conflicts")
      .insert({
        activity_id: row.activityId,
        other_activity_id: row.otherActivityId,
        message: row.message,
        accepted_at: null,
        accepted_by: null,
        overlap_ended_at: null,
        reopen_generation: 1,
      })
      .select("*")
      .single();
    if (error) throw new AppError("DB", error.message);
    return toStored(data);
  }

  async markEnded(id: string) {
    const { error } = await this.admin
      .from("activity_conflicts")
      .update({ overlap_ended_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new AppError("DB", error.message);
  }

  async reopen(id: string, generation: number) {
    const { data, error } = await this.admin
      .from("activity_conflicts")
      .update({
        overlap_ended_at: null,
        accepted_at: null,
        accepted_by: null,
        reopen_generation: generation,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError("DB", error.message);
    return toStored(data);
  }

  async accept(id: string, userId: string) {
    const { data, error } = await this.admin
      .from("activity_conflicts")
      .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError("DB", error.message);
    return toStored(data);
  }
}

function toStored(row: {
  id: string;
  activity_id: string;
  other_activity_id: string;
  accepted_at: string | null;
  accepted_by: string | null;
  overlap_ended_at: string | null;
  reopen_generation: number;
}): StoredConflict {
  return {
    id: row.id,
    activityId: row.activity_id,
    otherActivityId: row.other_activity_id,
    acceptedAt: row.accepted_at,
    acceptedBy: row.accepted_by,
    overlapEndedAt: row.overlap_ended_at,
    reopenGeneration: row.reopen_generation,
  };
}
