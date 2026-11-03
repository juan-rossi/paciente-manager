"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin/finanzas", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/finanzas/gastos", label: "Gastos", icon: Wallet },
  { href: "/admin/finanzas/costos-ia", label: "Costos IA", icon: Sparkles },
];

// Vertical en desktop; en mobile pasa a una fila scrolleable arriba del
// contenido para no comerse el ancho de la pantalla.
export function FinanzasNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Finanzas"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 pb-3 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:self-start lg:border-b-0 lg:px-0 lg:pb-0"
    >
      <p className="mb-2 hidden px-3 font-heading text-base font-semibold lg:block">Finanzas</p>
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
