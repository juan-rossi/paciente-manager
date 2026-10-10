import { RecuperarForm } from "./recuperar-form";

type Props = { searchParams: Promise<{ email?: string }> };

export default async function RecuperarPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent)",
        }}
      />
      <RecuperarForm emailInicial={typeof email === "string" ? email : ""} />
    </div>
  );
}
