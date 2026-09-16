"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Stethoscope,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  Users,
  CalendarDays,
  MessageCircle,
  Settings,
  LayoutDashboard,
  Stethoscope,
  Wallet,
} satisfies Record<string, LucideIcon>;

type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  matchPrefixes?: string[];
};

type Props = {
  links: NavLink[];
  className?: string;
  // "underline" es el nav horizontal de siempre (header desktop). "solid"
  // es para el menú vertical mobile (ver mobile-nav-menu.tsx): el activo se
  // marca con toda la fila rellena en el color primario, no con un borde.
  activeVariant?: "underline" | "solid";
};

export function NavLinks({ links, className, activeVariant = "underline" }: Props) {
  const pathname = usePathname();

  // Con rutas anidadas (ej. "/admin" y "/admin/gastos"), el link padre
  // también matchea por prefijo cualquier hijo -- sin desempate, "Dashboard"
  // quedaba marcado activo en todas las subpáginas del panel admin. Gana
  // el match más específico (el prefijo más largo), no el primero.
  function matchLength(link: NavLink): number {
    const prefixes = link.matchPrefixes ?? [link.href];
    const matching = prefixes.filter(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    return matching.length > 0 ? Math.max(...matching.map((p) => p.length)) : -1;
  }

  const bestMatch = Math.max(...links.map(matchLength));

  return (
    <nav
      className={cn(
        "hidden items-center gap-5 text-sm font-medium text-muted-foreground sm:flex",
        className
      )}
    >
      {links.map((link) => {
        const active = bestMatch >= 0 && matchLength(link) === bestMatch;
        const Icon = ICONS[link.icon];
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              activeVariant === "solid"
                ? "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground"
                : "flex items-center gap-1.5 border-b-2 border-transparent py-1 transition-colors hover:text-foreground",
              active &&
                (activeVariant === "solid"
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "border-primary text-foreground")
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
