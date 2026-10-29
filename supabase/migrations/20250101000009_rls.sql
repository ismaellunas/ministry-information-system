-- Enable RLS on every table.
alter table public.churches               enable row level security;
alter table public.ministries             enable row level security;
alter table public.profiles               enable row level security;
alter table public.profile_roles          enable row level security;
alter table public.members                enable row level security;
alter table public.church_department_counts enable row level security;
alter table public.activities             enable row level security;
alter table public.activity_conflicts     enable row level security;
alter table public.notifications          enable row level security;
alter table public.push_subscriptions     enable row level security;
alter table public.audit_log              enable row level security;

-- ============================================================
-- CHURCHES
-- ============================================================
-- Any signed-in active user may read all churches.
create policy "churches_read"
  on public.churches for select
  to authenticated
  using (public.app_is_active());

-- Admin may insert and update all columns.
create policy "churches_admin_insert"
  on public.churches for insert
  to authenticated
  with check (public.app_is_admin());

create policy "churches_admin_update"
  on public.churches for update
  to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());

-- Church rep may update restricted columns on their own church.
-- (Full column restriction enforced in service layer; RLS allows the row update.)
create policy "churches_rep_update"
  on public.churches for update
  to authenticated
  using (
    id = public.app_church_id()
    and not public.app_is_admin()
  )
  with check (
    id = public.app_church_id()
    and not public.app_is_admin()
  );

-- ============================================================
-- MINISTRIES
-- ============================================================
-- Any signed-in active user may read. No client writes.
create policy "ministries_read"
  on public.ministries for select
  to authenticated
  using (public.app_is_active());

-- ============================================================
-- PROFILES
-- ============================================================
-- A user reads their own row.
create policy "profiles_read_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() and public.app_is_active());

-- Admin reads all profiles.
create policy "profiles_admin_read"
  on public.profiles for select
  to authenticated
  using (public.app_is_admin());

-- A user updates their own profile.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and public.app_is_active())
  with check (id = auth.uid());

-- Admin updates any profile (for deactivation, must_change_password, etc.)
create policy "profiles_admin_update"
  on public.profiles for update
  to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());

-- Profile is inserted by service role only (via AdminService).
-- No policy needed for authenticated here — handled via service role.

-- ============================================================
-- PROFILE_ROLES
-- ============================================================
-- A user reads their own rows.
create policy "profile_roles_read_own"
  on public.profile_roles for select
  to authenticated
  using (profile_id = auth.uid() and public.app_is_active());

-- Admin reads all.
create policy "profile_roles_admin_read"
  on public.profile_roles for select
  to authenticated
  using (public.app_is_admin());

-- Admin writes all (insert and delete).
create policy "profile_roles_admin_write"
  on public.profile_roles for insert
  to authenticated
  with check (public.app_is_admin());

create policy "profile_roles_admin_delete"
  on public.profile_roles for delete
  to authenticated
  using (public.app_is_admin());

-- ============================================================
-- MEMBERS
-- ============================================================
-- Church reps see and write only their own church's members.
-- Admin has no church_id → app_church_id() returns null → no rows.
create policy "members_church_rep_read"
  on public.members for select
  to authenticated
  using (
    church_id = public.app_church_id()
    and public.app_is_active()
    and deleted_at is null
  );

create policy "members_church_rep_insert"
  on public.members for insert
  to authenticated
  with check (
    church_id = public.app_church_id()
    and public.app_is_active()
  );

create policy "members_church_rep_update"
  on public.members for update
  to authenticated
  using (church_id = public.app_church_id() and public.app_is_active())
  with check (church_id = public.app_church_id());

-- ============================================================
-- CHURCH_DEPARTMENT_COUNTS
-- ============================================================
-- Church reps read/write their own church's counts.
create policy "counts_church_rep_read"
  on public.church_department_counts for select
  to authenticated
  using (
    church_id = public.app_church_id()
    and public.app_is_active()
  );

create policy "counts_church_rep_write"
  on public.church_department_counts for insert
  to authenticated
  with check (
    church_id = public.app_church_id()
    and public.app_is_active()
  );

create policy "counts_church_rep_update"
  on public.church_department_counts for update
  to authenticated
  using (church_id = public.app_church_id() and public.app_is_active())
  with check (church_id = public.app_church_id());

-- ============================================================
-- ACTIVITIES
-- ============================================================
-- SELECT: sectional rows for all signed-in; PUBLIC local for all; CHURCH_ONLY only for that church.
create policy "activities_read"
  on public.activities for select
  to authenticated
  using (
    public.app_is_active()
    and deleted_at is null
    and (
      scope = 'SECTIONAL'
      or (scope = 'LOCAL' and visibility = 'PUBLIC')
      or (scope = 'LOCAL' and visibility = 'CHURCH_ONLY' and church_id = public.app_church_id())
    )
  );

-- Admin can also read public local events (but not church-only)
create policy "activities_admin_read"
  on public.activities for select
  to authenticated
  using (
    public.app_is_admin()
    and deleted_at is null
    and (scope = 'SECTIONAL' or (scope = 'LOCAL' and visibility = 'PUBLIC'))
  );

-- INSERT: church reps for local events, ministry reps for sectional ministry events,
-- presbytery and admin for sectional general events.
-- The full can_manage check is in the service layer; RLS is defense in depth.
create policy "activities_insert"
  on public.activities for insert
  to authenticated
  with check (
    public.app_is_active()
    and created_by = auth.uid()
    and (
      -- Church rep inserting a local event for their church
      (scope = 'LOCAL' and church_id = public.app_church_id())
      -- Ministry rep inserting a ministry sectional event
      or (scope = 'SECTIONAL' and ministry_id = public.app_ministry_id() and ministry_id is not null)
      -- Presbytery or admin inserting any sectional event
      or (scope = 'SECTIONAL' and (public.app_is_presbytery() or public.app_is_admin()))
    )
  );

-- UPDATE: same ownership checks; cannot move to a different church
create policy "activities_update"
  on public.activities for update
  to authenticated
  using (
    public.app_is_active()
    and deleted_at is null
    and (
      (scope = 'LOCAL' and church_id = public.app_church_id())
      or (scope = 'SECTIONAL' and ministry_id = public.app_ministry_id() and ministry_id is not null)
      or (scope = 'SECTIONAL' and (public.app_is_presbytery() or public.app_is_admin()))
    )
  )
  with check (
    (scope = 'LOCAL' and church_id = public.app_church_id())
    or (scope = 'SECTIONAL' and ministry_id = public.app_ministry_id() and ministry_id is not null)
    or (scope = 'SECTIONAL' and (public.app_is_presbytery() or public.app_is_admin()))
  );

-- ============================================================
-- ACTIVITY_CONFLICTS
-- ============================================================
-- Client never queries this table directly (service layer manages it).
-- No authenticated select policy — service role handles inserts and reads.

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
-- Users read and update their own notifications.
create policy "notifications_read"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid() and public.app_is_active());

create policy "notifications_update"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid() and public.app_is_active())
  with check (user_id = auth.uid());

-- Inserts are service-role only.

-- ============================================================
-- PUSH_SUBSCRIPTIONS
-- ============================================================
create policy "push_subscriptions_read"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid() and public.app_is_active());

create policy "push_subscriptions_insert"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid() and public.app_is_active());

create policy "push_subscriptions_delete"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- AUDIT_LOG
-- ============================================================
-- Admin reads only. Inserts are service-role only.
create policy "audit_log_admin_read"
  on public.audit_log for select
  to authenticated
  using (public.app_is_admin());
