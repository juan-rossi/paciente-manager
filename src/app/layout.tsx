import type { Metadata } from "next";
import { Geist_Mono, Inter, Sora } from "next/font/google";
import { AuthSessionProvider } from "@/components/session-provider";
import { esProduccion, getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

// Solo para texto tabular (DNI, teléfonos) -- no es parte de la identidad de
// marca, así que se mantiene sin cambios pese al rebranding.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: "Semio360",
  // QA y previews nunca se indexan (ver también robots.ts).
  ...(esProduccion() ? {} : { robots: { index: false, follow: false } }),
  title: {
    default: "Semio360",
    template: "%s · Semio360",
  },
  description: "Tu consultorio, en órbita. Turnos, historia clínica y evolución en un solo lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
