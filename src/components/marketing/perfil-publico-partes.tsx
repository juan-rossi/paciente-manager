import Link from "next/link";
import { Building2, ChevronRight, MapPin, Phone } from "lucide-react";
import { ESPECIALIDAD_LABELS, type Especialidad } from "@/lib/especialidad";
import { formatNombreConTitulo, type TituloCortesia } from "@/lib/titulo-cortesia";
import { cn } from "@/lib/utils";

// Piezas compartidas entre el perfil público del médico
// (/directorio/[slug]) y la agenda de un lugar puntual
// (/directorio/[slug]/[lugarSlug]).

export function ContactField({
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

export function LugarCard({
  lugar,
}: {
  lugar: { id: string; tipo: "PARTICULAR" | "CONSULTORIO"; nombre: string | null; direccion: string; telefono: string };
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2">
        <span
          className={
            lugar.tipo === "PARTICULAR"
              ? "rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground"
              : "rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary"
          }
        >
          {lugar.tipo === "PARTICULAR" ? "Particular" : "Consultorio"}
        </span>
        <span className="text-[13.5px] font-bold">{lugar.nombre ?? "Consulta particular"}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ContactField icon={MapPin} label="Dirección" value={lugar.direccion} />
        <ContactField icon={Phone} label="Teléfono" value={lugar.telefono} />
      </div>
    </div>
  );
}

export function PerfilHero({
  doctor,
  ciudad,
}: {
  doctor: {
    tituloCortesia: TituloCortesia | null;
    nombre: string;
    apellido: string;
    especialidad: Especialidad | null;
    fotoPerfilBase64: string | null;
  };
  ciudad: string;
}) {
  const nombreCompleto = formatNombreConTitulo(
    doctor.tituloCortesia,
    `${doctor.nombre} ${doctor.apellido}`.trim()
  );
  const iniciales = `${doctor.nombre.charAt(0)}${doctor.apellido.charAt(0)}`.toUpperCase();

  return (
    <section className="bg-gradient-to-b from-primary/[0.06] to-transparent">
      <nav
        aria-label="Ruta"
        className="mx-auto flex max-w-4xl flex-wrap items-center gap-1.5 px-4 pt-14 text-[13px] text-muted-foreground"
      >
        <Link href="/directorio" className="transition-colors hover:text-primary hover:underline">
          Directorio
        </Link>
        {doctor.especialidad && (
          <>
            <ChevronRight className="size-3.5 opacity-60" />
            <Link
              href={`/directorio?especialidad=${doctor.especialidad}`}
              className="transition-colors hover:text-primary hover:underline"
            >
              {ESPECIALIDAD_LABELS[doctor.especialidad]}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5 opacity-60" />
        <span aria-current="page" className="font-semibold text-foreground">
          {nombreCompleto}
        </span>
      </nav>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 pt-6 pb-8 text-center sm:flex-row sm:items-center sm:text-left">
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
            {ciudad && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {ciudad}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
