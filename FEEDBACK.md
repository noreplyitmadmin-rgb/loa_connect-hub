# Codebase Feedback: LOA Connect Hub

## Features

**Strengths:** Broad domain coverage — auth (JWT + role-based middleware, activation, password flows), appointment booking with conflict detection, 10+ report types, admin data management (departments, semesters, subjects, sections, enrollments), audit logging, CSV-based ETL with preview, iCal/PDF export, email via Vercel Workflows, and mobile companion pages. Dark mode is well-implemented (no-flash script, localStorage persistence).

**Gaps:** Faculty Evaluation module pages are all built. Sentiment analysis (`lib/services/sentiment.ts` + 3 API routes) is still stubbed with placeholder implementations.

**Architecture:** The Reports domain has been refactored into a two-layer pattern (`*.controller.ts` orchestrates + shapes DTOs, `*.service.ts` handles pure data fetching/computation). Previously, service files mixed multi-department loops, cross-department aggregation, and UI formatting (month names, labels, percentages) with repository calls. The split follows the `appointments` controller precedent and improves testability — services are now focused units of logic. Sixteen backward-compat re-export shims in `components/` were also removed — all imports now point directly to the real implementations in `components/ui/`, `components/layouts/`, or `features/*/components/`.

---

## Testability

**Strengths:** Repository pattern with interfaces allows module-level mocking via `vi.mock`. Tests that exist (9 test files) cover utilities (roles, auth, CSV parser), access control, appointment booking validation, report merging, ETL import, and some API routes. Latest tests use `vi.hoisted` for mock definitions before module resolution, which is the correct pattern for Vitest.

**Weaknesses:** Estimated coverage is very low (~7%). Critical paths untested: appointment conflict detection, middleware role resolution, email template rendering, iCal generation, availability rule validation, full appointment lifecycle, report aggregation edge cases, most repository methods. No integration tests against a real/stub database. No setup files in Vitest config. Some tests use `clearAllMocks` where `resetAllMocks` is needed (noted in AGENTS.md as a known issue). Services use static imports from the factory — no constructor/parameter injection means varying mocks per test case requires workarounds.

---

## Scalability

**Strengths:** Batch operations exist for user creation and section-level replacements (faculty-subjects, enrollments). Database has targeted indexes on the most common lookup paths (appointment status/student/faculty/date/meetingType, time slot dates, user email, semester active flag). Embedded joins in `appointmentSelect` prevent N+1 on related data fetches.

**Strengths:** Appointment slot/attendee creation and conflict checks use `Promise.all` for parallel DB operations instead of sequential `for...of` + `await` loops, reducing N+M round-trips to a handful of batches. All appointment list endpoints (`listByStudent`, `listByFaculty`, `listByParticipant`, `listAll`) use server-side pagination via Supabase `.range()` + `count: "exact"` with default limit 50.

**Weaknesses:** Department-scaled report queries run 7+ queries per department in parallel (fine for <20 departments, problematic at 50+). No server-side caching beyond the 60s TTL access config cache (no Redis, no query result caching, no ISR).

---

## Performance

**Strengths:** Next.js App Router enables streaming and server components. Email workflows are fire-and-forget (non-blocking). Embedded joins reduce round-trips for related data. Permission checks in middleware are now cached with 60s TTL per user. `findByEmail` uses exact `.eq()` match instead of `ilike` prefix scan — correct semantics and index-friendly. `appointmentSelect` user joins use explicit column lists (`id, name, email`) instead of `*`, removing `passwordHash` from query results. jsPDF + jspdf-autotable are dynamically imported on click rather than bundled statically (~500KB saved from critical path). Report tab content is code-split via `next/dynamic`, with chart/schedule/summary views loaded on tab activation. Slot/attendee creation and conflict checks use `Promise.all` for parallel DB operations.
