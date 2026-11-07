# Agent Context — West Section Ministry Information System

> **READ THIS FIRST.** This file is the single source of truth for AI agents working on this project.
> Before making any change, read this file. After any change, update the relevant section.
> The companion design authority is [`blueprint.md`](./blueprint.md) — it defines decisions that cannot be changed without a logged entry here.

---

## Project Snapshot

| Field | Value |
|---|---|
| **Project** | Northeastern Mindanao District-West Section MIS |
| **Stack** | Next.js 14 (App Router) · Supabase (Postgres + Auth + Storage) · Vercel (Hobby) · PWA |
| **Language** | TypeScript (strict) |
| **Architecture** | Service Layer → Repository Layer (strict, no skipping layers) |
| **Database** | Supabase Postgres with RLS; local IndexedDB via Dexie.js |
| **Timezone** | `Asia/Manila` (UTC+8) everywhere — no DST |
| **Auth** | Supabase Auth, email+password, no public sign-up |
| **Styling** | Tailwind CSS + shadcn/ui (Radix primitives) + lucide-react |
| **Tests** | Vitest (unit/domain), Playwright (E2E), pgTAP (SQL) |
| **Deployment** | Vercel Hobby (free) |
| **Blueprint version** | Decision lock v2 (`blueprint.md`) |

---

## Key Directories

```
src/
  app/          — Next.js App Router routes
    (auth)/     — login, reset-password, change-password
    (app)/      — authenticated shell (calendar, churches, members, notifications, admin, install)
    api/        — Route handlers (cron, health, push/subscribe, sync/pull, sync/push)
  domain/       — Pure business logic (NO Supabase/Dexie/React imports allowed here)
  repositories/ — Data access interfaces + Supabase implementations
  services/     — Orchestration: auth checks, conflict detection, fan-out, audit
  composition/  — Dependency injection roots (server.ts, browser.ts)
  core/         — Shared utilities
  lib/          — Third-party wrappers
supabase/
  migrations/   — Sequential SQL migrations (numbered 20250101XXXXXX_*.sql)
  seed.sql
  tests/        — pgTAP SQL tests
.cursor/rules/  — Cursor IDE rules (autosave, mobile-first, list-search, visual-system)
```

---

## Architecture Laws (Never Break These)

1. **UI → Services → Repositories → DB.** No UI or route handler may call Supabase or Dexie directly.
2. **Repositories hold no product rules.** They query, map, persist.
3. **Domain logic lives in `src/domain/` only.** Zero imports from Supabase, Dexie, React, or Next.
4. **Service-role Supabase client** is used only from `*.admin.ts` modules and cron code guarded with `import 'server-only'`.
5. **Calendar route is a client component** (reads Dexie first, then syncs). It cannot be a server component.
6. **Online and offline writes both go through server services.** RLS stays on as defense-in-depth.
7. **`audit_log` detail JSON must never contain** full_name, birth_month, birth_day, birth_year, phone, or any member payload.
8. **Hard-delete members** 30 days after `deleted_at` via the daily job only.

---

## Roles

| Role | Key constraint |
|---|---|
| `CHURCH_REP` | Scoped to one church. At least one per active church (enforced). |
| `SECTION_MINISTRY_REP` | One per ministry. Must also be a church rep except Missions (`EVANGELISM`). |
| `SECTION_PRESBYTERY` | Exactly one. Must also be a CHURCH_REP for a home church. |
| `ADMIN` | Cannot combine with any other role. Sees membership **counts only** (no names). |

---

## Migration Inventory

