import { Semio360Mark } from "@/components/brand/logo";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Semio360Mark className="size-5" />
            <span>Semio360 · Gestión médica, simplificada.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>semio360.com</span>
            <span>semio360.com.ar</span>
            <a href="mailto:hola@semio360.com" className="hover:text-foreground">
              hola@semio360.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
