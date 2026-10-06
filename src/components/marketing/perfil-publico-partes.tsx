import Link from "next/link";
import { Building2, ChevronRight, MapPin, Phone } from "lucide-react";
import { ESPECIALIDAD_LABELS, type Especialidad } from "@/lib/especialidad";
import { formatNombreConTitulo, type TituloCortesia } from "@/lib/titulo-cortesia";
import { cn } from "@/lib/utils";
import { BiografiaPerfil } from "./biografia-perfil";

// Piezas compartidas entre el perfil público del médico
// (/directorio/[slug]) y la agenda de un lugar puntual
// (/directorio/[slug]/[lugarSlug]).

export function ContactField({
  icon: Icon,
  label,
  value,
  className,
  mapQuery,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  className?: string;
  /** Si se pasa, agrega un link "Ver en mapa" que abre Google Maps en otra pestaña. */
  mapQuery?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">{label}</span>
        <span className="text-[13.5px] font-medium">{value}</span>
        {mapQuery && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Ver en mapa
          </a>
        )}
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
        <ContactField icon={MapPin} label="Dirección" value={lugar.direccion} mapQuery={lugar.direccion} />
        <ContactField icon={Phone} label="Teléfono" value={lugar.telefono} />
      </div>
    </div>
  );
}

type PerfilDoctor = {
  tituloCortesia: TituloCortesia | null;
  nombre: string;
  apellido: string;
  especialidad: Especialidad | null;
  fotoPerfilBase64: string | null;
};

// Contenedor del perfil: misma anchura y gutter que el header (max-w-6xl
// px-4) para que el contenido quede alineado con el logo y con el botón de
// la derecha. En escritorio, el perfil queda fijo a la izquierda mientras el
// paciente elige turno a la derecha.
export function PerfilShell({
  doctor,
  ciudad,
  biografia,
  prepagas,
  apilado = false,
  children,
}: {
  doctor: PerfilDoctor;
  ciudad: string;
  biografia?: string | null;
  prepagas?: string[];
  // Sin calendario (cuenta inactiva o sin reservas online) no hay nada que
  // poner al lado del perfil: se apilan las secciones en una sola columna.
  apilado?: boolean;
  children: React.ReactNode;
}) {
  const nombreCompleto = formatNombreConTitulo(
    doctor.tituloCortesia,
    `${doctor.nombre} ${doctor.apellido}`.trim()
  );
  const iniciales = `${doctor.nombre.charAt(0)}${doctor.apellido.charAt(0)}`.toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12">
      <nav
        aria-label="Ruta"
        className="flex flex-wrap items-center gap-1.5 pt-6 pb-5 text-[13px] text-muted-foreground"
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

      <div
        className={
          apilado
            ? "flex flex-col gap-6"
            : "grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"
        }
      >
        <aside className={`flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-6 ${apilado ? "" : "lg:sticky lg:top-20"}`}>
          <div className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-primary/10 font-heading text-2xl font-bold text-primary shadow-lg shadow-primary/20">
              {doctor.fotoPerfilBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doctor.fotoPerfilBase64} alt="" className="size-full object-cover" />
              ) : (
                iniciales
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-extrabold tracking-tight">{nombreCompleto}</h1>
              {doctor.especialidad && (
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {ESPECIALIDAD_LABELS[doctor.especialidad]}
                </span>
              )}
              {ciudad && (
                <span className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {ciudad}
                </span>
              )}
            </div>
          </div>

          {biografia && <BiografiaPerfil biografia={biografia} titulo={nombreCompleto} />}

          {prepagas && prepagas.length > 0 && (
            <div>
              <h2 className="font-heading text-sm font-bold">Coberturas</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {prepagas.map((nombre) => (
                  <li
                    key={nombre}
                    className="rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-xs font-semibold"
                  >
                    {nombre}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
