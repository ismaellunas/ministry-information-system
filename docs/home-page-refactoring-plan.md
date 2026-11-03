# Home Page Refactoring Plan

## 1. Overview & Objectives

Transform the current Home page of the West Section Ministry Information System (`src/app/(app)/page.tsx`) to match the modern card-based mobile dashboard aesthetic of the reference design.

### Key Requirements
1. **Top Church Hero Card**:
   - Church Name
   - Address
   - Contact Number (`hotlineNumber` / `pastorPhone`)
   - Logged-in User Full Name & Role (e.g. `Pastor Juan Dela Cruz · Church Representative`)
   - Location / Map badge
2. **Church Highlights (This Month Only)**:
   - **Upcoming Birthdays**: Nearest birthday this month. Clicking navigates to the calendar.
   - **Upcoming Events**: Nearest event this month. Clicking navigates to the calendar.
3. **Membership Department Counts**:
   - 4 official reporting departments:
     - **Men's Ministry** (`(count)`)
     - **Women's Ministry** (`(count)`)
     - **Youth Alive** (`(count)`)
     - **Christian Education** (`(count)`)
   - Styled matching the reference design category cards (tinted icon background, bold title with count, secondary label, diagonal accent arrow `ArrowUpRight`).
   - Prepared for upcoming Members Directory navigation (`soon to come. not this time`).

---

## 2. Visual & UI Structure

```
┌────────────────────────────────────────────────────────┐
│  [ = ]            [ App Logo: West MIS ]          [ 🔔 ]│  <- Global Header
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │  LOCAL CHURCH                                📍  │  │
│  │  Caloocan Assembly of God                        │  │  <- Hero Banner Card
│  │  123 Main Street, West District                  │  │     (Dark/gradient banner,
│  │  📞 +63 912 345 6789                             │  │      curved corners,
│  │  👤 Juan Dela Cruz · Church Representative       │  │      prominent church info)
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  THIS MONTH                                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ [ 🎂 ] Upcoming Birthday                      ↗  │  │  <- Nearest birthday this month
│  │        Maria Santos · Nov 18                     │  │     (Click -> Opens calendar)
│  ├──────────────────────────────────────────────────┤  │
│  │ [ 📅 ] Upcoming Event                         ↗  │  │  <- Nearest event this month
│  │        District Youth Fellowship · Nov 22        │  │     (Click -> Opens calendar)
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  MEMBERSHIP COUNTS                        4 departments│
│  ┌──────────────────────────────────────────────────┐  │
│  │ [ 👔 ] Men's Ministry (42)                    ↗  │  │  <- Soft blue tint
│  │        Active Department Membership              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ [ 🌸 ] Women's Ministry (58)                  ↗  │  │  <- Soft rose tint
│  │        Active Department Membership              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ [ ⚡ ] Youth Alive (35)                       ↗  │  │  <- Soft amber tint
│  │        Active Department Membership              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ [ 📖 ] Christian Education (28)               ↗  │  │  <- Soft emerald tint
│  │        Active Department Membership              │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

All components will be placed in `src/app/(app)/_components/`:

### 3.1 `ChurchHeroCard.tsx`
- **Visuals**: Deep gradient background (`bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 text-white rounded-3xl p-6 shadow-theme-md relative overflow-hidden`).
- **Elements**:
  - Small uppercase pill/tag: `"LOCAL CHURCH"`
  - Large title: `church.name`
  - Address row: Map pin icon + `church.address ?? "No address registered"`
  - Phone row: Phone icon + `church.hotlineNumber ?? church.pastorPhone ?? "No contact number"`
  - User identity badge: User icon + `{actor.firstName} {actor.lastName} · {roleLabel(role)}`
  - Decorative accent: Circular semi-transparent white badge on top right with a location/church icon.

### 3.2 `HomeActionCard.tsx` (Card Primitive)
- **Visuals**: White background (`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 transition-all flex items-center justify-between gap-4`).
- **Icon Container**: Fixed size (`w-12 h-12 rounded-xl flex items-center justify-center shrink-0`) with pastel tint:
  - Pink/Rose: Birthday (`bg-rose-50 text-rose-500`)
  - Orange/Amber: Events (`bg-amber-50 text-amber-500`)
  - Blue: Men's Ministry (`bg-blue-50 text-blue-500`)
  - Purple/Rose: Women's Ministry (`bg-purple-50 text-purple-500`)
  - Yellow/Amber: Youth Alive (`bg-yellow-50 text-yellow-600`)
  - Green/Emerald: Christian Education (`bg-emerald-50 text-emerald-500`)
- **Body**: Bold title + description subtitle.
- **Trailing Action**: Accent arrow `ArrowUpRight` or chevron.

### 3.3 `UpcomingBirthdaysCard.tsx`
- Fetches active members of the church whose `birth_month` matches the current Manila month.
- Identifies the nearest celebration day:
  - Finds the closest birthday on or after today in the current month.
  - If none remaining this month, shows the earliest in the month or "No more birthdays this month".
- Links to `/calendar?from=YYYY-MM-DD` so the user jumps directly to that date on the calendar.

### 3.4 `UpcomingEventsCard.tsx`
- Fetches activities in the current month range (`today` to `endOfMonth`).
- Picks the nearest upcoming event.
- Displays title, date, and formatted time.
- Links to `/calendar?from=YYYY-MM-DD` (or `/calendar/${event.id}`).

### 3.5 `DepartmentCountsSection.tsx`
- Fetches `counts.listForOwnChurch(churchId)` for the 4 reporting ministries (`MM`, `WM`, `YA`, `CE`).
- Displays 4 action cards with format: `"[Ministry Name] ([Count])"`.
- Click interaction: Displays a non-intrusive notification or badge (`Coming Soon: Members Directory`).

---

## 4. Data Layer & Queries

### 4.1 Nearest Birthday Query
In a new query helper `getNearestBirthdayThisMonth(churchId: string)`:
```ts
const now = new Date();
const currentMonth = now.getMonth() + 1; // 1-12
const currentDay = now.getDate();

