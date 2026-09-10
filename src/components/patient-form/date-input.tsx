"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { CalendarIcon } from "lucide-react";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
  id?: string;
};

// El valor que entra/sale siempre es ISO "YYYY-MM-DD" (lo que ya usa el resto
// de la app). Lo que cambia acá es la EDICIÓN: en vez de un <input type="date">
// nativo -- cuyo formato de tipeo (orden día/mes/año) depende del idioma del
// browser/SO, no de esta app, y puede reinterpretar los dígitos tipeados de
// forma inesperada -- este input siempre pide y muestra DD/MM/AAAA, sin
// importar la configuración regional de la máquina donde corra.
function isoToDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function digitsToDisplay(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
}

// Traduce "cuántos dígitos hay antes del cursor" a la posición del cursor en
// el string ya formateado con barras, para que tipear en el medio de una
// fecha ya completa no mande el cursor al final en cada tecla.
function digitIndexToCaret(digitIndex: number): number {
  if (digitIndex <= 2) return digitIndex;
  if (digitIndex <= 4) return digitIndex + 1;
  return digitIndex + 2;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function digitsToIso(digits: string): string | null {
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(month, year)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoToLocalDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function DateInput({ value, onChange, invalid, className, id }: DateInputProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const [pickerOpen, setPickerOpen] = useState(false);
  // DayPicker no navega solo al mes de `selected` -- si no se controla `month`
  // explícitamente, siempre abre mostrando el mes actual, sin importar qué
  // fecha ya esté cargada.
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => isoToLocalDate(value) ?? new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretRef = useRef<number | null>(null);

  // Si `value` cambia desde afuera (se cargó otro paciente, se reseteó el
  // formulario), resincronizamos el texto mostrado -- ajustado durante el
  // render, no en un efecto, para no arrastrar un render extra.
  if (value !== prevValue) {
    setPrevValue(value);
    setDisplay(isoToDisplay(value));
  }

  useLayoutEffect(() => {
    if (pendingCaretRef.current === null) return;
    inputRef.current?.setSelectionRange(pendingCaretRef.current, pendingCaretRef.current);
    pendingCaretRef.current = null;
  }, [display]);

  function handleTextChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const caretPos = e.target.selectionStart ?? raw.length;
    const digitsBeforeCaret = raw.slice(0, caretPos).replace(/\D/g, "").length;
    const digits = raw.replace(/\D/g, "").slice(0, 8);

    pendingCaretRef.current = digitIndexToCaret(Math.min(digitsBeforeCaret, digits.length));
    setDisplay(digitsToDisplay(digits));

    if (digits.length === 0) {
      onChange("");
      return;
    }
    if (digits.length === 8) {
      const iso = digitsToIso(digits);
      if (iso) onChange(iso);
    }
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Input
        ref={inputRef}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        value={display}
        onChange={handleTextChange}
        className={cn("pr-9", invalid ? "border-destructive" : undefined)}
      />
      <Popover
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (open) setCalendarMonth(isoToLocalDate(value) ?? new Date());
        }}
      >
        <PopoverTrigger
          type="button"
          aria-label="Elegir fecha en el calendario"
          className="absolute right-1.5 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <CalendarIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            locale={es}
            captionLayout="dropdown"
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selected={isoToLocalDate(value)}
            onSelect={(date) => {
              if (!date) return;
              const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              onChange(iso);
              setPickerOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
