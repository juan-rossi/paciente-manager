import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyPassword, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? normalizeEmail(credentials.email) : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.nombre, role: user.role };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // El login por contraseña ya valida contra nuestra tabla en `authorize()`.
      // Google solo puede entrar si el email ya es un usuario existente
      // (nadie se crea por OAuth).
      if (account?.provider === "credentials") return true;

      const email = typeof user.email === "string" ? normalizeEmail(user.email) : "";
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      return existing !== null;
    },
    async jwt({ token, user }) {
      if (user) {
        const email = typeof user.email === "string" ? normalizeEmail(user.email) : "";
        const dbUser = "role" in user && user.role ? user : await prisma.user.findUnique({ where: { email } });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role as UserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string" && token.role) {
        session.user.id = token.userId;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