const { data: members } = await supabase
  .from("members")
  .select("id, full_name, birth_month, birth_day")
  .eq("church_id", churchId)
  .eq("birth_month", currentMonth)
  .eq("is_active", true)
  .is("deleted_at", null)
  .order("birth_day", { ascending: true });
```

### 4.2 Nearest Event Query
In `getNearestEventThisMonth(churchId: string, actor: Profile)`:
- Range: `start = startOfDay(todayManila())`, `end = endOfMonth(todayManila())`.
- Retrieve activities via `services.activities.list({ start, end }, hat)`.
- Sort by `start_at` ascending and pick `events[0]`.

### 4.3 Department Counts
- Reuses `services.counts.listForOwnChurch(churchId)`.
- Extracts counts mapped to:
  - `MM`: Men's Ministry
  - `WM`: Women's Ministry
  - `YA`: Youth Alive
  - `CE`: Christian Education

---

## 5. Implementation Roadmap

1. **Service / Data Layer**:
   - Create helper for birthday query in `src/repositories/supabase/member.repository.ts` (or direct server fetch).
   - Create helper for nearest event calculation in `src/app/(app)/_lib/home-data.ts`.
2. **Components Creation**:
   - Create `src/app/(app)/_components/ChurchHeroCard.tsx`.
   - Create `src/app/(app)/_components/HomeActionCard.tsx`.
   - Create `src/app/(app)/_components/UpcomingBirthdaysCard.tsx`.
   - Create `src/app/(app)/_components/UpcomingEventsCard.tsx`.
   - Create `src/app/(app)/_components/DepartmentCountsSection.tsx`.
3. **Page Refactor**:
   - Refactor `src/app/(app)/page.tsx` to assemble the new dashboard.
   - Maintain compatibility for Admin and Section Presbytery views while adopting the same polished card styling.
4. **Testing & Validation**:
   - Verify mobile viewport matching the reference image.
   - Verify calendar deep-links when clicking birthday and event cards.
   - Run `npx tsc --noEmit` and `npm test`.
