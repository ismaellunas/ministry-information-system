-- SECURITY DEFINER helpers — fixed search_path to prevent search_path injection.
-- These functions run as the definer, allowing them to check roles without recursion.

create function public.app_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.profiles where id = auth.uid()),
    false
  )
$$;

create function public.app_church_id()
returns uuid
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

create function public.app_ministry_id()
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select ministry_id
  from public.profile_roles
  where profile_id = auth.uid()
    and role = 'SECTION_MINISTRY_REP'
    and public.app_is_active()
$$;

create function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid()
      and role = 'ADMIN'
      and public.app_is_active()
  )
$$;

create function public.app_is_presbytery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid()
      and role = 'SECTION_PRESBYTERY'
      and public.app_is_active()
  )
$$;

-- Official member count: typed count until roster_complete, then live roster total.
create function public.official_member_count(p_church uuid, p_ministry smallint)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when c.roster_complete then (
      select count(*)::int
      from public.members m
      where m.church_id = c.church_id
        and m.ministry_id = c.ministry_id
        and m.deleted_at is null
        and m.is_active
    )
    else c.member_count
  end
  from public.church_department_counts c
  where c.church_id = p_church
    and c.ministry_id = p_ministry
$$;

-- Summary for Admin, Presbytery, and ministry reps (counts only, no names).
create function public.church_summary()
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
    (d.church_id is not null),
    d.updated_at
  from public.churches c
  join public.ministries m on m.tracks_membership
  left join public.church_department_counts d
    on d.church_id = c.id and d.ministry_id = m.id
  where c.is_active
    and (
      public.app_is_admin()
      or public.app_is_presbytery()
      or (public.app_ministry_id() = m.id)
    )
$$;