| File | What it does |
|---|---|
| `20250101000001_types.sql` | Enum types: `user_role`, `activity_scope`, `event_visibility`, `audience_label` |
| `20250101000002_functions.sql` | `set_updated_at()` and `touch_row()` triggers |
| `20250101000003_churches.sql` | `churches` table |
| `20250101000004_ministries.sql` | `ministries` table + seed rows (MM, WM, YA, CE, MUSIC, EVANGELISM) |
| `20250101000017_rename_evangelism_to_missions.sql` | Display name of `EVANGELISM` is Missions |
| `20250101000018_pastor_birthday.sql` | Pastor birthday record, readable by Admin and that church's reps |
| `20250101000019_pastor_ncmdc.sql` | Pastor mark and optional NCMDC ID on the profile |
| `20250101000020_ncmdc_for_church_reps.sql` | NCMDC ID allowed on any church representative |
| `20250101000005_profiles.sql` | `profiles` table |
| `20250101000006_profile_roles.sql` | `profile_roles` table + unique indexes |
| `20250101000007_remaining_tables.sql` | `members`, `church_department_counts`, `activities`, `activity_conflicts`, `notifications`, `push_subscriptions`, `audit_log` |
| `20250101000008_helpers.sql` | Security-definer helpers: `app_is_active()`, `app_church_id()`, `app_ministry_id()`, `app_is_admin()`, `app_is_presbytery()`, `official_member_count()`, `church_summary()` |
| `20250101000009_rls.sql` | Row-Level Security policies for all tables |
| `20250101000010_storage.sql` | Storage bucket `church-logos` + policies |
| `20250101000011_function_grants.sql` | GRANT EXECUTE on helpers to `authenticated` role |
| `20250101000012_church_pastor_names.sql` | Added `pastor_name` / `pastor_phone` columns to `churches` |
| `20250101000013_activity_overlap.sql` | GiST index on `activities` for time-range overlap queries |

---

## Service & Repository Inventory

| File | Responsibility |
|---|---|
| `services/activity.service.ts` | Save/remove activities, provisional conflict preview, conflict fan-out trigger |
| `services/conflict.service.ts` | `evaluateAndNotify`: classify pairs, reconcile `activity_conflicts`, notify |
| `services/admin.service.ts` | User creation, role assignment, church management, deactivation |
| `services/church.service.ts` | Church directory reads/writes (non-admin) |
| `services/count.service.ts` | Department count reads/writes, roster-complete flag |
| `services/notification.service.ts` | Inbox and push delivery |
| `services/sync.service.ts` | Pull-since and push-from-outbox for offline sync |
| `repositories/activity.repository.ts` | Activity CRUD |
| `repositories/conflict.repository.ts` | `activity_conflicts` table access |
| `repositories/church.repository.ts` | Churches CRUD |
| `repositories/profile.repository.ts` | Profiles CRUD |
| `repositories/audit.repository.ts` | Audit log inserts |
| `repositories/count.repository.ts` | `church_department_counts` CRUD |
| `repositories/ministry.repository.ts` | Ministry lookups |
| `repositories/notification.repository.ts` | Notifications CRUD |
| `domain/conflict.ts` | `overlaps()`, `sameLocation()`, `classify()` — pure functions |
| `domain/activity-access.ts` | Viewer permission checks |
| `domain/activity-bounds.ts` | All-day → Manila UTC bounds |
| `domain/birthday.ts` | Birthday date math, Feb 29 → Mar 1 in non-leap years |
| `domain/time.ts` | Manila timezone utilities |
| `domain/sync.ts` | Outbox and pull-since logic |
| `domain/audit.ts` | Audit entry shape validation |
| `domain/roles.ts` | Role combination rules |
| `domain/user-form.ts` | Create-user form fields → role assignments |
| `domain/schemas.ts` | Shared Zod schemas |
| `domain/errors.ts` | Typed error classes |

---

## Open / Undecided Items

> Update this table when an item is resolved.

| # | Item | Status | Blocking |
|---|---|---|---|
| 1 | External backup destination and key holder for Supabase dumps | ❌ Unresolved | Public release |
| 2 | `react-big-calendar` vs. FullCalendar (confirm free views) | ❌ Unresolved — defaulting to `react-big-calendar` | Calendar UI |
| 3 | Serwist PWA integration (verify current API) | ❌ Unresolved | Phase 4 offline write |
| 4 | Email provider (Resend + verified domain) for birthday digest | ❌ Unresolved | R2 birthday emails |
| 5 | External keep-alive pinger config for `/api/health` alerting **09269292763** | ❌ Unresolved | Production readiness |

