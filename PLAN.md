# E-Consultation Feature Plan

## Progress

| Phase | Status |
|-------|--------|
| **1. Availability Rules Engine** | ✅ **Done** |
| **2. Faculty Dashboard Tabs** | ✅ **Done** |
| **3. Faculty Cancel Flow** | ✅ **Done** |
| **4. Student Cancellation** | ✅ **Done** |
| 5. Faculty-to-Faculty Meetings | ✅ **Done** |
| 6. Sync Tracking Fields | ⏳ Pending |
| 7. Teams Sync Orchestration | ⏳ Pending |
| 8. Conflict Detection w/ Teams | ⏳ Pending |

## Overview

Transform the MVP booking system into a complete academic consultation platform with app-level availability rules, faculty-to-faculty meetings, and optional MS Teams calendar integration.

**Core Principle:** Faculty controls their availability at the app level. Students can only book within those bounds. MS Teams integration is optional and feature-flagged.

---

## Phase 1: Availability Rules Engine ✅ *(Implemented)*

Faculty configures app-level rules per day-of-week. Students are blocked from booking outside those rules.

### 1A. New Prisma Model

```prisma
model FacultyAvailabilityRule {
  id        String  @id @default(cuid())
  facultyId String
  dayOfWeek Int     // 0=Monday, 6=Sunday
  isBlocked Boolean @default(false)
  startTime String? // "15:00" — null means full day available
  endTime   String? // "19:00"

  faculty User @relation(fields: [facultyId], references: [id], onDelete: Cascade)
  @@unique([facultyId, dayOfWeek])
}
```

### 1B. New Repository Interface + Implementation

- `IAvailabilityRuleRepository` — CRUD + listByFaculty + getByFacultyAndDay
- Prisma implementation
- Factory registration

### 1C. New Controller

- `listAvailabilityRules(facultyId)`
- `upsertAvailabilityRule(input)` — create or update a rule per dayOfWeek
- `getEffectiveHours(facultyId, dayOfWeek)` — returns available window or "blocked"

### 1D. New API Routes

- `GET /api/availability-rules` — list rules for current faculty
- `POST /api/availability-rules` — upsert a rule (faculty only)

### 1E. UI: Faculty Availability Settings Page

**`/faculty/availability`** — New page with:
- Grid of 7 cards (one per day, Mon–Sun)
- Each card: toggle "Block entire day" + optional time picker (start/end)
- Visual summary of current rules
- Sidebar link (visible only for faculty)

### 1F. Update Student Booking Flow

In `listAvailableSchedules()`:
- After fetching schedules, filter against each faculty's availability rules
- Remove: slots on blocked days
- Remove: slots outside allowed time windows
- This is server-side, students can't bypass it

**Scope:** Availability rules only apply to **students booking via the app**. Faculty-to-faculty meetings (Phase 5) use a separate `InternalMeeting` model and are not filtered by these rules — faculty book directly with each other.

### 1H. Seed Defaults

When a faculty account is created (or on first login), seed sensible defaults:
- Monday–Friday: `isBlocked=false`, `startTime="08:00"`, `endTime="18:00"`
- Saturday–Sunday: `isBlocked=true`
- Faculty can customize these on the `/faculty/availability` page at any time

### 1G. Calendar-Based Booking UI (Student)

Replace the flat card grid with an interactive calendar view for browsing and booking availability.

**Design approach:** A monthly/weekly calendar grid where available slots are highlighted. The student navigates by day/week, not by scrolling through an endless list.

**Component: BookingCalendar**
- Monthly grid view showing days with available slots (highlighted)
- Click a highlighted day → expands to show time slots for that day grouped by faculty
- Each time slot shows: faculty name, time range, "Book" button
- Empty days and blocked days are visually dimmed or hidden
- Tabs to filter by faculty (or show all)

**Student flow:**
```
┌──────────────────────────────────────────┐
│  [◀]  May 2026  [▶]                      │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun       │
│        ┌────┐ ┌────┐                     │
│        │  5 │ │  6 │                     │
│        │ 3  │ │ 5  │  ← number of slots  │
│        │slts│ │slts│                     │
│        └────┘ └────┘                     │
│  ┌────┐ ┌────┐ ┌────┐                   │
│  │ 12 │ │ 13 │ │ 14 │                   │
│  │ 2  │ │ 0  │ │ 4  │                   │
│  │slts│ │    │ │slts│                   │
│  └────┘ └────┘ └────┘                   │
└──────────────────────────────────────────┘

  Clicking May 6 (3 slots):
  ┌────────────────────────────────┐
  │ Faculty         Time           │
  │ Dr. Smith       09:00-10:00  ▶ │
  │ Dr. Smith       10:00-11:00  ▶ │
  │ Prof. Jones     14:00-15:00  ▶ │
  └────────────────────────────────┘
```

