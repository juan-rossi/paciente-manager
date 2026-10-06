import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, MapPin, Phone } from "lucide-react";
import { getDoctorPublicoPorSlug } from "@/lib/directorio";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import { descripcionPerfil, nombreDoctor, perfilJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { PublicBookingCalendar } from "@/components/marketing/public-booking-calendar";
import {
  ContactField,
  LugarCard,
  PerfilShell,
} from "@/components/marketing/perfil-publico-partes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lugar?: string }>;
};

type DoctorPerfil = NonNullable<Awaited<ReturnType<typeof getDoctorPublicoPorSlug>>>;

// Qué lugares se muestran: con perfil público, los que el médico dejó
// visibles; si solo compartió su agenda (sin perfil), los que tienen
// reservas online. Y el calendario solo ofrece lugares con reservas
// habilitadas (el server filtra igual los horarios, ver public-booking.ts).
function datosPerfil(doctor: DoctorPerfil) {
  const todos = doctor.lugaresDeTrabajo;
  const lugaresVisibles = todos.filter((l) =>
    doctor.perfilPublico ? l.perfilVisible : l.reservaPublicaHabilitada
  );
  const lugaresReservables = doctor.reservaPublicaHabilitada
    ? todos.filter((l) => l.reservaPublicaHabilitada)
    : [];
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
  const prepagas = doctor.perfilPublico
    ? doctor.prepagas.map(({ prepaga }) =>
        prepaga.nombreCompleto && prepaga.nombreCompleto !== prepaga.nombre
          ? `${prepaga.nombre} (${prepaga.nombreCompleto})`
          : prepaga.nombre
      )
    : [];
  return { todos, lugaresVisibles, lugaresReservables, ciudad: ciudades.join(" · "), prepagas };
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const doctor = await getDoctorPublicoPorSlug(slug);
  if (!doctor) return {};

  const nombre = nombreDoctor(doctor);
  const { ciudad, prepagas, lugaresReservables } = datosPerfil(doctor);
  const esp = doctor.especialidad ? ESPECIALIDAD_LABELS[doctor.especialidad] : null;
  const title = `${nombre}${esp ? ` – ${esp}` : ""}${ciudad ? ` en ${ciudad}` : ""}`;
  const description = descripcionPerfil({
    ...doctor,
    ciudad,
    prepagas,
    biografia: doctor.perfilPublico ? doctor.biografia : null,
    reservaOnline: doctor.reservaPublicaHabilitada && lugaresReservables.length > 0,
  });
  const path = `/directorio/${encodeURIComponent(slug)}`;
  // La imagen la aporta `opengraph-image.tsx` (foto del médico o tarjeta con
  // su nombre y especialidad), así que acá no se pasa `images`.
  return {
    title,
    description,
    alternates: { canonical: path },
    // Un médico que solo compartió su agenda (sin perfil público) no se indexa.
    ...(doctor.perfilPublico ? {} : { robots: { index: false, follow: false } }),
    openGraph: { title, description, url: path, siteName: "Semio360", locale: "es_AR", type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PerfilPublicoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lugar: lugarDestacado } = await searchParams;
  const doctor = await getDoctorPublicoPorSlug(slug);
  if (!doctor) notFound();

  const { todos, lugaresVisibles, lugaresReservables, ciudad, prepagas } = datosPerfil(doctor);
  if (todos.length > 0 && lugaresVisibles.length === 0 && lugaresReservables.length === 0) {
    notFound();
  }

  // Los lugares con reserva online se muestran dentro del calendario (una
  // sola vez: pestaña + dirección + teléfono). Acá quedan solo los que el
  // paciente no puede reservar, o todos si no hay calendario.
  const hayCalendario =
    doctor.reservaPublicaHabilitada && !!doctor.publicSlug && lugaresReservables.length > 0;
  const lugaresSueltos = hayCalendario
    ? lugaresVisibles.filter((l) => !lugaresReservables.some((r) => r.id === l.id))
    : lugaresVisibles;

  const jsonLd = doctor.perfilPublico
    ? perfilJsonLd({
        slug,
        nombre: nombreDoctor(doctor),
        especialidad: doctor.especialidad,
        descripcion: descripcionPerfil({
          ...doctor,
          ciudad,
          prepagas,
          biografia: doctor.biografia,
          reservaOnline: hayCalendario,
        }),
        fotoUrl: doctor.fotoUrl,
        prepagas,
        lugares: lugaresVisibles,
      })
    : null;

  return (
    <>
    {jsonLd && <JsonLd data={jsonLd} />}
    <PerfilShell
      doctor={doctor}
      ciudad={ciudad}
      biografia={doctor.perfilPublico ? doctor.biografia : null}
      prepagas={prepagas}
      apilado={!hayCalendario}
    >
      {hayCalendario && (
        <PublicBookingCalendar
          slug={doctor.publicSlug!}
          lugares={lugaresReservables}
          lugarDestacado={lugarDestacado}
          prepagas={doctor.prepagas.map(({ prepaga }) => prepaga.nombre)}
        />
      )}

      {lugaresSueltos.length > 0 ? (
        <div>
          <h2 className="font-heading mb-3 text-sm font-bold">
            {hayCalendario ? "Otros lugares de atención" : "Dónde atiende"}
          </h2>
          {hayCalendario && (
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">Sin turnos online.</p>
          )}
          <div className="flex flex-col gap-3">
            {lugaresSueltos.map((lugar) => (
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
                  mapQuery={doctor.direccion}
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
    </PerfilShell>
    </>
  );
}
