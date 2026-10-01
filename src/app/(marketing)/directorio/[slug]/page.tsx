import { notFound } from "next/navigation";
import { Building2, MapPin, Phone } from "lucide-react";
import { getDoctorPublicoPorSlug } from "@/lib/directorio";
import { PublicBookingCalendar } from "@/components/marketing/public-booking-calendar";
import {
  ContactField,
  LugarCard,
  PerfilHero,
} from "@/components/marketing/perfil-publico-partes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lugar?: string }>;
};

export default async function PerfilPublicoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lugar: lugarDestacado } = await searchParams;
  const doctor = await getDoctorPublicoPorSlug(slug);
  if (!doctor) notFound();

  const todos = doctor.lugaresDeTrabajo;
  // Qué lugares se muestran: con perfil público, los que el médico dejó
  // visibles; si solo compartió su agenda (sin perfil), los que tienen
  // reservas online. Y el calendario solo ofrece lugares con reservas
  // habilitadas (el server filtra igual los horarios, ver public-booking.ts).
  const lugaresVisibles = todos.filter((l) =>
    doctor.perfilPublico ? l.perfilVisible : l.reservaPublicaHabilitada
  );
  const lugaresReservables = doctor.reservaPublicaHabilitada
    ? todos.filter((l) => l.reservaPublicaHabilitada)
    : [];
  if (todos.length > 0 && lugaresVisibles.length === 0 && lugaresReservables.length === 0) {
    notFound();
  }

  // La ciudad del perfil es un dato legado (ya no se edita en Mi perfil): se
  // complementa con las ciudades de cada práctica visible, y solo se usa si
  // no hay ningún lugar oculto (podría ser la de ese lugar).
  // Si atiende en varias ciudades se listan todas (sin repetir).
  const ciudades = [
    ...new Set(
      [
        lugaresVisibles.length === todos.length ? doctor.ciudad : null,
        ...lugaresVisibles.map((l) => l.ciudad),
      ].filter((c): c is string => !!c)
    ),
  ];
  const ciudad = ciudades.join(" · ");

  return (
    <>
      <PerfilHero doctor={doctor} ciudad={ciudad} />

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pt-4 pb-12">
        {doctor.perfilPublico && doctor.biografia && (
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="font-heading text-sm font-bold">Sobre mí</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {doctor.biografia}
            </p>
          </div>
        )}

        {/* Un médico puede atender en más de un lugar (potencialmente en
            ciudades distintas) -- cada uno tiene su propia dirección y
            teléfono, así que va en su propia tarjeta en vez de mezclarse en
            un solo bloque de "información de contacto" (eso hacía parecer
            que el médico atiende en un único lugar). */}
        {lugaresVisibles.length > 0 ? (
          <div>
            <h2 className="font-heading mb-3 text-sm font-bold">Dónde atiende</h2>
            <div className="flex flex-col gap-3">
              {lugaresVisibles.map((lugar) => (
                <LugarCard key={lugar.id} lugar={lugar} />
              ))}
            </div>
          </div>
        ) : (
          todos.length === 0 &&
          (doctor.nombreConsultorio || doctor.direccion || doctor.telefono) && (
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h2 className="font-heading mb-3 text-sm font-bold">Información de contacto</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {doctor.direccion && (
                  <ContactField
                    icon={MapPin}
                    label="Dirección"
                    value={doctor.direccion}
                    className="col-span-2"
                  />
                )}
                {doctor.nombreConsultorio && (
                  <ContactField icon={Building2} label="Consultorio" value={doctor.nombreConsultorio} />
                )}
                {doctor.telefono && (
                  <ContactField icon={Phone} label="Teléfono" value={doctor.telefono} />
                )}
              </div>
            </div>
          )
        )}

        {doctor.reservaPublicaHabilitada && doctor.publicSlug && lugaresReservables.length > 0 && (
          <PublicBookingCalendar
            slug={doctor.publicSlug}
            lugares={lugaresReservables}
            lugarDestacado={lugarDestacado}
            lugaresSinReserva={lugaresVisibles
              .filter((l) => !lugaresReservables.some((r) => r.id === l.id))
              .map((l) => l.nombre ?? "Consulta particular")}
          />
        )}
      </div>
    </>
  );
}
