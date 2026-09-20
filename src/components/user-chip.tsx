"use client";

import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

type Props = {
  nombreConTitulo: string;
  iniciales: string;
  fotoPerfilBase64: string | null;
  className?: string;
};

export function UserChip({ nombreConTitulo, iniciales, fotoPerfilBase64, className }: Props) {
  return (
    <Popover>
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
      <PopoverContent align="end" className="w-auto min-w-fit p-1.5">
        <LogoutButton />
      </PopoverContent>
    </Popover>
  );
}
