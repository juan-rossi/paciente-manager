"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

type Props = {
  nombreConTitulo: string;
  iniciales: string;
  fotoPerfilBase64: string | null;
  configHref?: string;
  adminHref?: string;
  className?: string;
};

export function UserChip({
  nombreConTitulo,
  iniciales,
  fotoPerfilBase64,
  configHref,
  adminHref,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-2 rounded-full border border-border py-1 pr-2.5 pl-1 text-sm font-medium text-foreground transition-colors hover:bg-muted aria-expanded:bg-muted",
          className
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {fotoPerfilBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoPerfilBase64} alt="" className="size-full object-cover" />
          ) : (
            iniciales
          )}
        </span>
        <span className="max-w-40 truncate">{nombreConTitulo}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1.5">
        {(configHref || adminHref) && (
          <>
            {configHref && (
              <Link
                href={configHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Settings className="size-4 text-muted-foreground" />
                Configuración
              </Link>
            )}
            {adminHref && (
              <Link
                href={adminHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <LayoutDashboard className="size-4 text-muted-foreground" />
                Panel Admin
              </Link>
            )}
            <div className="h-px bg-border" />
          </>
        )}
        <LogoutButton variant="menu-item" />
      </PopoverContent>
    </Popover>
  );
}
