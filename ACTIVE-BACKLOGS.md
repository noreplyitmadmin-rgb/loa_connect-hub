# Active Backlogs

> Working file for tracking issues, bugs, and improvements across the project.
> Data may be stale — verify before acting.

---

## 1. Access-Config Enforcement

### Goal

Enforce the `group_access` system so that page access is controlled by the database-driven access config, not by scattered `hasRole()` checks in individual pages.

### Current State

#### What exists
- `lib/access.ts` — `loadAccessConfig()`, `hasPageAccess(role, path)`, `clearAccessConfigCache()`
- `supabase` table `group_access` with pages JSONB per role group
- `/api/auth/access` — returns allowed pages for the current user (used by sidebar)
- `/api/admin/access-config` — CRUD for group_access (admin UI at `/admin/access-config`)
- `components/Sidebar.tsx` — fetches `allowedPages` and filters nav items; has collapsible Data Management + Evaluations groups
- `app/403/page.tsx` — static 403 page exists but is **never triggered**

#### What's missing
1. **No middleware or layout-level enforcement** — pages check `hasRole()` independently, and some don't check at all
2. **`hasPageAccess()` is never called** in page components
3. **No redirect to `/403`** — denied access goes to `/login` instead
4. **DB `group_access` table overrides `DEFAULT_CONFIG`** — new `/admin/data/*` paths added to `DEFAULT_CONFIG` in code but may not be in the DB table, causing sidebar links to not appear
5. **`admin/reports/*` pages** only check `session?.user`, not ADMIN role
6. **Sidebar filtering is cosmetic** — doesn't prevent URL-based navigation

#### Stale items (removed from backlog)
- `/admin/users` client component — now moved to `/admin/data/users` (server component)
- `admin/data-management` — no longer an active path

### Plan

#### Part A: Navigation Hiding (Sidebar)

**Status: Mostly done.** The sidebar already calls `/api/auth/access` and filters `ALL_NAV_ITEMS` against `allowedPages`.

Needs:
- [ ] Ensure all page routes are registered in the `group_access` seed data + admin page catalog
- [ ] Add `/admin/reports/*` child paths to the scanned page catalog in `/api/admin/access-config` so admins can toggle them individually
- [ ] Sync `/admin/data/*` and other new paths into the DB `group_access` table

#### Part B: Server-Side Enforcement (403 Redirect)

Create a **middleware** or **layout-level guard** that enforces `hasPageAccess()` on every request:

**Option 1 — `middleware.ts` (Recommended)**
```
File: middleware.ts (project root)

Logic:
1. Extract session from NextAuth
2. Get current pathname
3. Call hasPageAccess(role, pathname)
4. If denied → redirect to /403
5. Allow auth pages (/, /login, /activate, /forgot-password, /change-password) through
```

**Option 2 — Per-role layouts**
```
Create:
  app/admin/layout.tsx
  app/dean/layout.tsx
  app/faculty/layout.tsx
  app/student/layout.tsx

Each calls hasPageAccess() and redirects to /403 on failure.
```

**Recommendation:** Option 1 (middleware) is simpler and covers all pages, including client components that currently have no checks.

#### Implementation Steps

1. **Create `middleware.ts`**
   - Use NextAuth's `getToken()` or `auth()` to read the session
   - Whitelist: `/login`, `/activate`, `/forgot-password`, `/change-password`, `/setup-password`, `/403`, `/_next/*`, `/api/auth/*`
   - For all other pages: call `hasPageAccess(role, pathname)`
   - If denied → `NextResponse.redirect(new URL('/403', request.url))`
   - If allowed → `NextResponse.next()`

2. **Update page-level checks**
   - Remove existing `hasRole()` + `redirect("/login")` from server components
   - (Optional) Keep them as defense-in-depth — middleware is the primary gate

3. **Add missing pages to `group_access` seed data**
   - Audit all page routes and ensure they're in the DEFAULT_CONFIG in `lib/access.ts`
   - Add any missing evaluation/report page paths

4. **Client component pages**
   - `/admin/data/users` — after middleware, no change needed
   - `/student/evaluations` — after middleware, no change needed

#### Files to Modify

| File | Change |
|------|--------|
| `middleware.ts` (new) | Enforce `hasPageAccess()` on all page requests |
| `lib/access.ts` | Update `DEFAULT_CONFIG` with all current page paths |
| `supabase-schema.sql` | Update `group_access` seed data with any missing paths |
| Individual server pages | Remove redundant `hasRole()` + `redirect("/login")` (optional cleanup) |
| `app/api/admin/access-config/route.ts` | Add missing paths to page catalog |

#### Risks

- **Middleware + NextAuth compatibility**: `auth()` in middleware has some constraints. Need to verify `getToken()` from `next-auth/jwt` works.
- **API routes excluded**: Middleware should NOT block API routes — their own auth logic handles it
- **Middleware matcher**: Use `config.matcher` in middleware to exclude api, static files, and auth pages
- **Performance**: `hasPageAccess()` has a 60s cache, so DB lookups aren't per-request

#### Dependencies

- Existing `lib/access.ts` `hasPageAccess()` function — already works
- Existing NextAuth session — already set up
- Existing `app/403/page.tsx` — already exists

#### Out of Scope

- API-level access config enforcement (API routes check roles internally)
- Dynamically hiding UI elements beyond sidebar navigation
- Per-user (vs per-role) access configuration

---

## 2. `GET /api/data/evaluation-mappings` Returns 500

### Symptom

Calling `GET /api/data/evaluation-mappings?type=faculty` (or `type=student`) returns a 500 error.

### Root Cause

The query uses Supabase embedded join syntax:

```typescript
.select(`
  id,
  faculty:facultyId (id, name, email),
  subject:subjectId (id, code, name),
  section:sectionId (id, name, program)
`)
```

PostgREST requires foreign key relationships to be recognized for the `foreignTable:foreignColumn()` join syntax. Despite the FK constraints being defined in the SQL schema (`REFERENCES users(id) ON DELETE CASCADE`), PostgREST may not have picked them up. This can happen when:
- The schema cache hasn't been refreshed after migration
- Quoted column names interfere with FK detection
- The FK exists in the database but PostgREST's schema cache is stale

### Possible Fixes

- **Refresh schema cache**: Run `NOTIFY pgrst, 'reload schema'` in Supabase SQL Editor or go to API Settings → Schema Cache → Refresh
- **Drop quoted column names**: Unquote `"facultyId"` → `facultyId` in the CREATE TABLE (requires migration)
- **Rewrite without joins**: Use separate queries and manual resolution (e.g., fetch mappings first, then batch-lookup related rows)

### Notes

