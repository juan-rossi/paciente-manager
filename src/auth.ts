import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyPassword, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nuevaFechaFinTrial } from "@/lib/plan";

// Google solo da un nombre completo -- lo partimos como mejor se puede en
// nombre/apellido (el médico puede corregirlo después en /onboarding, donde
// además completa la matrícula que Google no provee).
function splitNombre(nombreCompleto: string): { nombre: string; apellido: string } {
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length <= 1) return { nombre: partes[0] ?? "", apellido: "" };
  return { nombre: partes[0], apellido: partes.slice(1).join(" ") };
}

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
      if (account?.provider === "credentials") return true;

      const email = typeof user.email === "string" ? normalizeEmail(user.email) : "";
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return true;

      // Primer login con Google y el email no existe todavía: se autoregistra
      // como médico en período de prueba. La matrícula (que Google no da)
      // se completa en /onboarding antes de poder usar el resto de la app.
      const { nombre, apellido } = splitNombre(
        typeof user.name === "string" ? user.name : ""
      );
      await prisma.user.create({
        data: {
          email,
          nombre,
          apellido,
          passwordHash: "",
          role: "DOCTOR",
          plan: "BASICA",
          trialEndsAt: nuevaFechaFinTrial(),
        },
      });
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        const email = typeof user.email === "string" ? normalizeEmail(user.email) : "";
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role as UserRole;
          token.perfilCompleto = dbUser.role !== "DOCTOR" || dbUser.nroMatricula.trim() !== "";
        }
      } else if (trigger === "update" && typeof token.userId === "string") {
        // La sesión JWT no se refresca sola en cada request -- sin esto,
        // `perfilCompleto` queda pegado al valor de cuando se logueó y nunca
        // se entera de que el perfil se completó, generando un loop de
        // redirects entre /onboarding y /dashboard. `update()` (llamado
        // desde el cliente tras completar el perfil) dispara este trigger.
        const dbUser = await prisma.user.findUnique({ where: { id: token.userId } });
        if (dbUser) {
          token.role = dbUser.role as UserRole;
          token.perfilCompleto = dbUser.role !== "DOCTOR" || dbUser.nroMatricula.trim() !== "";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string" && token.role) {
        session.user.id = token.userId;
        session.user.role = token.role as UserRole;
        session.user.perfilCompleto = (token.perfilCompleto as boolean | undefined) ?? true;
      }
      return session;
    },
  },
});
