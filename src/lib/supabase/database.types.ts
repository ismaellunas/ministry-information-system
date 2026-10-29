// Generated placeholder — run `supabase gen types typescript --local` to regenerate.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      churches: {
        Row: {
          id: string; name: string; pastor_name: string | null;
          pastor_phone: string | null; address: string | null;
          facebook_page_url: string | null; hotline_number: string | null;
          map_pin_url: string | null; logo_url: string | null;
          is_active: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["churches"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["churches"]["Insert"]>;
      };
      ministries: {
        Row: { id: number; code: string; name: string; tracks_membership: boolean; allows_churchless_rep: boolean };
        Insert: never;
        Update: never;
      };
      profiles: {
        Row: {
          id: string; first_name: string; last_name: string;
          phone_number: string | null; is_active: boolean;
          must_change_password: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      profile_roles: {
        Row: {
          id: string; profile_id: string;
          role: "ADMIN" | "SECTION_PRESBYTERY" | "SECTION_MINISTRY_REP" | "CHURCH_REP";
          church_id: string | null; ministry_id: number | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profile_roles"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["profile_roles"]["Insert"]>;
      };
      members: {
        Row: {
          id: string; church_id: string; ministry_id: number; full_name: string;
          birth_month: number | null; birth_day: number | null; birth_year: number | null;
          is_active: boolean; deleted_at: string | null; created_by: string | null;
          version: number; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["members"]["Row"], "version" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
      };
      church_department_counts: {
        Row: {
          church_id: string; ministry_id: number; member_count: number;
          roster_complete: boolean; updated_by: string | null; updated_at: string;
        };
        Insert: Database["public"]["Tables"]["church_department_counts"]["Row"];
        Update: Partial<Database["public"]["Tables"]["church_department_counts"]["Row"]>;
      };
      activities: {
        Row: {
          id: string; title: string; description: string | null; location: string | null;
          start_at: string; end_at: string; is_all_day: boolean;
          scope: "LOCAL" | "SECTIONAL";
          visibility: "CHURCH_ONLY" | "PUBLIC" | null;
          church_id: string | null; ministry_id: number | null;
          host_church_id: string | null; at_own_church: boolean | null;
          audience: "PASTORS_ONLY" | "ALL_CHURCHES" | "PUBLIC" | "MM_ONLY" | "WM_ONLY" | "YA_ONLY" | "MM_AND_WM" | "CHRISTIAN_EDUCATION" | null;
          created_by: string; version: number; deleted_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activities"]["Row"], "version" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
      };
      activity_conflicts: {
        Row: {
          id: string; activity_id: string; other_activity_id: string; message: string;
          accepted_at: string | null; accepted_by: string | null;
          overlap_ended_at: string | null; reopen_generation: number; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_conflicts"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["activity_conflicts"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string; user_id: string; type: string; title: string;
          body: string | null; data: Json; dedupe_key: string | null;
          read_at: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      push_subscriptions: {
        Row: {
          id: string; user_id: string; endpoint: string;
          subscription: Json; user_agent: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["push_subscriptions"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
      };
      audit_log: {
        Row: {
          id: number; actor_id: string | null; action: string;
          entity: string | null; entity_id: string | null;
          detail: Json | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_log"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      app_is_active: { Args: Record<string, never>; Returns: boolean };
      app_church_id: { Args: Record<string, never>; Returns: string | null };
      app_ministry_id: { Args: Record<string, never>; Returns: number | null };
      app_is_admin: { Args: Record<string, never>; Returns: boolean };
      app_is_presbytery: { Args: Record<string, never>; Returns: boolean };
      official_member_count: { Args: { p_church: string; p_ministry: number }; Returns: number | null };
      church_summary: {
        Args: Record<string, never>;
        Returns: { church_id: string; church_name: string; ministry_id: number; member_count: number | null; reported: boolean; updated_at: string | null }[];
      };
    };
    Enums: {
      user_role: "ADMIN" | "SECTION_PRESBYTERY" | "SECTION_MINISTRY_REP" | "CHURCH_REP";
      activity_scope: "LOCAL" | "SECTIONAL";
      event_visibility: "CHURCH_ONLY" | "PUBLIC";
      audience_label: "PASTORS_ONLY" | "ALL_CHURCHES" | "PUBLIC" | "MM_ONLY" | "WM_ONLY" | "YA_ONLY" | "MM_AND_WM" | "CHRISTIAN_EDUCATION";
    };
  };
};