- `type=subjects` and `type=sections` work fine (they're simple table selects with no joins)
- The same join pattern was previously used in the "ViewMappings" component on `/admin/etl-hub` (now replaced by separate `/admin/data/*` pages)
- No urgency since the dedicated `/admin/data/faculty-mappings` and `/admin/data/student-enrollments` pages use their own working queries

---

## 3. DB `group_access` Overrides `DEFAULT_CONFIG`

### Symptom

New `/admin/data/*` sidebar links don't appear despite being added to `DEFAULT_CONFIG` in `lib/access.ts`.

### Root Cause

The `loadAccessConfig()` function in `lib/access.ts` loads from the DB `group_access` table first, and that table's rows **completely override** (not merge with) the `DEFAULT_CONFIG`. If the DB rows don't include the new paths, they won't appear regardless of the code config.

### Possible Fix

- Update the `group_access` rows in the DB (via `/admin/access-config` UI or SQL seed data) to include all new `/admin/data/*` paths
- Or change `loadAccessConfig()` to merge DB config with DEFAULT_CONFIG instead of replacing

---

## 4. Pre-existing TS Errors

### `lib/__tests__/import-preview.test.ts`

- `NextRequest` type mismatch — test file was written for an older Next.js version
- Unrelated to evaluation work
- Low priority

---

## 5. User-Level Permission Overrides

### Goal

Add granular per-user permission overrides on top of the existing RBAC (`group_access`). RBAC stays as the backbone (page-level routing via `proxy.ts`); the new layer controls specific actions within a page (API + UI).

### Plan

**5 phases, 5 PRs:**

| Phase | Scope | Key Files |
|-------|-------|-----------|
| **0: Schema + Types** | `permissions JSONB` column on `users`; TypeScript types | `supabase-schema.sql`, `lib/types/permissions.ts`, `lib/types/repository.ts` |
| **1: Resolution Engine** | `parsePermission()`, `hasPermission()`, `pageCapabilities()`; JWT embedding | `lib/utils/permissions.ts`, `lib/auth.ts`, `lib/repositories/supabase/user.ts` |
| **2: UI Components** | `<AccessDeniedCard />` inline card | `components/AccessDeniedCard.tsx` |
| **3: Pilot — Departments** | API guards + `pageCapabilities` compose | `app/api/admin/departments/route.ts`, `app/admin/data/departments/page.tsx` |
| **4: Pilot — ETL Hub** | Tab hides via `pageCapabilities` | `app/admin/etl-hub/page.tsx` |
| **5: Admin Editor** | User search + checkbox grid for grants/denies | `app/admin/access-config/permissions/page.tsx` |

### Permission Format

URL-based: `<resource-path>:<action>` (e.g. `/admin/data/departments:create`)

| Resource | Actions |
|----------|---------|
| `/admin/data/departments` | `create`, `update`, `delete`, `read-all`, `read-only` |
| `/admin/etl-hub` | `import-faculty`, `import-student`, `download-template` |
| `/admin/users` | `create`, `update`, `delete`, `read-all`, `read-only`, `import`, `restore` |
| `/admin/appointments` | `create`, `update`, `delete`, `read-all`, `read-only`, `cancel`, `complete` |
| `/admin/evaluations` | `create-period`, `edit-period`, `delete-period`, `manage-rubric`, `view-results`, `compute-results`, `export-results` |
| `/admin/reports` | `view`, `export` |
| `/admin/access-config/permissions` | `view`, `edit` |

### Key Types

```ts
interface UserPermissions { grants: string[]; denies: string[] }
type EffectivePermissions = string[]
interface PageCapabilities {
  readScope: "all" | "own" | "none"
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}
```

### Resolution

```
effective = role_base (implicit via group_access)
if user.permissions is object:
  effective += grants; effective -= denies
embedded as effectivePermissions: string[] on session

pageCapabilities(resource) → readScope cascade:
  has(:delete|:update|:create|:read-all) → "all"
  has(:read-only)                         → "own"
  else                                    → "none"
```

### UI Pattern

```tsx
const caps = pageCapabilities(perms, "/admin/data/departments")
{caps.readScope === "all"  && <AllDataTable />}
{caps.readScope === "own"  && <OwnDataTable />}
{caps.readScope === "none" && <AccessDeniedCard />}
{caps.canCreate && <CreateForm />}
{caps.canUpdate && <EditActions />}
{caps.canDelete && <DeleteActions />}
```

### Admin Editor UX

Search user → checkbox grid per resource with 3 states:
- ✓ checked → in `grants`
- ✗ unchecked → in `denies`
- · dimmed → omitted (role default applies)

### Out of Scope

- `role_capabilities` table — role defaults stay implicit in `group_access`
- Wildcard matching — `hasPermission` stays O(n) includes
- Migration for existing users — `NULL` means role default
- SSO sync — permissions set manually via admin editor

---

## 6. Student CSV Upload Flow

### Goal

Build a student CSV bulk import flow that validates against existing faculty-subject-section mappings (from faculty upload). Students are enrolled into sections via `student_enrollments` for the evaluation system. No auto-creation of sections or subjects — they must pre-exist.

### Design Doc

`STUDENT-CSV-UPLOAD.md`

### CSV Format

```
student email, name, subject code, section
alice.student@lyceumalabang.edu.ph, Alice Student, ELEC-323, BSIT-32A1
```

### Per-Row Validation

1. Parse & validate columns (email domain, required fields)
2. Create user if not exists (STUDENT role)
3. Validate section exists in DB → fail row if not
4. Validate subject exists in DB → fail row if not
5. Validate `faculty_subject` mapping exists for (subject, section) → fail row if not
6. Create `student_enrollment` (additive, skip if exists)

### Key Behaviors

- **No auto-create** for sections, subjects, or faculty-subject mappings
- **Two downloadable CSVs** after upload: successes + failures (with remarks column)
- **Blocking progress modal** during upload
- No new dependencies (CSVs generated as strings, blobs client-side)

### Files

| File | Status |
|------|--------|
| `lib/services/studentImport.ts` | ✅ Complete — `parseStudentCsv()`, `importStudents()`, `getStudentCsvTemplate()` |
| `app/api/import/students/route.ts` | ✅ Complete — rewritten to use `importStudents()`; accepts JSON or multipart |
| `components/bulk-import/BulkStudentImport.tsx` | ✅ Complete — file selection, editable preview, blocking modal, results + download |
| `lib/repositories/supabase/student-enrollment.ts` | ✅ Complete — `addEnrollments()` additive batch insert with dedup |
| `lib/types/evaluation.ts` | ✅ Complete — `addEnrollments` added to `IStudentEnrollmentRepository` interface |
| `lib/__tests__/studentImport.test.ts` | ❌ Not started — unit tests for service missing |

### Notes

- UI lives in `app/admin/etl-hub/page.tsx` (Student Import tab) — faculty and dean upload pages were left untouched
- No tests yet for the service layer
- Design doc: `STUDENT-CSV-UPLOAD.md`

---

## 7. Evaluation Module — Semester Rearchitecture

### Goal

Replace `evaluation_periods` with `semesters` as the central scoping entity. Add `semesterId` FK to all child tables. Wire semester dropdown into ETL imports, gate student access via `user.semesterId`, and seed rubrics via ETL.

### Current State

- `evaluation_periods` table has separate `name`, `semester`, `schoolYear` columns and `startDate`, `endDate`, `isActive`
- `periodId` FK exists on `evaluations`, `evaluation_results`, `rating_scales`, `rubric_categories`
- `users` has `evaluationPeriodId` (DB schema only — missing from TS `User` type)
- Student evaluation flow fetches global active period (no per-user gate)
- `student_enrollments` and `faculty_subjects` have no period/semester scoping

### Design

```
semesters (new, replaces evaluation_periods)
├── id, title ("2026 - 2027 - First Semester")
├── evalStartDate, evalEndDate (nullable), isActive
│
├── student_enrollments.semesterId  (nullable FK → semesters, for soft-disable)
├── faculty_subjects.semesterId     (nullable FK → semesters)
├── evaluations.semesterId          (renamed from periodId)
├── evaluation_results.semesterId   (renamed from periodId)
├── rating_scales.semesterId        (renamed from periodId)
├── rubric_categories.semesterId    (renamed from periodId)
└── users.semesterId               (renamed from evaluationPeriodId)
```

### CSV Import Format

```
name, email, subject code, section
```

(same as before — semester comes from the ETL dropdown, not the CSV)

### Key Behaviors

- **Semester required** in ETL dropdown before imports (like department)
- **ETL** nulls out old `semesterId` on reimport with a different semester (soft-disable)
- **Student gate** checks `user.semesterId` → `semesters.isActive` + date range
- **End date nullable** — no end means evaluations stay open indefinitely
- **Rubric seeding** — ETL button inserts 8 categories / 34 items

### Implementation Plan

Full breakdown in `PLAN-evaluation-module.md` (9 phases, ~40+ files).

| Phase | Scope | Files |
|-------|-------|-------|
| 1 | DB schema — create `semesters`, add FK columns, drop `evaluation_periods` | `supabase-schema.sql`, `reset-data.sql` |
| 2 | Types — `Semester` replaces `EvaluationPeriod`, `semesterId` everywhere | `entity.ts`, `evaluation.ts`, `repository.ts` |
| 3 | Repos — rename/update all queries | 7 files in `lib/repositories/supabase/`, `factory.ts` |
| 4 | Controllers — rename/update | 4 files in `lib/controllers/` |
| 5 | Services — ETL + student import accept `semesterId`, new `seedRubric()` | `etlEvaluation.ts`, `studentImport.ts` |
| 6 | API routes — rename folders (`evaluation-periods` → `semesters`), add rubric seed route | ~16 files under `app/api/` |
| 7 | Pages — admin semesters, ETL hub dropdown, results pages, student gate | ~10 files in `app/` |
| 8 | Components — pass `semesterId` to bulk import components | `BulkStudentImport.tsx`, `BulkFacultyImport.tsx` |

### Completion Criteria

- [ ] `semesters` table replaces `evaluation_periods` in DB (data migrated if any)
- [ ] All downstream FK columns renamed to `semesterId`
- [ ] TypeScript types, repositories, controllers updated (no stale `periodId` refs)
- [ ] ETL hub has required semester dropdown for faculty + student imports
- [ ] Rubric seed button in ETL hub inserts the 8 categories
- [ ] Student evaluation page gates on `user.semesterId`
- [ ] Old API routes (`/api/evaluation-periods/*`) removed or redirected
- [ ] Build passes (`npm run build`)


### IMPORTANT! THESE ARE THE LAST LOGGED ACTION ITEMS THAT WAS STOPPED

All three files are created. Let me give the user a summary of what was done and ask for review.
Created migrations/ with 3 files:
File
README.md
supabase-schema.sql
001-semester-rearchitecture.sql
Migration steps in 001-semester-rearchitecture.sql:
 1. Create semesters table
 2. Migrate evaluation_periods data → semesters (guarded — no-op if table missing)
 3. Add semesterId → faculty_subjects (guarded)
 4. Add semesterId → student_enrollments (guarded)
 5. Rename periodId → semesterId on evaluations, recreate FK + unique constraint
 6. Same for evaluation_results
 7. Same for rating_scales
 8. Same for rubric_categories
 9. Rename evaluationPeriodId → semesterId on users
10. Drop old periodId-related indexes
11. DROP TABLE evaluation_periods CASCADE
12. Update group_access with semester paths
Every DDL step is guarded via information_schema.columns or IF NOT EXISTS — safe to re-run.
Please review the file and confirm or request changes before we proceed to Phase 2.
▣  Build · Big Pickle · 36.0s
phase 2, 
Thought: 1.5s
Phase 2 is the TypeScript types phase. Let me re-read the plan for Phase 2 from PLAN-evaluation-module.md.

Phase 2 — TypeScript Types:
- lib/types/entity.ts - Replace evaluationPeriodId with semesterId: string | null on User
- lib/types/evaluation.ts - Replace EvaluationPeriod → Semester, EvaluationPeriodData → SemesterData, CreateEvaluationPeriodInput → CreateSemesterInput, rename periodId → semesterId on several interfaces, add semesterId to StudentEnrollment/FacultySubject, update repository interfaces (IEvaluationPeriodRepository → ISemesterRepository)
- lib/types/repository.ts - Replace evaluationPeriodId → semesterId on UserData

I need to read these files first, then propose changes one at a time, ask for confirmation, etc.

Let me read all three files first.
# Todos
[ ] Phase 2: Update lib/types/entity.ts — User type
[ ] Phase 2: Update lib/types/evaluation.ts — Semester types, rename periodId, interfaces
[ ] Phase 2: Update lib/types/repository.ts — UserData
Thought: 224ms
Let me read all 3 type files first to understand the current state.
→Read lib\types\entity.ts 
→Read lib\types\evaluation.ts 
→Read lib\types\repository.ts 
Thought: 12.3s
Now I have all three files. Let me plan the exact changes for Phase 2:

lib/types/entity.ts
- Add semesterId: string | null to the User interface

lib/types/evaluation.ts
1. Replace EvaluationPeriod → Semester (id, title, evalStartDate, evalEndDate, isActive, createdAt)
2. Replace EvaluationPeriodData → SemesterData
3. Replace CreateEvaluationPeriodInput → CreateSemesterInput (title, evalStartDate, evalEndDate)
4. Rename periodId → semesterId on: RubricCategory, RubricCategoryData, Evaluation, EvaluationData, EvaluationResult, EvaluationResultData
5. Add semesterId: string (or string | null?) to: StudentEnrollment, StudentEnrollmentData, FacultySubject, FacultySubjectData
6. Update repository interfaces:
   - IEvaluationPeriodRepository → ISemesterRepository
   - periodId params → semesterId on IRubricRepository, IEvaluationRepository, IEvaluationResultRepository

lib/types/repository.ts
- Replace evaluationPeriodId: string | null → semesterId: string | null on UserData

Wait, I need to think about whether the semesterId on FacultySubject/StudentEnrollment should be string (required) or string | null (optional). Per the plan:
- student_enrollments — add "semesterId" TEXT REFERENCES semesters(id) ON DELETE CASCADE (nullable)
- faculty_subjects — add "semesterId" TEXT REFERENCES semesters(id) ON DELETE CASCADE (nullable)

So it's nullable. In the Data types, it should be semesterId: string | null.

But what about the entity types? They should match. Let me add semesterId: string | null to FacultySubject, FacultySubjectData, StudentEnrollment, StudentEnrollmentData.

Wait, the plan says "Add semesterId: string to: StudentEnrollment, StudentEnrollmentData, FacultySubject, FacultySubjectData" — but it's nullable in the DB. Let me check the plan again...

The plan says:
- Add `semesterId: string` to: `StudentEnrollment`, `StudentEnrollmentData`, `FacultySubject`, `FacultySubjectData`

But the DB column is nullable (no NOT NULL). I'll make it string | null to match the DB schema. The plan might have been simplified.

Now for the repository interfaces:

IEvaluationPeriodRepository → ISemesterRepository:
- list(filter?: { isActive?: boolean; schoolYear?: string }) → list(filter?: { isActive?: boolean }) (drop schoolYear, add semesterId filter later if needed)
- findActive() → stays the same
- create(CreateEvaluationPeriodInput) → create(CreateSemesterInput)
- update(id, data) → update(id, data)
- delete(id) → stays
- setActive(id) → stays

Actually, looking at the plan more carefully:

For ISemesterRepository:
- Drop `filter?.schoolYear` (no longer exists)
- `semesterId` replaces `schoolYear` filter (list by semester FK)

Wait, the plan says the repository should:
- Drop filter?.schoolYear (no longer exists)
- semesterId replaces schoolYear filter (list by semester FK)

But the ISemesterRepository interface just lists semesters, so the filter would be by something else. Let me re-read:

Phase 3 says:
### Rename: lib/repositories/supabase/evaluation-period.ts → lib/repositories/supabase/semester.ts
- All `evaluation_periods` → `semesters`
- Drop `filter?.schoolYear` (no longer exists)
- `semesterId` replaces `schoolYear` filter (list by semester FK)

I think "list by semester FK" means the repository can filter semesters by... well, that doesn't make sense for the semester repository itself. Maybe it means the list() filter just drops schoolYear. Let me keep the interface simple for now.

For IRubricRepository:
- getCategoriesWithItems(periodId: string) → getCategoriesWithItems(semesterId: string)
- replaceRubric(periodId: string, ...) → replaceRubric(semesterId: string, ...)
- copyFromSource(periodId: string, sourcePeriodId: string) → copyFromSource(semesterId: string, sourceSemesterId: string)

For IEvaluationRepository:
- findPending(evaluatorId: string, periodId: string) → findPending(evaluatorId: string, semesterId: string)
- findByComposite(periodId: string, ...) → findByComposite(semesterId: string, ...)
- create(periodId: string, ...) → create(semesterId: string, ...)

For IEvaluationResultRepository:
- list(periodId: string, ...) → list(semesterId: string, ...)
- findByFaculty(periodId: string, ...) → findByFaculty(semesterId: string, ...)
- compute(periodId: string, ...) → compute(semesterId: string, ...)
- computeAll(periodId: string) → computeAll(semesterId: string)

OK, now for IStudentEnrollmentRepository and IFacultySubjectRepository, the plan says to add semesterId to list filters, but those are Phase 3 changes to the repository implementations. The interface definitions will need to be updated now though.

Let me think about which changes go in Phase 2 (types) vs Phase 3 (repos).

Phase 2 is about TypeScript types — interfaces, DTOs, repository interfaces. Phase 3 is about implementing the repository classes.

So for Phase 2, I need to update:
1. Entity types (entity.ts)
2. Evaluation types + repository interfaces (evaluation.ts)
3. UserData type (repository.ts)

For the repository interfaces in evaluation.ts, the plan says to update:
- IEvaluationPeriodRepository → ISemesterRepository with updated method signatures
- IRubricRepository — rename params periodId → semesterId
- IEvaluationRepository — rename params periodId → semesterId
- IEvaluationResultRepository — rename params periodId → semesterId
- IStudentEnrollmentRepository — add semesterId to methods
- IFacultySubjectRepository — add semesterId to methods

Let me be careful and thorough. Let me count all the changes needed.

For lib/types/entity.ts:
- Add semesterId: string | null to User

For lib/types/evaluation.ts:
1. EvaluationPeriod → Semester (rename fields)
2. EvaluationPeriodData → SemesterData
3. CreateEvaluationPeriodInput → CreateSemesterInput
4. FacultySubject — add semesterId: string | null
5. FacultySubjectData — add semesterId: string | null
6. StudentEnrollment — add semesterId: string | null
7. StudentEnrollmentData — add semesterId: string | null
8. RubricCategory.periodId → semesterId: string
9. RubricCategoryData.periodId → semesterId: string
10. Evaluation.periodId → semesterId: string
11. EvaluationData.periodId → semesterId: string
12. EvaluationResult.periodId → semesterId: string
13. EvaluationResultData.periodId → semesterId: string
14. IEvaluationPeriodRepository → ISemesterRepository
15. IRubricRepository params: periodId → semesterId
16. IEvaluationRepository params: periodId → semesterId
17. IEvaluationResultRepository params: periodId → semesterId

For lib/types/repository.ts:
- UserData.evaluationPeriodId → semesterId

Let me do this one file at a time, with user confirmation between each.

Actually, per the behavioral rules — "one change at a time, ask confirmation". But the user said "phase 2" which encompasses multiple files. I think I should do one file at a time within the phase, asking for confirmation/review before each.

Let me start with entity.ts first since it's the smallest change.
phase 2 covers 3 type files. Per the rules — one at a time, confirm before proceeding.
First change: lib/types/entity.ts — add semesterId: string | null to the User interface.
 export interface User {
   id: string
   name: string
   email: string
   role: Role
   departmentId: string | null
+  semesterId: string | null
   hasLoggedInBefore: boolean
   lastLoginAt: Date | null
   createdAt: Date
 }
Proceed?
▣  Build · Big Pickle · 24.0s
yes
Thought: 409ms
Let me make the change to entity.ts.
# Todos
[•] Phase 2: Update lib/types/entity.ts — User type
[ ] Phase 2: Update lib/types/evaluation.ts — Semester types, rename periodId, interfaces
[ ] Phase 2: Update lib/types/repository.ts — UserData
Thought: 198ms
Make the edit.
← Edit lib\types\entity.ts
  name: string
  email: string
  role: Role
  departmentId: string | null

  hasLoggedInBefore: boolean
  lastLoginAt: Date | null
  createdAt: Date
}
Thought: 552ms
Entity.ts is done. Next is repository.ts — the UserData type. Let me ask for confirmation on that change since it's the smallest of the remaining two files.
# Todos
[✓] Phase 2: Update lib/types/entity.ts — User type
[ ] Phase 2: Update lib/types/evaluation.ts — Semester types, rename periodId, interfaces
[ ] Phase 2: Update lib/types/repository.ts — UserData
Thought: 479ms
Done. Next up: lib/types/repository.ts — rename evaluationPeriodId → semesterId on UserData. This is a one-line change. Let me ask for confirmation since I need to follow the one-at-a-time rule.
Done. User.semesterId: string | null added at entity.ts:13.
Next: lib/types/repository.ts — rename evaluationPeriodId → semesterId on UserData:
-  evaluationPeriodId: string | null
+  semesterId: string | null
Proceed?
▣  Build · Big Pickle · 14.0s
yes
Thought: 355ms
Simple one-line rename.
← Edit lib\types\repository.ts
Thought: 3.3s
Done. Now the big one: lib/types/evaluation.ts. Let me think about how to present this. There are many changes in this file. I should break it into discrete sub-steps and ask for confirmation for each.

