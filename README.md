# E-Consultation

Academic consultation management system built with **Next.js 16**, **Supabase**, and **Tailwind CSS 4**.

## Architecture

### Database

Supabase PostgreSQL. Tables created via `supabase-schema.sql` (run in Supabase SQL Editor).

### MS Teams Integration

Optional — guarded by `FEATURE_CREATE_TEAMS_MEETING` flag. Sync tracking fields on `Appointment` (`teamsSyncStatus`, `teamsSyncRetries`, etc.) with a cron-triggered endpoint at `POST /api/admin/sync-teams`.

## Architecture Review

### Layered Structure

```
app/                          # Next.js App Router — pages, layouts, API routes
├── (auth)/                   # Auth route group (login, activate, forgot-password)
│   └── error.tsx             # Auth error boundary
├── admin/                    # Admin dashboard & management
│   └── error.tsx             # Admin error boundary
├── api/                      # REST API routes (thin handlers -> controllers)
├── dean/                     # Dean dashboard & management
│   ├── error.tsx             # Dean error boundary
│   └── loading.tsx           # Dean loading state
├── dean/m/                   # Dean mobile companion pages (departments, upload)
├── faculty/                  # Faculty dashboard & management
│   ├── error.tsx             # Faculty error boundary
│   └── loading.tsx           # Faculty loading state
├── faculty/m/                # Faculty mobile companion pages (meetings)
├── student/                  # Student dashboard & booking
│   ├── error.tsx             # Student error boundary
│   ├── loading.tsx           # Student loading state
│   ├── book/loading.tsx      # Booking loading state
│   └── meetings/             # Student meetings (with loading.tsx per [id])
├── student/m/                # Student mobile companion pages (book, meetings)
├── 403/                      # Access denied page
├── faq/                      # FAQ page
├── error.tsx                 # Global error boundary (inside layout)
├── global-error.tsx          # Root error boundary (outside layout, includes <html>)
├── layout.tsx                # Root layout (SessionProvider + AppShell)
└── page.tsx                  # Root page (role-based redirect / multi-role selector)

components/                   # React components (37 files)
├── reports/                  # Report-related components (12 files)
├── MobileBookingFlow.tsx     # Mobile booking wizard (step-by-step)
├── AppShell.tsx              # App layout shell (sidebar + breadcrumbs)
├── BookingCalendar.tsx       # Calendar slot selection
├── BookingForm.tsx           # Booking form
├── Sidebar.tsx               # App sidebar navigation (dark mode toggle)
└── ...                       # StatusBadge, Skeleton, SubmitButton, etc.

lib/                          # Business logic (32 files)
├── controllers/              # Domain logic (appointments, auth, reports, etc.)
├── repositories/             # Data access layer (interfaces + Supabase impl)
├── services/                 # Cross-cutting (email, audit, CSV, iCal)
├── types/                    # Shared type definitions (entity, dto, repository)
└── utils/                    # Date, roles, semester helpers
```

### Data Flow

```
Browser HTTP Request
    ↓
proxy.ts (NextAuth Middleware) — JWT validation, mobile-UA redirect, role-based page access
    ↓
Next.js App Router / API Routes
    ↓
API Route Handler (thin) — parse request, call controller, return JSON
    ↓
Controller (lib/controllers/) — business logic, validation, orchestration
    ↓
Repository (lib/repositories/) — data access via Supabase REST API
    ↓
Supabase PostgreSQL
```

Server Components fetch data directly via controllers and pass props to Client Components.

### Mobile Companion Pages

Mobile user-agents are auto-redirected from desktop routes to their `/m/` counterparts via `proxy.ts`. The proxy rewrites mobile paths back to desktop equivalents (`toDesktopPath()`) for role-based access checks, so the auth config stays simple.

| Desktop Route | Mobile Route | Purpose |
|---|---|---|
| `/student/book` | `/student/m/book` | Step-by-step booking wizard (same-department faculty filter) |
| `/student/meetings` | `/student/m/meetings` | Student consultation list |
| `/student/meetings/[id]` | `/student/m/meetings/[id]` | Student consultation detail |
| `/faculty/meetings` | `/faculty/m/meetings` | Faculty meeting list |
| `/faculty/meetings/new` | `/faculty/m/meetings/new` | Faculty create meeting (wraps StudentBooking) |
| `/faculty/meetings/[id]` | `/faculty/m/meetings/[id]` | Faculty meeting detail |
| `/dean` | `/dean/m` | Desktop-only notice (dashboard excluded from mobile) |
| `/dean/departments` | `/dean/m/departments` | Department courses management |
| `/dean/upload` | `/dean/m/upload` | Bulk CSV import |

Desktop opt-out via `?desktop=1` query param.

