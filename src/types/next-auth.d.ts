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
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    perfilCompleto?: boolean;
  }
}