The changes are:
1. Replace EvaluationPeriod → Semester 
2. Replace EvaluationPeriodData → SemesterData
3. Replace CreateEvaluationPeriodInput → CreateSemesterInput
4. Add semesterId to FacultySubject, FacultySubjectData
5. Add semesterId to StudentEnrollment, StudentEnrollmentData
6. Rename periodId → semesterId on RubricCategory, RubricCategoryData
7. Rename periodId → semesterId on Evaluation, EvaluationData
8. Rename periodId → semesterId on EvaluationResult, EvaluationResultData
9. Rename interface IEvaluationPeriodRepository → ISemesterRepository + update method signatures
10. Update IRubricRepository params
11. Update IEvaluationRepository params
12. Update IEvaluationResultRepository params

That's a lot. Let me group them into maybe 3-4 batches:
- Batch A: Entity types (EvaluationPeriod→Semester + add semesterId to FacultySubject/StudentEnrollment)
- Batch B: Data types (EvaluationPeriodData→SemesterData, CreateEvaluationPeriodInput→CreateSemesterInput, rename periodId on RubricCategoryData/EvaluationData/EvaluationResultData)
- Batch C: Repository interfaces (IEvaluationPeriodRepository→ISemesterRepository, update all periodId params)

Actually, per the user's request — "strictly do one item at a time" — I should do each conceptual change one at a time. But that's going to be very tedious with 12+ changes. Let me group them logically into fewer steps.

