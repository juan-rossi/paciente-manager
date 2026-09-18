import { notFound } from "next/navigation";
import { Building2, CalendarDays, MapPin, Phone } from "lucide-react";
import { getDoctorPublicoPorSlug } from "@/lib/directorio";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import { formatNombreConTitulo } from "@/lib/titulo-cortesia";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function InfoRow({ icon: Icon, text }: { icon: typeof Building2; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      {text}
    </div>
  );
}

export default async function PerfilPublicoPage({ params }: Props) {
  const { slug } = await params;
  const doctor = await getDoctorPublicoPorSlug(slug);
  if (!doctor) notFound();

  const nombreCompleto = formatNombreConTitulo(
    doctor.tituloCortesia,
    `${doctor.nombre} ${doctor.apellido}`.trim()
  );
  const iniciales = `${doctor.nombre.charAt(0)}${doctor.apellido.charAt(0)}`.toUpperCase();

  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.06] to-transparent">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 py-14 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-primary/10 font-heading text-3xl font-bold text-primary shadow-lg shadow-primary/20">
            {doctor.fotoPerfilBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doctor.fotoPerfilBase64} alt="" className="size-full object-cover" />
            ) : (
              iniciales
            )}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
              {nombreCompleto}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {doctor.especialidad && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {ESPECIALIDAD_LABELS[doctor.especialidad]}
                </span>
              )}
              {doctor.ciudad && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {doctor.ciudad}
                </span>
              )}
              {doctor.atencionTipo && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="size-3.5" />
                  {doctor.atencionTipo === "CONSULTORIO" ? "Atiende en consultorio" : "Atención particular"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-12 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          {doctor.biografia && (
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h2 className="font-heading text-lg font-bold">Sobre mí</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {doctor.biografia}
              </p>
            </div>
          )}

          {(doctor.nombreConsultorio || doctor.direccion || doctor.telefono) && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-6">
              <h2 className="font-heading text-lg font-bold">Información de contacto</h2>
              {doctor.nombreConsultorio && <InfoRow icon={Building2} text={doctor.nombreConsultorio} />}
              {doctor.direccion && <InfoRow icon={MapPin} text={doctor.direccion} />}
              {doctor.telefono && <InfoRow icon={Phone} text={doctor.telefono} />}
            </div>
          )}
        </div>

        {doctor.reservaPublicaHabilitada && (
          <div className="w-full shrink-0 lg:w-72">
            <div className="flex flex-col gap-3 rounded-2xl border border-brand-accent/30 bg-brand-accent/5 p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-accent text-white">
                  <CalendarDays className="size-4.5" />
                </span>
                <span className="font-heading text-[15px] font-bold">Agenda online habilitada</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Este médico acepta reservas de turno directamente desde su perfil público, sin
                necesidad de contactarlo. La reserva online todavía no está disponible en esta
                pantalla.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
