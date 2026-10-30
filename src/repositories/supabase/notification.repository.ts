import { AppError } from "@/domain/errors";
import type { Json } from "@/lib/supabase/database.types";
import type {
  AppNotification,
  NotificationRepository,
  NotificationWrite,
} from "@/repositories/notification.repository";
import type { TypedSupabaseClient } from "./client";

export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(
    private readonly db: TypedSupabaseClient,
    private readonly admin: TypedSupabaseClient
  ) {}

  async listMine() {
    const { data, error } = await this.db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toNotification);
  }

  async markRead(id: string) {
    const { error } = await this.db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
    if (error) throw new AppError("DB", error.message);
  }

  async insertIgnore(row: NotificationWrite) {
    const { error } = await this.admin.from("notifications").insert({
      user_id: row.userId,
      type: row.type,
      title: row.title,
      body: row.body,
      dedupe_key: row.dedupeKey,
      data: row.data as Json,
      read_at: null,
    });
    if (error && error.code !== "23505") throw new AppError("DB", error.message);
  }
}

function toNotification(row: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Json;
  read_at: string | null;
  created_at: string;
}): AppNotification {
  const data = row.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : {};
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: data as Record<string, unknown>,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
