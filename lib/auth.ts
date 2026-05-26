import { NextAuthOptions, getServerSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { userRepository } from "@/lib/repositories/factory"
import { compare } from "bcryptjs"

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await userRepository.findByEmail(credentials.email as string)

        if (!user || !user.passwordHash) return null
        if (user.isDisabled) return null
        if (user.role === "GUEST") return null

        const isValid = await compare(credentials.password as string, user.passwordHash)
        if (!isValid) return null

        await userRepository.update(user.id, { hasLoggedInBefore: true, lastLoginAt: new Date() })

        // Fire-and-forget audit log
        import("@/lib/services/audit").then(({ logAuditEvent }) =>
          logAuditEvent({ userId: user.id, email: user.email, action: "LOGIN", details: "Successful login" })
        ).catch(() => {})

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Sign-in: store user details + current tokenVersion
        token.id = user.id
        ;(token as any).role = (user as any).role || "STUDENT"
        ;(token as any).tokenVersion = (user as any).tokenVersion ?? 0
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).tokenVersion = (token as any).tokenVersion
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
}

export async function auth() {
  const session = await getServerSession(authOptions)

  // Validate the session is still active — handles users disabled mid-session
  // and database resets (tokenVersion mismatch). Replaces the unreliable DB
  // lookup inside the jwt callback (which caused redirect loops).
  //
  // IMPORTANT: on DB error we return the session as-is, not null. Returning
  // null on a transient Supabase hiccup causes a redirect-to-login loop
  // because the login page's useSession() still sees a valid JWT cookie and
  // redirects right back.
  const userId = (session?.user as any)?.id
  if (!userId) return session

  try {
    const dbUser = await userRepository.findById(userId)

    // User doesn't exist in DB (deleted, DB reset, etc.)
    if (!dbUser) {
      console.warn(`[auth] Session user ${userId} not found in DB — returning null`)
      return null
    }

    // User was disabled mid-session
    if (dbUser.isDisabled) {
      console.warn(`[auth] Session user ${userId} is disabled — returning null`)
      return null
    }

    // User was demoted to GUEST mid-session
    if (dbUser.role === "GUEST") {
      console.warn(`[auth] Session user ${userId} is GUEST — returning null`)
      return null
    }

    // Token version mismatch (token revoked by admin / DB reset).
    // For old JWTs that lack tokenVersion, treat as version 0 and
    // compare against the DB so a reset (which resets to 0 for all
    // users) or a disable (which increments) is still caught.
    const jwtVersion = (session?.user as any)?.tokenVersion ?? 0
    if (dbUser.tokenVersion !== jwtVersion) {
      console.warn(`[auth] Session user ${userId} tokenVersion mismatch (JWT: ${jwtVersion}, DB: ${dbUser.tokenVersion}) — returning null`)
      return null
    }
  } catch (err) {
    // DB transient error — leave session intact to avoid redirect loop
    console.error(`[auth] DB error during session validation for ${userId}:`, err)
  }

  return session
}

/**
 * Lightweight session check for client components that use useSession().
 * Returns true if the server-side session is still valid (user active,
 * tokenVersion matches). Call this periodically or after sensitive actions.
 */
export async function checkSession(): Promise<boolean> {
  const session = await auth()
  return session !== null
}