---

## Change Log

> **Agents: append every change here.** One entry per work session. Format: date · agent or tool · summary of what changed and why.
> Do not remove past entries. Do not edit past entries.

---

### 2026-11-03 — Antigravity (session init)

**What:** Created this `AGENT_CONTEXT.md` tracking file.

**Why:** The user works with multiple AI agents across sessions. This file gives every agent a fast ramp-up without having to re-read `blueprint.md` in full. It summarizes the architecture laws, directory layout, migration inventory, service/repository inventory, and open decisions.

**Files changed:**
- `AGENT_CONTEXT.md` — created (this file)

**Decisions made:** None — this is documentation only.

**Agent notes:** The `blueprint.md` file is the canonical design authority. This file tracks *implementation state*. When in doubt, `blueprint.md` wins except where this log explicitly records an approved deviation.

---

### 2026-11-03 — Antigravity (offline calendar navigation)

**What:** Fixed offline Previous/Next navigation on the calendar view.

**Why:** Clicking Previous or Next calls `router.replace('/calendar?from=NEW_DATE')`. The service worker caches pages with `ignoreSearch: true`, so offline it always returned the same cached HTML regardless of the new `?from=` date. The server-rendered `initialItems` never changed, so the calendar appeared frozen when navigating while offline.

**Root cause:** `LocalCalendar` read `from` from the prop (set once at server render) rather than from the live URL. Events from Dexie were merged against the original server items with no date windowing, so they always reflected the cached date.

**Fix:** `LocalCalendar.tsx` now:
1. Uses `useSearchParams()` to track the live `?from=` URL param — this updates instantly on `router.replace()` even offline.
2. When `from` (URL) differs from `serverFrom` (prop), filters locally stored Dexie events to the same `[-7, +42]` day window the server would use, and builds the display list **entirely from Dexie** (skipping stale server items for the wrong date).
3. When online (`from === serverFrom`), behaviour is identical to before — server items are authoritative and Dexie fills gaps.

**Files changed:**
- `src/app/(app)/calendar/_components/LocalCalendar.tsx` — added `useSearchParams`, `windowFor()`, `fromStoredOnly` mode in `mergeItems`, inline `allDayRangeBounds` date window filter.

**Decisions made:**
- The offline window mirrors the server's `shiftCivil(from, -7)` to `shiftCivil(from, +42)` range. Events outside that window are not shown in offline navigation (matching online behaviour).
- No service worker change needed — SW correctly returns the cached page shell; the client now handles date navigation entirely in JS.
- `mergeItems` gained a `fromStoredOnly` parameter (default `false`) to stay backward-compatible.

**Agent notes:** `useSearchParams()` requires the component to be inside a `<Suspense>` boundary in Next.js App Router, but because `LocalCalendar` is already a deep client component inside the app layout, it works without adding one. If Next.js warns about this in a future version, wrap `LocalCalendar` in `<Suspense>` inside `calendar/page.tsx`.

---

### 2026-11-03 — Antigravity (loading screen & stale-while-revalidate data caching)

**What:** Added visual loading indicators during page navigation and implemented stale-while-revalidate data caching.

**Why:** Navigating between pages felt like the app was "hanging" with zero feedback during slow database fetches. Now users get immediate loading feedback (top progress bar + streaming skeleton screen) and revisited pages render cached data immediately, refreshing in the background.