**Where to place it:**
- Replace the "Available Consultation Slots" section on the student dashboard (`/student`)
- Or create a dedicated `/student/book` page with the calendar as the primary view
- Keep the dashboard for metrics + upcoming appointments only

**Filter by faculty:**
- Dropdown or sidebar to filter the calendar by a specific faculty member
- Helps students focus on their preferred faculty's availability

### New/Modified Files

| File | Action |
|------|--------|
| `prisma/schema.prisma` | + `FacultyAvailabilityRule` model |
| `lib/models/index.ts` | + `AvailabilityRule` type |
| `lib/repositories/interfaces.ts` | + `IAvailabilityRuleRepository` |
| `lib/repositories/prisma.ts` | + `PrismaAvailabilityRuleRepository` |
| `lib/repositories/factory.ts` | + register factory |
| `lib/controllers/availabilityRules.ts` | New file |
| `app/api/availability-rules/route.ts` | New file |
| `app/faculty/availability/page.tsx` | New page |
| `components/Sidebar.tsx` | + link for faculty |
| `lib/controllers/schedules.ts` | Updated to filter by rules |
| `app/student/page.tsx` | Replace slot grid with calendar (or create `/student/book`) |
| `components/BookingCalendar.tsx` | New — interactive monthly calendar for booking |

---

## Phase 2: Faculty Dashboard Tabs ✅ *(Implemented)*

Faculty sees PENDING / APPROVED / ALL as separate views instead of one flat list.

### 2A. New Component: Tab Navigation

- Tab bar: **Pending** | **Approved** | **All**
- Each tab filters existing appointments by status
- Client-side filtering with URL search params for shareability

### 2B. Update Faculty Dashboard Page

- Add tab navigation above Appointment Cards section
- Keep metrics and schedule timeline as-is

### 2C. Appointment Card Updates

- Update `AppointmentCard` for faculty view to show relevant actions per status
- Cancel button only for APPROVED appointments

### Modified Files

| File | Action |
|------|--------|
| `components/AppointmentCard.tsx` | Updated with cancel, status-tab-aware |
| `app/faculty/page.tsx` | Add tab navigation + filtering |

---

## Phase 3: Faculty Cancel Flow ✅ *(Implemented)*

Faculty can cancel an approved appointment → restores slot availability + removes Teams event.

### 3A. New Controller Function

```ts
export async function cancelAppointment(id: string, facultyId: string) {
  // Verify ownership + APPROVED status
  // Restore schedule availability
  // Delete Teams meeting event (if teamsEventId exists)
  // Set status to CANCELLED
}
```

### 3B. New Status: `CANCELLED`

- Add to `AppointmentStatus` enum in Prisma schema
- Add to types in `lib/models/index.ts`
- Add to `AppointmentData` interface in repositories
- Update all UI badge components to handle it

### 3C. Update API Route

- `POST /api/appointments/[id]/cancel` — new action route
- Protected: faculty only, ownership check

### 3D. Update `AppointmentCard`

- If role=FACULTY and status=APPROVED: show "Cancel Meeting" button
- If role=STUDENT and status=CANCELLED: show "Cancelled" badge

### Modified Files

| File | Action |
|------|--------|
| `prisma/schema.prisma` | + `CANCELLED` in `AppointmentStatus` |
| `lib/models/index.ts` | + `CANCELLED` type |
| `lib/repositories/interfaces.ts` | + `CANCELLED` in type |
| `lib/controllers/appointments.ts` | + `cancelAppointment()` |
| `app/api/appointments/[id]/[action]/route.ts` | + cancel handler |
| `components/AppointmentCard.tsx` | + cancel button + cancelled badge |
| `components/StatusBadge.tsx` | + cancelled variant |

---

## Phase 4: Student Cancellation ✅ *(Implemented)*

### 4A. Flow

```
Student books → PENDING → Student cancels → CANCELLED (slot restored)
                          └─ Faculty still needs to approve
Student books → PENDING → Faculty approves → APPROVED → only faculty can cancel
```

