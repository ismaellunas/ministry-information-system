import { AppError } from "@/domain/errors";
import type { Ministry } from "@/domain/types";
import type { MinistryRepository } from "@/repositories/ministry.repository";
import { toMinistry } from "./mappers";
import type { TypedSupabaseClient } from "./client";

export class SupabaseMinistryRepository implements MinistryRepository {
  constructor(private readonly db: TypedSupabaseClient) {}

  async listAll(): Promise<Ministry[]> {
    const { data, error } = await this.db.from("ministries").select("*").order("id");
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toMinistry);
  }
}
