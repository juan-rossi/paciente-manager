import { cookies } from "next/headers";
import { Building2, Database, Mic, MessageSquare, Sparkles, User, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfiguracionTabs } from "@/components/configuracion-tabs";
import {
  CONFIGURACION_TAB_COOKIE,
  DEFAULT_CONFIGURACION_TAB,
  esConfiguracionTab,
} from "@/lib/configuracion-tabs";
import { MiPracticaSettings } from "@/components/mi-practica-settings";
import { SecretaryUsers } from "@/components/secretary-users";
import { MessagingSettings } from "@/components/messaging-settings";
import { TranscriberSettings } from "@/components/transcriber-settings";
import { PlanSettings } from "@/components/plan-settings";
import { ExportSettings } from "@/components/export-settings";
import { MiPerfilSettings } from "@/components/mi-perfil-settings";
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

  const cookieStore = await cookies();
  const tabGuardada = cookieStore.get(CONFIGURACION_TAB_COOKIE)?.value;
  const initialTab = esConfiguracionTab(tabGuardada) ? tabGuardada : DEFAULT_CONFIGURACION_TAB;

  const [blocks, secretarias, lugares] = await Promise.all([
    prisma.workScheduleBlock.findMany({
      where: { userId: user.id },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "SECRETARY", secretariaAsignaciones: { some: { doctorId: user.id } } },
      select: {
        id: true,
        email: true,
        nombre: true,
        createdAt: true,
        secretariaAsignaciones: {
          where: { doctorId: user.id },
          select: { lugares: { select: { lugarId: true } }, puedeBloquearHorarios: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lugarDeTrabajo.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const initialSecretarias = secretarias.map(({ secretariaAsignaciones, ...s }) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    lugarIds: secretariaAsignaciones[0]?.lugares.map((l) => l.lugarId) ?? [],
    puedeBloquearHorarios: secretariaAsignaciones[0]?.puedeBloquearHorarios ?? false,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Configuración</h1>

      <ConfiguracionTabs
        initialTab={initialTab}
        orientation="vertical"
        className="flex-col items-stretch gap-6 md:flex-row md:items-start"
      >
        <TabsList className="w-full shrink-0 items-stretch gap-0.5 rounded-xl border border-border/60 bg-card p-2 md:w-56">
          <div className={groupLabelClass}>Consultorio</div>
          <TabsTrigger value="practica" className={navItemClass}>
            <Building2 className="size-4" />
            Mi práctica
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
          <TabsTrigger value="perfil" className={navItemClass}>
            <User className="size-4" />
            Mi perfil
          </TabsTrigger>
          <TabsTrigger value="plan" className={navItemClass}>
            <Sparkles className="size-4" />
            Mi plan
          </TabsTrigger>
          <TabsTrigger value="datos" className={navItemClass}>
            <Database className="size-4" />
            Mis datos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practica" className="w-full">
          <MiPracticaSettings
            initialLugares={lugares}
            initialBlocks={blocks}
            initialSlotDurationMinutes={user.slotDurationMinutes}
            initialSobreturnosHabilitados={user.sobreturnosHabilitados}
          />
        </TabsContent>
        <TabsContent value="usuarios" className="w-full">
          <SecretaryUsers initialSecretarias={initialSecretarias} lugares={lugares} />
        </TabsContent>
        <TabsContent value="mensajeria" className="w-full">
          <MessagingSettings
            initialMensajeTemplate={user.mensajeTemplate}
            initialMensajeriaHabilitada={user.mensajeriaHabilitada}
          />
        </TabsContent>
        <TabsContent value="transcriptor" className="w-full">
          <TranscriberSettings />
        </TabsContent>
        <TabsContent value="perfil" className="w-full">
          <MiPerfilSettings
            email={user.email}
            initialFotoPerfilBase64={user.fotoPerfilBase64}
            initialTituloCortesia={user.tituloCortesia}
            initialNombre={user.nombre}
            initialApellido={user.apellido}
            initialEspecialidad={user.especialidad}
            initialNroMatricula={user.nroMatricula}
            initialPerfilPublico={user.perfilPublico}
            initialAtencionTipo={user.atencionTipo}
            initialNombreConsultorio={user.nombreConsultorio}
            initialTelefono={user.telefono}
            initialDireccion={user.direccion}
            initialCiudad={user.ciudad}
            initialLatitud={user.latitud}
            initialLongitud={user.longitud}
            initialBiografia={user.biografia}
            initialReservaPublicaHabilitada={user.reservaPublicaHabilitada}
            initialPublicSlug={user.publicSlug}
          />
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
      </ConfiguracionTabs>
    </div>
  );
}