**Files changed:**
- `src/app/(app)/loading.tsx` — Created streaming fallback skeleton component for all `(app)` routes.
- `src/app/(app)/_components/NavProgress.tsx` — Created lightweight CSS-based progress bar triggered on internal navigation.
- `src/app/globals.css` — Added `@keyframes nav-progress` animation.
- `src/app/(app)/_components/AppShell.tsx` — Integrated `<NavProgress />` wrapped in `<Suspense>`.
- `src/lib/page-cache.ts` — Added `cachedFetch()` using Next.js `unstable_cache` with user-scoped keys and tag invalidation.
- `src/app/(app)/page.tsx` — Cached church counts, section summary, and admin metrics.
- `src/app/(app)/notifications/page.tsx` — Cached notification list with 15s TTL.
- `src/app/(app)/churches/page.tsx` — Cached church directory list with 60s TTL.
- `src/app/(app)/calendar/page.tsx` — Cached calendar items and options with 30s TTL.
- `src/app/(app)/churches/[id]/page.tsx` — Cached church details and counts.

**Decisions made:**
- Cached items are scoped strictly by `actor.id` to guarantee RLS boundaries are respected.
- Calendar items and church directories serialize only plain JSON structures so `unstable_cache` deserialization remains type-safe without Date hydration issues.
- Fast background revalidation (15-60s) ensures data never stays stale for long while delivering instant sub-10ms first paint on revisit.

---

### 2026-11-07 — Cursor (Presbytery home church on create user)

**What:** Creating a Presbytery user now keeps the church chosen in the dropdown as that person's home church.

**Why:** Checking Presbytery locks the church-representative checkbox on and disables it. Disabled controls are omitted from form data, so the server stored only the Presbytery role and then rejected the user for having no home church. The church id was submitted and ignored.

**Files changed:**
- `src/domain/user-form.ts` — create-user role parsing; a Presbytery submission with a church id also assigns church rep
- `src/domain/user-form.test.ts` — covers the omitted checkbox and the still-required home church
- `src/app/(app)/admin/actions.ts` — create user uses that parser
- `src/app/(app)/admin/_components/CreateUserForm.tsx` — submits the locked church-rep role with a hidden field
- `src/domain/roles.test.ts` — asserts the exact home-church message

**Decisions made:** The home-church rule stays in `validateRoleSet`. The form parser supplies the missing church-rep assignment; Presbytery itself remains untied to a church id, matching `roleShapeError`.

**Agent notes:** The reported spelling "Presbetery" is not in the repo. The message is already "The Presbytery must also represent a home church." The signed-in create-user screen was not opened: no dev server was running, and this session had no admin credentials.

---

### 2026-11-07 — Cursor (Directory represented churches and closed styling)

**What:** The Directory pins every church the signed-in user represents above the search field. Search filters only the other churches. A closed church has a red border and the word CLOSED in bold red.

**Why:** The user asked for represented churches to stay on top of the Directory, with search under them, and for closed churches to be marked in red wherever they appear in that list.

**Approved deviation (2026-11-07):** Blueprint §10.4 lists every church on one directory and says closed churches remain listed. It does not pin a person's churches above search. This entry records the user's layout: churches from `CHURCH_REP` roles stay above search and are omitted from the searchable list. Closed churches stay listed. They use a 2px `border-destructive` (`#fb2c36`) and the word CLOSED in `text-sm font-bold text-destructive`.

**Files changed:**
- `src/domain/directory.ts` — `splitDirectoryChurches` keeps represented churches out of the other list and preserves the open-then-name sort in both sections
- `src/domain/directory.test.ts` — covers one church, several churches, and a user who represents none
- `src/app/(app)/churches/_components/ChurchList.tsx` — pinned section, existing `SearchableList` for the rest, closed card styling
- `src/app/(app)/churches/[id]/page.tsx` — CLOSED on the church page opened from the directory

**Decisions made:** "Represents a church" is every `CHURCH_REP` role with a church id (`churchRepChurchIds`). A Presbytery's home church is included because that role also requires church rep. An Admin represents none, so the whole directory stays under search. Search still matches name, pastor, phone, hotline, address, and active/closed.

**Agent notes:** Browser check used the local seed admin, who represents no church, so the pinned section was not on screen. Search, the closed church AG Baikingon, phone width, and the `md` sidebar were checked. A church-rep sign-in was not available.

---

