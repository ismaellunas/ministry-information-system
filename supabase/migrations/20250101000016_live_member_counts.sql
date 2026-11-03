-- Department counts now always reflect real registered members instead of a
-- manually-typed figure. Both functions keep their exact signature/return
-- shape, so this is a pure body replacement — no app code depends on this
-- beyond the existing RPC call in SupabaseCountRepository.summary().

create or replace function public.official_member_count(p_church uuid, p_ministry smallint)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.members m
  where m.church_id = p_church
    and m.ministry_id = p_ministry
    and m.deleted_at is null
    and m.is_active
$$;

-- Summary for Admin, Presbytery, and ministry reps (counts only, no names).
-- "reported" now means "has at least one registered member", not "has a
-- typed-in church_department_counts row" — church_department_counts is no
-- longer consulted here.
create or replace function public.church_summary()
returns table (
  church_id    uuid,
  church_name  text,
  ministry_id  smallint,
  member_count int,
  reported     boolean,
  updated_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    m.id,
    public.official_member_count(c.id, m.id),
    (public.official_member_count(c.id, m.id) > 0),
    null::timestamptz
  from public.churches c
  join public.ministries m on m.tracks_membership
  where c.is_active
    and (
      public.app_is_admin()
      or public.app_is_presbytery()
      or (public.app_ministry_id() = m.id)
    )
$$;