### Current Patterns

| Pattern | Implementation |
|---------|---------------|
| **Routing** | Next.js App Router — file-based, route groups, dynamic `[id]` routes |
| **Auth** | NextAuth v4 (Credentials provider, JWT, bcryptjs) |
| **Authorization** | Middleware (`proxy.ts`) + per-route `auth()` calls + DB role checks |
| **Data access** | Repository pattern with interface abstraction |
| **Roles** | Multi-role via pipe-delimited string in `user.role`; resolved by priority (ADMIN > DEAN > FACULTY > STUDENT); Faculty ⇔ Dean mutually exclusive |
| **UI state** | React built-in hooks (`useState`, `useEffect`); no global state library |
| **Forms** | Local `useState`; `SubmitButton` double-click prevention |
| **Email** | Nodemailer (Gmail SMTP), durable via Vercel Workflows with sequenced steps |
| **iCal** | Custom `.ics` generation (no library) |
| **CSV import** | Custom parser in `lib/services/` |
| **PDF export** | jsPDF + jspdf-autotable |
| **Feature flags** | Environment variables (`EMAIL_FEATURE_FLAG`, `SSO_FEATURE_FLAG`, etc.) |
| **Loading states** | Dedicated skeleton components + `loading.tsx` per route segment |
| **Dark mode** | Class-based (`.dark` on `<html>`), persisted in localStorage, Tailwind v4 `@custom-variant dark` |
| **Mobile detection** | UA regex in `proxy.ts`, desktop opt-out via `?desktop=1` |

### File Count

| Directory | Source Files |
|-----------|-------------|
| `app/` | 92 (pages, API routes, layouts, error boundaries, loading states) |
| `components/` | 37 (React components) |
| `lib/` | 40 (controllers, services, workflows, repos, types, utils, email-templates) |
| Total | ~169 source files |

### Known Issues & Risks

1. **Minimal test coverage** — Only 2 test files exist for ~17,619 LOC. Critical paths (appointment booking, conflict detection, role resolution, report aggregation) are untested.
2. **Mitigated — Vercel Workflows for durable email** — Fire-and-forget `.catch()` call sites replaced with Vercel Workflow functions (`lib/workflows/email-workflows.ts`) that provide built-in retries per step. Status notifications (accept, complete, cancel) also use durable workflows. Silent failures remain for non-critical emails not yet migrated.
3. **HTML email templates via template literals** — Fragile string concatenation. No type safety or template engine.

## Environment Variables

