import { AppError } from "@/domain/errors";
import type { AuditEntry } from "@/domain/types";
import type { AuditRepository } from "@/repositories/audit.repository";
import { toAudit } from "./mappers";
import type { TypedSupabaseClient } from "./client";

export class SupabaseAuditRepository implements AuditRepository {
  constructor(private readonly db: TypedSupabaseClient) {}

  async record(
    actorId: string | null,
    action: string,
    entity: string | null,
    entityId: string | null,
    detail: Record<string, unknown> | null
  ): Promise<void> {
    const { error } = await this.db.from("audit_log").insert({
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId,
      detail,
    });
    if (error) throw new AppError("DB", error.message);
  }

  async listRecent(limit: number): Promise<AuditEntry[]> {
    const { data, error } = await this.db
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toAudit);
  }
}
