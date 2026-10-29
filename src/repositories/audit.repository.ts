import type { AuditEntry } from "@/domain/types";

export interface AuditRepository {
  record(
    actorId: string | null,
    action: string,
    entity: string | null,
    entityId: string | null,
    detail: Record<string, unknown> | null
  ): Promise<void>;
  listRecent(limit: number): Promise<AuditEntry[]>;
}
