# E-Consultation

Academic consultation management system built with **Next.js 16**, **Supabase**, and **Tailwind CSS 4**.

## Architecture

### Database

- **Production**: Supabase PostgreSQL. Tables created via `supabase-schema.sql` (run in Supabase SQL Editor).
- **Local dev**: SQLite via Prisma (`prisma/dev.db`).

### Data Access

Two repository implementations exist under `lib/repositories/`:

| Provider | File | Used when |
|----------|------|-----------|
| **Supabase REST API** | `supabase.ts` | `DB_PROVIDER=supabase` |
| **Prisma (SQLite)** | `prisma.ts` | `DB_PROVIDER=sqlite` |

The factory (`lib/repositories/factory.ts`) only imports the Supabase repos by default to avoid bundling Prisma on production deployments. Set `DB_PROVIDER=sqlite` locally if you need Prisma-based SQLite access.

### MS Teams Integration

Optional — guarded by `FEATURE_CREATE_TEAMS_MEETING` flag. Sync tracking fields on `Appointment` (`teamsSyncStatus`, `teamsSyncRetries`, etc.) with a cron-triggered endpoint at `POST /api/admin/sync-teams`.

## Environment Variables

Copy `.env` to set up your local environment.

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | NextAuth signing secret (generate via `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | App base URL (`http://localhost:3000` for dev) |
| `AUTH_URL` | No | Alias for NEXTAUTH_URL |
| `DB_PROVIDER` | Yes | `sqlite` for local dev, `supabase` for production |
| `SUPABASE_URL` | If Supabase | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | If Supabase | Supabase service role key |
| `SSO_FEATURE_FLAG` | No | Enable Microsoft Entra ID sign-in |
| `EMAIL_FEATURE_FLAG` | No | Enable email sending via Gmail SMTP |
| `GMAIL_USER` | If email | Gmail address for sending activation emails |
| `GMAIL_APP_PASSWORD` | If email | Gmail app password |
| `DATABASE_URL` | If SQLite | Prisma SQLite connection string (`file:./prisma/dev.db`) |
| `FEATURE_CREATE_TEAMS_MEETING` | No | Master toggle for Teams sync features |

## UI Patterns

### Double-Click Prevention

All form submissions and action buttons use `SubmitButton` (`components/SubmitButton.tsx`) which has a built-in `useRef` guard that blocks re-entry for 500ms after the first click, preventing double-submissions even before React re-renders.

### Skeleton Loading

Client-side pages that fetch data on mount show skeleton placeholders (`components/Skeleton.tsx`) instead of "Loading..." text. Variants: `text`, `card`, `table-row`, `avatar`, `metric`, `badge`, plus composite layouts `SkeletonTable`, `SkeletonMetricGrid`, `SkeletonCard`.

### Redirect Guard on Login

The login page checks `useSession()` on mount and auto-redirects already-authenticated users to their role-specific dashboard, preventing them from seeing the login form after session errors or redirects.

## Quick Start

### Local Dev (SQLite)

```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts
DB_PROVIDER=sqlite npm run dev
```

### Production (Supabase)

```bash
# 1. Run supabase-schema.sql in Supabase SQL Editor (creates all tables + seed data)
# 2. Set DB_PROVIDER=supabase in .env
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

See `PLAN.md` for full feature breakdown.

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
