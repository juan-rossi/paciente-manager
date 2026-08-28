"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, MessageCircle, Settings, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { Users, CalendarDays, MessageCircle, Settings } satisfies Record<string, LucideIcon>;

type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  matchPrefixes?: string[];
};

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground sm:flex">
      {links.map((link) => {
        const prefixes = link.matchPrefixes ?? [link.href];
        const active = prefixes.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
        );
        const Icon = ICONS[link.icon];
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 border-b-2 border-transparent pb-1 transition-colors hover:text-foreground",
              active && "border-primary text-foreground"
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
