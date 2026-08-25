import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const DOCTOR_NAME = process.env.DOCTOR_NAME ?? "Dr. Juan Pablo Beligoy";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="size-4.5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">{DOCTOR_NAME}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
