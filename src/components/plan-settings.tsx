import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings-section";
import { PLAN_FEATURES } from "@/lib/plan";
import { TIME_ZONE } from "@/lib/timezone";

type Props = {
  plan: "BASICA" | "PREMIUM";
  trialEndsAt: string | null;
  diasRestantesDeTrial: number | null;
};

export function PlanSettings({ plan, trialEndsAt, diasRestantesDeTrial }: Props) {
  const enTrial = diasRestantesDeTrial !== null && diasRestantesDeTrial > 0;

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Tu plan actual"
        description="Podés cambiar de plan en cualquier momento."
        icon={Sparkles}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={plan === "PREMIUM" ? "default" : "secondary"} className="text-sm">
            {plan === "PREMIUM" ? "Premium" : "Básica"}
          </Badge>
          {enTrial && (
            <span className="text-sm text-muted-foreground">
              Período de prueba: quedan {diasRestantesDeTrial}{" "}
              {diasRestantesDeTrial === 1 ? "día" : "días"}
              {trialEndsAt &&
                ` (hasta el ${new Date(trialEndsAt).toLocaleDateString("es-AR", { timeZone: TIME_ZONE })})`}
              .
            </span>
          )}
        </div>
      </SettingsSection>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Básica</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {PLAN_FEATURES.BASICA.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Premium</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {PLAN_FEATURES.PREMIUM.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          {plan !== "PREMIUM" && (
            <Button
              type="button"
              className="mt-1 self-start"
              nativeButton={false}
              render={
                <a href="mailto:hola@semio360.com?subject=Quiero%20pasar%20a%20Premium" />
              }
            >
              Pasar a Premium
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
