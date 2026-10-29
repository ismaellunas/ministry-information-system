-- One login, many roles.
-- ADMIN rows cannot share a profile with any other role (enforced in AdminService).
create table public.profile_roles (
  id          uuid          primary key default gen_random_uuid(),
  profile_id  uuid          not null references public.profiles(id) on delete cascade,
  role        public.user_role not null,
  church_id   uuid          references public.churches(id),
  ministry_id smallint      references public.ministries(id),
  created_at  timestamptz   not null default now(),
  constraint role_shape_chk check (
    (role = 'CHURCH_REP'           and church_id is not null  and ministry_id is null) or
    (role = 'SECTION_MINISTRY_REP' and church_id is null      and ministry_id is not null) or
    (role = 'SECTION_PRESBYTERY'   and church_id is null      and ministry_id is null) or
    (role = 'ADMIN'                and church_id is null      and ministry_id is null)
  )
);

-- A profile may only have one CHURCH_REP row (one home church)
create unique index profile_roles_church_rep_uq
  on public.profile_roles (profile_id)
  where role = 'CHURCH_REP';

-- Only one SECTION_PRESBYTERY in the system
create unique index profile_roles_one_presbytery
  on public.profile_roles (role)
  where role = 'SECTION_PRESBYTERY';

-- One rep per ministry
create unique index profile_roles_one_rep_per_ministry
  on public.profile_roles (ministry_id)
  where role = 'SECTION_MINISTRY_REP';

-- Admin flag is unique per profile (so no profile can have two ADMIN rows)
create unique index profile_roles_one_admin_role
  on public.profile_roles (profile_id)
  where role = 'ADMIN';
