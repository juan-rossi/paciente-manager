"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const ESTADOS = [
  { value: "", label: "Estado: todos" },
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];
const PLANES = [
  { value: "", label: "Plan: todos" },
  { value: "TRIAL", label: "Trial" },
  { value: "BASICA", label: "Básico" },
  { value: "PREMIUM", label: "Premium" },
];
const VENCIMIENTOS = [
  { value: "", label: "Vencimiento: todos" },
  { value: "7", label: "Vence en 7 días" },
  { value: "30", label: "Vence en 30 días" },
  { value: "VENCIDO", label: "Ya venció" },
];

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-white px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function MedicosFiltros({
  q,
  estado,
  plan,
  vencimiento,
}: {
  q: string;
  estado: string;
  plan: string;
  vencimiento: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          const value = (new FormData(e.currentTarget).get("q") as string) ?? "";
          setParam("q", value);
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Buscar por nombre o email" className="w-56 bg-white pl-8" />
      </form>
      <select value={estado} onChange={(e) => setParam("estado", e.target.value)} className={SELECT_CLASS}>
        {ESTADOS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select value={plan} onChange={(e) => setParam("plan", e.target.value)} className={SELECT_CLASS}>
        {PLANES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={vencimiento}
        onChange={(e) => setParam("vencimiento", e.target.value)}
        className={SELECT_CLASS}
      >
        {VENCIMIENTOS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