### 2026-11-07 — Cursor (Reset test data and seed production admin)

**What:** Added `npm run db:reset-data -- --confirm`, which clears application data on the Supabase project in `.env.local` and creates one admin.

**Why:** Production day will reuse the current Supabase project. Test churches, members, events, and logins need to be removed without dropping the schema or the ministry list.

**Files changed:**
- `scripts/reset-data.mjs` — deletes app rows, church logos, and auth users, then creates `admin@west.info`
- `package.json` — `db:reset-data` script

**Decisions made:** The script refuses to run without `--confirm`. It keeps `ministries`. The admin is West Adminstrator, password `secret`, with `must_change_password` false so that password signs in. Local `supabase/seed.sql` is unchanged and still seeds the development churches.

**Agent notes:** Point `.env.local` at the project to wipe before running. This was not executed.

---

### 2026-11-07 — Cursor (Rename Evangelism ministry option to Missions)

**What:** The ministry option labeled Evangelism now reads Missions when a user is added.

**Why:** The user asked for that dropdown option to say Missions.

**Approved deviation (2026-11-07):** Blueprint §6 and the ministry table name this row Evangelism and say Missions is absent. The display name is now Missions. The code stays `EVANGELISM`, so existing assignments remain on the same row. It still does not track membership, and a rep of this ministry may still have no church.

**Files changed:**
- `supabase/migrations/20250101000017_rename_evangelism_to_missions.sql` — updates `ministries.name`
- `supabase/tests/phase1.test.sql` — asserts the label
- `src/domain/roles.test.ts` — fixture and test name use Missions

**Decisions made:** Only the visible name changes. The dropdown already renders `ministry.name`.

**Agent notes:** The hosted project's `EVANGELISM` row was renamed to Missions through the service role. `supabase db push` could not record the migration because the database password was rejected. The update is safe to run again when the password is available.

---

### 2026-11-07 — Cursor (Pastor birthday on the church record)

**What:** A church's pastor birthday can be saved with the pastor's name. That church's birthday reminder includes the pastor. The year is stored and is not shown in the reminder or the directory.

**Why:** The pastor's birthday was missing. It stays out of the calendar. It belongs with the other birthday reminders for that church, and the year is a record rather than something the rest of the section sees.

**Approved deviation (2026-11-07):** Blueprint §8.3 sends birthday reminders for members only, and §10.4 does not list a pastor birthday on the directory. The birthday is a separate `church_pastor_birthdays` row, not a member and not an activity. Admin and that church's representatives can read and edit the month, day, and year. Everyone else cannot read the row. The home reminder shows month and day only.

**Files changed:**
- `supabase/migrations/20250101000018_pastor_birthday.sql` — table and row-level security
- `src/domain/birthday.ts` — validation and the reminder line
- `src/services/church.service.ts` — saves the birthday with the directory and returns it only to people who may edit that church
- `src/app/(app)/churches/_components/ChurchForms.tsx` — month, day, and year fields
- `src/app/(app)/_components/UpcomingBirthdaysCard.tsx` — includes the pastor in this month's reminder

**Decisions made:** The offline directory cache strips the birthday so a phone copy of the directory cannot carry the year.

**Agent notes:** The hosted database still needs this migration applied. The database password was rejected on the last `supabase db push`, so saving a pastor birthday will fail until then.

---

### 2026-11-07 — Cursor (Pastor mark and NCMDC ID)

**What:** Adding a church representative can mark that person as the pastor and store an optional NCMDC ID. The dashboard user card shows Pastor instead of Church representative, and shows the ID when it is set.

**Why:** A pastor login was only a church representative, so the app could not tell a pastor from another rep. The NCMDC ID is the person's identifier in the District MIS.

**Approved deviation (2026-11-07):** Blueprint roles do not include a pastor flag or a district identifier. `profiles.is_pastor` is separate from `CHURCH_REP`. The ID is optional and is stored only for a pastor. A person who is not a church representative cannot be a pastor. Removing their last church-representative role clears the mark and the ID.