Let me propose the groups and ask.
# Todos
[✓] Phase 2: Update lib/types/entity.ts — User type
[•] Phase 2: Update lib/types/evaluation.ts — Semester types, rename periodId, interfaces
[✓] Phase 2: Update lib/types/repository.ts — UserData
Thought: 151ms
Let me ask about how to batch these changes.
lib/types/evaluation.ts has ~12 changes. I'll group them into 3 batches for review. Proposed:
Batch A — Entity types (lines 3-100):
- EvaluationPeriod → Semester (id, title, evalStartDate, evalEndDate, isActive, createdAt)
- Add semesterId: string | null to FacultySubject, StudentEnrollment
- Rename periodId → semesterId on RubricCategory, Evaluation, EvaluationResult
Batch B — Data types (lines 102-191):
- EvaluationPeriodData → SemesterData, CreateEvaluationPeriodInput → CreateSemesterInput
- Rename periodId → semesterId on RubricCategoryData, EvaluationData, EvaluationResultData
- Add semesterId: string | null to FacultySubjectData, StudentEnrollmentData
Batch C — Repository interfaces (lines 228-290):
- IEvaluationPeriodRepository → ISemesterRepository (drop schoolYear filter)
- Rename periodId → semesterId params on IRubricRepository, IEvaluationRepository, IEvaluationResultRepository
Shall I proceed with Batch A?
▣  Build · Big Pickle · 14.2s
yes
Thought: 373ms
Let me make Batch A changes to entity types in evaluation.ts.
← Edit lib\types\evaluation.ts
Thought: 461ms
Now add semesterId to FacultySubject and StudentEnrollment, and rename periodId to semesterId on RubricCategory, Evaluation, EvaluationResult.
← Edit lib\types\evaluation.ts
  id: string
  facultyId: string
  subjectId: string
  sectionId: string

}

