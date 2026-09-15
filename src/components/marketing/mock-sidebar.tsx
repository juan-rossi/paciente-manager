import { CalendarDays, MessageCircle, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { icon: Users, label: "Pacientes", active: false },
  { icon: CalendarDays, label: "Turnos", active: true },
  { icon: MessageCircle, label: "Recordatorios", active: false },
  { icon: Settings, label: "Configuración", active: false },
];

export function MockSidebar({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-36 shrink-0 flex-col gap-1 border-r border-border/60 bg-muted/20 p-3", className)}>
      {ITEMS.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium",
            item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          )}
        >
          <item.icon className="size-3.5" />
          {item.label}
        </div>
      ))}
    </div>
  );
}
