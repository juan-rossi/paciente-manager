import { CalendarDays, MessageSquare, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleSettings } from "@/components/schedule-settings";
import { SecretaryUsers } from "@/components/secretary-users";
import { MessagingSettings } from "@/components/messaging-settings";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [blocks, secretarias] = await Promise.all([
    prisma.workScheduleBlock.findMany({
      where: { userId: user.id },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "SECRETARY" },
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

      <Tabs defaultValue="horario">
        <TabsList>
          <TabsTrigger value="horario">
            <CalendarDays className="size-4" />
            Horario de trabajo
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="size-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="mensajeria">
            <MessageSquare className="size-4" />
            Mensajería
          </TabsTrigger>
        </TabsList>

        <TabsContent value="horario" className="mt-2">
          <ScheduleSettings
            initialBlocks={blocks}
            initialSlotDurationMinutes={user.slotDurationMinutes}
          />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-2">
          <SecretaryUsers initialSecretarias={initialSecretarias} />
        </TabsContent>
        <TabsContent value="mensajeria" className="mt-2">
          <MessagingSettings
            initialMensajeTemplate={user.mensajeTemplate}
            initialRecordatorioDiasAdelanto={user.recordatorioDiasAdelanto}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
