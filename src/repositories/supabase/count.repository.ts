import { AppError } from "@/domain/errors";
import type { ChurchSummaryRow } from "@/domain/types";
import type { CountRepository } from "@/repositories/count.repository";
import { toSummary } from "./mappers";
import type { TypedSupabaseClient } from "./client";

export class SupabaseCountRepository implements CountRepository {
  constructor(private readonly db: TypedSupabaseClient) {}

  async summary(): Promise<ChurchSummaryRow[]> {
    const { data, error } = await this.db.rpc("church_summary");
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toSummary);
  }
}
