import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type FormSectionProps = {
  title: string;
  icon: ComponentType<LucideProps>;
  children: ReactNode;
  contentClassName?: string;
  headerClassName?: string;
  iconClassName?: string;
};

export function FormSection({
  title,
  icon: Icon,
  children,
  contentClassName,
  headerClassName,
  iconClassName,
}: FormSectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <h3
        className={cn(
          "flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground sm:px-5",
          headerClassName
        )}
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary",
            iconClassName
          )}
        >
          <Icon className="size-3.5" />
        </span>
        {title}
      </h3>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4",
          contentClassName
        )}
      >
        {children}
      </div>
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
  required?: boolean;
  invalid?: boolean;
};

export function TextAreaField({
  label,
  value,
  onChange,
  helpText,
  rows = 4,
  required,
  invalid,
}: TextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{required ? `${label} *` : label}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={invalid ? "border-destructive" : undefined}
      />
    </div>
  );
}
