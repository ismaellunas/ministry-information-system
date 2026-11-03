-- A church rep ("pastor") can now be assigned to more than one church, and a church
-- can already have more than one rep (that was never restricted). Previously a profile
-- could hold at most one CHURCH_REP row; now only an exact duplicate (same profile +
-- same church) is blocked.

drop index if exists public.profile_roles_church_rep_uq;

create unique index profile_roles_church_rep_uq
  on public.profile_roles (profile_id, church_id)
  where role = 'CHURCH_REP';

-- app_church_id() was a scalar helper that assumed one church per rep — with two or
-- more CHURCH_REP rows it would throw "more than one row returned by a subquery".
-- Replace it with a set-returning version. CASCADE drops every policy built on top of
-- it; this migration recreates each one below with set membership instead of scalar
-- equality (logic is otherwise unchanged).
drop function public.app_church_id() cascade;

create function public.app_church_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select church_id
  from public.profile_roles
  where profile_id = auth.uid()
    and role = 'CHURCH_REP'
    and public.app_is_active()
$$;

grant execute on function public.app_church_ids() to authenticated;

-- ============================================================
-- CHURCHES
-- ============================================================
create policy "churches_rep_update"
  on public.churches for update
  to authenticated
  using (
    id in (select public.app_church_ids())
    and not public.app_is_admin()
  )
  with check (
    id in (select public.app_church_ids())
    and not public.app_is_admin()
  );

-- ============================================================
-- MEMBERS
-- ============================================================
create policy "members_church_rep_read"
  on public.members for select
  to authenticated
  using (
    church_id in (select public.app_church_ids())
    and public.app_is_active()
    and deleted_at is null
  );

create policy "members_church_rep_insert"
  on public.members for insert
  to authenticated
  with check (
    church_id in (select public.app_church_ids())
    and public.app_is_active()
  );

create policy "members_church_rep_update"
  on public.members for update
  to authenticated
  using (church_id in (select public.app_church_ids()) and public.app_is_active())
  with check (church_id in (select public.app_church_ids()));

-- ============================================================
-- CHURCH_DEPARTMENT_COUNTS
-- ============================================================
create policy "counts_church_rep_read"
  on public.church_department_counts for select
  to authenticated
  using (
    church_id in (select public.app_church_ids())
    and public.app_is_active()
  );

create policy "counts_church_rep_write"
  on public.church_department_counts for insert
  to authenticated
  with check (
    church_id in (select public.app_church_ids())
    and public.app_is_active()
  );

create policy "counts_church_rep_update"
  on public.church_department_counts for update
  to authenticated
  using (church_id in (select public.app_church_ids()) and public.app_is_active())
  with check (church_id in (select public.app_church_ids()));

-- ============================================================
-- ACTIVITIES
-- ============================================================
create policy "activities_read"
  on public.activities for select
  to authenticated
  using (
    public.app_is_active()
    and deleted_at is null
    and (
      scope = 'SECTIONAL'
      or (scope = 'LOCAL' and visibility = 'PUBLIC')
      or (scope = 'LOCAL' and visibility = 'CHURCH_ONLY' and church_id in (select public.app_church_ids()))
    )
  );

create policy "activities_insert"
  on public.activities for insert
  to authenticated
  with check (
    public.app_is_active()
    and created_by = auth.uid()
    and (
      -- Church rep inserting a local event for one of their churches
      (scope = 'LOCAL' and church_id in (select public.app_church_ids()))
      -- Ministry rep inserting a ministry sectional event
      or (scope = 'SECTIONAL' and ministry_id = public.app_ministry_id() and ministry_id is not null)
      -- Presbytery or admin inserting any sectional event
      or (scope = 'SECTIONAL' and (public.app_is_presbytery() or public.app_is_admin()))
    )
  );

create policy "activities_update"
  on public.activities for update
  to authenticated
  using (
    public.app_is_active()
    and deleted_at is null
    and (
      (scope = 'LOCAL' and church_id in (select public.app_church_ids()))
      or (scope = 'SECTIONAL' and ministry_id = public.app_ministry_id() and ministry_id is not null)
      or (scope = 'SECTIONAL' and (public.app_is_presbytery() or public.app_is_admin()))
    )
  )
  with check (
    (scope = 'LOCAL' and church_id in (select public.app_church_ids()))
    or (scope = 'SECTIONAL' and ministry_id = public.app_ministry_id() and ministry_id is not null)
    or (scope = 'SECTIONAL' and (public.app_is_presbytery() or public.app_is_admin()))
  );

-- ============================================================
-- STORAGE (church logos)
-- ============================================================
create policy "church_logos_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'church-logos'
    and public.app_is_active()
    and (
      public.app_is_admin()
      or (
        (storage.foldername(name))[1] = 'churches'
        and (storage.foldername(name))[2]::uuid in (select public.app_church_ids())
      )
    )
  );

create policy "church_logos_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'church-logos'
    and public.app_is_active()
    and (
      public.app_is_admin()
      or (storage.foldername(name))[2]::uuid in (select public.app_church_ids())
    )
  );
