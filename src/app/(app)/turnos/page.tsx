import { getCurrentUser } from "@/lib/session";
import { getDaySlots } from "@/lib/get-day-slots";
import { getTenantId, resolveActiveLugarId, resolvePuedeBloquearHorarios } from "@/lib/tenant";
import { formatDateParamBA } from "@/lib/timezone";
import { prisma } from "@/lib/prisma";
import { TurnosCalendar } from "@/components/turnos-calendar";
import { nombreDoctor } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function TurnosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tenantId = getTenantId(user);
  const activeLugarId = await resolveActiveLugarId(user);
  const puedeBloquearHorarios = await resolvePuedeBloquearHorarios(user);
  const today = new Date();
  const {
    slots,
    sobreturnos,
    sinConfigurar,
    diasConHorario,
    diasEspeciales,
    sobreturnosHabilitados,
    lugares,
    bloqueosDelDia,
  } = await getDaySlots(today, user.role, tenantId, activeLugarId);

  const prepagas = (
    await prisma.doctorPrepaga.findMany({
      where: { doctorId: tenantId },
      select: { prepaga: { select: { nombre: true } } },
      orderBy: { prepaga: { nombre: "asc" } },
    })
  ).map((d) => d.prepaga.nombre);

  // Link público de reserva para el botón "Compartir". La secretaria solo
  // comparte el de su lugar activo; el médico, el general.
  const doctorPublico = await prisma.user.findUnique({
    where: { id: tenantId },
    select: {
      publicSlug: true,
      reservaPublicaHabilitada: true,
      tituloCortesia: true,
      nombre: true,
      apellido: true,
    },
  });
  let compartir: { url: string; nombreMedico: string; lugarNombre: string | null } | null = null;
  if (doctorPublico?.publicSlug && doctorPublico.reservaPublicaHabilitada) {
    const nombreMedico = nombreDoctor(doctorPublico);
    if (activeLugarId) {
      const lugar = await prisma.lugarDeTrabajo.findFirst({
        where: { id: activeLugarId, userId: tenantId, deletedAt: null, reservaPublicaHabilitada: true },
        select: { publicSlug: true, nombre: true },
      });
      if (lugar?.publicSlug) {
        compartir = {
          url: absoluteUrl(`/directorio/${doctorPublico.publicSlug}/${lugar.publicSlug}`),
          nombreMedico,
          lugarNombre: lugar.nombre,
        };
      }
    } else {
      compartir = {
        url: absoluteUrl(`/directorio/${doctorPublico.publicSlug}`),
        nombreMedico,
        lugarNombre: null,
      };
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <TurnosCalendar
        role={user.role}
        tenantId={tenantId}
        activeLugarId={activeLugarId}
        puedeBloquearHorarios={puedeBloquearHorarios}
        initialDate={formatDateParamBA(today)}
        initialSlots={slots}
        initialSobreturnos={sobreturnos}
        initialSinConfigurar={sinConfigurar}
        initialDiasConHorario={diasConHorario}
        initialDiasEspeciales={diasEspeciales}
        initialSobreturnosHabilitados={sobreturnosHabilitados}
        initialLugares={lugares}
        initialBloqueosDelDia={bloqueosDelDia}
        prepagas={prepagas}
        compartir={compartir}
      />
    </div>
  );
}
