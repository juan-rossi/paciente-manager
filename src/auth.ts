import { cookies } from "next/headers";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyPassword, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nuevaFechaFinTrial, SIGNUP_PLAN_COOKIE } from "@/lib/plan";
import { TERMINOS_COOKIE, TERMINOS_VERSION } from "@/lib/terminos";
import { getClientIp } from "@/lib/request-ip";
import { loginRequiereVerificacion, rateLimitOk, registrarLoginFallido } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { INVITACION_COOKIE } from "@/lib/invitacion-secretaria-shared";
import { aceptarInvitacion, buscarInvitacion } from "@/lib/invitacion-secretaria";

// `code` llega al cliente en la respuesta de `signIn()` -- el login-form lo
// usa para mostrar "demasiados intentos" en vez de "contraseña incorrecta".
class DemasiadosIntentos extends CredentialsSignin {
  code = "rate_limited";
}

// Varios intentos fallidos con este email: el login-form muestra Turnstile y
// reintenta con el token (ver `loginRequiereVerificacion`).
class RequiereVerificacion extends CredentialsSignin {
  code = "captcha_required";
}

// Médico suspendido desde /admin/moderacion (ver `src/lib/sanciones.ts`).
// Solo se informa después de validar la contraseña, para no revelarle a
// cualquiera qué cuentas están suspendidas.
class CuentaSuspendida extends CredentialsSignin {
  code = "suspended";
}