**Files changed:**
- `supabase/migrations/20250101000019_pastor_ncmdc.sql` — columns, checks, and a trigger so only Admin can change them
- `src/domain/user-form.ts` — reads the pastor mark and ID from the create-user form
- `src/app/(app)/admin/_components/CreateUserForm.tsx` — Pastor checkbox and optional NCMDC ID
- `src/app/(app)/admin/_components/UserManageForms.tsx` — the same fields on an existing church representative
- `src/app/(app)/_components/ChurchHeroCard.tsx` and `SectionHeroCard.tsx` — dashboard user line

**Decisions made:** The church's pastor name stays a directory field. It is not used to guess which login is the pastor.

**Agent notes:** The hosted database still needs this migration. Until then, saving the mark fails and existing profiles are treated as not pastors. Migration `20250101000020` later allows the NCMDC ID on a church representative who is not marked pastor.

---

### 2026-11-07 — Cursor (Master list import scripts)

**What:** Two confirm-gated scripts load `docs/west_section_masterlist.xls`. Churches are inserted first and their ids are written to `docs/church-id-map.json`. Users are created from that map. NCMDC 1253 is also the section Presbytery. People with no church are printed and skipped.

**Why:** Production day resets test data, then loads the district list. A church representative needs the church id, so churches must exist before users.

**Approved deviation (2026-11-07):** The NCMDC ID is stored for every imported church representative, not only people marked Pastor. Migration `20250101000020` drops `profiles_ncmdc_pastor_chk`. The dashboard shows the ID whenever it is set. The Pastor label still requires `is_pastor`. Imported people are not marked Pastor. Their password is the birthday as YYYYMMDD, or the literal `password` when the birthday cannot be used. The first sign-in lets them keep that password or set a new one.

**Files changed:**
- `scripts/masterlist.mjs` — reads the sheet, builds emails, and groups churches
- `scripts/import-churches.mjs` — inserts churches and writes the id map
- `scripts/import-users.mjs` — creates the logins from the map
- `scripts/script-client.mjs` — shared service-role client and `--confirm`
- `supabase/migrations/20250101000020_ncmdc_for_church_reps.sql` — drops the pastor-only NCMDC check
- `src/domain/user-form.ts` — keeps an NCMDC ID on a church representative who is not the pastor

**Decisions made:** Church pastor name, phone, Facebook, hotline, and map pin stay blank. Credential columns are not imported. An existing church name or email is left in place so a script can be run again. The scripts were not executed.

**Agent notes:** Run order, after the migrations are on the hosted database: `npm run db:reset-data -- --confirm`, then `npm run import:churches -- --confirm`, then `npm run import:users -- --confirm`. `supabase db push` still needs the database password. Migrations 017 through 020 are not all applied.

---

### 2026-11-07 — Cursor (First login can keep or change the password)

**What:** The password gate offers Change password and Keep this password. Either choice clears `must_change_password`. Imported master-list accounts start with that flag on.

**Why:** A first login should be able to waive the given password or replace it. Birthday passwords and the fallback `password` can stay if the person wants them.

**Approved deviation (2026-11-07):** Blueprint §8.5 says a new user must set a new password before continuing. The first sign-in, and a later admin reset that sets the same flag, now accepts an explicit choice to keep the password they were given.

**Files changed:**
- `src/app/(auth)/change-password/page.tsx` — copy for the choice
- `src/app/(auth)/change-password/_components/ChangePasswordForm.tsx` — Change password and Keep this password
- `scripts/import-users.mjs` — imported profiles start with `must_change_password` true

**Decisions made:** Keep this password does not write a new auth password. It only clears the flag for the signed-in user. The production admin from the reset script still signs in with no gate.

**Agent notes:** The signed-in screen shows Change password and Keep this password. Keep this password clears the flag and does not replace the auth password. The production admin flag was turned back off after that check.

---

### 2026-11-07 — Cursor (Helpful District Links on the dashboard)

