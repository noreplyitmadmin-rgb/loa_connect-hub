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
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        ;(token as any).role = (user as any).role || "STUDENT"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).id = (token as any).id
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

export function auth() {
  return getServerSession(authOptions)
}
