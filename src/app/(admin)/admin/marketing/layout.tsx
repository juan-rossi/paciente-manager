import { MarketingTabs } from "@/components/admin/marketing-tabs";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-xl font-semibold">Marketing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Contenido para las redes sociales de Semio360.</p>
      </div>
      <MarketingTabs />
      {children}
    </div>
  );
}