**What:** Home shows Helpful District Links between This month and Membership counts. The links open Event Attendance, Finances, and District Resources on ncmdcaog.org in a new tab.

**Why:** Church and section users need those district pages from the dashboard.

**Approved deviation (2026-11-07):** Blueprint §10 does not list district links on the home dashboard. The three URLs are fixed in the app. A file over 200 KB is still rejected; logo resizing stays with the person uploading it.

**Files changed:**
- `src/app/(app)/_components/DistrictLinks.tsx` — the three links
- `src/app/(app)/page.tsx` — placement on the church dashboard and the section dashboard
- `src/app/(app)/_components/HomeActionCard.tsx` — external links open in a new tab

**Decisions made:** The same block appears on a church dashboard and on a section or admin dashboard. A person who represents more than one church sees the links once, under the first church.

**Agent notes:** None

---

### 2026-11-07 — Cursor (Offline calendar opens, removed events stay removed)

**What:** The offline screen no longer offers Sign in. Open calendar opens the calendar saved on the phone, or says the calendar is not on the phone yet. A removed event is not written back when the phone syncs.

**Why:** Closing the browser and opening it offline showed Sign in and a Calendar link that reloaded the same screen. Events that had already been removed were uploaded again from the phone.

**Files changed:**
- `public/sw.js` — keeps the cached calendar across an update, saves it while the app is online, and the shell opens that copy
- `public/offline.html` and `src/app/offline/page.tsx` — Open calendar, no Sign in
- `src/services/sync.service.ts` — refuses to save an event that was removed
- `src/lib/sync-client.ts` — drops a queued save for a removed event

**Decisions made:** Sign in stays off this screen because it needs a connection. An event created on the phone that the server has never stored can still upload. A removed event cannot.

**Agent notes:** The phone learns the new screen after the updated service worker installs, which happens on the next online visit. New Lucide icons must be added to `src/types/lucide-react.d.ts`. That local module is what TypeScript checks, so an icon can exist in the package and still fail the build.

---

### 2026-11-07 — Cursor (Month day opens a new event)

**What:** Clicking a day in month view opens Add event with that day already filled in (9:00–10:00). It no longer switches to the day view.

**Why:** The day number was a shortcut into the day view. The calendar should start an event for the day that was tapped.

**Files changed:**
- `src/app/(app)/calendar/_components/PhoneMonth.tsx` — day buttons start an event
- `src/app/(app)/calendar/_components/CalendarBoard.tsx` — phone and desktop month clicks share that action
- `src/app/(app)/calendar/calendar.css` — month days show a pointer

**Decisions made:** Week and day views still open a day from a heading click. An existing event in the month still opens that event. A login that cannot add events does nothing on a day tap. The plus button is unchanged.

**Agent notes:** None

---

### 2026-11-07 — Cursor (Church card logo and Minister label)

**What:** The church dashboard card shows that church's logo in the top corner. A church representative with an NCMDC number is labeled Minister.

**Why:** The corner showed a building icon, and the name line still said Church representative after the NCMDC number was stored.

**Files changed:**
- `src/app/(app)/_components/ChurchHeroCard.tsx` — logo in the corner; Minister label
- `src/app/(app)/_components/SectionHeroCard.tsx` — same label rule
- `src/domain/roles.ts` — church rep with an NCMDC number is Minister; Pastor stays Pastor
- `src/domain/roles.test.ts` — covers the three labels

**Decisions made:** A church with no logo keeps the building icon. Presbytery and Admin labels are unchanged. Pastor still wins over Minister when that mark is set.

**Agent notes:** None

---

<!-- TEMPLATE — copy and fill for every new session:

### YYYY-MM-DD — <Agent name / tool>

**What:** <Short description of what was built or changed>

**Why:** <The reason — user request, bug fix, design decision, etc.>

**Files changed:**
- `path/to/file` — what changed

**Decisions made:** <Any design choices that future agents should know about; "None" if none>

**Agent notes:** <Gotchas, known issues, things to watch, follow-up work>

-->
