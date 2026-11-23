"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileUp,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Settings,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ICONS = {
  Users,
  CalendarDays,
  MessageCircle,
  Settings,
  LayoutDashboard,
  Stethoscope,
  Wallet,
  Megaphone,
  Sparkles,
  ShieldAlert,
  LifeBuoy,
  FileUp,
  ClipboardList,
} satisfies Record<string, LucideIcon>;

type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  matchPrefixes?: string[];
  // Contador de pendientes; se muestra como pill solo si es > 0.
  badge?: number;
};

// Ítem que despliega un submenú al hacer click. Su contador es la suma de
// los contadores de los hijos.
type NavGroup = {
  label: string;
  icon: keyof typeof ICONS;
  children: NavLink[];
};

export type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

function CountBadge({ count, inverted }: { count?: number; inverted?: boolean }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[11px] leading-none font-semibold tabular-nums",
        inverted ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
      )}
    >
      {count}
    </span>
  );
}

type Props = {
  links: NavItem[];
  className?: string;
  // "underline" es el nav horizontal de siempre (header desktop). "solid"
  // es para el menú vertical mobile (ver mobile-nav-menu.tsx): el activo se
  // marca con toda la fila rellena en el color primario, no con un borde.
  activeVariant?: "underline" | "solid";
};

export function NavLinks({ links, className, activeVariant = "underline" }: Props) {
  const pathname = usePathname();

  // El menú vertical (mobile) no tiene dónde desplegar un popover: ahí los
  // grupos se aplanan y sus hijos se listan como links comunes.
  const items: NavItem[] =
    activeVariant === "solid" ? links.flatMap((l) => (isGroup(l) ? l.children : [l])) : links;

  // Con rutas anidadas (ej. "/admin" y "/admin/finanzas"), el link padre
  // también matchea por prefijo cualquier hijo -- sin desempate, "Dashboard"
  // quedaba marcado activo en todas las subpáginas del panel admin. Gana
  // el match más específico (el prefijo más largo), no el primero. Un grupo
  // compite con el mejor match de sus hijos.
  function matchLength(link: NavLink): number {
    const prefixes = link.matchPrefixes ?? [link.href];
    const matching = prefixes.filter(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    return matching.length > 0 ? Math.max(...matching.map((p) => p.length)) : -1;
  }

  function itemMatchLength(item: NavItem): number {
    return isGroup(item) ? Math.max(-1, ...item.children.map(matchLength)) : matchLength(item);
  }

  const bestMatch = Math.max(...items.map(itemMatchLength));
  const isActive = (item: NavItem) => bestMatch >= 0 && itemMatchLength(item) === bestMatch;

  return (
    <nav
      className={cn(
        "hidden items-center gap-5 text-sm font-medium text-muted-foreground sm:flex",
        className
      )}
    >
      {items.map((item) => {
        if (isGroup(item)) {
          return (
            <NavGroupMenu
              key={item.label}
              group={item}
              active={isActive(item)}
              isChildActive={(child) => bestMatch >= 0 && matchLength(child) === bestMatch}
            />
          );
        }
        const active = isActive(item);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
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
            {item.label}
            <CountBadge count={item.badge} inverted={active && activeVariant === "solid"} />
          </Link>
        );
      })}
    </nav>
  );
}

function NavGroupMenu({
  group,
  active,
  isChildActive,
}: {
  group: NavGroup;
  active: boolean;
  isChildActive: (child: NavLink) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[group.icon];
  const total = group.children.reduce((sum, c) => sum + (c.badge ?? 0), 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent py-1 transition-colors hover:text-foreground aria-expanded:text-foreground",
          active && "border-primary text-foreground"
        )}
      >
        <Icon className="size-4" />
        {group.label}
        <CountBadge count={total} />
        <ChevronDown
          className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-0.5 p-1.5">
        {group.children.map((child) => {
          const ChildIcon = ICONS[child.icon];
          const childActive = isChildActive(child);
          return (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted",
                childActive && "bg-muted font-medium"
              )}
            >
              <ChildIcon className="size-4 text-muted-foreground" />
              <span className="flex-1">{child.label}</span>
              <CountBadge count={child.badge} />
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
