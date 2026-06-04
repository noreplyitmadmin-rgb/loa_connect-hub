# Faculty Evaluation — AI-Assisted Effort Estimate

**Methodology**: Each "prompt" = one AI interaction that generates, edits, or reviews code. A prompt can produce 1 file or a logical group of related files. Includes generation + 1 refinement pass.

---

## Phase 1: Database Setup (3 prompts — risk: none, it's additive)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 1 | Generate SQL migration: 11 new tables + 2 ALTER TABLE on `users` + indexes | `supabase-schema.sql` addition | None — additive only |
| 2 | Generate `lib/types/evaluation.ts` with all entity/DTO types + `lib/types/repository.ts` additions | 1 new file + 1 edit | Low — new types, existing types unaffected |
| 3 | Generate 5 new repositories in `lib/repositories/supabase/` + update `factory.ts` | 5 new files + 1 edit | Low — factory.ts only adds exports |

**Blast radius**: Zero. New tables don't touch existing tables. New repos don't affect existing repos.

---

## Phase 2: Controllers (3 prompts — risk: low)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 4 | Generate `lib/controllers/evaluation-periods.ts` + `rubrics.ts` | 2 new files | None |
| 5 | Generate `lib/controllers/evaluations.ts` + `evaluation-results.ts` | 2 new files | None |
| 6 | Generate `lib/controllers/sentiment-analysis.ts` + `etl-evaluation.ts` | 2 new files | None |

**Blast radius**: None. Pure new files.

---

## Phase 3: API Routes (5 prompts — risk: low)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 7 | Generate `app/api/evaluation-periods/route.ts` + `[id]/route.ts` + `[id]/activate/route.ts` | 3 new files | None |
| 8 | Generate `app/api/evaluation-periods/[id]/rubrics/**` + `subjects/**` + `faculty-subjects/**` + `enrollments/**` + `enrollment-stats/**` | ~8 new files | None |
| 9 | Generate `app/api/evaluations/**` (pending, submitted, create, ratings, submit, comments) | ~7 new files | None |
| 10 | Generate `app/api/evaluation-results/**` + `evaluation-comments/**` | ~5 new files | None |
| 11 | Generate `app/api/sentiment-analysis/**` + `evaluation-reports/**` | ~5 new files | None |

**Blast radius**: None. All new route files under `/api/` — no existing routes touched.

---

## Phase 4: Shared Components (2 prompts — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 12 | Generate `RatingScale`, `CategoryProgressBar`, `FacultyResultCard`, `SentimentBadge` | 4 new components | None |
| 13 | Generate `EvaluationFilters`, `EvaluationForm` | 2 new components | None |

**Blast radius**: None. All new files in `components/`.

---

## Phase 5: ETL Enhancement (2 prompts — risk: moderate — touches EXISTING code)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 14 | Edit `lib/constants.ts` — add `evaluation-faculty` and `evaluation-student` to `EtlUploadType` | 1 existing file | Low — adds enum values |
| 15 | Edit `app/api/admin/etl-upload/validate/route.ts` + `confirm/route.ts` — handle 2 new types | 2 existing files | **Moderate** — branching logic for new upload types must not break existing student/faculty uploads |

**Blast radius**: Moderate. The validate and confirm routes must preserve existing logic for `"student"` and `"faculty"` types while adding handlers for the two new types. Existing behavior unchanged by keeping `if (type === "evaluation-faculty" || type === "evaluation-student")` branches separate.

---

## Phase 6: Student Pages (2 prompts — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 16 | Generate `app/student/evaluations/page.tsx` + `history/page.tsx` + mobile `m/` views | 4 new files | None |
| 17 | Generate `app/student/evaluations/[periodId]/page.tsx` + mobile version | 2 new files | None |

**Blast radius**: None. Entirely new directory.

---

## Phase 7: Faculty Pages (1 prompt — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 18 | Generate `app/faculty/evaluations/page.tsx` + `[periodId]/page.tsx` + mobile | 3-4 new files | None |

**Blast radius**: None. Entirely new directory.

---

## Phase 8: Dean Pages (1 prompt — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 19 | Generate `app/dean/evaluations/page.tsx` + `results/page.tsx` + `reports/page.tsx` + mobile | 4-5 new files | None |

**Blast radius**: None. Entirely new directory.

---

## Phase 9: Admin Pages (3 prompts — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 20 | Generate `app/admin/evaluations/page.tsx` + `periods/page.tsx` + `rubrics/page.tsx` | 3 new files | None |
| 21 | Generate `app/admin/evaluations/upload/page.tsx` + `results/page.tsx` + `results/[facultyId]/page.tsx` | 3 new files | None |
| 22 | Generate `app/admin/evaluations/reports/page.tsx` + `reports/sentiment/page.tsx` + mobile views | 4-5 new files | None |

**Blast radius**: None. Entirely new directory.

---

## Phase 10: Integration & Wiring (3 prompts — risk: the side effects)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 23 | Edit `lib/types/index.ts` — add evaluation export | 1 existing file | Low — one line added |
| 24 | Edit `lib/access.ts` DEFAULT_CONFIG — add evaluation paths per role | 1 existing file | Low — adds to existing arrays |
| 25 | Edit `components/Sidebar.tsx` — add collapsible evaluation nav section | 1 existing file | **Low-Medium** — adds new collapsible section alongside admin reports |

**Blast radius**: Low. Sidebar changes add nav items but don't alter existing items. Access config adds paths but doesn't remove any.

---

## Phase 11: Sentiment AI (1 prompt — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 26 | Generate `lib/services/sentiment.ts` + `.env` config | 1-2 files | None — new service, env additions only |

---

## Phase 12: Testing (3 prompts — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 27 | Generate unit tests for controllers | `lib/__tests__/` additions | None |
| 28 | Generate unit tests for repositories | `lib/__tests__/` additions | None |
| 29 | Generate ETL validation tests | `lib/__tests__/` additions | None |

---

## Risk Summary

| Risk Level | Phases | Count |
|-----------|--------|-------|
| **None** (new files only) | 1-4, 6-9, 11-12 | 24 prompts |
| **Low** (add enum values, add exports, add paths to arrays) | 5 (constants), 10 (types, access) | 3 prompts |
| **Moderate** (branching logic in existing routes) | 5 (validate + confirm routes) | 1 prompt |
| **High** (rewrites existing behavior) | None | 0 prompts |

**The ETL validate/confirm routes at Phase 5, Prompt 15 is the only moderate-risk area.** The approach: keep existing logic in clearly separated `if/else` blocks, test all 4 upload types after changes.

---

## Adjusted Estimate

| Scenario | Prompts | Wall Clock |
|----------|---------|------------|
| **Minimum** (ideal, no iteration) | 26 | ~4-6 hours |
| **Likely** (1 refinement pass, fixes) | 35-40 | ~1-1.5 days |
| **Maximum** (multiple refinements) | 50-55 | ~2 days |

**Key insight**: 24 out of 26 prompts (92%) touch exclusively NEW files. Only 2 prompts touch existing code. The blast radius is concentrated in the ETL routes and integration wiring.
