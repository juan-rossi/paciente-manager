import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ComponentType<LucideProps>;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <h3 className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground sm:px-5">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        {title}
      </h3>
      <div className="flex flex-col gap-3 bg-card p-4 sm:p-5">
        {description && (
          <p className="border-b border-dashed border-border pb-3 text-xs text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
