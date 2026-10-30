-- Overlap lookup for conflict detection. Service role only: a user JWT must not
-- read another church's church-only rows through this function.
-- Also lets Admin write public local events (blueprint §6). Church-only stays closed to Admin.

create function public.activities_overlapping(p_start timestamptz, p_end timestamptz)
returns setof public.activities
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.activities
  where deleted_at is null
    and start_at < p_end
    and end_at > p_start
$$;

revoke all on function public.activities_overlapping(timestamptz, timestamptz) from public;
grant execute on function public.activities_overlapping(timestamptz, timestamptz) to service_role;

create policy "activities_admin_insert_public"
  on public.activities for insert
  to authenticated
  with check (
    public.app_is_admin()
    and public.app_is_active()
    and created_by = auth.uid()
    and scope = 'LOCAL'
    and visibility = 'PUBLIC'
    and church_id is not null
  );

create policy "activities_admin_update_public"
  on public.activities for update
  to authenticated
  using (
    public.app_is_admin()
    and public.app_is_active()
    and deleted_at is null
    and scope = 'LOCAL'
    and visibility = 'PUBLIC'
  )
  with check (
    public.app_is_admin()
    and scope = 'LOCAL'
    and visibility = 'PUBLIC'
    and church_id is not null
  );
