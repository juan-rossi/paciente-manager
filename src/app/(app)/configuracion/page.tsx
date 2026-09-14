import { CalendarDays, Database, Mic, MessageSquare, Sparkles, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleSettings } from "@/components/schedule-settings";
import { SecretaryUsers } from "@/components/secretary-users";
import { MessagingSettings } from "@/components/messaging-settings";
import { TranscriberSettings } from "@/components/transcriber-settings";
import { PlanSettings } from "@/components/plan-settings";
import { ExportSettings } from "@/components/export-settings";
import { diasRestantesDeTrial } from "@/lib/plan";

export const dynamic = "force-dynamic";

// Sidebar (no la pill horizontal default de TabsTrigger): plano, alineado a
// la izquierda, con un acento de color a la izquierda cuando está activo.
const navItemClass =
  "w-full justify-start gap-2.5 rounded-lg border-0 border-l-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground data-active:border-l-primary data-active:bg-primary/10 data-active:text-primary data-active:hover:bg-primary/10 data-active:hover:text-primary";

const groupLabelClass =
  "px-3 pt-3 pb-1.5 text-[10px] font-bold tracking-wide text-muted-foreground/75 uppercase first:pt-1";

export default async function ConfiguracionPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [blocks, secretarias] = await Promise.all([
    prisma.workScheduleBlock.findMany({
      where: { userId: user.id },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "SECRETARY", doctorId: user.id },
      select: { id: true, email: true, nombre: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const initialSecretarias = secretarias.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Configuración</h1>

      <Tabs
        defaultValue="horario"
        orientation="vertical"
        className="flex-col items-stretch gap-6 md:flex-row md:items-start"
      >
        <TabsList className="w-full shrink-0 items-stretch gap-0.5 rounded-xl border border-border/60 bg-card p-2 md:w-56">
          <div className={groupLabelClass}>Consultorio</div>
          <TabsTrigger value="horario" className={navItemClass}>
            <CalendarDays className="size-4" />
            Horario de trabajo
          </TabsTrigger>
          <TabsTrigger value="usuarios" className={navItemClass}>
            <Users className="size-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="mensajeria" className={navItemClass}>
            <MessageSquare className="size-4" />
            Mensajería
          </TabsTrigger>
          <TabsTrigger value="transcriptor" className={navItemClass}>
            <Mic className="size-4" />
            Transcriptor
          </TabsTrigger>

          <div className={groupLabelClass}>Cuenta</div>
          <TabsTrigger value="plan" className={navItemClass}>
            <Sparkles className="size-4" />
            Mi plan
          </TabsTrigger>
          <TabsTrigger value="datos" className={navItemClass}>
            <Database className="size-4" />
            Mis datos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="horario" className="w-full">
          <ScheduleSettings
            initialBlocks={blocks}
            initialSlotDurationMinutes={user.slotDurationMinutes}
          />
        </TabsContent>
        <TabsContent value="usuarios" className="w-full">
          <SecretaryUsers initialSecretarias={initialSecretarias} />
        </TabsContent>
        <TabsContent value="mensajeria" className="w-full">
          <MessagingSettings
            initialMensajeTemplate={user.mensajeTemplate}
            initialRecordatorioDiasAdelanto={user.recordatorioDiasAdelanto}
          />
        </TabsContent>
        <TabsContent value="transcriptor" className="w-full">
          <TranscriberSettings />
        </TabsContent>
        <TabsContent value="plan" className="w-full">
          <PlanSettings
            plan={user.plan}
            trialEndsAt={user.trialEndsAt?.toISOString() ?? null}
            diasRestantesDeTrial={diasRestantesDeTrial(user)}
          />
        </TabsContent>
        <TabsContent value="datos" className="w-full">
          <ExportSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