- Student can cancel their own **PENDING** requests at any time (before faculty reviews)
- **APPROVED** appointments: only faculty can cancel (Phase 3). Student cancel on APPROVED is rejected.
- When cancelled → schedule slot is restored, other students can book it

### 4B. Controller

- `studentCancelAppointment(id, studentId)` — ownership check, status=PENDING guard, restores slot, sets CANCELLED

### 4C. API Route

- `POST /api/appointments/[id]/student-cancel` — separate route file (not part of `[action]` route)
- Route resolution: literal `student-cancel` takes priority over `[action]` dynamic segment

### 4D. UI

- AppointmentCard for role=STUDENT + status=PENDING: shows "Cancel Request" button
- No confirmation dialog (kept simple, matches Phase 3 style)

### Modified Files

| File | Action |
|------|--------|
| `lib/controllers/appointments.ts` | + `studentCancelAppointment()` |
| `app/api/appointments/[id]/student-cancel/route.ts` | New — dedicated student cancel route |
| `components/AppointmentCard.tsx` | + cancel button for student view |

---

## Phase 5: Faculty-to-Faculty Internal Meetings ✅ *(Implemented)*

### 5A. New Prisma Models & Enums

```prisma
enum MeetingStatus { CONFIRMED, CANCELLED }
enum ParticipantStatus { PENDING, ACCEPTED, DECLINED }

model InternalMeeting {
  id          String        @id @default(cuid())
  title       String
  description String?
  date        String
  startTime   String
  endTime     String
  organizerId String
  teamsEventId String?
  teamsLink   String?
  status      MeetingStatus @default(CONFIRMED)
  createdAt   DateTime      @default(now())

  organizer    User                          @relation("OrganizedMeetings")
  participants InternalMeetingParticipant[]
}

model InternalMeetingParticipant {
  id        String            @id @default(cuid())
  meetingId String
  userId    String
  status    ParticipantStatus @default(PENDING)

  meeting InternalMeeting @relation(onDelete: Cascade)
  user    User
  @@unique([meetingId, userId])
}
```

### 5B. Repository

- `IMeetingRepository` interface with: create, findById (with includes), listByOrganizer, listByParticipant, update, addParticipant, updateParticipantStatus, getParticipants
- Conflict queries: `listConflictingAppointments(facultyId, date, startTime, endTime)` — joins through FacultySchedule for date/time overlap
- `listConflictingMeetings(facultyId, date, startTime, endTime)` — checks CONFIRMED internal meetings

### 5C. Conflict Detection Service

- `checkConflicts(facultyIds, date, startTime, endTime)` — checks both appointments and meetings for all given faculty IDs
- Returns advisory list of conflicts (does not block booking)

### 5D. Controller

- `createMeeting()` — creates meeting + adds participants (organizer auto-ACCEPTED)
- `getMeetingsForUser()` — merges organized + invited, deduplicated
- `getMeetingById()` — single meeting with all includes
- `respondToMeeting()` — accept/decline by participant
- `cancelMeeting()` — organizer only, sets CANCELLED
- `getConflicts()` — wraps conflict detection service

### 5E. API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/meetings` | GET | List meetings for current user |
| `/api/meetings` | POST | Create new meeting |
| `/api/meetings/[id]` | GET | Meeting detail |
| `/api/meetings/[id]` | PATCH | Cancel meeting (organizer only) |
| `/api/meetings/[id]/respond` | POST | Accept/decline invitation |
| `/api/meetings/conflicts` | POST | Check conflicts for a set of faculty |
| `/api/auth/users` | GET | List all faculty users (for participant picker) |

### 5F. UI Pages

- **`/faculty/meetings`** — List view with metrics (confirmed/total), meeting cards with status badges, participant avatars with color-coded status
- **`/faculty/meetings/new`** — Form with: title, description, date, time range, faculty multi-select checkboxes, **real-time conflict checking** (debounced 500ms)
- **`/faculty/meetings/[id]`** — Detail view with: meeting info, description panel, Teams link, respond buttons (Accept/Decline for invitees with PENDING status), Cancel Meeting button (organizer only), participant list with status badges
- Sidebar updated with "Meetings" link for FACULTY role (before Availability Rules)

### 5G. Implementation Notes

- Conflict checking is **advisory** — users can proceed despite conflicts
- Organizer is automatically added as ACCEPTED participant
- Non-organizer invitees see Accept/Decline only when their status is PENDING
- No Teams sync yet — `teamsEventId`/`teamsLink` fields are structural for Phase 7