export interface StudentEnrollment {
  id: string
← Edit lib\types\evaluation.ts
export interface StudentEnrollment {
  id: string
  studentId: string
  sectionId: string

}

export interface RubricCategory {
  id: string
Thought: 295ms
Now rename periodId to semesterId on RubricCategory, Evaluation, EvaluationResult.
← Edit lib\types\evaluation.ts
← Edit lib\types\evaluation.ts
← Edit lib\types\evaluation.ts
Thought: 279ms
Batch A is done. Let me present the result and ask about Batch B.
Batch A done. Summary of changes:
- EvaluationPeriod → Semester (title, evalStartDate/evalEndDate replacing name/semester/schoolYear/startDate/endDate)
- FacultySubject.semesterId: string | null added
- StudentEnrollment.semesterId: string | null added
- RubricCategory.periodId → semesterId
- Evaluation.periodId → semesterId
- EvaluationResult.periodId → semesterId
Proceed with Batch B — Data types?
▣  Build · Big Pickle · 26.6s
yers
Thought: 996ms
The user said "yers" which I assume means "yes". Let me proceed with Batch B - Data types.

Batch B changes:
1. EvaluationPeriodData → SemesterData
2. CreateEvaluationPeriodInput → CreateSemesterInput
3. Rename periodId → semesterId on RubricCategoryData, EvaluationData, EvaluationResultData
4. Add semesterId: string | null to FacultySubjectData, StudentEnrollmentData

Let me read the current state of the file to make sure my edits are correct.
→Read lib\types\evaluation.ts [offset=100, limit=100]
Thought: 370ms
Now let me make the Batch B changes one by one.
← Edit lib\types\evaluation.ts
Thought: 405ms
Now add semesterId to FacultySubjectData and StudentEnrollmentData, and rename periodId to semesterId on RubricCategoryData, EvaluationData, EvaluationResultData.
← Edit lib\types\evaluation.ts
← Edit lib\types\evaluation.ts
← Edit lib\types\evaluation.ts
← Edit lib\types\evaluation.ts
← Edit lib\types\evaluation.ts
Thought: 413ms
Batch B done. Now let me read the repository interfaces section to make sure I know the current state before Batch C.
Batch B done. Summary:
- EvaluationPeriodData → SemesterData (title, evalStartDate/evalEndDate)
- CreateEvaluationPeriodInput → CreateSemesterInput (title, evalStartDate, evalEndDate optional)
- FacultySubjectData.semesterId: string | null added
- StudentEnrollmentData.semesterId: string | null added
- RubricCategoryData.periodId → semesterId
- EvaluationData.periodId → semesterId
- EvaluationResultData.periodId → semesterId
Proceed with Batch C — Repository interfaces?
Changes:
- IEvaluationPeriodRepository → ISemesterRepository (drop schoolYear filter)
- IRubricRepository params: periodId → semesterId
- IEvaluationRepository params: periodId → semesterId
- IEvaluationResultRepository params: periodId → semesterId
- IFacultySubjectRepository + IStudentEnrollmentRepository method signatures to include semesterId
▣  Build · Big Pickle · 30.6s
yes
Thought: 286ms
Let me read the current state of the repository interfaces section.
→Read lib\types\evaluation.ts [offset=228]
Thought: 1.0s
Now I'll make all the Batch C changes. Let me do them one at a time:

1. IEvaluationPeriodRepository → ISemesterRepository (drop schoolYear, update types)
2. IFacultySubjectRepository — add semesterId to list filter, add semesterId param to replaceBySection
3. IStudentEnrollmentRepository — add semesterId to list filter, addEnrollments, replaceBySection, getDistinctFaculty
4. IRubricRepository — periodId → semesterId
5. IEvaluationRepository — periodId → semesterId
6. IEvaluationResultRepository — periodId → semesterId
← Edit lib\types\evaluation.ts
Thought: 251ms
Now update IFacultySubjectRepository to add semesterId filters.
← Edit lib\types\evaluation.ts
Thought: 317ms
Now IStudentEnrollmentRepository.
← Edit lib\types\evaluation.ts
Thought: 496ms
Now rename periodId to semesterId on IRubricRepository, IEvaluationRepository, IEvaluationResultRepository.
← Edit lib\types\evaluation.ts
← Edit lib\types\evaluation.ts
← Edit lib\types\evaluation.ts
Thought: 184ms
Batch C is done. Let me mark the todo as complete and verify the final state of the file.
Batch C done. Let me verify the final state of the file.
→Read lib\types\evaluation.ts 
Thought: 339ms
Phase 2 is complete. All three type files updated. Let me mark the todo as complete.
# Todos
[✓] Phase 2: Update lib/types/entity.ts — User type
[✓] Phase 2: Update lib/types/evaluation.ts — Semester types, rename periodId, interfaces
[✓] Phase 2: Update lib/types/repository.ts — UserData
Thought: 425ms
Phase 2 is done. The user hasn't specified what to do next, so I should ask per the advisory mode rules.
Phase 2 complete. All type files updated:
File
entity.ts
repository.ts
evaluation.ts
Proceed to Phase 3 — Repositories?
▣  Build · Big Pickle · 42.3s
yers
Thought: 2.4s
Phase 3 is the repositories. Let me re-read the plan:

Phase 3 — Repositories:
1. Rename: lib/repositories/supabase/evaluation-period.ts → lib/repositories/supabase/semester.ts
   - All evaluation_periods → semesters
   - Drop filter?.schoolYear (no longer exists)
   - semesterId replaces schoolYear filter (list by semester FK)

2. Update: lib/repositories/supabase/evaluation.ts
   - findPending — scope by semesterId on enrollments + faculty_subjects
   - All periodId → semesterId

3. Update: lib/repositories/supabase/evaluation-result.ts
   - All periodId → semesterId

4. Update: lib/repositories/supabase/rubric.ts
   - All periodId → semesterId

5. Update: lib/repositories/supabase/student-enrollment.ts
   - Add semesterId to list() filter
   - Update addEnrollments to accept semesterId
   - Update getDistinctFaculty to filter by semesterId
   - Add semesterId parameter to replaceBySection

6. Update: lib/repositories/supabase/faculty-subject.ts
   - Add semesterId to list() filter
   - Update replaceBySection to accept semesterId

7. Update: lib/repositories/factory.ts
   - evaluationPeriodRepository → semesterRepository
   - Update import path

Let me read all these files first to understand the current state, then do them one at a time.

I should start by reading all 7 files in parallel.
# Todos
[ ] Phase 3: Rename repo evaluation-period.ts → semester.ts
[ ] Phase 3: Update evaluation.ts repo — periodId→semesterId + findPending scope
[ ] Phase 3: Update evaluation-result.ts repo — periodId→semesterId
[ ] Phase 3: Update rubric.ts repo — periodId→semesterId
[ ] Phase 3: Update student-enrollment.ts repo — add semesterId
[ ] Phase 3: Update faculty-subject.ts repo — add semesterId
[ ] Phase 3: Update factory.ts — semesterRepository
Thought: 283ms
Let me read all the files first.
→Read lib\repositories\supabase 
→Read lib\repositories\factory.ts 
Thought: 316ms
Now let me read all the repository files I need to modify.
→Read lib\repositories\supabase\evaluation-period.ts 
→Read lib\repositories\supabase\evaluation.ts 
→Read lib\repositories\supabase\evaluation-result.ts 
→Read lib\repositories\supabase\rubric.ts 
→Read lib\repositories\supabase\student-enrollment.ts 
→Read lib\repositories\supabase\faculty-subject.ts 
Thought: 1.7s
Now I have a good picture of all the files. Let me start with the first task: rename evaluation-period.ts → semester.ts and update its content.

For the rename, I'll need to:
1. Create the new file semester.ts with updated content
2. Delete evaluation-period.ts
3. Update factory.ts

Let me do the first item: create the renamed file.

The current evaluation-period.ts needs to be updated:
- Import SemesterData, ISemesterRepository, CreateSemesterInput instead of the old types
- Table name: evaluation_periods → semesters
- Remove filter?.schoolYear 
- All EvaluationPeriodData → SemesterData
- IEvaluationPeriodRepository → ISemesterRepository
- CreateEvaluationPeriodInput → CreateSemesterInput

The setActive method: The new semesters table also has isActive, so this stays the same.

Let me create the new file.
Starting with Phase 3, item 1: Rename evaluation-period.ts → semester.ts.
# Todos
[•] Phase 3: Rename repo evaluation-period.ts → semester.ts
[ ] Phase 3: Update evaluation.ts repo — periodId→semesterId + findPending scope
[ ] Phase 3: Update evaluation-result.ts repo — periodId→semesterId
[ ] Phase 3: Update rubric.ts repo — periodId→semesterId
[ ] Phase 3: Update student-enrollment.ts repo — add semesterId
[ ] Phase 3: Update faculty-subject.ts repo — add semesterId
[ ] Phase 3: Update factory.ts — semesterRepository
Thought: 400ms
I'll create the new semester.ts file, then delete the old one. Let me write it with the updated types and imports.
# Wrote lib\repositories\supabase\semester.ts
import { supabase } from "@/lib/supabase"
import type { SemesterData, ISemesterRepository, CreateSemesterInput } from "@/lib/types"

export const semesterRepository: ISemesterRepository = {
  async list(filter) {
    let q = supabase.from("semesters").select("*").order("createdAt", { ascending: false })
    if (filter?.isActive !== undefined) q = q.eq("isActive", filter.isActive)
    const { data, error } = await q
    if (error) throw error
    return data as SemesterData[]
  },

  async findById(id) {
    const { data, error } = await supabase.from("semesters").select("*").eq("id", id).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as SemesterData
  },

  async findActive() {
    const { data, error } = await supabase.from("semesters").select("*").eq("isActive", true).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as SemesterData
  },

  async create(input: CreateSemesterInput) {
    const { data, error } = await supabase.from("semesters").insert(input).select("*").single()
    if (error) throw error
    return data as SemesterData
  },

  async update(id, data) {
    const { data: updated, error } = await supabase.from("semesters").update(data).eq("id", id).select("*").single()
    if (error) throw error
    return updated as SemesterData
  },

  async delete(id) {
    const { error } = await supabase.from("semesters").delete().eq("id", id)
    if (error) throw error
  },

  async setActive(id) {
    await supabase.from("semesters").update({ isActive: false }).neq("id", id)
    const { data, error } = await supabase.from("semesters").update({ isActive: true }).eq("id", id).select("*").single()
    if (error) throw error
    return data as SemesterData
  },
}

Thought: 255ms
Now delete the old file.
# Delete old evaluation-period.ts
$ Remove-Item -LiteralPath "lib\repositories\supabase\evaluation-period.ts"
(no output)
Thought: 1.6s
Good. Now update factory.ts to import from the new path and use the new name. But wait — per the "one at a time" rule, I should do factory.ts as a separate step after this one. Let me finish this item and ask about the next one.

Actually, the plan says Phase 3 item 7 is factory.ts. So let me just mark this item done and proceed to ask for the next.

Wait, but the user said "yers" to phase 3. So I should work through each item sequentially but ask for confirmation between each. Let me mark this done and ask if they want to proceed to item 2.
# Todos
[✓] Phase 3: Rename repo evaluation-period.ts → semester.ts
[ ] Phase 3: Update evaluation.ts repo — periodId→semesterId + findPending scope
[ ] Phase 3: Update evaluation-result.ts repo — periodId→semesterId
[ ] Phase 3: Update rubric.ts repo — periodId→semesterId
[ ] Phase 3: Update student-enrollment.ts repo — add semesterId
[ ] Phase 3: Update faculty-subject.ts repo — add semesterId
[ ] Phase 3: Update factory.ts — semesterRepository
Thought: 300ms
Item 1 done. Ask about item 2.
Item 1 done. Created lib/repositories/supabase/semester.ts (table: evaluation_periods → semesters, types updated, schoolYear filter removed). Deleted old evaluation-period.ts.
Next: Item 2 — lib/repositories/supabase/evaluation.ts
Changes:
- Rename all periodId → semesterId in queries + insert object
- findPending — scope by semesterId on student_enrollments + faculty_subjects
Proceed?
▣  Build · Big Pickle · 38.5s
yes
Thought: 966ms
Let me rewrite the evaluation.ts repository. The key changes:

1. Import types: IEvaluationRepository stays the same (it already uses semesterId in the interface)
2. findPending(evaluatorId, semesterId) - need to scope both student_enrollments and faculty_subjects queries by semesterId
3. All periodId → semesterId in queries

Let me write the updated file.
# Wrote lib\repositories\supabase\evaluation.ts
import { supabase } from "@/lib/supabase"
import type { EvaluationData, EvaluationComment, IEvaluationRepository } from "@/lib/types"

export const evaluationRepository: IEvaluationRepository = {
  async findPending(evaluatorId, semesterId) {
    const { data: enrollments, error: enrollErr } = await supabase
      .from("student_enrollments")
      .select("section_id")
      .eq("student_id", evaluatorId)
      .eq("semesterId", semesterId)
    if (enrollErr) throw enrollErr
    if (enrollments.length === 0) return []

    const sectionIds = enrollments.map((r) => r.section_id)
    const { data: facultySubjects, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("faculty_id")
      .in("section_id", sectionIds)
      .eq("semesterId", semesterId)
    if (fsErr) throw fsErr
    const allFacultyIds = [...new Set(facultySubjects.map((r) => r.faculty_id))]

    const { data: existing, error: evErr } = await supabase
      .from("evaluations")
      .select("evaluateeId")
      .eq("evaluatorId", evaluatorId)
      .eq("semesterId", semesterId)
    if (evErr) throw evErr
    const submittedIds = new Set(existing.map((r) => r.evaluateeId))

    return allFacultyIds.filter((id) => !submittedIds.has(id)).map((evaluateeId) => ({ evaluateeId }))
  },

  async findByEvaluator(evaluatorId) {
    const { data, error } = await supabase.from("evaluations").select("*").eq("evaluatorId", evaluatorId)
    if (error) throw error
    return data as EvaluationData[]
  },

  async findById(id) {
    const { data, error } = await supabase.from("evaluations").select("*").eq("id", id).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationData
  },

  async findByComposite(semesterId, evaluatorId, evaluateeId) {
    const { data, error } = await supabase
      .from("evaluations")
      .select("*")
      .eq("semesterId", semesterId)
      .eq("evaluatorId", evaluatorId)
      .eq("evaluateeId", evaluateeId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationData
  },

  async create(semesterId, evaluatorId, evaluateeId) {
    const { data, error } = await supabase
      .from("evaluations")
      .insert({ semesterId, evaluatorId, evaluateeId })
      .select("*")
      .single()
    if (error) throw error
    return data as EvaluationData
  },

  async setRatings(evaluationId, ratings) {
    const rows = ratings.map((r) => ({ evaluationId, itemId: r.itemId, rating: r.rating }))
    const { error: delErr } = await supabase.from("evaluation_ratings").delete().eq("evaluationId", evaluationId)
    if (delErr) throw delErr
    const { error: insErr } = await supabase.from("evaluation_ratings").insert(rows)
    if (insErr) throw insErr
  },

  async submit(evaluationId) {
    const { data, error } = await supabase
      .from("evaluations")
      .update({ status: "SUBMITTED", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq("id", evaluationId)
      .select("*")
      .single()
    if (error) throw error
    return data as EvaluationData
  },

  async getRatings(evaluationId) {
    const { data, error } = await supabase
      .from("evaluation_ratings")
      .select("itemId, rating")
      .eq("evaluationId", evaluationId)
    if (error) throw error
    return data as { itemId: string; rating: number }[]
  },

  async addComment(evaluationId, comment) {
    const { data, error } = await supabase
      .from("evaluation_comments")
      .insert({ evaluationId, comment })
      .select("*")
      .single()
    if (error) throw error
    return data as EvaluationComment
  },
}

Thought: 162ms
Done with evaluation.ts. Now ask about item 3.
Done. evaluation.ts updated — all periodId → semesterId, findPending scoped by semesterId on enrollments + faculty subjects.
Next: Item 3 — lib/repositories/supabase/evaluation-result.ts
Changes:
- All periodId → semesterId in queries + insert/update objects
- Also the embedded join for the compute method still references periodId
Proceed?
▣  Build · Big Pickle · 12.7s
yes
Thought: 653ms
Let me write the updated evaluation-result.ts. Key changes:
1. All .eq("periodId", periodId) → .eq("semesterId", semesterId)
2. All insert/update objects with periodId → semesterId
3. Param names periodId → semesterId
# Wrote lib\repositories\supabase\evaluation-result.ts
import { supabase } from "@/lib/supabase"
import type { EvaluationResultData, IEvaluationResultRepository } from "@/lib/types"

export const evaluationResultRepository: IEvaluationResultRepository = {
  async list(semesterId, filters) {
    let q = supabase.from("evaluation_results").select("*").eq("semesterId", semesterId)
    if (filters?.departmentId) q = q.eq("departmentId", filters.departmentId)
    if (filters?.facultyId) q = q.eq("facultyId", filters.facultyId)
    const { data, error } = await q
    if (error) throw error
    return data as EvaluationResultData[]
  },

  async findByFaculty(semesterId, facultyId) {
    const { data, error } = await supabase
      .from("evaluation_results")
      .select("*")
      .eq("semesterId", semesterId)
      .eq("facultyId", facultyId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationResultData
  },

  async compute(semesterId, facultyId) {
    const filterFaculty = facultyId ? { evaluateeId: facultyId } : {}
    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, evaluateeId")
      .eq("semesterId", semesterId)
      .eq("status", "SUBMITTED")
      .match(filterFaculty)
    if (evErr) throw evErr
    if (!evals || evals.length === 0) return

    const grouped = new Map<string, string[]>()
    for (const ev of evals) {
      if (!grouped.has(ev.evaluateeId)) grouped.set(ev.evaluateeId, [])
      grouped.get(ev.evaluateeId)!.push(ev.id)
    }

    for (const [facId, evaluationIds] of grouped) {
      if (evaluationIds.length === 0) continue

      const { data: ratings, error: rErr } = await supabase
        .from("evaluation_ratings")
        .select("evaluationId, itemId, rating, rubric_items!inner(categoryId, rubric_categories!inner(name))")
        .in("evaluationId", evaluationIds)
      if (rErr) throw rErr

      const catRatings: Record<string, number[]> = {}
      for (const r of ratings as unknown as Array<{ rating: number; rubric_items: { categoryId: string; rubric_categories: { name: string } } }>) {
        const catName = r.rubric_items.rubric_categories.name
        if (!catRatings[catName]) catRatings[catName] = []
        catRatings[catName].push(r.rating)
      }

      const catAverages: Record<string, number> = {}
      for (const [cat, vals] of Object.entries(catRatings)) {
        catAverages[cat] = vals.reduce((a, b) => a + b, 0) / vals.length
      }

      const general = Object.keys(catAverages).length > 0
        ? Object.values(catAverages).reduce((a, b) => a + b, 0) / Object.keys(catAverages).length
        : null

      let remarks: string | null = null
      if (general !== null) {
        if (general >= 4.5) remarks = "Outstanding"
        else if (general >= 3.5) remarks = "Very Satisfactory"
        else if (general >= 2.5) remarks = "Satisfactory"
        else if (general >= 1.5) remarks = "Unsatisfactory"
        else remarks = "Poor"
      }

      const { data: userRow, error: uErr } = await supabase
        .from("users")
        .select("departmentId")
        .eq("id", facId)
        .single()
      if (uErr) throw uErr

      const updateData: Record<string, unknown> = {
        totalRespondents: evaluationIds.length,
        generalRating: general ? Math.round(general * 100) / 100 : null,
        remarks,
        departmentId: userRow?.departmentId ?? null,
        computedAt: new Date().toISOString(),
      }

      const nameToColumn: Record<string, string> = {
        "Professional Manner": "professionalManner",
        "Communication with Students": "communicationWithStudent",
        "Student Engagement": "studentEngagement",
        "Learning Materials": "learningMaterials",
        "Time Management": "timeManagement",
        "Experiential Learning": "experientialLearning",
        "Respect for Uniqueness": "respectUniqueness",
        "Assessment and Feedback": "assessmentAndFeedback",
      }

      for (const [catName, avg] of Object.entries(catAverages)) {
        const col = nameToColumn[catName]
        if (col) {
          updateData[col] = Math.round(avg * 100) / 100
        }
      }

      const { data: existing, error: exErr } = await supabase
        .from("evaluation_results")
        .select("id")
        .eq("semesterId", semesterId)
        .eq("facultyId", facId)
        .single()
      if (exErr && exErr.code !== "PGRST116") throw exErr

      if (existing) {
        const { error: upErr } = await supabase.from("evaluation_results").update(updateData).eq("id", existing.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase
          .from("evaluation_results")
          .insert({ semesterId, facultyId: facId, ...updateData })
        if (insErr) throw insErr
      }
    }
  },

  async computeAll(semesterId) {
    await this.compute(semesterId)
  },
}

Thought: 176ms
Done. Ask about item 4.
Done. evaluation-result.ts — all periodId → semesterId in queries + insert/update.
Next: Item 4 — lib/repositories/supabase/rubric.ts
Changes:
- All periodId → semesterId in queries + insert/update objects
Proceed?
▣  Build · Big Pickle · 13.4s
yes
Thought: 296ms
Let me write the updated rubric.ts. All periodId → semesterId.
# Wrote lib\repositories\supabase\rubric.ts
import { supabase } from "@/lib/supabase"
import type { RubricCategoryData, IRubricRepository } from "@/lib/types"

export const rubricRepository: IRubricRepository = {
  async getCategoriesWithItems(semesterId) {
    const { data, error } = await supabase
      .from("rubric_categories")
      .select("*, items:rubric_items(*)")
      .eq("semesterId", semesterId)
      .order("displayOrder", { ascending: true })
    if (error) throw error
    return data as unknown as RubricCategoryData[]
  },

  async replaceRubric(semesterId, categories) {
    const { data: existingCats, error: fetchErr } = await supabase
      .from("rubric_categories")
      .select("id, name")
      .eq("semesterId", semesterId)
    if (fetchErr) throw fetchErr

    const oldCatIds = existingCats.map((c) => c.id)
    if (oldCatIds.length > 0) {
      const { error: delItemsErr } = await supabase.from("rubric_items").delete().in("categoryId", oldCatIds)
      if (delItemsErr) throw delItemsErr
      const { error: delCatsErr } = await supabase.from("rubric_categories").delete().in("id", oldCatIds)
      if (delCatsErr) throw delCatsErr
    }

    const createdCats: RubricCategoryData[] = []
    for (const cat of categories) {
      const { data: newCat, error: catErr } = await supabase
        .from("rubric_categories")
        .insert({ semesterId, name: cat.name, displayOrder: cat.displayOrder })
        .select("*")
        .single()
      if (catErr) throw catErr

      const itemsToInsert = cat.items.map((item) => ({
        categoryId: newCat.id,
        text: item.text,
        displayOrder: item.displayOrder,
        weight: item.weight ?? 1,
      }))
      const { error: itemsErr } = await supabase.from("rubric_items").insert(itemsToInsert)
      if (itemsErr) throw itemsErr

      createdCats.push(newCat as RubricCategoryData)
    }

    return createdCats
  },

  async copyFromSource(semesterId, sourceSemesterId) {
    const { data: srcCats, error: fetchCatsErr } = await supabase
      .from("rubric_categories")
      .select("*")
      .eq("semesterId", sourceSemesterId)
      .order("displayOrder", { ascending: true })
    if (fetchCatsErr) throw fetchCatsErr

    const { data: srcItems, error: fetchItemsErr } = await supabase
      .from("rubric_items")
      .select("*")
      .in(
        "categoryId",
        srcCats.map((c) => c.id)
      )
      .order("displayOrder", { ascending: true })
    if (fetchItemsErr) throw fetchItemsErr

    const catIdMap = new Map<string, string>()
    const createdCats: RubricCategoryData[] = []
    for (const cat of srcCats) {
      const { data: newCat, error: catErr } = await supabase
        .from("rubric_categories")
        .insert({ semesterId, name: cat.name, displayOrder: cat.displayOrder })
        .select("*")
        .single()
      if (catErr) throw catErr
      catIdMap.set(cat.id, newCat.id)
      createdCats.push(newCat as RubricCategoryData)
    }

    const itemsToInsert = srcItems
      .filter((item) => catIdMap.has(item.categoryId))
      .map((item) => ({
        categoryId: catIdMap.get(item.categoryId)!,
        text: item.text,
        displayOrder: item.displayOrder,
        weight: item.weight,
      }))

    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabase.from("rubric_items").insert(itemsToInsert)
      if (itemsErr) throw itemsErr
    }

    return createdCats
  },

  async deleteCategory(id) {
    const { error } = await supabase.from("rubric_categories").delete().eq("id", id)
    if (error) throw error
  },

  async deleteItem(id) {
    const { error } = await supabase.from("rubric_items").delete().eq("id", id)
    if (error) throw error
  },
}

Thought: 338ms
Done. Ask about item 5 — student-enrollment.ts.
Done. rubric.ts — all periodId → semesterId.
Next: Item 5 — lib/repositories/supabase/student-enrollment.ts
Changes:
- list() — add semesterId filter
- replaceBySection() — accept semesterId param, write to rows
- addEnrollments() — accept semesterId field in items
- getDistinctFaculty() — filter by semesterId
Proceed?
▣  Build · Big Pickle · 13.0s
yes
Thought: 984ms
Let me write the updated student-enrollment.ts. Key changes:

1. list(filters) — add .eq("semesterId", filters.semesterId) if present
2. replaceBySection(section_id, items) — items now have semesterId?: string | null, spread into rows
3. addEnrollments(items) — items now have semesterId?: string | null, kept as-is in insert
4. getDistinctFaculty(student_id, semesterId?) — add .eq("semesterId", semesterId) on faculty_subjects query if provided
# Wrote lib\repositories\supabase\student-enrollment.ts
import { supabase } from "@/lib/supabase"
import type { StudentEnrollmentData, IStudentEnrollmentRepository } from "@/lib/types"

export const studentEnrollmentRepository: IStudentEnrollmentRepository = {
  async list(filters) {
    let q = supabase.from("student_enrollments").select("*")
    if (filters?.student_id) q = q.eq("student_id", filters.student_id)
    if (filters?.section_id) q = q.eq("section_id", filters.section_id)
    if (filters?.semesterId) q = q.eq("semesterId", filters.semesterId)
    const { data, error } = await q
    if (error) throw error
    return data as StudentEnrollmentData[]
  },

  async replaceBySection(section_id, items) {
    const { error: delErr } = await supabase.from("student_enrollments").delete().eq("section_id", section_id)
    if (delErr) throw delErr
    if (items.length === 0) return
    const rows = items.map((i) => ({ student_id: i.student_id, section_id, semesterId: i.semesterId ?? null }))
    const { error: insErr } = await supabase.from("student_enrollments").insert(rows)
    if (insErr) throw insErr
  },

  async addEnrollments(items) {
    if (items.length === 0) return
    const sectionIds = [...new Set(items.map((i) => i.section_id))]
    const { data: existing, error: fetchErr } = await supabase
      .from("student_enrollments")
      .select("student_id, section_id")
      .in("section_id", sectionIds)
    if (fetchErr) throw fetchErr
    const existingSet = new Set((existing || []).map((r) => `${r.student_id}|${r.section_id}`))
    const newItems = items.filter((i) => !existingSet.has(`${i.student_id}|${i.section_id}`))
    if (newItems.length === 0) return
    const { error: insErr } = await supabase.from("student_enrollments").insert(newItems)
    if (insErr) throw insErr
  },

  async getDistinctFaculty(student_id, semesterId) {
    let q = supabase.from("student_enrollments").select("section_id").eq("student_id", student_id)
    if (semesterId) q = q.eq("semesterId", semesterId) as typeof q
    const { data: enrollments, error: enrollErr } = await q
    if (enrollErr) throw enrollErr
    if (enrollments.length === 0) return []

    const sectionIds = enrollments.map((r) => r.section_id)
    let fsQ = supabase.from("faculty_subjects").select("faculty_id").in("section_id", sectionIds)
    if (semesterId) fsQ = fsQ.eq("semesterId", semesterId) as typeof fsQ
    const { data: fs, error: fsErr } = await fsQ
    if (fsErr) throw fsErr

    return [...new Set(fs.map((r) => r.faculty_id))]
  },
}

Thought: 219ms
Done. Ask about item 6 — faculty-subject.ts.
Done. student-enrollment.ts — semesterId filter on list(), replaceBySection(), addEnrollments(), getDistinctFaculty().
Next: Item 6 — lib/repositories/supabase/faculty-subject.ts
Changes:
- list() — add semesterId filter
- replaceBySection() — accept semesterId in items, write to rows
Proceed?
▣  Build · Big Pickle · 10.7s
yes
Thought: 306ms
Let me write the updated faculty-subject.ts.
# Wrote lib\repositories\supabase\faculty-subject.ts
import { supabase } from "@/lib/supabase"
import type { FacultySubjectData, IFacultySubjectRepository } from "@/lib/types"

export const facultySubjectRepository: IFacultySubjectRepository = {
  async list(filters) {
    let q = supabase.from("faculty_subjects").select("*")
    if (filters?.faculty_id) q = q.eq("faculty_id", filters.faculty_id)
    if (filters?.section_id) q = q.eq("section_id", filters.section_id)
    if (filters?.semesterId) q = q.eq("semesterId", filters.semesterId)
    const { data, error } = await q
    if (error) throw error
    return data as FacultySubjectData[]
  },

  async replaceBySection(section_id, items) {
    const { error: delErr } = await supabase.from("faculty_subjects").delete().eq("section_id", section_id)
    if (delErr) throw delErr
    if (items.length === 0) return
    const rows = items.map((i) => ({ faculty_id: i.faculty_id, subject_id: i.subject_id, section_id, semesterId: i.semesterId ?? null }))
    const { error: insErr } = await supabase.from("faculty_subjects").insert(rows)
    if (insErr) throw insErr
  },

  async findBySubjectAndSection(subject_id, section_id) {
    const { data, error } = await supabase
      .from("faculty_subjects")
      .select("*")
      .eq("subject_id", subject_id)
      .eq("section_id", section_id)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as FacultySubjectData
  },
}

Thought: 194ms
Done. Now item 7 — factory.ts.
Done. faculty-subject.ts — semesterId filter on list(), semesterId spread in replaceBySection().
Next: Item 7 (Phase 3 final) — lib/repositories/factory.ts
Changes:
- Import ISemesterRepository instead of IEvaluationPeriodRepository
- Import semesterRepository from ./supabase/semester
- Export semesterRepository: ISemesterRepository instead of evaluationPeriodRepository
Proceed?
▣  Build · Big Pickle · 9.0s
yes
Thought: 340ms
Let me update factory.ts with the necessary changes.
← Edit lib\repositories\factory.ts
Thought: 358ms
Now update the import of the repo and its export.
← Edit lib\repositories\factory.ts
Thought: 233ms
Now update the export.
← Edit lib\repositories\factory.ts
Thought: 455ms
Phase 3 is complete. Let me update the todos and ask if they want to proceed to Phase 4.
# Todos
[✓] Phase 3: Rename repo evaluation-period.ts → semester.ts
[✓] Phase 3: Update evaluation.ts repo — periodId→semesterId + findPending scope
[✓] Phase 3: Update evaluation-result.ts repo — periodId→semesterId
[✓] Phase 3: Update rubric.ts repo — periodId→semesterId
[✓] Phase 3: Update student-enrollment.ts repo — add semesterId
[✓] Phase 3: Update faculty-subject.ts repo — add semesterId
[✓] Phase 3: Update factory.ts — semesterRepository
Thought: 174ms
Phase 3 complete. Ask for Phase 4.
Phase 3 complete. All 7 repository files updated:
File
semester.ts (new)
evaluation.ts
evaluation-result.ts
rubric.ts
student-enrollment.ts
faculty-subject.ts
factory.ts
Proceed to Phase 4 — Controllers?
▣  Build · Big Pickle · 19.8s
yes
Thought: 1.2s
Phase 4 — Controllers:

1. Rename: lib/controllers/evaluation-periods.ts → lib/controllers/semesters.ts
   - All EvaluationPeriod → Semester
   - All getEvaluationPeriod* → getSemester*
   - Add getSemesters (list), getActiveSemester, createSemester, etc.

2. Update: lib/controllers/evaluations.ts
   - getPendingEvaluations — use user.semesterId instead of findActive()
   - All periodId → semesterId

3. Update: lib/controllers/evaluation-results.ts
   - All periodId → semesterId

4. Update: lib/controllers/rubrics.ts
   - All periodId → semesterId

Let me read all these files first.
# Todos
[ ] Phase 4: Rename controller evaluation-periods.ts → semesters.ts
[ ] Phase 4: Update evaluations controller — semesterId + user.semesterId gate
[ ] Phase 4: Update evaluation-results controller — periodId→semesterId
[ ] Phase 4: Update rubrics controller — periodId→semesterId
Thought: 317ms
Let me read all 4 controller files.
→Read lib\controllers 
→Read lib\controllers\evaluation-periods.ts 
→Read lib\controllers\evaluations.ts 
→Read lib\controllers\evaluation-results.ts 
→Read lib\controllers\rubrics.ts 
Thought: 1.9s
Now I have all 4 files. Let me start with item 1 — the rename of evaluation-periods.ts → semesters.ts.

The current evaluation-periods.ts:
- Imports from evaluationPeriodRepository (now semesterRepository)
- Imports CreateEvaluationPeriodInput (now CreateSemesterInput)
- Functions: getEvaluationPeriods, getEvaluationPeriod, getActiveEvaluationPeriod, createEvaluationPeriod, updateEvaluationPeriod, deleteEvaluationPeriod, activateEvaluationPeriod

New semesters.ts:
- Import from semesterRepository
- Import CreateSemesterInput (or just use inline types since it's just passed through)
- Functions: getSemesters, getSemester, getActiveSemester, createSemester, updateSemester, deleteSemester, activateSemester
- Remove schoolYear from params

Let me also check what the controller signature should look like. The plan says:
- Add getSemesters (list), getActiveSemester, createSemester, etc.

The current functions already exist, just renamed. Let me start.
Phase 4, Item 1: Rename evaluation-periods.ts → semesters.ts
# Todos
[•] Phase 4: Rename controller evaluation-periods.ts → semesters.ts
[ ] Phase 4: Update evaluations controller — semesterId + user.semesterId gate
[ ] Phase 4: Update evaluation-results controller — periodId→semesterId
[ ] Phase 4: Update rubrics controller — periodId→semesterId
Thought: 294ms
Create the new semesters.ts file.
# Wrote lib\controllers\semesters.ts
import { semesterRepository } from "@/lib/repositories/factory"
import type { CreateSemesterInput } from "@/lib/types"

export async function getSemesters(params?: { isActive?: boolean }) {
  return semesterRepository.list(params)
}

export async function getSemester(id: string) {
  return semesterRepository.findById(id)
}

export async function getActiveSemester() {
  return semesterRepository.findActive()
}

export async function createSemester(input: CreateSemesterInput) {
  return semesterRepository.create(input)
}

export async function updateSemester(id: string, data: Parameters<typeof semesterRepository.update>[1]) {
  return semesterRepository.update(id, data)
}

export async function deleteSemester(id: string) {
  return semesterRepository.delete(id)
}

export async function activateSemester(id: string) {
  return semesterRepository.setActive(id)
}

Thought: 251ms
Now delete the old file.
# Delete old evaluation-periods.ts
$ Remove-Item -LiteralPath "lib\controllers\evaluation-periods.ts"
(no output)
Thought: 339ms
Done. Now ask about item 2.
# Todos
[✓] Phase 4: Rename controller evaluation-periods.ts → semesters.ts
[ ] Phase 4: Update evaluations controller — semesterId + user.semesterId gate
[ ] Phase 4: Update evaluation-results controller — periodId→semesterId
[ ] Phase 4: Update rubrics controller — periodId→semesterId
Thought: 1.0s
Done. Next: item 2 — evaluations controller. Key changes:
- getPendingEvaluations(evaluatorId) — now accepts semesterId instead of looking up active period. The plan says "use user.semesterId instead of findActive()". So the caller will pass it.
- getOrCreateEvaluation(periodId, ...) → getOrCreateEvaluation(semesterId, ...)
- Remove the evaluationPeriodRepository import

Let me write the new file.
Done. Item 2 — lib/controllers/evaluations.ts
Changes:
- getPendingEvaluations(evaluatorId, semesterId) — uses passed semesterId instead of looking up active period
- getOrCreateEvaluation(periodId, ...) → getOrCreateEvaluation(semesterId, ...)
- Remove evaluationPeriodRepository import
Proceed?
▣  Build · Big Pickle · 30.0s
yes
Thought: 374ms
Let me write the updated evaluations.ts controller.
# Wrote lib\controllers\evaluations.ts
import { evaluationRepository } from "@/lib/repositories/factory"

export async function getPendingEvaluations(evaluatorId: string, semesterId: string) {
  return evaluationRepository.findPending(evaluatorId, semesterId)
}

export async function getMyEvaluations(evaluatorId: string) {
  return evaluationRepository.findByEvaluator(evaluatorId)
}

export async function getEvaluation(id: string) {
  return evaluationRepository.findById(id)
}
