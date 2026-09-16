import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/auth";

declare module "next-auth" {
  interface User {
    role?: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      // Falso solo para un DOCTOR creado por Google sin matrícula todavía --
      // `proxy.ts` lo usa para forzar `/onboarding` sin pegarle a la base.
      perfilCompleto: boolean;
      // Acceso al panel /admin otorgado a mano a un DOCTOR/SECRETARY (ver
      // `isPlatformAdmin()` en `src/lib/admin-access.ts`). Para role === "ADMIN"
      // no hace falta -- ya tiene acceso por su rol.
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    perfilCompleto?: boolean;
    isAdmin?: boolean;
  }
}
