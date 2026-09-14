"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NavLinks } from "@/components/nav-links";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: "Users" | "CalendarDays" | "MessageCircle" | "Settings";
  matchPrefixes?: string[];
};

type Props = {
  navLinks: NavLink[];
  configLink: NavLink[];
  userName?: string;
};

// Solo se muestra en mobile (el trigger es `sm:hidden`) -- en desktop, los
// links y el botón de logout ya se ven siempre en el header, así que este
// menú sería redundante.
export function MobileNavMenu({ navLinks, configLink, userName }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // El layout (y este menú) no se remonta al navegar entre páginas de la
  // app -- sin esto, el menú se quedaba abierto después de tocar un link.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Abrir menú"
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "sm:hidden")}
      >
        <Menu className="size-4.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="flex flex-col gap-1">
          {userName && (
            <p className="mb-1 border-b border-border px-2 pb-2 text-sm font-medium text-foreground">
              {userName}
            </p>
          )}
          <NavLinks
            links={navLinks}
            activeVariant="solid"
            className="flex w-full flex-col items-stretch gap-1"
          />
          {configLink.length > 0 && (
            <NavLinks
              links={configLink}
              activeVariant="solid"
              className="flex w-full flex-col items-stretch gap-1 border-t border-border pt-1"
            />
          )}
          <div className="mt-1 border-t border-border pt-2">
            <LogoutButton />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
