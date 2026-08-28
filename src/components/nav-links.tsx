"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  matchPrefixes?: string[];
};

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground sm:flex">
      {links.map((link) => {
        const prefixes = link.matchPrefixes ?? [link.href];
        const active = prefixes.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
        );
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "hover:text-foreground",
              active && "font-semibold text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
