"use client";

import { useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type TemplateVariable = {
  token: string;
  description: ReactNode;
  // Los links se muestran resaltados y separados de los datos de texto.
  link?: boolean;
};

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  variables: TemplateVariable[];
  disabled?: boolean;
  children?: ReactNode;
};

export function TemplateEditor({ id, label, value, onChange, variables, disabled, children }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activa, setActiva] = useState<TemplateVariable | null>(null);
  const datos = variables.filter((v) => !v.link);
  const links = variables.filter((v) => v.link);

  function insertar(token: string) {
    const ta = textareaRef.current;
    const inicio = ta?.selectionStart ?? value.length;
    const fin = ta?.selectionEnd ?? inicio;
    onChange(value.slice(0, inicio) + token + value.slice(fin));
    // Reposiciona el cursor después del token una vez que React aplicó el valor.
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(inicio + token.length, inicio + token.length);
    });
  }

  function chip(v: TemplateVariable) {
    return (
      <button
        key={v.token}
        type="button"
        disabled={disabled}
        // Evita que el textarea pierda la selección antes del click.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => insertar(v.token)}
        onMouseEnter={() => setActiva(v)}
        onFocus={() => setActiva(v)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none",
          v.link
            ? "border-transparent bg-primary/10 text-primary hover:bg-primary/15"
            : "border-border bg-background text-foreground hover:border-primary hover:text-primary"
        )}
      >
        <Plus className="size-3 opacity-60" />
        {v.token}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs text-muted-foreground">Insertar:</span>
        {datos.map(chip)}
        {datos.length > 0 && links.length > 0 && (
          <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        )}
        {links.map(chip)}
      </div>
      <Textarea
        id={id}
        ref={textareaRef}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <div
        aria-live="polite"
        className="min-h-10 rounded-md bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
      >
        {activa ? (
          <>
            <code className="text-primary">{activa.token}</code> — {activa.description}
          </>
        ) : (
          "Pasá el mouse por una variable para ver qué significa. Hacé clic para insertarla donde está el cursor."
        )}
      </div>
      {children}
    </div>
  );
}