// Hash bcrypt de una contraseña aleatoria descartada: se compara contra él cuando el
// email no existe para que la respuesta tarde lo mismo que con un email
// real (si no, midiendo el tiempo se podría averiguar qué emails tienen
// cuenta).
// Mismo costo que los hashes nuevos (`BCRYPT_COSTO` en src/lib/auth.ts).
const HASH_FICTICIO = "$2b$12$PyZ5aOH55mXoJSn9JQ5n3.OpuXpSZSx2hiDLPxysOhnMYRn4WLW56";

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
      credentials: { email: {}, password: {}, turnstileToken: {} },
      async authorize(credentials, request) {
        const email =
          typeof credentials?.email === "string" ? normalizeEmail(credentials.email) : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        // Por IP: una sola fuente atacando muchas cuentas.
        const ip = getClientIp(request);
        if (!(await rateLimitOk(ip, email, "login"))) {
          throw new DemasiadosIntentos();
        }

        // Por email: tras varios intentos FALLIDOS se pide Turnstile en vez de
        // bloquear -- bloquear dejaba que cualquiera le trabara el login a un
        // médico con solo mandar intentos con su email.
        if (await loginRequiereVerificacion(email)) {
          const token = typeof credentials?.turnstileToken === "string" ? credentials.turnstileToken : "";
          if (!(await verifyTurnstileToken(token, ip))) throw new RequiereVerificacion();
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await verifyPassword(password, HASH_FICTICIO);
          await registrarLoginFallido(ip, email);
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          await registrarLoginFallido(ip, email);
          return null;
        }
        if (user.suspendidoAt) throw new CuentaSuspendida();

        return { id: user.id, email: user.email, name: user.nombre, role: user.role };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // El login por contraseña ya valida contra nuestra tabla en `authorize()`.
      if (account?.provider === "credentials") return true;

      // Google entra a la cuenta existente con ese email (aunque se haya
      // creado con contraseña): solo se puede confiar en el email si Google
      // lo verificó. Una cuenta de Google con un email ajeno sin verificar
      // sería tomar la cuenta del médico con todas sus HC.
      if (account?.provider === "google" && profile?.email_verified !== true) {
        return "/login?error=EmailNoVerificado";
      }

      const email = typeof user.email === "string" ? normalizeEmail(user.email) : "";
      if (!email) return false;

      const cookieStore = await cookies();

      // "Continuar con Google" desde el link de una invitación de secretaria
      // (ver `/invitacion`): si la cuenta de Google es la del email invitado,
      // ese login acepta la invitación. Si es otra, se corta acá -- si no,
      // con un email nuevo se autoregistraría como médico.
      const tokenInvitacion = cookieStore.get(INVITACION_COOKIE)?.value;
      if (tokenInvitacion) {
        cookieStore.delete(INVITACION_COOKIE);
        const invitacion = await buscarInvitacion(tokenInvitacion);
        if (invitacion) {
          if (invitacion.email !== email) {
            return `/invitacion?token=${encodeURIComponent(tokenInvitacion)}&error=otra-cuenta`;
          }
          await aceptarInvitacion(invitacion);
          return true;
        }
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.suspendidoAt) return "/login?error=Suspendida";
      if (existing) return true;

      // Primer login con Google y el email no existe todavía: se autoregistra
      // como médico en período de prueba. La matrícula (que Google no da)
      // se completa en /onboarding antes de poder usar el resto de la app.
      // Google salta el formulario de /signup, así que la aceptación de los
      // términos viaja en una cookie que el cliente setea antes del redirect;
      // sin ella (p.ej. "Continuar con Google" desde /login con un email
      // nuevo) no se crea la cuenta y se lo manda a /signup a aceptar.
      if (cookieStore.get(TERMINOS_COOKIE)?.value !== TERMINOS_VERSION) {
        return "/signup?error=terminos";
      }
      const ahora = new Date();
      const plan = cookieStore.get(SIGNUP_PLAN_COOKIE)?.value === "PREMIUM" ? "PREMIUM" : "BASICA";
      cookieStore.delete(SIGNUP_PLAN_COOKIE);
      const { nombre, apellido } = splitNombre(
        typeof user.name === "string" ? user.name : ""
      );
      await prisma.user.create({
        data: {
          email,
          nombre,
          apellido,
          passwordHash: "",
          terminosVersion: TERMINOS_VERSION,
          terminosAceptadosAt: ahora,
          declaracionProfesionalAt: ahora,
          role: "DOCTOR",
          plan,
          trialEndsAt: nuevaFechaFinTrial(plan),
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
          token.isAdmin = dbUser.isAdmin;
          token.sessionVersion = dbUser.sessionVersion;
          token.sid = crypto.randomUUID();
        }
        return token;
      }

      // Sesión ya existente: si la cuenta restableció la contraseña después
      // de este login (ver `sessionVersion` en el schema), o si esta sesión
      // se cerró con "Cerrar sesión" (ver `SesionRevocada`), el JWT queda
      // invalidado -- devolver null hace que Auth.js borre la cookie. Los
      // JWT emitidos antes de existir el campo no lo traen y cuentan como 0.
      if (typeof token.userId === "string") {
        const [actual, revocada] = await Promise.all([
          prisma.user.findUnique({
            where: { id: token.userId },
            select: { sessionVersion: true },
          }),
          typeof token.sid === "string"
            ? prisma.sesionRevocada.findUnique({ where: { sid: token.sid }, select: { sid: true } })
            : null,
        ]);
        if (!actual || actual.sessionVersion !== (token.sessionVersion ?? 0)) return null;
        if (revocada) return null;
      }
      // JWT emitidos antes de existir `sid`: se les asigna uno en la próxima
      // renovación de la cookie, para que su logout también se pueda revocar.
      if (!token.sid) token.sid = crypto.randomUUID();

      if (trigger === "update" && typeof token.userId === "string") {
        // La sesión JWT no se refresca sola en cada request -- sin esto,
        // `perfilCompleto` queda pegado al valor de cuando se logueó y nunca
        // se entera de que el perfil se completó, generando un loop de
        // redirects entre /onboarding y /dashboard. `update()` (llamado
        // desde el cliente tras completar el perfil) dispara este trigger.
        const dbUser = await prisma.user.findUnique({ where: { id: token.userId } });
        if (dbUser) {
          token.role = dbUser.role as UserRole;
          token.perfilCompleto = dbUser.role !== "DOCTOR" || dbUser.nroMatricula.trim() !== "";
          token.isAdmin = dbUser.isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string" && token.role) {
        session.user.id = token.userId;
        session.user.role = token.role as UserRole;
        session.user.perfilCompleto = (token.perfilCompleto as boolean | undefined) ?? true;
        session.user.isAdmin = (token.isAdmin as boolean | undefined) ?? false;
      }
      return session;
    },
  },
  events: {
    // Auth.js solo borra la cookie -- ver `SesionRevocada` en el schema por
    // qué además hay que revocar el JWT en la base.
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const sid = token?.sid;
      if (typeof sid !== "string") return;
      const ahora = new Date();
      const expiresAt =
        typeof token?.exp === "number"
          ? new Date(token.exp * 1000)
          : new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);
      await prisma.$transaction([
        prisma.sesionRevocada.deleteMany({ where: { expiresAt: { lt: ahora } } }),
        prisma.sesionRevocada.upsert({
          where: { sid },
          create: { sid, expiresAt },
          update: {},
        }),
      ]);
    },
  },
});
