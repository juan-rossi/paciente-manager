import { Suspense } from "react";
import { SignupForm } from "./signup-form";
import { CapturaOrigen } from "@/components/marketing/captura-origen";
import { MetaPixel } from "@/components/marketing/meta-pixel";

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <CapturaOrigen />
      <MetaPixel />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent)",
        }}
      />
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
