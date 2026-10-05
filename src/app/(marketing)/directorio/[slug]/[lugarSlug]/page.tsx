import Link from "next/link";
import { notFound } from "next/navigation";
import { getDoctorPublicoPorSlug } from "@/lib/directorio";
import { PublicBookingCalendar } from "@/components/marketing/public-booking-calendar";
import { LugarCard, PerfilHero } from "@/components/marketing/perfil-publico-partes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; lugarSlug: string }> };

// Agenda de un lugar de atención puntual: el link que el médico le pasa a un
// paciente para que reserve ahí y no en otro lugar. Solo ofrece horarios de
// este lugar (el server filtra igual, ver public-booking.ts).
export default async function AgendaLugarPage({ params }: Props) {
  const { slug, lugarSlug } = await params;
  const doctor = await getDoctorPublicoPorSlug(slug);
  if (!doctor) notFound();

  const lugar = doctor.lugaresDeTrabajo.find((l) => l.publicSlug === lugarSlug);
  if (!lugar) notFound();

  const disponible = doctor.reservaPublicaHabilitada && lugar.reservaPublicaHabilitada && !!doctor.publicSlug;
  // Si el médico apagó este lugar después de compartir el link, el paciente
  // no ve un error: le explicamos y le mostramos dónde sí puede reservar.
  const alternativos = doctor.reservaPublicaHabilitada
    ? doctor.lugaresDeTrabajo.filter((l) => l.reservaPublicaHabilitada && !!l.publicSlug && l.id !== lugar.id)
    : [];

  return (
    <>
      <PerfilHero doctor={doctor} ciudad={lugar.ciudad ?? ""} />

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pt-4 pb-12">
        <LugarCard lugar={lugar} />

        {disponible ? (
          <PublicBookingCalendar slug={doctor.publicSlug!} lugares={[lugar]}
            prepagas={doctor.prepagas.map(({ prepaga }) => prepaga.nombre)}
          />
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="font-heading text-sm font-bold">
              Este lugar no tiene turnos online por ahora
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Para reservar en {lugar.nombre ?? "este lugar"}, contactá directamente al consultorio.
            </p>
            {alternativos.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-[13px] font-semibold">Podés reservar en:</span>
                {alternativos.map((alt) => (
                  <Link
                    key={alt.id}
                    href={`/directorio/${doctor.publicSlug}/${alt.publicSlug}`}
                    className="flex flex-col rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="text-[13.5px] font-bold">{alt.nombre ?? "Consulta particular"}</span>
                    <span className="text-xs text-muted-foreground">{alt.direccion}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
