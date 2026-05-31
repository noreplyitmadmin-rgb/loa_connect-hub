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
├── admin/                    # Admin dashboard & management
├── api/                      # REST API routes (thin handlers -> controllers)
├── dean/                     # Dean dashboard & management
├── faculty/                  # Faculty dashboard & management
├── student/                  # Student dashboard & booking
├── layout.tsx                # Root layout (SessionProvider + AppShell)
└── page.tsx                  # Root page (role-based redirect / multi-role selector)

components/                   # React components (36 files)
├── reports/                  # Report-related components (12 files)
├── AppShell.tsx              # App layout shell (sidebar + breadcrumbs)
├── BookingCalendar.tsx       # Calendar slot selection
├── BookingForm.tsx           # Booking form
├── Sidebar.tsx               # App sidebar navigation
└── ...                       # StatusBadge, Skeleton, SubmitButton, etc.

lib/                          # Business logic (29 files)
├── controllers/              # Domain logic (appointments, auth, reports, etc.)
├── repositories/             # Data access layer (interfaces + Supabase impl)
├── services/                 # Cross-cutting (email, audit, CSV, iCal)
├── models/                   # Domain model types
├── dtos/                     # Data transfer objects
└── utils/                    # Date, roles, semester helpers
```

### Data Flow

```
Browser HTTP Request
    ↓
proxy.ts (NextAuth Middleware) — JWT validation, role-based page access
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

### Current Patterns

| Pattern | Implementation |
|---------|---------------|
| **Routing** | Next.js App Router — file-based, route groups, dynamic `[id]` routes |
| **Auth** | NextAuth v4 (Credentials provider, JWT, bcryptjs) |
| **Authorization** | Middleware (`proxy.ts`) + per-route `auth()` calls + DB role checks |
| **Data access** | Repository pattern with interface abstraction |
| **Roles** | Multi-role via `userrole` join table; resolved by priority (ADMIN > DEAN > FACULTY > STUDENT) |
| **UI state** | React built-in hooks (`useState`, `useEffect`); no global state library |
| **Forms** | Local `useState`; `SubmitButton` double-click prevention |
| **Email** | Nodemailer (Gmail SMTP), fire-and-forget with `.catch()` |
| **iCal** | Custom `.ics` generation (no library) |
| **CSV import** | Custom parser in `lib/services/` |
| **PDF export** | jsPDF + jspdf-autotable |
| **Feature flags** | Environment variables (`EMAIL_FEATURE_FLAG`, `SSO_FEATURE_FLAG`, etc.) |
| **Loading states** | Dedicated skeleton components + `loading.tsx` per route segment |

### File Count

| Directory | Source Files |
|-----------|-------------|
| `app/` | 77 (pages, API routes, layouts) |
| `components/` | 36 (React components) |
| `lib/` | 29 (controllers, services, repos, utils) |
| Total | ~146 source files |

### Known Issues & Risks

1. **Supabase repository is a monolith** — `lib/repositories/supabase.ts` is ~1015 lines implementing 7 repository interfaces in one file. Violates Single Responsibility Principle; hard to test and maintain.
2. **Minimal test coverage** — Only 1 test file exists for ~17,619 LOC. Critical paths (appointment booking, conflict detection, role resolution, report aggregation) are untested.
3. **No client data-fetching library** — All client components use `useEffect` + `fetch()`. No caching, deduplication, stale-while-revalidate, optimistic updates, or automatic retry.
4. **Silent email failures** — Fire-and-forget pattern with `.catch()` means failed emails are invisible. No retry mechanism, queue, or user-facing feedback.
5. **No React Error Boundaries** — No `error.tsx` files. An uncaught client error can collapse the entire component tree.
6. **Scattered type definitions** — Types live across `lib/models/`, `lib/repositories/interfaces.ts`, and `lib/dtos/`. Inconsistent naming and organization.
7. **HTML email templates via template literals** — Fragile string concatenation. No type safety or template engine.

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

## Future Implementation — Reliable Email Delivery via Vercel Workflows

### Current Problem

Emails are sent as fire-and-forget background tasks using `.catch()` (see Known Issues #4). Failures are silent for two call sites and only logged for the others. There is no retry, no queue, and no user-facing feedback when an email fails.

### Options Considered

| Approach | Pros | Cons |
|----------|------|------|
| **Next.js `after()`** (`next/server`) | Built into Next.js 15.1+; zero dependencies; runs after response is sent | No durability — if the serverless function terminates mid-execution, the email is lost. No retry mechanism. |
| **`@vercel/functions` `waitUntil()`** | Extends request lifetime for promises | Same durability limitations as `after()`. No retry or observability. |
| **Vercel Workflows** (`workflow` SDK) | Durable execution — survives crashes; built-in retries; observable via Vercel dashboard; can pause/resume for long delays | Adds a dependency; requires `'use workflow'` directive; slightly more complex setup. |
| **Vercel Queues** | Reliable message queue; integrates with Vercel Functions | Adds infrastructure; requires queue consumer setup. |
| **Inngest** | Third-party workflow engine purpose-built for background jobs; generous free tier; full observability | External dependency; requires account; vendor lock-in. |

### Recommended Path: Vercel Workflows

Vercel Workflows (announced 2025, GA 2026) is the strongest fit because:

- **Durable** — survives deployment restarts and serverless cold starts. Workflow state is persisted.
- **Familiar DX** — uses async/await with a `'use workflow'` directive; no YAML or state machines.
- **Built-in retries** — each step can have individual retry policies, eliminating the silent-failure problem.
- **Observability** — built-in logs, metrics, and tracing in the Vercel dashboard.
- **Direct replacement** — the existing email functions in `lib/services/email.ts` can be called from within a workflow step with minimal refactoring.

### Current Status (Pre-deployment)

The following code is already in place and ready for Vercel deployment:

| File | What's Ready |
|------|-------------|
| `lib/workflows/email-workflows.ts` | 5 workflow functions: `sendConsultationInviteWorkflow`, `sendApprovedWorkflow`, `sendPasswordChangedWorkflow`, `sendAppointmentCreatedWorkflow`, `sendConsultationApprovedWorkflow` |
| `lib/controllers/appointments.ts` | All 3 email call sites now call workflow functions |
| `app/api/auth/change-password/route.ts` | Password notification uses `sendPasswordChangedWorkflow` |
| `package.json` | `workflow` SDK listed as dependency |

### Remaining Steps for Deployment

```
1. Deploy on Vercel
2. Run npm install (workflow SDK will resolve)
3. Vercel build will recognize "use workflow" directives
4. No code changes needed — controllers already call workflow functions
```

### Prerequisites

- Vercel deployment (Workflows require Vercel infrastructure)
- `VERCEL_ENV` environment variable (automatically set on Vercel)
- Workflow SDK: `npm i workflow`

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
| 14. Attendee Permissions | ❌ Remaining |
| 15. Reports & Export | ❌ Remaining |
| 16. Staggered & Multi-Faculty Booking | ✅ Done |
