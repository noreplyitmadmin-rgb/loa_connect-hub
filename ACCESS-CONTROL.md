# Access Control — User-Level Permission Overrides

> **Working file** — plan for adding granular per-user permission overrides on top of the existing RBAC.
> **Implementation branch:** `new-eval`

---

## Final Implementation Plan

### Phase 0: Schema + Types (1 PR)

**Files:**
- `supabase-schema.sql` — add `permissions JSONB DEFAULT '[]'::jsonb` to `users`
- `lib/types/permissions.ts` — `UserPermissions`, `EffectivePermissions`, `PageCapabilities`
- `lib/types/repository.ts` — add `permissions: UserPermissions | null` to `UserData`

### Phase 1: Resolution Engine (1 PR)

**Files:**
- `lib/utils/permissions.ts` — `parsePermission()`, `hasPermission()`, `pageCapabilities()` helpers
- `lib/repositories/supabase/user.ts` — handle `permissions` in queries
- `lib/auth.ts` — resolve effective permissions in JWT callback

**Resolution:**
```
effective = role_base (implicit via group_access)
if user.permissions is object:
  effective += grants
  effective -= denies
effective = unique(effective)

→ embedded as effectivePermissions: string[] on session
```

**`pageCapabilities(perms, resource)` logic:**
```
readScope:
  has(:delete|:update|:create|:read-all) → "all"
  has(:read-only)                         → "own"
  else                                    → "none"

canCreate: has(:create)
canUpdate: has(:update)
canDelete: has(:delete)
```

### Phase 2: UI Components (1 PR)

- `components/AccessDeniedCard.tsx` — inline card, no redirect

### Phase 3: Pilot — Departments Page (1 PR)

- `app/api/admin/departments/route.ts` — `hasPermission(perms, "/admin/data/departments:read-all")` guard
- `app/admin/data/departments/page.tsx` — single `pageCapabilities` resolve, compose mini-pages

### Phase 4: Pilot — ETL Hub (1 PR)

- `app/admin/etl-hub/page.tsx` — `pageCapabilities` resolve, tab hides

### Phase 5: Admin Editor (1 PR)

- `app/admin/access-config/permissions/page.tsx` — user search + checkbox grid (grant/deny/indeterminate), save as `{ grants, denies }`

---

## Permission String Index

Format: `<resource-path>:<action>` — URL is canonical, no separate map needed.

| Resource | Actions |
|----------|---------|
| `/admin/data/departments` | `create`, `update`, `delete`, `read-all`, `read-only` |
| `/admin/etl-hub` | `import-faculty`, `import-student`, `download-template` |
| `/admin/users` | `create`, `update`, `delete`, `read-all`, `read-only`, `import`, `restore` |
| `/admin/appointments` | `create`, `update`, `delete`, `read-all`, `read-only`, `cancel`, `complete` |
| `/admin/evaluations` | `create-period`, `edit-period`, `delete-period`, `manage-rubric`, `view-results`, `compute-results`, `export-results` |
| `/admin/reports` | `view`, `export` |
| `/admin/access-config/permissions` | `view`, `edit` |

---

## Example Scenarios

### A: Faculty given import access

```
grants: ["/admin/etl-hub:import-student"]
denies: []

pageCapabilities("/admin/etl-hub") → readScope="none", canCreate=true
  → Faculty sees only the Import Student tab
```

### B: Admin restricted from deleting users

```
grants: []
denies: ["-/admin/users:delete"]

pageCapabilities("/admin/users") → readScope="all", canDelete=false
  → Admin sees everything except Delete button
```

### C: Read-only department viewer + creator

```
grants: ["/admin/data/departments:create"]
denies: ["-/admin/data/departments:update", "-/admin/data/departments:delete", "-/admin/data/departments:read-only"]

pageCapabilities("/admin/data/departments") → readScope="all", canCreate=true, canUpdate=false, canDelete=false
  → AllDepartmentsTable + CreateForm, no Edit/Delete
```

### D: User with create + read-only (own data)

```
grants: ["/admin/appointments:create", "/admin/appointments:read-only"]
denies: ["-/admin/appointments:read-all", "-/admin/appointments:update", "-/admin/appointments:delete"]

pageCapabilities("/admin/appointments") → readScope="own", canCreate=true, canUpdate=false, canDelete=false
  → OwnDataTable + CreateButton, no AllDataTable, no Edit/Delete
```

### E: No permissions (default)

```
permissions = null

pageCapabilities(resource) → readScope="all" via role base, all booleans from role base
  → Full role-based access
```

---

## TypeScript Types

```ts
export interface UserPermissions {
  grants: string[]
  denies: string[]
}

export type EffectivePermissions = string[]

export interface PageCapabilities {
  readScope: "all" | "own" | "none"
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}
```

---

## UI Pattern

```tsx
const perms = session?.user?.effectivePermissions ?? []
const caps = pageCapabilities(perms, "/admin/data/departments")

{caps.readScope === "all"  && <AllDataTable />}
{caps.readScope === "own"  && <OwnDataTable />}
{caps.readScope === "none" && <AccessDeniedCard />}

{caps.canCreate && <CreateForm />}
{caps.canUpdate && <EditActions />}
{caps.canDelete && <DeleteActions />}
```

---

## Admin Editor UX

```
Search user → show checkbox grid per resource

/admin/data/departments:
  [x] create  [ ] update  [ ] delete  [x] read-all  [ ] read-only

States:
  ✓ checked   → stored in grants
  ✗ unchecked → stored in denies
  · dimmed    → omitted (role default applies)

Save → { grants: [...checked], denies: [...unchecked] }
```

---

## What's NOT included

- No `role_capabilities` table — role defaults stay implicit in `group_access`
- No wildcard matching — keeps `hasPermission` an O(n) includes check
- No migration script for existing users — `NULL` means role default
- No SSO sync changes — permissions set manually via admin editor
