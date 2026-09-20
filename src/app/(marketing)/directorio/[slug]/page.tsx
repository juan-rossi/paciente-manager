import { notFound } from "next/navigation";
import { Building2, MapPin, Phone } from "lucide-react";
import { getDoctorPublicoPorSlug } from "@/lib/directorio";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import { formatNombreConTitulo } from "@/lib/titulo-cortesia";
import { PublicBookingCalendar } from "@/components/marketing/public-booking-calendar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function ContactField({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">{label}</span>
        <span className="text-[13.5px] font-medium">{value}</span>
      </div>
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

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-12">
        {(doctor.biografia || doctor.nombreConsultorio || doctor.direccion || doctor.telefono) && (
          <div className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-6">
            {doctor.biografia && (
              <div>
                <h2 className="font-heading text-sm font-bold">Sobre mí</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {doctor.biografia}
                </p>
              </div>
            )}

            {doctor.biografia && (doctor.nombreConsultorio || doctor.direccion || doctor.telefono) && (
              <div className="h-px bg-border" />
            )}

            {(doctor.nombreConsultorio || doctor.direccion || doctor.telefono) && (
              <div>
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
            )}
          </div>
        )}

        {doctor.reservaPublicaHabilitada && doctor.publicSlug && (
          <PublicBookingCalendar slug={doctor.publicSlug} />
        )}
      </div>
    </>
  );
}
