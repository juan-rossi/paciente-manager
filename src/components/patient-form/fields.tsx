import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type FormSectionProps = {
  title: string;
  children: ReactNode;
};

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="border-b border-border pb-1.5 text-sm font-semibold text-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

type NumericMode = "digits" | "phone";

function filterNumeric(value: string, mode: NumericMode) {
  // "phone" preserva un único "+" inicial (prefijo internacional); el resto son solo dígitos.
  return mode === "phone" ? value.replace(/(?!^\+)[^\d]/g, "") : value.replace(/\D/g, "");
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  helpText?: string;
  required?: boolean;
  invalid?: boolean;
  numeric?: NumericMode;
};

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  helpText,
  required,
  invalid,
  numeric,
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{required ? `${label} *` : label}</Label>
      <Input
        type={type}
        inputMode={numeric === "phone" ? "tel" : numeric === "digits" ? "numeric" : undefined}
        value={value}
        onChange={(e) => onChange(numeric ? filterNumeric(e.target.value, numeric) : e.target.value)}
        className={invalid ? "border-destructive" : undefined}
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  rows?: number;
};

export function TextAreaField({
  label,
  value,
  onChange,
  helpText,
  rows = 4,
}: TextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
