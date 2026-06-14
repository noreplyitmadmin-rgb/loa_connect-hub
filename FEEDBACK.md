# Codebase Feedback: LOA Connect Hub

## Features

**Strengths:** Broad domain coverage — auth (JWT + role-based middleware, activation, password flows), appointment booking with conflict detection, 10+ report types, admin data management (departments, semesters, subjects, sections, enrollments), audit logging, CSV-based ETL with preview, iCal/PDF export, email via Vercel Workflows, and mobile companion pages. Dark mode is well-implemented (no-flash script, localStorage persistence).

**Gaps:** Faculty Evaluation module is the major incomplete area (~18 items missing from README checklist: 8 pages, 2 repositories, 3 API routes for evaluation reports). Sentiment analysis is stubbed with placeholder implementations. These live on the `eval` branch and haven't been merged.

**Architecture note:** A `lib/controllers/` layer is referenced in AGENTS.md but doesn't exist on disk — some orchestration logic lives in service files instead, blurring the service/controller boundary.

---

## Testability

**Strengths:** Repository pattern with interfaces allows module-level mocking via `vi.mock`. Tests that exist (9 test files) cover utilities (roles, auth, CSV parser), access control, appointment booking validation, report merging, ETL import, and some API routes. Latest tests use `vi.hoisted` for mock definitions before module resolution, which is the correct pattern for Vitest.

**Weaknesses:** Estimated coverage is very low (~7%). Critical paths untested: appointment conflict detection, middleware role resolution, email template rendering, iCal generation, availability rule validation, full appointment lifecycle, report aggregation edge cases, most repository methods. No integration tests against a real/stub database. No setup files in Vitest config. Some tests use `clearAllMocks` where `resetAllMocks` is needed (noted in AGENTS.md as a known issue). Services use static imports from the factory — no constructor/parameter injection means varying mocks per test case requires workarounds.

---

## Scalability

**Strengths:** Batch operations exist for user creation and section-level replacements (faculty-subjects, enrollments). Database has targeted indexes on the most common lookup paths (appointment status/student/faculty, time slot dates, user email, semester active flag). Embedded joins in `appointmentSelect` prevent N+1 on related data fetches.

**Weaknesses:** No pagination on any list endpoint — `listAll`, `listByFaculty`, `listByStudent`, and all report queries fetch every matching record. This is the most significant scalability risk as data grows. Department-scaled report queries run 7+ queries per department in parallel (fine for <20 departments, problematic at 50+). Missing indexes on `appointments.date`, `appointments.meetingType`, and composite `(facultyId, status, date)` for common report patterns. Appointment creation adds time slots and attendees in sequential `for...of` loops with `await` instead of batched or parallelized inserts. No server-side caching beyond the 60s TTL access config cache (no Redis, no query result caching, no ISR).

---

## Performance

**Strengths:** Next.js App Router enables streaming and server components. Email workflows are fire-and-forget (non-blocking). Embedded joins reduce round-trips for related data.

**Weaknesses:** Middleware performs a Supabase query (`checkUserPermission`) on every authenticated page request — adds 50-200ms latency per navigation with no caching. `ilike` with `%` prefix for email lookup (`findByEmail`) defeats index usage. `appointmentSelect` over-fetches (`select("*")` on user joins, includes `passwordHash` column). jsPDF + jspdf-autotable (~500KB gzipped client bundle) are not dynamically imported. `sendConsultationApprovedEmail` uses `await import()` inside a hot path instead of static top-level imports. Dynamic `await import()` for workflow runtime checks could be front-loaded. No code-splitting strategy for report-heavy pages. Sequential slot/attendee creation is both a scalability and performance concern.
