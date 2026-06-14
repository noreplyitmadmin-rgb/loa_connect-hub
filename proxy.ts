import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase"
import { loadAccessConfig } from "@/lib/access"

const ROLE_PRIORITY = ["ADMIN", "DEAN", "FACULTY", "STUDENT", "GUEST"]

function getPrimaryRole(roles: string): string {
  if (!roles) return "GUEST"
  const userRoles = roles.split("|")
  for (const p of ROLE_PRIORITY) {
    if (userRoles.includes(p)) return p
  }
  return "GUEST"
}

const PERM_CACHE_TTL = 60_000
const permCache = new Map<string, { result: boolean | null; ts: number }>()

/// Returns true (allow), false (deny), or null (no explicit entry — fall through).
/// Matches exact resource_path or prefix (e.g. grant for /api/admin/departments
/// also covers /api/admin/departments/123).
async function checkUserPermission(userId: string, resource: string): Promise<boolean | null> {
  const cached = permCache.get(userId)
  if (cached && Date.now() - cached.ts < PERM_CACHE_TTL) return cached.result

  try {
    const { data } = await supabase
      .from('user_permissions')
      .select('grants, denies, resource_path')
      .eq('user_id', userId);
    if (!data || data.length === 0) { permCache.set(userId, { result: null, ts: Date.now() }); return null; }
    for (const row of data as { grants: string[]; denies: string[]; resource_path: string }[]) {
      const rp: string = row.resource_path ?? '';
      if (resource !== rp && !resource.startsWith(rp + '/')) continue;
      const grants: string[] = row.grants ?? [];
      const denies: string[] = row.denies ?? [];
      if (denies.includes('access')) { permCache.set(userId, { result: false, ts: Date.now() }); return false; }
      if (grants.includes('access')) { permCache.set(userId, { result: true, ts: Date.now() }); return true; }
    }
  } catch { }
  return null;
}

const PUBLIC_PATHS = new Set([
  "/login", "/activate", "/forgot-password", "/change-password",
  "/setup-password", "/403",
])

const PUBLIC_PREFIXES = ["/_next", "/api/auth", "/api/test-auth"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next()
  }

  if (pathname.includes(".")) return NextResponse.next()

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  const token = await getToken({ req: request, secret })

  if (!token) {
    if (pathname === "/") return NextResponse.next()
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  const rawRole = (token as Record<string, unknown>).role as string | undefined
  const group = getPrimaryRole(rawRole ?? "GUEST")
    const userId = (token as Record<string, unknown>).id as string

  const isAdmin = rawRole?.includes('ADMIN')

  // Layer 1: User-level permission override (highest priority)
  const userPerm = await checkUserPermission(userId, pathname);
  if (userPerm === true) {
    if (!isAdmin) {
      const h = new Headers(request.headers);
      h.set('x-auth-by', 'user_permissions');
      return NextResponse.next({ request: { headers: h } });
    }
    return NextResponse.next();
  }
  if (userPerm === false) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({
        error: 'Forbidden',
        message: 'Access denied by user-permissions configuration.',
        path: pathname,
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    return NextResponse.redirect(new URL("/403", request.url));
  }

  // Admin API routes require ADMIN role or Layer 1 grant above
  if (pathname.startsWith('/api/admin/')) {
    if (isAdmin) return NextResponse.next();
    return new NextResponse(JSON.stringify({
      error: 'Forbidden',
      message: 'This API endpoint requires the ADMIN role or a user-permissions grant for this path.',
      path: pathname,
    }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // Authenticated non-admin API requests are allowed by default
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Layer 2: DB access-config merged with defaults
  const config = await loadAccessConfig();
  const entry = config[group];
  const dbAccess = entry?.pages?.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (dbAccess) return NextResponse.next();

  // Layer 3: Hardcoded default (only reached if DB config also denies)
  return NextResponse.redirect(new URL("/403", request.url));
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
