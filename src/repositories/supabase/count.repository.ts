import { AppError } from "@/domain/errors";
import type { ChurchDepartmentCount, ChurchSummaryRow } from "@/domain/types";
import type { CountRepository } from "@/repositories/count.repository";
import { toCount, toSummary } from "./mappers";
import type { TypedSupabaseClient } from "./client";

export class SupabaseCountRepository implements CountRepository {
  constructor(private readonly db: TypedSupabaseClient) {}

  async listForChurch(churchId: string): Promise<ChurchDepartmentCount[]> {
    const { data, error } = await this.db
      .from("church_department_counts")
      .select("*")
      .eq("church_id", churchId);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toCount);
  }

  async upsert(input: {
    churchId: string;
    ministryId: number;
    memberCount: number;
    rosterComplete: boolean;
    updatedBy: string;
  }): Promise<ChurchDepartmentCount> {
    const { data, error } = await this.db
      .from("church_department_counts")
      .upsert(
        {
          church_id: input.churchId,
          ministry_id: input.ministryId,
          member_count: input.memberCount,
          roster_complete: input.rosterComplete,
          updated_by: input.updatedBy,
        },
        { onConflict: "church_id,ministry_id" }
      )
      .select("*")
      .single();
    if (error) throw new AppError("DB", error.message);
    return toCount(data);
  }

  async summary(): Promise<ChurchSummaryRow[]> {
    const { data, error } = await this.db.rpc("church_summary");
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toSummary);
  }
}
