import { AppError } from "@/domain/errors";
import type { Database } from "@/lib/supabase/database.types";
import type { ActivityRepository, ActivityWrite, ActivityWriteAccess } from "@/repositories/activity.repository";
import type { TypedSupabaseClient } from "./client";
import { toActivity } from "./mappers";

type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];

export class SupabaseActivityRepository implements ActivityRepository {
  constructor(
    private readonly db: TypedSupabaseClient,
    private readonly admin: TypedSupabaseClient
  ) {}

  async findById(id: string) {
    const { data, error } = await this.db.from("activities").select("*").eq("id", id).maybeSingle();
    if (error) throw new AppError("DB", error.message);
    return data ? toActivity(data) : null;
  }

  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const { data, error } = await this.admin.from("activities").select("*").in("id", ids);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).filter((row) => row.deleted_at == null).map(toActivity);
  }

  async listVisible(range: { start: Date; end: Date }) {
    const { data, error } = await this.db
      .from("activities")
      .select("*")
      .is("deleted_at", null)
      .lt("start_at", range.end.toISOString())
      .gt("end_at", range.start.toISOString())
      .order("start_at");
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toActivity);
  }

  async insert(row: ActivityWrite, access: ActivityWriteAccess = "user") {
    const { data, error } = await this.dbFor(access, row).from("activities").insert(toRow(row)).select("*").single();
    if (error) throw new AppError("DB", error.message);
    return toActivity(data);
  }

  async update(row: ActivityWrite, expectedVersion: number, access: ActivityWriteAccess = "user") {
    const { id, created_by: _createdBy, ...rest } = toRow(row);
    const { data, error } = await this.dbFor(access, row)
      .from("activities")
      .update(rest)
      .eq("id", id)
      .eq("version", expectedVersion)
      .select("*")
      .maybeSingle();
    if (error) throw new AppError("DB", error.message);
    if (!data) throw new AppError("VERSION", "This event changed. Reload it and try again.");
    return toActivity(data);
  }

  async softDelete(id: string, expectedVersion: number, access: ActivityWriteAccess = "user") {
    const client = access === "service" ? await this.serviceClientForDelete(id) : this.db;
    // A removed event is hidden by the read policy. Selecting it back makes Postgres
    // reject the update as a row-level security failure, so the delete never lands.
    const { error, count } = await client
      .from("activities")
      .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", id)
      .eq("version", expectedVersion);
    if (error) throw new AppError("DB", error.message);
    if (!count) throw new AppError("VERSION", "This event changed. Reload it and try again.");
  }

  private dbFor(access: ActivityWriteAccess, row: Pick<ActivityWrite, "scope" | "visibility">) {
    if (access !== "service") return this.db;
    if (row.scope === "LOCAL" && row.visibility === "PUBLIC") return this.admin;
    throw new AppError("FORBIDDEN", "Only a public local event can be saved for a church Admin does not belong to.");
  }

  private async serviceClientForDelete(id: string) {
    const { data, error } = await this.admin.from("activities").select("scope, visibility").eq("id", id).maybeSingle();
    if (error) throw new AppError("DB", error.message);
    if (!data || data.scope !== "LOCAL" || data.visibility !== "PUBLIC") {
      throw new AppError("FORBIDDEN", "Only a public local event can be removed for a church Admin does not belong to.");
    }
    return this.admin;
  }

  async listForPull(query: { updatedSince: string | null; start: Date | null; end: Date | null }) {
    const base = this.db.from("activities").select("*");
    const filtered = query.updatedSince
      ? base.gte("updated_at", query.updatedSince)
      : base.lt("start_at", (query.end ?? new Date(0)).toISOString()).gt("end_at", (query.start ?? new Date(0)).toISOString());
    const { data, error } = await filtered
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(500);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toActivity);
  }

  async listOverlapping(range: { start: Date; end: Date }) {
    const args = { p_start: range.start.toISOString(), p_end: range.end.toISOString() };
    const rpc = await this.admin.rpc("activities_overlapping", args);
    if (!rpc.error && rpc.data) return rpc.data.map(toActivity);
    const { data, error } = await this.admin
      .from("activities")
      .select("*")
      .is("deleted_at", null)
      .lt("start_at", args.p_end)
      .gt("end_at", args.p_start);
    if (error) throw new AppError("DB", error.message);
    return (data ?? []).map(toActivity);
  }
}

function toRow(row: ActivityWrite): ActivityInsert {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    start_at: row.startAt.toISOString(),
    end_at: row.endAt.toISOString(),
    is_all_day: row.isAllDay,
    scope: row.scope,
    visibility: row.visibility,
    church_id: row.churchId,
    ministry_id: row.ministryId,
    host_church_id: row.hostChurchId,
    at_own_church: row.atOwnChurch,
    audience: row.audience,
    created_by: row.createdBy,
    deleted_at: null,
  };
}
