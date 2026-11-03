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
| `SECTION_MINISTRY_REP` | One per ministry. Must also be a church rep except EVANGELISM. |
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

<!-- TEMPLATE — copy and fill for every new session:

### YYYY-MM-DD — <Agent name / tool>

**What:** <Short description of what was built or changed>

**Why:** <The reason — user request, bug fix, design decision, etc.>

**Files changed:**
- `path/to/file` — what changed

**Decisions made:** <Any design choices that future agents should know about; "None" if none>

**Agent notes:** <Gotchas, known issues, things to watch, follow-up work>

-->
