-- Members
create table public.members (
  id          uuid        primary key default gen_random_uuid(),
  church_id   uuid        not null references public.churches(id) on delete restrict,
  ministry_id smallint    not null references public.ministries(id),
  full_name   text        not null,
  birth_month smallint    check (birth_month between 1 and 12),
  birth_day   smallint    check (birth_day between 1 and 31),
  birth_year  smallint    check (birth_year between 1900 and extract(year from now())::int),
  is_active   boolean     not null default true,
  deleted_at  timestamptz,
  created_by  uuid        references public.profiles(id),
  version     int         not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint birthday_pair check (
    (birth_month is null and birth_day is null) or
    (birth_month is not null and birth_day is not null)
  ),
  constraint valid_month_day check (
    birth_day is null or birth_day <= case birth_month
      when 2  then 29
      when 4  then 30
      when 6  then 30
      when 9  then 30
      when 11 then 30
      else 31
    end
  )
);

create index members_church_idx
  on public.members (church_id)
  where deleted_at is null;

create index members_birthday_idx
  on public.members (birth_month, birth_day)
  where deleted_at is null and is_active and birth_month is not null;

create trigger members_touch
  before insert or update on public.members
  for each row execute function public.touch_row();

-- Current membership counts (no history)
create table public.church_department_counts (
  church_id      uuid        not null references public.churches(id) on delete restrict,
  ministry_id    smallint    not null references public.ministries(id),
  member_count   int         not null check (member_count >= 0),
  roster_complete boolean    not null default false,
  updated_by     uuid        references public.profiles(id),
  updated_at     timestamptz not null default now(),
  primary key (church_id, ministry_id)
);

create trigger counts_updated
  before update on public.church_department_counts
  for each row execute function public.set_updated_at();

-- Activities
create table public.activities (
  id            uuid                    primary key default gen_random_uuid(),
  title         text                    not null,
  description   text,
  location      text,
  start_at      timestamptz             not null,
  end_at        timestamptz             not null,  -- exclusive (half-open [start, end))
  is_all_day    boolean                 not null default false,
  scope         public.activity_scope   not null,
  visibility    public.event_visibility,           -- LOCAL only; null on SECTIONAL
  church_id     uuid                    references public.churches(id) on delete restrict,
  ministry_id   smallint                references public.ministries(id),
  host_church_id uuid                   references public.churches(id),
  at_own_church boolean,                           -- LOCAL only
  audience      public.audience_label,
  created_by    uuid                    not null references public.profiles(id),
  version       int                     not null default 1,
  deleted_at    timestamptz,
  created_at    timestamptz             not null default now(),
  updated_at    timestamptz             not null default now(),
  constraint time_chk check (end_at > start_at),
  constraint scope_chk check (
    (scope = 'LOCAL'     and church_id is not null and ministry_id is null
       and visibility is not null and at_own_church is not null and host_church_id is null) or
    (scope = 'SECTIONAL' and church_id is null     and visibility is null
       and at_own_church is null)
  )
);

create index activities_range_gist
  on public.activities
  using gist (tstzrange(start_at, end_at, '[)'))
  where deleted_at is null;

create index activities_sync_idx
  on public.activities (updated_at, id);

create trigger activities_touch
  before insert or update on public.activities
  for each row execute function public.touch_row();

-- Conflict pairs
create table public.activity_conflicts (
  id                  uuid        primary key default gen_random_uuid(),
  activity_id         uuid        not null references public.activities(id) on delete cascade,
  other_activity_id   uuid        not null references public.activities(id) on delete cascade,
  message             text        not null,
  accepted_at         timestamptz,
  accepted_by         uuid        references public.profiles(id),
  overlap_ended_at    timestamptz,
  reopen_generation   int         not null default 1,
  created_at          timestamptz not null default now(),
  check (activity_id <> other_activity_id)
);

create unique index activity_conflicts_pair_uq
  on public.activity_conflicts
  (least(activity_id, other_activity_id), greatest(activity_id, other_activity_id));

-- In-app notifications
create table public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null,
  title       text        not null,
  body        text,
  data        jsonb       not null default '{}',
  dedupe_key  text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- Push subscriptions
create table public.push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  endpoint    text        not null unique,
  subscription jsonb      not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- Audit log
create table public.audit_log (
  id          bigint      generated always as identity primary key,
  actor_id    uuid,
  action      text        not null,
  entity      text,
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