### New/Modified Files

| File | Action |
|------|--------|
| `prisma/schema.prisma` | + `InternalMeeting`, `InternalMeetingParticipant`, enums, User relations |
| `lib/models/index.ts` | + `MeetingStatus`, `ParticipantStatus`, `InternalMeeting`, `InternalMeetingParticipant` types |
| `lib/repositories/interfaces.ts` | + `IMeetingRepository` + data types |
| `lib/repositories/prisma.ts` | + `meetingRepository` implementation |
| `lib/repositories/factory.ts` | Export `meetingRepository` |
| `lib/services/conflictDetection.ts` | New — conflict detection |
| `lib/controllers/meetings.ts` | New — meeting CRUD + respond + conflicts |
| `app/api/meetings/route.ts` | New |
| `app/api/meetings/[id]/route.ts` | New |
| `app/api/meetings/[id]/respond/route.ts` | New |
| `app/api/meetings/conflicts/route.ts` | New |
| `app/api/auth/users/route.ts` | New — faculty list for participant picker |
| `app/faculty/meetings/page.tsx` | New — meetings list |
| `app/faculty/meetings/new/page.tsx` | New — create meeting form |
| `app/faculty/meetings/[id]/page.tsx` | New — meeting detail |
| `components/Sidebar.tsx` | + Meetings link for faculty |

---

## Phase 6: Sync Tracking Fields

