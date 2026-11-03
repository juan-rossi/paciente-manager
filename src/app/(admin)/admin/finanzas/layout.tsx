import { FinanzasNav } from "@/components/admin/finanzas-nav";

export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
      <FinanzasNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
