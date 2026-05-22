# E-Consultation

Academic consultation management system built with Next.js 16, Supabase, and Tailwind CSS 4.

## Environment Variables

Copy `.env` to set up your local environment. Below are all required variables — obtain the values from your team lead or Supabase dashboard.

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | NextAuth signing secret (generate via `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | App base URL (`http://localhost:3000` for dev) |
| `AUTH_URL` | No | Alias for NEXTAUTH_URL |
| `DB_PROVIDER` | Yes | `sqlite` for local dev, `supabase` for production |
| `SUPABASE_URL` | If Supabase | Supabase project URL (`https://[project-ref].supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | If Supabase | Supabase service role key (project Settings → API) |
| `SSO_FEATURE_FLAG` | No | Set `true` to enable Microsoft Entra ID sign-in (requires Azure app registration) |
| `EMAIL_FEATURE_FLAG` | No | Set `true` to enable email sending via Gmail SMTP |
| `GMAIL_USER` | If email | Gmail address for sending activation emails |
| `GMAIL_APP_PASSWORD` | If email | Gmail app password (enable 2FA → App passwords) |
| `DATABASE_URL` | If SQLite | Prisma SQLite connection string (`file:./prisma/dev.db`) |

## Quick Start

```bash
# Install dependencies
npm install

# SQLite (local dev)
npx prisma db push
npx tsx prisma/seed.ts
npm run dev

# Supabase (production)
# 1. Run supabase-schema.sql in Supabase SQL Editor
# 2. Set DB_PROVIDER=supabase in .env
# 3. npx tsx prisma/seed-supabase.ts
# 4. npm run dev
```

## Seed Accounts (all password: `password123`)

| Role | Email |
|------|-------|
| Admin | admin@econsult.com |
| Dean | regie@itmlyceumalabang.onmicrosoft.com |
| Faculty | nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com |
| Student | nin.alamo@outlook.com |

Only the admin account is activated by default. Other accounts must use the activation flow at `/activate`.