Add fields to track which approved appointments have been synced to MS Teams (and which haven't).

**Key principle:** Faculty approval only writes to our database. A separate process handles the actual Teams API call. This decouples approval from Teams sync, allowing retries and failure visibility.

### 6A. Schema Changes — Appointment Model

```prisma
model Appointment {
  // ... existing fields (id, studentId, facultyId, scheduleId, status, requestedAt, updatedAt, teamsLink)

  // New: Teams sync tracking
  teamsSyncStatus  TeamsSyncStatus @default(UNWRITTEN)
  teamsSyncRetries Int             @default(0)
  teamsSyncError   String?
  teamsSyncLastAttempt DateTime?
}

enum TeamsSyncStatus {
  UNWRITTEN  // Approved but not yet synced to Teams
  WRITTEN    // Successfully created in Teams calendar
  FAILED     // Failed after exhausting retries
}
```

### 6B. Behavior on Faculty Approve

`approveAppointment()`:
- Sets `status = APPROVED`, `teamsSyncStatus = UNWRITTEN`
- **No Teams API call** — only writes to our database
- The orchestration layer picks this up later

### 6C. Behavior on Faculty Cancel

`cancelAppointment()`:
- If `teamsSyncStatus = WRITTEN` → attempts Teams deletion, but does not block
- Status set to `CANCELLED` regardless of Teams deletion outcome

### 6D. UI: Sync Status Display

- Faculty sees a **sync status indicator** on each approved appointment:
  - ✅ **Written to Teams** — green checkmark
  - ⏳ **Pending sync** — amber spinner
  - ❌ **Sync failed** — red warning with error tooltip

### 6E. UI: Retry Button (Faculty)

- If `teamsSyncStatus = FAILED` → faculty sees a **"Retry sync"** button
- Clicking it resets `teamsSyncRetries = 0` and sets `teamsSyncStatus = UNWRITTEN`
- Orchestrator picks it up on next cycle

### 6F. Booking Ticket (Appointment Detail Page)

Create a dedicated appointment detail page that serves as the "ticket" for a booking. Accessible by both student and faculty.

**New page: `/appointments/[id]`** — Single appointment detail view:
- **Header:** Faculty name, student name, date, time
- **Status badge:** PENDING / APPROVED / CANCELLED / FAILED
- **Sync status section** (if APPROVED):
  - ✅ Written to Teams — Teams join link displayed
  - ⏳ Pending sync — "Meeting link will be available shortly"
  - ❌ Sync failed — Red error banner: "Meeting sync failed after multiple attempts. Contact your faculty member."
- **Faculty actions** (if owner): Cancel, Retry sync
- **Student actions** (if owner): Cancel request (if PENDING)
- **Activity log:** Timestamped entries (e.g., "Approved by Dr. Smith on May 6 at 14:30", "Cancelled on May 7 at 10:00")

### Modified Files

| File | Action |
|------|--------|
| `prisma/schema.prisma` | + `TeamsSyncStatus` enum, + fields on Appointment |
| `lib/models/index.ts` | + `TeamsSyncStatus` type |
| `lib/repositories/interfaces.ts` | + sync fields in `AppointmentData` |
| `lib/controllers/appointments.ts` | Update approve/cancel — no Teams calls |
| `components/StatusBadge.tsx` | + sync status indicator |
| `components/AppointmentCard.tsx` | + sync badge + retry button |
| `lib/controllers/appointments.ts` | + `retryTeamsSync()` controller |
| `app/appointments/[id]/page.tsx` | New — booking ticket page |
| `components/AppointmentTicket.tsx` | New — ticket component |

---

## Phase 7: Teams Sync Orchestration

A background process that polls the database for UNWRITTEN appointments, calls the MS Graph API to create calendar events, and updates sync status.

### 7A. Architecture

```
                  ┌──────────────┐
                  │   Database   │
                  └──────┬───────┘
                         │ poll UNWRITTEN appointments
                         ▼
              ┌─────────────────────┐
              │  Teams Sync Service  │
              │  (orchestration.ts)  │
              └──────────┬──────────┘
                         │ call Graph API
                         ▼
              ┌─────────────────────┐
              │  Microsoft Graph    │
              │  /me/onlineMeetings │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Update DB record   │
              │  WRITTEN or retry   │
              └─────────────────────┘
```

Can be triggered via:
- **Cron job** — runs every N minutes (e.g., `*/5 * * * *`)
- **Manual endpoint** — `POST /api/admin/sync-teams` (admin-only)
- **Button in admin dashboard** — manual "Sync now"

### 7B. Sync Logic

```ts
export async function syncPendingAppointments(): Promise<SyncResult> {
  // 1. Fetch all appointments WHERE status = APPROVED AND teamsSyncStatus = UNWRITTEN
  // 2. For each appointment:
  //    a. Get faculty's Microsoft access token (from Account table)
  //    b. If no token → skip (no Teams integration possible)
  //    c. Call POST /me/onlineMeetings with:
  //       - subject: "Consultation: [student name] & [faculty name]"
  //       - startDateTime: "[date]T[startTime]:00"
  //       - endDateTime: "[date]T[endTime]:00"
  //       - attendees: [{ emailAddress: { address: student.email } }]
  //       - description: "Topic: [consultation topic]"
  //    d. On success:
  //       - Save teamsLink, teamsEventId
  //       - Set teamsSyncStatus = WRITTEN
  //    e. On failure:
  //       - Increment teamsSyncRetries
  //       - Save error message
  //       - If retries >= 5 → set teamsSyncStatus = FAILED
  //       - If retries < 5 → leave as UNWRITTEN (next cycle retries)
  // 3. Return summary: { processed, succeeded, failed, skipped }
}
```

### 7C. Retry Policy

| Retry # | Action | teamsSyncStatus |
|---------|--------|-----------------|
| 0 | First attempt | UNWRITTEN |
| 1–4 | Failed, will retry | UNWRITTEN |
| 5 | Failed, max retries reached | **FAILED** |

**Backoff strategy:** Subsequent retries could use exponential backoff (e.g., retry after 1min, 5min, 15min, 30min, 60min). Track `teamsSyncLastAttempt` to enforce delays.

### 7D. API Endpoints

- `POST /api/admin/sync-teams` — triggers sync immediately, returns result summary
- `GET /api/admin/sync-teams/status` — shows pending count, last sync time, failure stats

### 7E. Admin Dashboard Section

Add a "Teams Sync" panel to the admin dashboard showing:
- **Pending sync:** X appointments
- **Failed sync:** Y appointments (with list)
- **Last sync:** timestamp
- **"Sync Now" button** — triggers the orchestration
- **"Auto-sync" toggle** — enable/disable cron-based sync

### 7F. Faculty Booking Ticket (Student View)

When a student views their approved appointment, the ticket shows:
- Sync status indicator
- If WRITTEN → Teams join link is visible and clickable
- If FAILED → red banner: "Meeting sync failed. Please contact your faculty member for the meeting link."
- If UNWRITTEN → amber banner: "Meeting link pending. Check back shortly."

### New Files

| File | Action |
|------|--------|
| `lib/services/teamsSync.ts` | New — orchestration logic |
| `app/api/admin/sync-teams/route.ts` | New — trigger endpoint |
| `app/api/admin/sync-teams/status/route.ts` | New — status endpoint |
| `app/admin/page.tsx` | + Sync panel section |
| `prisma/schema.prisma` | Already updated in Phase 6 |

### Modified Files

| File | Action |
|------|--------|
| `lib/services/graph.ts` | + `createOnlineMeeting()` refinement |
| `lib/controllers/appointments.ts` | No changes needed (sync is decoupled) |

---

## Phase 8: Conflict Detection with Teams

Once the sync orchestration is in place, use Teams calendar data for conflict detection.

### 8A. Teams Calendar View

Add to `lib/services/graph.ts`:
```ts
export async function getCalendarView(
  accessToken: string,
  startDateTime: string,
  endDateTime: string
): Promise<CalendarEvent[]> {
  // GET /me/calendarView?startDateTime=...&endDateTime=...
  // Returns existing events in the faculty's calendar
}
```

### 8B. Enhanced Conflict Detection

In `checkConflicts()`:
- Check app schedules (existing appointments + internal meetings)
- If faculty has Microsoft token: also check their Teams calendar
- Return merged conflict list with source labels ("app" vs "teams")

### 8C. UI

When faculty books an internal meeting or a student tries to book:
- Yellow warning: "⚠️ Faculty has a Teams calendar event overlapping this time"
- They can proceed anyway (conflict is advisory, not blocking)

---

## Feature Flagging

### MS Teams Integration

| Flag | Purpose | Phase |
|------|---------|-------|
| `FEATURE_CREATE_TEAMS_MEETING` | Master toggle for all Teams sync features | 6+ |
| `NEXT_PUBLIC_FEATURE_TEAMS` | Shows/hides Microsoft SSO button on login | Any |
| `TEAMS_AUTO_SYNC_ENABLED` | Enables cron-based auto-sync (vs manual only) | 7 |

### Current State

```
FEATURE_CREATE_TEAMS_MEETING=true   (keep, code degrades gracefully)
NEXT_PUBLIC_FEATURE_TEAMS=true      (keep to show SSO option)
```

### Degradation Behavior

When Teams is disabled or MS token is unavailable:
- **Phase 6:** Sync status stays UNWRITTEN. Faculty sees "sync pending" badge. No impact on booking flow.
- **Phase 7:** Orchestrator skips appointments where faculty has no Microsoft token.
- **Phase 8:** Conflict detection falls back to app-only mode.
- **Approval:** Always works — writes to database only, no Teams dependency.
- **Cancel:** Always works — updates status, Teams cleanup is best-effort.

---

## Schema Summary

### New Tables

| Table | Purpose | Phase |
|-------|---------|-------|
| `FacultyAvailabilityRule` | Per-day availability rules | 1 |
| `InternalMeeting` | Faculty-to-faculty meetings | 5 |
| `InternalMeetingParticipant` | Meeting participants | 5 |

### Modified Tables

| Table | Change | Phase |
|-------|--------|-------|
| `Appointment` | Add `teamsSyncStatus`, `teamsSyncRetries`, `teamsSyncError`, `teamsSyncLastAttempt` | 6 |
| `AppointmentStatus` | Add `CANCELLED` value | 3 |

### New Enums

| Enum | Values | Phase |
|------|--------|-------|
| `TeamsSyncStatus` | `UNWRITTEN`, `WRITTEN`, `FAILED` | 6 |
| `MeetingStatus` | `CONFIRMED`, `CANCELLED` | 5 |
| `ParticipantStatus` | `PENDING`, `ACCEPTED`, `DECLINED` | 5 |

---

## Implementation Order

```
Phase 1 ──> Phase 2 ──> Phase 3 ──> Phase 4 ──> Phase 5 ──> Phase 6 ──> Phase 7 ──> Phase 8
 (Rules)    (Tabs)      (Cancel)    (Student     (Meetings)   (Sync       (Sync        (Conflict
                                     Cancel)                  Tracking)   Orchestr.)    w/ Teams)
```

Each phase builds on the previous.

- **Phases 1–5:** App-only. No Microsoft dependency. Core booking flow improvements.
- **Phase 5:** Internal meetings. Conflict detection is app-only initially.
- **Phase 6:** Adds sync tracking fields. Approval is decoupled from Teams API calls.
- **Phase 7:** Orchestration service polls for unwritten appointments and calls Teams API.
- **Phase 8:** Teams calendar conflict detection (requires sync + tokens to work).

Phases 7 and 8 require admin consent for the Microsoft Graph API permissions to be fully functional, but the code and schema can be built ahead of time.
