"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  // "button" es el botón outline de siempre (mobile-nav-menu.tsx). "menu-item"
  // es la fila con ícono para el menú del chip de usuario (user-chip.tsx).
  variant?: "button" | "menu-item";
};

export function LogoutButton({ variant = "button" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut({ redirectTo: "/login" });
    } finally {
      setLoading(false);
    }
  }

  if (variant === "menu-item") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10",
          loading && "opacity-60"
        )}
      >
        <LogOut className="size-4" />
        {loading ? "Saliendo..." : "Cerrar sesión"}
      </button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={loading}>
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </Button>
  );
}
