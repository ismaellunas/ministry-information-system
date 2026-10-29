# NORTHEASTERN MINDANAO DISTRICT-West Ministry Information System (MIS): Development Blueprint

**For:** Northeastern Mindanao District-West Section Ministers, Assemblies of God
**Stack:** Next.js (App Router) · Supabase (Postgres + Auth + Storage) · Vercel · PWA
**Budget:** $0/month (free tiers only)
**Architecture:** Service Layer + Repository Layer
**Status:** Decision lock v2. Product rules in this document replace Draft v1 and the original app definition.

> **How to read this document.** Where this blueprint disagrees with the original app definition or with Draft v1, this blueprint wins. §17 is the decision log. Items marked **(verify)** are facts about third-party free tiers or APIs that change often; confirm them in the vendor's current docs before relying on them.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Requirements Traceability](#2-requirements-traceability)
3. [Review of the App Definition: Corrections Made](#3-review-of-the-app-definition-corrections-made)
4. [Free-Tier Constraints and Mitigations](#4-free-tier-constraints-and-mitigations)
5. [Architecture](#5-architecture)
6. [Roles and Permission Matrix](#6-roles-and-permission-matrix)
7. [Data Model](#7-data-model)
8. [Core Domain Logic](#8-core-domain-logic)
9. [Server Surface (Actions and Endpoints)](#9-server-surface-actions-and-endpoints)
10. [UI Map and Dashboards](#10-ui-map-and-dashboards)
11. [PWA and Offline Design](#11-pwa-and-offline-design)
12. [Security and Privacy](#12-security-and-privacy)
13. [DevOps](#13-devops)
14. [Testing Strategy](#14-testing-strategy)
15. [Phased Roadmap](#15-phased-roadmap)
16. [Risk Register](#16-risk-register)
17. [Decision Log](#17-decision-log)
18. [Appendices](#18-appendices)

---

## 1. Product Overview

### 1.1 Purpose
A shared information system for the 28 churches of the NORTHEASTERN MINDANAO DISTRICT-West Section so that churches, ministries, and the Presbytery can:

1. **Plan activities and see clashes.** This is the core feature. The system warns and marks clashes in red. It never blocks a save. "Save anyway" is the normal path. Nobody is forced to move an event; unresolved clashes are settled in offline meetings.
2. Keep a **directory** of churches.
3. Track **current membership** per reporting department, and optionally **register members** per ministry.
4. Send **birthday reminders** to that church's own reps.
5. Use the calendar from a phone, **including creating and editing events with no signal**.

This app is the source of truth. Posting events here is mandatory. Nobody is assigned to chase a church that keeps planning only on Messenger.

### 1.2 Guiding Principles
- **Calendar first.** If a trade-off must be made, the calendar and its conflict rules win.
- **Free forever.** Every dependency must have a usable free tier, and the design must degrade gracefully when a limit is hit.
- **Church-owned member lists.** Member names stay with that church's reps. Admin sees counts only. The Presbytery sees names only for the one church he owns.
- **Church-only events stay private.** Admin, the Presbytery acting for the section, and other ministries cannot open another church's church-only event.
- **Phone first.** Most users will be on mobile, often on poor connections. The first release works offline for viewing, creating, and editing events.
- **Trustworthy data.** Every change is attributable. The audit log stores no member names and no birthdays.

### 1.3 Scale and rollout
- **28** local churches.
- Pilot church: **Great Emmanuel Worship Church Inc.**
- No existing spreadsheet import. Admin enters churches and users.
- Product owner for disputes during the build: the **Presbyter**.
- Login support: the **Admin**.
- Offline-upgrade tester: **Ptr. Jo Lunas**.
- Interface and training: **English**. Event titles may be English or Cebuano (plain text, no translation system).
- No print view and no PDF report in this MVP.
- No ministers directory, now or later.
- No recurring events and no standing weekly services in this MVP. Users enter the events they want checked. The system does not seed worship services.

### 1.4 Roles
A person has one login and may hold more than one role. The event form asks which role they are using before it saves. `ADMIN` cannot be combined with any other role. That keeps Admin from opening member names through a second role.

| Role | Who | How many |
|---|---|---|
| `CHURCH_REP` | Church representative | At least one per **active** church. Every rep of that church receives conflict alerts and birthday alerts. A profile holds at most one church. |
| `SECTION_MINISTRY_REP` | Section representative for one ministry | One person per ministry. Creates **sectional** events for that ministry only. |
| `SECTION_PRESBYTERY` | The Presbytery login | Exactly one profile. Must also be `CHURCH_REP` of exactly one home church. |
| `ADMIN` | System administrator | Manages users, churches, and system health. Sees membership **counts only**. Cannot hold another role. |

There is no separate `SPECIAL_MINISTRY` event scope. A ministry rep with no church is still a `SECTION_MINISTRY_REP`, and that person's events are sectional. Only **Evangelism** may be held by a rep who has no church. Every other ministry rep must also be a church rep.

The Presbytery hat is a **dashboard switch** between "my church" and "the section." It does not grant access. Postgres policies do.

---

## 2. Requirements Traceability

| # | Requirement | Where addressed | Release |
|---|---|---|---|
| 1 | Admin page, user registration | §9, §10, §15 Phase 1–2 | R1 |
| 2 | Per-user dashboards; section summary of membership counts | §7 `church_summary()`, §10 | R1 |
| 3 | Optional member registration per ministry | §7 `members`, §8.6, §15 Phase 5 | R2 |
| 4 | Membership count per reporting department | §7 `church_department_counts`, §8.6 | R1 |
| 5 | Birthdays (month/day optional; year optional), daily and first-Sunday digest at 6:00 AM | §8.3, §15 Phase 5 | R2 |
| 6 | Calendar with the locked conflict rules | §8.1 | R1 |
| 7 | Calendar is the major feature | §1.2, §15 Phases 3–4 | R1 |
| 8 | Phone home-screen shortcut | §11.1 | R1 |
| 9 | Login that does not expire | §8.5 | R1 |
| 10 | Offline view, create, and edit, with sync | §8.4, §11, §15 Phase 4 | R1 |
| 11 | Service Layer + Repository Layer | §5 | all |

**In scope beyond the original list:** church directory, notification inbox, audit log, install guide.

**Out of this MVP:** recurring events, weekly-service seeding, print/PDF, ministers directory, CSV import, ICS feed, notification mute switches, membership history, draft/approval.

---

## 3. Review of the App Definition: Corrections Made

Draft v1 corrections that still hold, plus the decision-lock changes an implementer must not miss.

| # | Earlier assumption | Rule now |
|---|---|---|
| 1 | RLS helpers queried `profiles` in a way that could recurse | `SECURITY DEFINER` helpers read `profile_roles` with a fixed `search_path` (§7) |
| 2 | Every signed-in user can read every event | **Church-only** local events are visible only to that church's reps. Public local events and all sectional events are visible to every signed-in user (§6, §8.1) |
| 3 | Departments were Kids, Youth, Young Adults, MM, WM, Pastoral | Reporting departments are Men's Ministry, Women's Ministry, Youth Alive, and Christian Education. Music and Evangelism have events and no membership count (§7.2) |
| 4 | Admin and Presbytery needed cross-church names | Admin sees no member names. Presbytery sees names only for his home church (§6) |
| 5 | One overlap rule for every pair | Conflict matrix in §8.1, including same-location and redacted "busy" notices |
| 6 | Whole-day events as a special case | Half-open `[start, end)`. The **server** turns a Manila civil date into bounds. A phone clock cannot shift the day |
| 7 | "PST (UTC+8)" | `Asia/Manila` everywhere. The Philippines has no DST |
| 8 | Vercel Cron as the 6:00 AM clock | `pg_cron` + `pg_net` calling a secured endpoint. A missed first Sunday is **not** sent on Monday (§8.3) |
| 9 | Dashboard "refresh token = 1 year" | Rely on default refresh behavior plus long cookie lifetime. **(verify)** (§8.5) |
| 10 | `signOut(userId, 'global')` | Deactivate revokes sessions immediately and every request checks `is_active`. **(verify the current admin API)** (§8.5) |
| 11 | Background Sync on all phones | Sync on app open, `online`, and `visibilitychange`. Background Sync is Chromium-only |
| 12 | One role column on `profiles` | `profile_roles`. Creating an event asks which role is acting |
| 13 | Hat switcher hides data | The hat only switches the dashboard. Policies hide other churches' names and church-only events |
| 14 | Cancel and Delete are different | One **Remove** action. The event disappears from the calendar. The row stays as a tombstone for sync |
| 15 | Feb 29 celebrated on Feb 28; birthday required | Month/day are optional. Feb 29 is celebrated on **March 1** in a non-leap year |
| 16 | `@ducanh2912/next-pwa` | Serwist, or whichever is current when build starts. **(verify)** |
| 17 | Offline write in a later release | The **first release** includes offline view, create, and edit of events |
| 18 | Conflict means time overlap only | Time overlap, plus **same host church** when a sectional event is hosted at a church (§8.1) |
| 19 | No audit log | `audit_log` on every mutation. Detail JSON must not contain member names, birthdays, or phones |
| 20 | Typed count and roster could disagree silently | The typed count stays official until a church rep marks that department's roster **complete**. Then the live roster total is official. Only the current number is kept |

---

## 4. Free-Tier Constraints and Mitigations

| Constraint (verify current numbers) | Impact | Mitigation |
|---|---|---|
| **Vercel Hobby is for personal, non-commercial use** | Account suspension is possible | **Accepted.** The app stays portable (no Vercel-only APIs) so it can move later. No host switch before build |
| Vercel Hobby cron: once/day, ±59 min, UTC | Cannot promise exactly 6:00 AM | `pg_cron` + `pg_net`. GitHub Actions `schedule` is a backup pinger, not the birthday authority |
| Supabase free projects **pause after ~7 days idle** | A quiet week takes the app offline | The daily job touches the database. Pausing also stops `pg_cron`, so an **external** pinger must hit `/api/health` and alert **09269292763**. The runbook says how to unpause |
| Supabase free: 500 MB database, 1 GB storage, 5 GB egress, 2 projects | Enough for 28 churches if tombstones, notifications, and audit rows are pruned | Dev and prod use the two projects. Logos ≤ 200 KB |
| Supabase free has no reliable automated backups | Data loss | A backup **job** and a pause **runbook** exist before public release. The copy must live **outside** Supabase. Destination and key holder are still undecided (§17.2) and block public release |
| Supabase auth email is rate-limited | Password mail may fail | Admin creates the account and sends the first password or reset link by email |
| iOS: Web Push only for an installed PWA; no Background Sync | Reminders and sync differ on iPhone | Install guide, in-app inbox, sync when the app is open |
| Vercel Hobby function limits | Fan-out can time out | Conflict fan-out writes inbox rows in the request. Push sending stays bounded. 28 churches is a small fan-out |
| GitHub Actions schedules can stall on an inactive repo | Backup and keep-alive die together | The health check alerts a person. Do not treat Actions as the only clock |

A dump stored only inside the same Supabase project is not a backup. If the project is paused or deleted, that copy dies with it.

---

## 5. Architecture

### 5.1 Stack
| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js App Router, TypeScript | |
| UI | Tailwind CSS + shadcn/ui + lucide-react | |
| Calendar UI | `react-big-calendar` unless FullCalendar's required views are confirmed free | Wrap behind one component. Do not take a paid calendar plugin |
| Auth/DB/Storage | Supabase (`@supabase/ssr`) | |
| Local DB | Dexie.js (IndexedDB) | Source for offline calendar reads |
| PWA | Serwist (or current equivalent) | **(verify)** |
| Push | `web-push` (Node runtime, not Edge) | VAPID keys |
| Email (optional) | Resend | Birthday digest only, after a verified domain. Not required for R1 or R2 |
| Validation | Zod | Shared client/server |
| Dates | `date-fns` + `date-fns-tz` (or Temporal) | All civil-date logic in `Asia/Manila` |
| Tests | Vitest, Playwright, pgTAP (Supabase CLI) | |

### 5.2 Layering (strict)

```
UI (Server/Client Components)
   │  calls
Server Actions / Route Handlers   ← thin: parse input (Zod), call a service, map errors
   │
Services  (business rules, authorization, conflict detection, fan-out)
   │  depend on interfaces only
Repository interfaces (src/repositories/*.repository.ts)
   │  implemented by
SupabaseXRepository (server)   |   DexieXRepository + Outbox (browser)
   │
Postgres (RLS) / IndexedDB
```

**Rules**
1. UI and route handlers never call Supabase or Dexie directly. They call services.
2. Repositories contain no product rules. They query, map, and persist. The Dexie activity repository may enqueue an outbox row; that is persistence, not conflict logic.
3. Services contain validation, authorization, conflict detection, and fan-out.
4. Services receive repositories through constructor injection. One composition root per runtime.
5. Pure domain logic (conflict classification, Manila civil dates, birthday math) lives in `src/domain/` with zero imports from Supabase, Dexie, React, or Next.
6. The service-role client is imported only from `*.admin.ts` modules and cron code guarded with `import 'server-only'`. It is used to create auth users, revoke sessions, insert conflict and notification and audit rows, and run the birthday job. It is **not** used to render member lists or church-only events. Those screens use the user JWT so RLS applies.
7. Online writes and offline replays both go through the server services. RLS stays on as defense in depth.
8. The calendar route is a **client** screen. It reads Dexie first and then syncs. A server component that fetches events on each request cannot be the offline calendar.
9. Browser `ActivityService.save` queues the write and runs a **provisional** conflict preview. It does not audit and it does not notify. The server save is the one that audits, reconciles conflicts, and notifies. The browser result is labeled provisional until sync returns.

### 5.3 Directory Layout

```text
/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/
├── public/
│   ├── icons/
│   └── manifest.webmanifest
├── src/
│   ├── app/
│   │   ├── (auth)/login, reset-password, change-password
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── calendar/
│   │   │   ├── churches/
│   │   │   ├── members/
│   │   │   ├── notifications/
│   │   │   ├── admin/
│   │   │   └── install/
│   │   └── api/
│   │       ├── cron/daily/route.ts
│   │       ├── health/route.ts
│   │       ├── push/subscribe/route.ts
│   │       ├── sync/pull/route.ts
│   │       └── sync/push/route.ts
│   ├── domain/
│   │   ├── conflict.ts
│   │   ├── time.ts
│   │   ├── birthday.ts
│   │   └── types.ts
│   ├── repositories/
│   ├── services/
│   ├── composition/
│   │   ├── server.ts
│   │   └── browser.ts
│   ├── core/
│   └── lib/
└── .github/workflows/
```

### 5.4 Example contracts

```ts
export interface ActivityRepository {
  findById(id: string): Promise<Activity | null>;
  listVisible(viewer: Viewer, range: { start: Date; end: Date }): Promise<Activity[]>;
  upsert(a: ActivityInput, expectedVersion?: number): Promise<Activity>;
  softDelete(id: string, expectedVersion: number): Promise<void>;
}

export class ActivityService {
  async previewConflicts(actor: Actor, draft: ActivityDraft) { /* no write */ }

  async save(actor: Actor, draft: ActivityDraft, expectedVersion?: number) {
    assertCanManage(actor, draft);
    const saved = await this.activities.upsert(toInput(draft, actor), expectedVersion);
    // Soft-block: a thrown notifier must not roll the user's success away.
    const conflicts = await this.conflicts.evaluateAndNotify(saved);
    await this.audit.record(actor, 'activity.save', saved.id); // no member payload
    return { activity: saved, conflicts: conflicts.summary };
  }
}
```

If notify or audit fails after the event row is stored, the API still returns **success**. The failure is logged for Admin. The event stays saved.

---

## 6. Roles and Permission Matrix

Legend: **R** read · **W** write · **S** counts only · **✗** no access · **own** the caller's church only

| Resource | CHURCH_REP | SECTION_MINISTRY_REP | SECTION_PRESBYTERY | ADMIN |
|---|---|---|---|---|
| Own church directory fields (pastor, phones, Facebook, address, map, hotline, logo) | R/W | R/W if also a church rep of that church | R/W for home church | R/W |
| Church name, active flag, close church | ✗ | ✗ | ✗ | R/W |
| Directory of all churches | R | R | R | R/W |
| Members (names, birth month/day, year, age) | R/W own | R/W own only when also that church's rep | R/W **home church only** | ✗ |
| Other churches' member names | ✗ | ✗ | ✗ | ✗ |
| Department counts, own church | R/W | R/W own church if also a church rep | R/W home church | ✗ |
| Counts, all churches | ✗ | S for **their** reporting ministry only | S | S |
| Mark roster complete | own church | own church if also a church rep | home church | ✗ |
| Church-only local events | R/W own church | own church only, via church-rep role | home church only | ✗ |
| Public local events | R all; W own church | R all; W own church via church-rep role | R all; W home church | R/W |
| Sectional events for a ministry | R | R/W **that ministry only** | R/W | R/W |
| General sectional events (no ministry) | R | R | R/W | R/W |
| Users, roles, sessions | ✗ | ✗ | ✗ | R/W |
| Audit log | ✗ | ✗ | ✗ | R |

A section ministry rep who is also a church rep uses the church-rep column when they act as the church, and the ministry column when they act as the ministry. The form records which one.

**Creator display.** On an event another church is allowed to open in full, show the creator's **phone only**. Do not show the creator's name. Reps of the creating church see the name. The Presbytery sees the name only on his home church's events.

**Closed church.** Admin marks it inactive only after its users are reassigned. The church, its past events, and its past counts stay visible for the record. It accepts no new events and has no logins. A closed church may have zero reps. An **active** church may not.

**Last rep.** Admin cannot deactivate the last active rep of an active church. Assign another rep first.

---

## 7. Data Model

### 7.1 Ministries

| Code | Name | Membership counts | Churchless rep allowed |
|---|---|---|---|
| `MM` | Men's Ministry | Yes | No |
| `WM` | Women's Ministry | Yes | No |
| `YA` | Youth Alive | Yes | No |
| `CE` | Christian Education | Yes | No |
| `MUSIC` | Music | No | No |
| `EVANGELISM` | Evangelism | No | Yes |

Missions is not a ministry in this system. "Missing" on the Admin dashboard applies only to MM, WM, YA, and CE.

### 7.2 Schema

```sql
create type public.user_role as enum
  ('ADMIN', 'SECTION_PRESBYTERY', 'SECTION_MINISTRY_REP', 'CHURCH_REP');

create type public.activity_scope as enum ('LOCAL', 'SECTIONAL');

create type public.event_visibility as enum ('CHURCH_ONLY', 'PUBLIC');

create type public.audience_label as enum (
  'PASTORS_ONLY', 'ALL_CHURCHES', 'PUBLIC',
  'MM_ONLY', 'WM_ONLY', 'YA_ONLY', 'MM_AND_WM', 'CHRISTIAN_EDUCATION'
);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create function public.touch_row() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.version := old.version + 1; end if;
  return new;
end $$;

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pastor_name text,
  pastor_phone text,
  address text,
  facebook_page_url text,
  hotline_number text,
  map_pin_url text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger churches_updated before update on public.churches
  for each row execute function public.set_updated_at();

create table public.ministries (
  id smallint generated always as identity primary key,
  code text not null unique,
  name text not null,
  tracks_membership boolean not null,
  allows_churchless_rep boolean not null default false
);
insert into public.ministries (code, name, tracks_membership, allows_churchless_rep) values
  ('MM', 'Men''s Ministry', true, false),
  ('WM', 'Women''s Ministry', true, false),
  ('YA', 'Youth Alive', true, false),
  ('CE', 'Christian Education', true, false),
  ('MUSIC', 'Music', false, false),
  ('EVANGELISM', 'Evangelism', false, true);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone_number text,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- One login, many roles. ADMIN rows cannot share a profile with any other role (enforced in AdminService).
create table public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  church_id uuid references public.churches(id),
  ministry_id smallint references public.ministries(id),
  created_at timestamptz not null default now(),
  constraint role_shape_chk check (
    (role = 'CHURCH_REP' and church_id is not null and ministry_id is null) or
    (role = 'SECTION_MINISTRY_REP' and church_id is null and ministry_id is not null) or
    (role = 'SECTION_PRESBYTERY' and church_id is null and ministry_id is null) or
    (role = 'ADMIN' and church_id is null and ministry_id is null)
  )
);
create unique index profile_roles_church_rep_uq
  on public.profile_roles (profile_id) where role = 'CHURCH_REP';
create unique index profile_roles_one_presbytery
  on public.profile_roles (role) where role = 'SECTION_PRESBYTERY';
create unique index profile_roles_one_rep_per_ministry
  on public.profile_roles (ministry_id) where role = 'SECTION_MINISTRY_REP';
create unique index profile_roles_one_admin_role
  on public.profile_roles (profile_id) where role = 'ADMIN';

create table public.members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete restrict,
  ministry_id smallint not null references public.ministries(id),
  full_name text not null,
  birth_month smallint check (birth_month between 1 and 12),
  birth_day smallint check (birth_day between 1 and 31),
  birth_year smallint check (birth_year between 1900 and extract(year from now())::int),
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_by uuid references public.profiles(id),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint birthday_pair check (
    (birth_month is null and birth_day is null) or
    (birth_month is not null and birth_day is not null)
  ),
  constraint valid_month_day check (
    birth_day is null or birth_day <= case birth_month
      when 2 then 29 when 4 then 30 when 6 then 30
      when 9 then 30 when 11 then 30 else 31 end)
);
create index members_church_idx on public.members (church_id) where deleted_at is null;
create index members_birthday_idx on public.members (birth_month, birth_day)
  where deleted_at is null and is_active and birth_month is not null;
create trigger members_touch before insert or update on public.members
  for each row execute function public.touch_row();

-- Current membership only. No year history. Overwrite replaces the previous number.
create table public.church_department_counts (
  church_id uuid not null references public.churches(id) on delete restrict,
  ministry_id smallint not null references public.ministries(id),
  member_count int not null check (member_count >= 0),
  roster_complete boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (church_id, ministry_id)
);
create trigger counts_updated before update on public.church_department_counts
  for each row execute function public.set_updated_at();

create table public.activities (
  id uuid primary key default gen_random_uuid(), -- client may supply
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,                  -- exclusive
  is_all_day boolean not null default false,
  scope public.activity_scope not null,
  visibility public.event_visibility,           -- LOCAL only; null on SECTIONAL
  church_id uuid references public.churches(id) on delete restrict,
  ministry_id smallint references public.ministries(id),
  host_church_id uuid references public.churches(id),
  at_own_church boolean,                        -- LOCAL only; default true
  audience public.audience_label,
  created_by uuid not null references public.profiles(id),
  version int not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_chk check (end_at > start_at),
  constraint scope_chk check (
    (scope = 'LOCAL' and church_id is not null and ministry_id is null
       and visibility is not null and at_own_church is not null and host_church_id is null) or
    (scope = 'SECTIONAL' and church_id is null and visibility is null
       and at_own_church is null)
  )
);
create index activities_range_gist on public.activities
  using gist (tstzrange(start_at, end_at, '[)'))
  where deleted_at is null;
create index activities_sync_idx on public.activities (updated_at, id);
create trigger activities_touch before insert or update on public.activities
  for each row execute function public.touch_row();

create table public.activity_conflicts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  other_activity_id uuid not null references public.activities(id) on delete cascade,
  message text not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id),
  overlap_ended_at timestamptz,
  reopen_generation int not null default 1,
  created_at timestamptz not null default now(),
  check (activity_id <> other_activity_id)
);
create unique index activity_conflicts_pair_uq on public.activity_conflicts
  (least(activity_id, other_activity_id), greatest(activity_id, other_activity_id));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
```

`detail` may list changed field names. It must not contain `full_name`, birth month, birth day, birth year, member phone, or a member payload.

There is no `CANCELLED` status. **Remove** sets `deleted_at`. The calendar hides the row. Sync still returns it so other phones delete their copy.

Audience labels do not hide an event and do not change conflicts. The label `PUBLIC` is not the visibility flag. Visibility is `CHURCH_ONLY` or `PUBLIC` on local events only.

### 7.3 Helpers and summary

```sql
create function public.app_is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false)
$$;

create function public.app_church_id() returns uuid
language sql stable security definer set search_path = public as $$
  select church_id from public.profile_roles
  where profile_id = auth.uid() and role = 'CHURCH_REP'
    and public.app_is_active()
$$;

create function public.app_ministry_id() returns smallint
language sql stable security definer set search_path = public as $$
  select ministry_id from public.profile_roles
  where profile_id = auth.uid() and role = 'SECTION_MINISTRY_REP'
    and public.app_is_active()
$$;

create function public.app_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid() and role = 'ADMIN' and public.app_is_active()
  )
$$;

create function public.app_is_presbytery() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid() and role = 'SECTION_PRESBYTERY' and public.app_is_active()
  )
$$;

-- Official number: typed count until roster_complete, then the live roster.
create function public.official_member_count(p_church uuid, p_ministry smallint)
returns int
language sql stable security definer set search_path = public as $$
  select case
    when c.roster_complete then (
      select count(*)::int from public.members m
      where m.church_id = c.church_id
        and m.ministry_id = c.ministry_id
        and m.deleted_at is null
        and m.is_active
    )
    else c.member_count
  end
  from public.church_department_counts c
  where c.church_id = p_church and c.ministry_id = p_ministry
$$;

create function public.church_summary()
returns table (
  church_id uuid,
  church_name text,
  ministry_id smallint,
  member_count int,
  reported boolean,
  updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, m.id, public.official_member_count(c.id, m.id),
         (d.church_id is not null), d.updated_at
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
```

`reported` is false when the active church has no count row for that department. A typed `0` is reported. Music and Evangelism never appear. A complete roster counts as reported even when the typed cell was never the source of the official number.

While `roster_complete` is false, a roster of 5 against a typed 40 shows **40**. After a church rep marks it complete, the section sees the live roster total. The typed number stays stored so clearing the flag restores it. Only church reps of that church, including the Presbytery for his home church, can change the flag. Admin cannot.

### 7.4 RLS

Enable RLS on every table in §7.2. No policy means no access for `anon` and `authenticated`.

- **profiles:** a user reads and updates their own row. Admin reads all profile rows (these are accounts, not members). No one else gets a general profile select. Event APIs return creator phone through the service, not by opening the profile.
- **profile_roles:** a user reads their own rows. Admin reads and writes all. Writes from other roles are denied.
- **churches:** any signed-in user may read. Admin may insert and update every column. A church rep may update only pastor name, pastor phone, Facebook, address, hotline, map pin, and logo on their own church. They cannot change `name` or `is_active`.
- **ministries:** any signed-in user may read. No client writes.
- **members:** `church_id = app_church_id()` for select and write. Admin has no church, so Admin gets zero member rows. The Presbytery sees members only because his profile also has `CHURCH_REP` for his home church.
- **church_department_counts:** same church match for direct reads and writes. Cross-church numbers come only from `church_summary()`.
- **activities select:** sectional rows for every signed-in user; `PUBLIC` local rows for every signed-in user; `CHURCH_ONLY` rows only when `church_id = app_church_id()`.
- **activities insert/update:** `can_manage` for the acting role (§6). `created_by` on insert is `auth.uid()`. Update cannot move a church-only event into another church's id. Admin's policies exclude `CHURCH_ONLY` rows.
- **activity_conflicts:** the client never queries this table directly. `ConflictService` returns a view model. Hidden sides become "Church A is busy" and the private activity id is omitted (§8.1).
- **notifications, push_subscriptions:** `user_id = auth.uid()`. Inserts of notifications use the service role.
- **audit_log:** Admin select only. Inserts use the service role.

`must_change_password` is enforced in the server session check, not only by a client redirect.

Closing a church (`is_active = false`) is an Admin service action: reassign or deactivate every rep of that church first, then flag the church. Do not `DELETE` the church row. Foreign keys are `ON DELETE RESTRICT` so a delete cannot cascade through history.

Hard-delete members 30 days after `deleted_at` via the daily job. Until then they are hidden from rosters, counts, and birthday alerts.

### 7.5 Storage
Bucket `church-logos`, public read, path `churches/{church_id}/logo.webp`. Upload: Admin or that church's rep. Max 200 KB, enforced in the storage policy as well as the client. MIME `image/webp`, `image/png`, or `image/jpeg`.

### 7.6 Account creation
`auth.users` and `profiles` are created together by `AdminService`. Public sign-up is off. There is no self-service registration. If profile creation fails, the service deletes the auth user it just created. A session with no profile must not be able to read events; the app shell rejects it.

---

## 8. Core Domain Logic

### 8.1 Calendar conflict engine

**Time model.** Stored instants, half-open `[start, end)`, interpreted in `Asia/Manila`.
- Timed events: the service converts the entered Manila wall time to UTC.
- All-day events: the client sends a civil date (or a start date and an end date). The **server** sets `start` to that date at 00:00 in `Asia/Manila` and `end` to the morning after the last date. The phone's timezone setting is ignored for all-day events.
- Overlap is `a.start < b.end && a.end > b.start`. Touching endpoints do not overlap.
- No maximum length. A very long event will turn red against every matching event in that span. That is accepted.

**Same location.** A sectional event stores an optional `host_church_id`. A local event defaults to `at_own_church = true`. Same location means `host_church_id = local.church_id` and `at_own_church` is true. Two free-text location strings never count as the same place.

**Audience** is a label only: Pastors Only, All Churches, Public, MM Only, WM Only, YA Only, MM & WM, Christian Education. It does not hide the event and it does not change the matrix.

**Classification.** Compare active, non-deleted events.

| Pair | Red? | Who sees the clash |
|---|---|---|
| Two events of the same church | Yes | People who can see **both** events. A viewer who cannot see a church-only side does not see a mark on the public side |
| Two local events, different churches | No | The other church sees the event only when it is public. No conflict row |
| Public local event and a **ministry** sectional event | Yes, wherever they are | Everyone signed in |
| Public local event and a **general** sectional event, different place | No | Everyone can see both events. No conflict row |
| Public local event held at Church A, and any sectional event hosted at Church A | Yes | Everyone signed in, with the public title |
| Church-only local event and a sectional event **not** hosted at that church | No | Church only. Hidden from everyone else |
| Church-only local event at Church A, and any sectional event (ministry or general) hosted at Church A | Yes | Church A's reps see the private title. The Presbytery, Admin, and the sectional creator see **"{Church} is busy"** plus the time. No private title, description, audience, creator name, or creator phone. Other churches do not see the busy notice. They still see the sectional event |
| Two sectional events (same ministry, different ministries, or ministry and general) | Yes | Everyone signed in |

Ministry events are sectional rows with `ministry_id` set. General sectional rows have `ministry_id` null. "Any sectional event hosted at Church A" includes ministry events. That is the exception to "church-only versus ministry is hidden": the exception fires only when the host church matches.

```ts
export type Scope = 'LOCAL' | 'SECTIONAL';
export type Visibility = 'CHURCH_ONLY' | 'PUBLIC';

export function overlaps(a: ActivityLike, b: ActivityLike) {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

export function sameLocation(local: ActivityLike, sectional: ActivityLike) {
  return sectional.scope === 'SECTIONAL'
    && local.scope === 'LOCAL'
    && local.atOwnChurch
    && sectional.hostChurchId != null
    && sectional.hostChurchId === local.churchId;
}

export function classify(a: ActivityLike, b: ActivityLike): 'CONFLICT' | 'NONE' {
  if (a.id === b.id || !overlaps(a, b) || a.deleted || b.deleted) return 'NONE';
  const [x, y] = a.scope === 'LOCAL' ? [a, b] : [b, a];
  if (x.scope === 'LOCAL' && y.scope === 'LOCAL')
    return x.churchId === y.churchId ? 'CONFLICT' : 'NONE';
  if (x.scope === 'SECTIONAL' && y.scope === 'SECTIONAL') return 'CONFLICT';
  // x is local, y is sectional
  if (x.visibility === 'PUBLIC' && y.ministryId != null) return 'CONFLICT';
  if (sameLocation(x, y)) return 'CONFLICT';
  return 'NONE';
}
```

`classify` decides that a pair conflicts. The service decides what each viewer is allowed to read about it.

**Busy redaction.** For a church-only local event conflicting with a sectional event at the same host church, the API returns:
- to that church's reps: both titles, the private description, and their own creator name;
- to the Presbytery, Admin, and the sectional creator: the sectional title, plus a line "{Church name} is busy" and the time;
- to everyone else: the sectional event with **no** conflict line for this pair.

The response for a redacted side must not include the private activity id, title, description, audience, or creator phone. RLS already blocks selecting that activity. The conflict DTO must not smuggle the id out.

**Flow on save (`evaluateAndNotify`)**
1. Load overlapping candidates with a security-definer query that can see church-only rows. The user JWT alone cannot, and would miss the busy case.
2. Classify.
3. Reconcile `activity_conflicts` by the unordered pair. Update the existing row. Do not insert a second row (the unique index forbids it).
4. When the times no longer overlap, set `overlap_ended_at`. Red clears.
5. When the times overlap again, clear `overlap_ended_at`, clear `accepted_at` and `accepted_by`, increment `reopen_generation`, and notify again.
6. A user who can manage either event may **accept** the overlap while the times still overlap. Set `accepted_at` and `accepted_by`. Red clears for everyone. Acceptance and "times no longer overlap" stay separate columns.
7. Dismissing a notification sets `read_at` only. Red stays.
8. Notify, idempotently, with dedupe key `conflict:{minId}:{maxId}:{userId}:{reopenGeneration}`:
   - Local side: every active rep of that church.
   - Sectional side: the creator and the Presbytery. One notification if those are the same person.
   - Busy case: church reps get the real title; Presbytery and the sectional creator get "{Church} is busy." Other churches get nothing for that pair.
9. Never refuse the save. The UI shows the warning before save and offers **Change time** and **Save anyway**.
10. If notification delivery fails, the save response is still success.

There is no in-app "who must yield" flag. A ministry fellowship is socially expected to move for a sectional ministers' meeting, and that expectation is handled in the offline meeting, not by the database.

### 8.2 Presbytery hat
`viewContext` is `LOCAL` or `SECTIONAL`, stored for the UI only.
- `LOCAL` shows his home-church dashboard, including that church's members and church-only events.
- `SECTIONAL` shows counts for all churches, public events, sectional events, and redacted busy notices. It does not call the member list for any other church.
- A crafted request cannot widen this. Member policies are church-scoped. Church-only activity policies are church-scoped.

### 8.3 Birthdays and the daily job

**Data rules**
- Month and day are optional. A member with no birthday is still listed and is skipped by reminders.
- Year is optional. Year and computed age render only on that church's own screens (its reps, and the Presbytery when it is his church).
- Month and day are visible to whoever may open that member. Admin cannot open members.
- Inactive members and soft-deleted members are excluded.
- Feb 29 is celebrated on **March 1** when the Manila year is not a leap year.
- Alerts go to every active rep of that church, and to the Presbytery only for his home church. Admin receives none.
- Lock-screen text may contain the person's name. There is no mute switch in the first release that includes birthdays.

**Scheduling**
- Target: 06:00 `Asia/Manila` (22:00 UTC the previous day).
- Primary: Supabase `pg_cron` + `pg_net` POST to `/api/cron/daily` with `Authorization: Bearer CRON_SECRET`. **(verify `pg_cron`, `pg_net`, and Vault on the free plan.)**
- The request may pass a Manila civil date. When it does not, the handler uses **today in Asia/Manila at the moment the handler runs**.
- A run later the same Manila morning (for example 11:00) still sends that date's alerts.
- A run that has crossed Manila midnight does **not** send the previous date.
- The first-Sunday digest runs only when that Manila date is a Sunday and the day of the month is 1 through 7. If that run fails and the next success is Monday, **skip the month**. There is no catch-up.
- On the first Sunday, send **both** the daily alert and the digest.
- Backup pinger: GitHub Actions hits the same endpoint. It is not a second copy of the birthday rules.
- The handler also runs a trivial database read so the project is less likely to pause. An external monitor must still alert a human, because a paused project does not run `pg_cron`.

**Job steps** (bearer auth, idempotent)
1. Resolve the Manila civil date.
2. Daily: for each church, active members whose month and day match that date (Feb 29 mapped to March 1 in a non-leap year). One inbox item plus push per church rep. Skip churches with no rep and log them.
3. Digest: only on the first Sunday, all of this month's birthdays for that church, sorted by day.
4. Dedupe keys: `bday:{yyyy-mm-dd}:{userId}` and `bdaydigest:{yyyy-mm}:{userId}`.
5. Ignore inactive profiles. Delete push subscriptions that return HTTP 404 or 410. Deactivation also deletes that user's subscriptions immediately.
6. Hard-delete members whose `deleted_at` is older than 30 days.
7. Log counts of sent, skipped, and failed. The log line must not include member names.

### 8.4 Offline storage and sync

The first release includes offline **view, create, and edit** of events. Member offline edits ship with R2, using the same outbox rules.

**What a phone stores**
- Events that viewer is allowed to see: own church (including church-only), every public local event, every sectional event.
- Never another church's church-only event.
- Own-church members only, and only after R2. Admin stores no members. The Presbytery stores members only for his home church.
- Outbox, sync cursor, conflict placeholders.

**Pull** (`GET /api/sync/pull?since=`)
- Returns rows changed after the cursor, including tombstones (`deleted_at` set).
- Cursor is `(updated_at, id)` with a small overlap so equal timestamps are not lost.
- The first pull loads the previous month through the next 12 months, plus any later event that overlaps that window.
- The server filters by the caller. A church rep's pull does not contain other churches' private events.

**Push** (`POST /api/sync/push`)
- Client UUIDs. Re-sending the same create is safe. If the queued create was edited before the first acknowledgement, the push sends the latest payload for that id, not an empty replay.
- Updates send `baseVersion`. A mismatch returns `conflict` and the UI asks **Keep mine / Keep server**.
- Each mutation runs through the same services as an online save.
- The outbox is FIFO per entity. A rejected mutation does not block a different entity.
- A mutation the server will never accept (permission, validation) is marked **Failed** and is not retried.
- A mutation queued longer than **30 days** is **Failed**. The phone then does a full refresh and drops the expired queue.
- Provisional offline conflicts can be wrong because church-only events of other churches are absent. After sync, the server result wins. If it adds a clash, the user gets an inbox item.

**Sync triggers:** app start, `online`, `visibilitychange` to visible, "Sync now", a timer while the app is open, and Background Sync on Chromium only.

**Logout** warns if the outbox has unsent items, then clears Dexie. Deactivation cannot erase a phone that is offline. The next time that phone connects, the app rejects the session, clears Dexie, and shows the signed-out screen.

**Installed-app upgrades.** A new deploy must migrate Dexie forward and must not drop a non-empty outbox. Ptr. Jo Lunas tests an update on a phone that still has an unsent edit.

### 8.5 Authentication and sessions
- Admin-created accounts only. Email and password. Two people cannot share an email. A rep without an email is not a user until they have one.
- The first password or reset link is sent by email. When login fails, the person contacts Admin.
- New users have `must_change_password = true` until the server records a completed change.
- Long-lived sessions: `@supabase/ssr` cookies with a long `maxAge`, refresh-token rotation, no inactivity timeout. **(verify current Supabase session settings.)** Offline refresh can fail. After the access token expires offline, the app still shows the Dexie calendar for a user who was already signed in. It does not send the queue until a refresh succeeds.
- **Deactivate** sets `is_active = false`, deletes `auth` sessions and refresh tokens, and deletes push subscriptions in the same action. The next request fails. Do not wait for access-token expiry. **(verify the current session-revoke API.)** Admin does this immediately when a rep leaves.
- "Sign out everywhere" is the same session revoke without setting `is_active = false`.

### 8.6 Membership counts
- The number is **membership**, not attendance.
- One person belongs to one ministry at that church.
- Church reps overwrite the current typed count at any time. There is no month lock and no stored history.
- The section sees the typed count until the roster is marked complete for that department. Example: typed 40 and five roster rows shows 40 until the flag is set, then shows 5, and follows later roster adds and removes.
- Missing means an active church has no count row for MM, WM, YA, or CE.

---

## 9. Server Surface

| Area | Operation | Who |
|---|---|---|
| Auth | login, logout, change password | any account |
| Admin | create, update, deactivate user; assign roles; revoke sessions; reset link | ADMIN |
| Admin | create church; rename; close (after reassignment) | ADMIN |
| Churches | directory read; update own directory fields; logo | signed in / that church's reps |
| Counts | get and set own typed count; mark roster complete | that church's reps |
| Summary | `church_summary()` | ADMIN, Presbytery, ministry rep for their reporting ministry |
| Members | list, create, update, soft-delete | that church's reps only |
| Activities | list, preview conflicts, save, remove | by §6 |
| Conflicts | list mine (redacted), accept | owners of a side they can see |
| Notifications | list, mark read, push subscribe | self |
| Sync | pull, push | signed in |
| Cron | `/api/cron/daily` bearer | scheduler |
| Health | `/api/health` | monitor |

Zod on every input. Mutating services write `audit_log` without member names or birthdays. Services do not read `process.env`; the composition root injects config.

No CSV import in this MVP. No ICS feed in this MVP. No print endpoint.

---

## 10. UI Map and Dashboards

### 10.1 Navigation
Bottom tabs on a phone: Home, Calendar, Directory, Inbox, More. Sidebar on a wide screen. Header shows offline state, unsent count, and last sync time.

### 10.2 Dashboards
| Role | Shows |
|---|---|
| Church rep | Next 30 days of their events and the sectional and public events they can see. Open red clashes. Birthdays this month (R2). Department counts with edit, and roster-complete. Add event |
| Ministry rep | Their ministry's sectional events, red clashes on those events, and membership totals for their department across churches when that ministry tracks membership |
| Presbytery, sectional hat | All-church count summary, missing departments, public and sectional events, redacted busy notices. No other church's member names |
| Presbytery, local hat | The home-church dashboard, including names |
| Admin | Count summary, churches missing a department, users who have never signed in, recent audit rows, last cron success, last backup attempt. No member names. No church-only events |

### 10.3 Calendar
- Phone default is the agenda. Also month, week, and day.
- Colors: sectional, ministry sectional, own local, other churches' public local.
- Church-only events appear on that church's calendar only.
- A red event stays red until the overlap ends or someone accepts it.
- Filters: scope, church, ministry, clashes only.
- The form asks the acting role when the login has two. Fields: title, all-day, start, end, location text, description, audience label. Local events also have church-only versus public, defaulting to at our church. Sectional events may pick a host church. No draft and no approval step.
- Save shows **Change time** and **Save anyway**.
- Remove asks for confirmation, then hides the event.
- Another church's opened event shows creator **phone** and not creator name.

### 10.4 Directory
Each church card shows pastor name, pastor phone, Facebook, address, map pin, and hotline. It does not show worship times or year established. Closed churches remain listed and cannot receive new events.

### 10.5 Other screens
Member roster with search and ministry filter (R2). Inbox. Admin users, churches, audit, health. Install guide. Settings: sign out. No mute controls in the birthday release.

---

## 11. PWA and Offline Design

### 11.1 Install
`short_name` is `West MIS` so it fits a phone home screen. `name` is the full section title. `display` is `standalone`. Provide 192, 512, maskable, and `apple-touch-icon`.

- Android: capture `beforeinstallprompt`.
- iOS: the install page explains Share → Add to Home Screen, and that push requires the installed app.

### 11.2 Caching
| Resource | Strategy |
|---|---|
| App shell, JS, CSS, fonts, icons | Precache |
| Navigations | Network first, offline fallback page |
| Calendar and member data | Dexie only. The service worker does not cache API JSON |
| Logos | Stale-while-revalidate |
| Auth, sync, cron, push | Network only |

A new service worker must activate without discarding a non-empty outbox. Dexie schema changes are versioned migrations.

### 11.3 Phones
| Capability | Android Chrome | Installed iOS PWA |
|---|---|---|
| Install | Prompt | Manual |
| Web Push | Yes | Yes, iOS 16.4+, installed only |
| Background Sync | Yes | No. Sync when the app is opened |
| Offline store | Yes | Yes. iOS may evict storage if the app is unused for a long time |

---

## 12. Security and Privacy

### 12.1 Application security
- RLS on every table, tested per role, including "Admin has no member rows" and "Presbytery has members only for the home church."
- Church-only activities are denied to every role except that church's reps.
- Conflict DTOs are tested so a private title cannot appear in a busy notice or in a network payload.
- Service-role key only on the server and in CI secrets. Never `NEXT_PUBLIC_`.
- Cron uses a bearer secret compared in constant time.
- Login and sync are rate-limited in the database. An in-memory limiter does not work across serverless instances.
- Security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`. HTTPS only.
- Zod on input. No SQL built by string concatenation.
- Preview deployments use the **dev** Supabase project. Production service-role keys are not available to preview.
- Dependabot and `npm audit` in CI.
- Deactivation takes effect on the next request.

### 12.2 Privacy
The Admin accepts liability for the data held here and will review Philippine privacy obligations, including religious data, minors, and hosting outside the Philippines. The app does not collect a consent checkbox.

- Collect the minimum on a member: name, one ministry, optional birth month and day, optional year.
- Children's names follow the member rules. They are not shown to Admin or to other churches. The Presbytery sees children only in the church he owns.
- Birthday pushes go only to that church's reps and may show the name on the lock screen.
- Event descriptions are visible to everyone who can open that event. Church-only events are the way to keep a description inside the church.
- Audit rows and job logs must not store member names or birthdays.
- Soft-deleted members are hard-deleted after 30 days. Backups made before that day can still contain them until the backup itself is deleted.
- Anyone with Supabase, Vercel, or a backup file can read every member. That is accepted. It is why the backup must not sit in a public bucket and why the key holder matters (§17.2).
- A privacy notice in the app states what is collected, why, and who can see it.

---

## 13. DevOps

### 13.1 Environments
| Env | Supabase | Vercel | Data |
|---|---|---|---|
| Dev / preview | `nemdc-west-mis-dev` | Preview | Seed data only. Never real member names |
| Prod | `nemdc-west-mis-prod` | Production | Real data allowed before a restore drill. Public release still waits on §15 Phase 6 |

### 13.2 Environment variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
NEXT_PUBLIC_APP_URL=

SUPABASE_SERVICE_ROLE_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourdomain
CRON_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
```
Validate with Zod at startup. Fail if a required variable is missing. `RESEND_API_KEY` and `EMAIL_FROM` are optional.

### 13.3 CI
1. On a pull request: install, lint, typecheck, unit tests, build.
2. Database tests: `supabase start` and pgTAP.
3. Schema changes only through migration files.
4. Applying migrations to prod is a deliberate step, not an automatic side effect of opening a preview.

### 13.4 Backups, keep-alive, and the public-release gate
- The daily job and an external uptime check against `/api/health` are the keep-alive. Alert **09269292763** when the check fails.
- A scheduled export must exist before **public** release. Restoring it once is not required before the pilot puts real data in prod. It is required before the section-wide announcement if the export destination is ready.
- The export's location outside Supabase, and the person who holds the encryption key, are **not decided**. Public release waits on that decision.
- Account owner today is the Admin's personal GitHub, Supabase, Vercel, and domain logins. A second person who can recover those accounts is **not named**. Public release waits on that too.
- Runbook: unpause Supabase, restore, rotate secrets, add and remove a user, deactivate a lost phone.

### 13.5 Monitoring
Vercel logs, Supabase logs, last cron time on the Admin dashboard, and the external uptime check.

---

## 14. Testing Strategy

| Layer | What |
|---|---|
| Domain | Every conflict row in §8.1, including public-versus-ministry, general sectional at another place, same host church, and church-only busy. Touching endpoints. All-day Manila bounds with the clock set to UTC. Feb 29 → March 1. First Sunday on the 1st and on the 7th. Monday does not send the digest |
| Services | Each role's allows and denies. Roster 40 with five people stays 40 until complete, then follows the roster. Reopen increments generation and notifies again. Accept clears red while times still overlap. Dismiss does not. Save returns success when notify throws. Audit JSON has no member name |
| Database | Admin selects zero members. Presbytery selects only the home church. Church-only activities are invisible to other churches, Admin, and ministry reps. Last-rep and close-church rules. One Presbytery row. One rep per ministry. Evangelism may lack a church; Music may not. `church_summary()` returns no names |
| API | Cron bearer. Double run does not duplicate birthdays. Sync replay. Expired 30-day mutation is Failed. Redacted conflict payload has no private id or title |
| E2E | Login, two-role event create, conflict modal, Save anyway, hat switch, church-only hidden from a second user, offline create, reconnect, server clash. Playwright `setOffline` |
| Manual | Android and iPhone install, push, offline, and a one-week idle login. Ptr. Jo Lunas runs the upgrade-with-unsent-edit test |
| Pilot | Great Emmanuel Worship Church Inc. before the other churches |

---

## 15. Phased Roadmap

Effort for one part-time builder: **S** a few days · **M** one to two weeks · **L** two to four weeks. Phase 3 and Phase 4 are the critical path. Offline editing is part of the first release, so those two phases are larger than a screen-only calendar.

### Phase 0 — Accounts (S)
- Create GitHub, Supabase dev, Supabase prod, and Vercel. Confirm every **(verify)** item.
- Record the account owner. Leave the second recovery person and the external backup destination open; they block Phase 6, not Phase 1.
- Confirm FullCalendar's license if it is still a candidate; otherwise use `react-big-calendar`.

**Done when:** dev and prod projects exist and the owner can sign in to each vendor.

### Phase 1 — Foundation and auth (M) → R1
- Next.js, Tailwind, shadcn/ui, Zod env, CI.
- Migrations for churches, ministries, profiles, profile roles, RLS, and seeds.
- Login, forced password change, email-only accounts, long-lived cookies.
- Shell, role list, offline banner placeholder.
- pgTAP for the tables that exist.

**Done when:** an Admin can sign in and CI runs the RLS tests that exist so far.

### Phase 2 — Churches, roles, counts (M) → R1
- Admin creates users and assigns roles, with the combination rules in §6.
- Directory fields, logo upload, church rename and close.
- Typed membership counts, missing-department list, `church_summary()`.
- Presbytery hat as a dashboard switch only.
- Audit writes that cannot store member names.
- Deactivate and session revoke.

**Done when:** Admin adds a rep, the rep edits a count, the Presbytery sees the number and cannot open another church's members, and Admin cannot open members.

### Phase 3 — Calendar and conflicts (L) → R1
- Manila time helpers and server-side all-day bounds.
- Local and sectional events, visibility, host church, audience label, acting-role picker.
- Conflict matrix, accept, reopen, busy redaction, inbox.
- Remove (soft delete). No cancel status.
- Client calendar reading the local store once Phase 4 lands; until then an online calendar is allowed only inside Phase 3.

**Done when:** the §8.1 table passes end to end online, including "{Church} is busy" without a private title in the response body.

### Phase 4 — Offline events (L) → R1 complete
- Dexie, outbox, pull, push, 30-day expiry, Failed rows, Keep mine / Keep server.
- Sync triggers, logout wipe, provisional preview, server recheck.
- Service-worker update that keeps an unsent outbox.
- Playwright offline test and the named phone test.

**Done when:** an event created with no signal appears for other users after reconnect, and a church-only event never appears in another church's pull.

### Phase 5 — Members and birthdays (M) → R2
- Roster, one ministry per person, optional birthday, search, soft-delete, 30-day hard-delete.
- Roster-complete flag and official count.
- Privacy notice.
- Daily job, first-Sunday digest, skip-on-Monday, March 1 rule, push, dead-subscription cleanup.
- Member cache on the phone for that church only.

**Done when:** a test church receives the 6:00 AM alert and the first-Sunday digest, a second run does not duplicate them, and a Monday run does not send the digest.

### Phase 6 — Public release (M)
- Backup job, pause runbook, and a successful note of where the external copy lives.
- Second recovery person named and tested.
- Uptime alert to 09269292763.
- Pilot at Great Emmanuel Worship Church Inc., then the other churches.
- Short English training and the install page.
- Accessibility pass on a small Android phone: contrast, tap targets, labels.

**Done when:** the public-release checklist in §17.2 is complete and the pilot church has created a real event, seen a clash, and recovered from airplane mode.

R1 is Phases 1–4. R2 is Phase 5. Public release is Phase 6, not the end of Phase 3.

---

## 16. Risk Register

| Risk | Likelihood | Impact | What we do |
|---|---|---|---|
| Vercel Hobby suspends the project | Medium | High | Accepted. Keep the app movable. No second host until it happens |
| Supabase pauses | Medium | High | Daily write plus an external health check that texts 09269292763. Runbook to unpause |
| Backup destination still unknown | High | High | Public release is blocked until it is chosen. Pilot data may exist before a restore drill |
| Personal account ownership, no second person | High | High | Public release is blocked until a second person can recover GitHub, Supabase, Vercel, and the domain |
| Private event title leaks through a conflict payload | Medium | High | Redaction tests on the DTO. Do not return the private activity id |
| Offline queue duplicates or drops an edit | Medium | High | Client UUIDs, versions, 30-day expiry, Failed state, upgrade test with an unsent item |
| Churches keep planning on Messenger | High | High | The app is mandatory and nobody is assigned to follow up. Counts and clashes will be wrong when events are missing. Accepted |
| Long events paint the month red | Medium | Medium | No length cap. Save anyway remains available |
| iOS push and storage eviction | High | Medium | Install guide, inbox, sync on open |
| Birthday job misses Sunday | Medium | Medium | Skip that month's digest. Do not send it on Monday |
| Service-role or backup holder reads member names | High | High | Accepted. Limit who receives the key. Keep names out of logs and audit detail |
| Free-tier numbers change | Medium | Medium | Re-check at the start of each phase |

---

## 17. Decision Log

### 17.1 Locked

| Topic | Decision |
|---|---|
| Churches | 28. Pilot: Great Emmanuel Worship Church Inc. No file import |
| Reps | At least one per active church. All of them get conflict and birthday alerts. No shared email. Email login only |
| Presbytery | One login, one home church, hat is a dashboard switch |
| Two roles | Allowed, except Admin. The event form asks which role is acting |
| Ministries | MM, WM, Youth Alive, Christian Education report membership. Music and Evangelism do not. Evangelism may have a rep with no church. Missions is absent |
| Counts | Current membership only. Church rep overwrites anytime. Typed count wins until the roster is marked complete |
| Names | Admin: none. Presbytery: home church only, including children. Other churches: their own reps |
| Birthdays | Optional. Alerts to that church's reps. Both daily and digest on the first Sunday at 6:00 AM. March 1 for Feb 29. Late the same morning still sends. Monday does not send the digest. Lock screen may show the name. No mute in that release |
| Removal | 30 days from soft-delete to hard-delete |
| Audit | Admin only. No names, birthdays, or member phones in the payload |
| Events | Users create them. No weekly seed. No recurrence in this MVP. No approval. Remove hides the event |
| Visibility | Church-only stays inside the church. Public local and sectional are visible to every signed-in user |
| Audience | Label only. Does not hide and does not affect conflicts |
| Conflicts | Matrix in §8.1. Save anyway is normal. Accept clears red. Dismiss does not. Re-overlap notifies owners again. Same host church conflicts, including the redacted busy notice |
| Creator card | Phone only for another church. Name for the creating church, and for the Presbytery on his own church |
| Directory | Pastor name, pastor phone, Facebook, address, map pin, hotline |
| Language | English UI and training. Titles may be English or Cebuano |
| Offline | First release views, creates, and edits events offline. Queue expires at 30 days. Status text is Failed. Logout clears the phone database |
| All-day | Server computes Manila bounds |
| Print | None in this MVP |
| Truth | This app. Posting is mandatory. No chaser |
| Deactivate | Admin, immediately, on the next request. An offline phone clears itself when it next connects |
| Consent | No in-app consent step. Admin accepts liability and will do the privacy review |
| Hosting risk | Vercel Hobby suspension risk accepted |
| Alert phone | 09269292763 |
| Real data | Allowed in prod before a restore drill has succeeded |

### 17.2 Deferred — these block public release only

| Item | Status |
|---|---|
| Where the backup copy lives outside Supabase, and who holds the key | Decide later |
| The second person who can recover GitHub, Supabase, Vercel, and the domain | Decide later |

Building Phases 1–5 does not wait on §17.2. Phase 6 does.

---

## 18. Appendices

### A. Instructions for an AI coding agent
1. Read this entire document first. Follow it where it disagrees with the original app definition or with Draft v1.
2. Work one phase at a time. Stop at that phase's "Done when" and wait for review.
3. Follow §5.2. Do not call Supabase from components or route handlers.
4. Put every schema change in `supabase/migrations/`. Do not edit the live schema by hand.
5. Write tests with the code: domain, then services, then pgTAP, then end to end.
6. Never commit secrets. Never put a secret in `NEXT_PUBLIC_`.
7. For every **(verify)** item, check the current vendor docs before coding against it, and write what you found in the pull request.
8. Do not put member names, birthdays, or member phones in logs, audit detail, or error text.
9. Do not return a church-only event, or its id, to a caller who is not a rep of that church. Busy notices are the only exception, and they carry church name and time only.
10. Keep commits small, with Conventional Commit messages.

### B. Definition of done (per feature)
- The permission is enforced in the service and in RLS, and a test covers the deny path.
- It works on a narrow phone width. Labels and tap targets are usable.
- Empty, loading, error, and offline states are handled when the screen can appear offline.
- Every mutation writes an audit row that passes the redaction rule.
- Operational changes update the runbook.

### C. Glossary
| Term | Meaning |
|---|---|
| Section | Northeastern Mindanao District-West, 28 churches |
| Presbytery | The single section login, also a rep of one home church |
| Church-only | A local event visible only to that church's reps |
| Public local | A local event visible to every signed-in user |
| Sectional | An event for the whole section. Ministry events are sectional rows with a ministry set |
| Busy notice | The redacted clash text "{Church} is busy," with no private title |
| Accept | A person clears the red mark while the times still overlap |
| Roster complete | The switch that makes the member list the official membership number |
| Outbox | Phone queue of offline edits waiting to sync |
| RLS | Postgres row level security |
| PHT | Philippine Time, `Asia/Manila`, UTC+8, no daylight saving |

### D. Source notes
Free-tier and platform limits change. Recheck Vercel Hobby terms, Supabase pause rules, backup limits, `pg_cron`, `pg_net`, and iOS installed-PWA push before relying on them in a phase.