Copy `.env` to set up your local environment.

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | NextAuth signing secret (generate via `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | App base URL (`http://localhost:3000` for dev) |
| `AUTH_URL` | No | Alias for NEXTAUTH_URL |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `SSO_FEATURE_FLAG` | No | Enable Microsoft Entra ID sign-in |
| `EMAIL_FEATURE_FLAG` | No | Enable email sending via Gmail SMTP |
| `GMAIL_USER` | If email | Gmail address for sending activation emails |
| `GMAIL_APP_PASSWORD` | If email | Gmail app password |
| `FEATURE_CREATE_TEAMS_MEETING` | No | Master toggle for Teams sync features |

## UI Patterns

### Double-Click Prevention

All form submissions and action buttons use `SubmitButton` (`components/SubmitButton.tsx`) which has a built-in `useRef` guard that blocks re-entry for 500ms after the first click, preventing double-submissions even before React re-renders.

### Skeleton Loading

Client-side pages that fetch data on mount show skeleton placeholders (`components/Skeleton.tsx`) instead of "Loading..." text. Variants: `text`, `card`, `table-row`, `avatar`, `metric`, `badge`, plus composite layouts `SkeletonTable`, `SkeletonMetricGrid`, `SkeletonCard`.

### Redirect Guard on Login

The login page checks `useSession()` on mount and auto-redirects already-authenticated users to their role-specific dashboard, preventing them from seeing the login form after session errors or redirects.

### Dark Mode

Class-based strategy: `.dark` class on `<html>` toggles Tailwind `dark:` variants. Persisted in `localStorage` with an inline no-flash script in `<head>`. Sidebar toggle uses sun/moon icons. CSS variable overrides in `globals.css` for custom components.

## Email Delivery via Vercel Workflows

### Architecture

Emails are sent through **Vercel Workflows** (durable execution) with built-in retries per step, surviving deployment restarts and serverless cold starts. On local development the `"use workflow"` / `"use step"` directives are no-ops and functions run as regular async calls.

### Workflow Functions

| Function | Purpose | Steps |
|----------|---------|-------|
| `sendConsultationInviteWorkflow` | Student → Faculty consultation invite | 1 — `sendConsultationInvite` |
| `sendApprovedWorkflow` | Consultation accepted with Teams link | 1 — `sendApprovedWithTeamsLink` |
| `sendPasswordChangedWorkflow` | Password change notification | 1 — `sendPasswordChangedEmail` |
| `sendAppointmentCreatedWorkflow` | Dynamic booking email dispatch | 1 — `sendAppointmentCreatedEmail` |
| `sendConsultationApprovedWorkflow` | Student-booking accepted | 1 — `sendConsultationApprovedEmail` |
| `sendMeetingInviteWithAcknowledgementWorkflow` | Faculty/Dean booking: invite → creator ack | 2 — `sendInviteStep` → `sendAcknowledgementStep` |
| `sendConsultationInviteWithAcknowledgementWorkflow` | Student booking: invite → student ack | 2 — `sendConsultationInviteStep` → `sendAcknowledgementStep` |
| `sendStatusUpdateWorkflow` | Accept/complete/cancel notifications | 1 — `sendStatusUpdateEmail` |

### Email Flows

| Trigger | Recipients | Template | Workflow |
|---------|-----------|----------|----------|
| Student books consultation | Faculty TO + CC attendees | `consultation-invite` | `sendConsultationInviteWithAcknowledgementWorkflow` |
| Student books consultation (ack) | Student | `booking-acknowledgement` (request variant) | ↑ step 2 |
| Faculty/Dean creates meeting | Attendees TO + CC | `meeting-invite` | `sendMeetingInviteWithAcknowledgementWorkflow` |
| Faculty/Dean creates meeting (ack) | Creator | `booking-acknowledgement` (booking variant) | ↑ step 2 |
| Faculty accepts consultation (student-booking) | Student TO, CC faculty + attendees | `consultation-approved` | `sendConsultationApprovedWorkflow` |
| Faculty accepts (self-booking) | Faculty TO, CC attendees | `status-notification` (accepted + creator wording) | `sendStatusUpdateWorkflow` |
| Appointment cancelled | Non-actor participants | `status-notification` (cancelled) | `sendStatusUpdateWorkflow` |
| Appointment completed | Creator TO, CC attendees | `status-notification` (completed + action taken) | `sendStatusUpdateWorkflow` |
| Password changed | User | Inline HTML | `sendPasswordChangedWorkflow` |

### Files

| File | Role |
|------|------|
| `lib/services/email.ts` | Low-level Nodemailer senders (7 functions) |
| `lib/email-templates/*.ts` | HTML templates (5 variants) |
| `lib/workflows/email-workflows.ts` | Durable workflow wrappers (8 functions) |
| `lib/controllers/appointments.ts` | Business logic that invokes workflows |

### Prerequisites for Production

- Vercel deployment (Workflows require Vercel infrastructure)
- `VERCEL_ENV` (automatically set on Vercel)
- `"workflow"` dependency in `package.json` (already installed)

## Quick Start

### Setup

```bash
# 1. Run supabase-schema.sql in Supabase SQL Editor (creates all tables + seed data)
# 2. Configure .env with Supabase credentials
# 3. Deploy
```

## Seed Accounts

| Role | Email | Password | Activated |
|------|-------|----------|-----------|
| Admin | admin@lyceumalabang.ph | `a7Kx9mPq4Rz2wY8b` | Yes |
| Dean | regie@itmlyceumalabang.onmicrosoft.com | `password123` | No |
| Faculty | nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com | `password123` | No |
| Student | nin.alamo@outlook.com | `password123` | No |

Non-activated accounts must use the activation flow at `/activate`.

## Feature Status

| Phase | Status |
|-------|--------|
| 1. Availability Rules Engine | ✅ Done |
| 2. Faculty Dashboard Tabs | ✅ Done |
| 3. Faculty Cancel Flow | ✅ Done |
| 4. Student Cancellation | ✅ Done |
| 5. Faculty-to-Faculty Meetings | ✅ Done |
| 6. Sync Tracking Fields | ✅ Done |
| 7. Teams Sync Orchestration | ✅ Done |
| 8. Conflict Detection w/ Teams | ✅ Done |
| 9. Enhanced Booking (Title, Desc, Attendees) | ✅ Done |
| 10. Department & Dean Role | ✅ Done |
| 11. ETL — Bulk User Import (CSV) | ✅ Done |
| 12. Email-based Auth & Password Setup | ✅ Done |
| 13. Consultation Completion (Action Taken) | ✅ Done |
| 14. Attendee Permissions | ✅ Done |
| 15. Reports & Export | ✅ Done |
| 16. Staggered & Multi-Faculty Booking | ✅ Done |
| 17. Mobile Companion Pages | ✅ Done |
| 18. Dark Mode | ✅ Done |
