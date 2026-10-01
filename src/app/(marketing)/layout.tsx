import Link from "next/link";
import { Semio360Mark } from "@/components/brand/logo";
import { SiteHeader } from "@/components/marketing/site-header";

// Mismas secciones que el header; solo existen en el home, de ahí el `/#id`.
const FOOTER_PRODUCT_LINKS = [
  { href: "/#producto", label: "Producto" },
  { href: "/#planes", label: "Planes" },
  { href: "/#faq", label: "Preguntas frecuentes" },
  { href: "/directorio", label: "Directorio" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#d9dee9] bg-[#eef1f7] text-sm text-[#566078]">
        <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 px-5 py-14 sm:grid-cols-[2fr_1fr_1fr] sm:px-4 sm:py-12">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 font-semibold text-[#1b2233]">
              <Semio360Mark className="size-5" />
              Semio360
            </div>
            <p className="max-w-xs leading-relaxed">Gestión médica, simplificada.</p>
          </div>

          <nav aria-label="Explorar" className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1b2233]">Explorar</h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-medium text-[#4f46e5] hover:text-[#3730a3]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Contacto" className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1b2233]">Contacto</h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/terminos" className="font-medium text-[#4f46e5] hover:text-[#3730a3]">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <a href="mailto:contacto@semio360.com" className="break-all font-medium text-[#4f46e5] hover:text-[#3730a3]">
                  contacto@semio360.com
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-[#d9dee9]">
          <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-5 py-6 text-xs sm:flex-row sm:gap-4 sm:px-4">
            <span>© {new Date().getFullYear()} Semio360</span>
            <span className="hidden sm:inline">·</span>
            <span>semio360.com · semio360.com.ar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
