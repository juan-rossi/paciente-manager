import Link from "next/link";
import { CalendarClock, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNombreConTitulo } from "@/lib/titulo-cortesia";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import { TIME_ZONE, formatHoraBA, isSameDayBA } from "@/lib/timezone";
import type { DoctorPublico } from "@/lib/directorio";

// Cuántas coberturas se muestran en la tarjeta de un destacado antes de
// resumir el resto como "+N" (la lista completa está en el perfil).
const MAX_PREPAGAS_EN_TARJETA = 4;

function formatDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

const diaCorto = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "numeric",
});

// "hoy 10:30", "mañana 10:30" o "jue 23/10 10:30", siempre en horario de
// Argentina (la página se renderiza en el server, que corre en UTC).
function formatProximoTurno(iso: string): string {
  const inicio = new Date(iso);
  const ahora = new Date();
  const hora = formatHoraBA(inicio);
  if (isSameDayBA(inicio, ahora)) return `hoy ${hora}`;
  if (isSameDayBA(inicio, new Date(ahora.getTime() + 24 * 60 * 60 * 1000))) return `mañana ${hora}`;
  return `${diaCorto.format(inicio).replace(",", "")} ${hora}`;
}

export function DoctorCard({ doctor }: { doctor: DoctorPublico }) {
  const nombreCompleto = formatNombreConTitulo(
    doctor.tituloCortesia,
    `${doctor.nombre} ${doctor.apellido}`.trim()
  );
  const iniciales = `${doctor.nombre.charAt(0)}${doctor.apellido.charAt(0)}`.toUpperCase();
  // Si la búsqueda matcheó por un lugar puntual (no por el perfil), se lo
  // pasamos al perfil para que el calendario de reserva arranque con ese
  // lugar destacado (ver PublicBookingCalendar).
  const href = doctor.lugarIdMasCercano
    ? `/directorio/${doctor.publicSlug}?lugar=${doctor.lugarIdMasCercano}`
    : `/directorio/${doctor.publicSlug}`;
  // "Reservar turno" lleva al mismo perfil, pero directo al calendario: en
  // desktop por el ancla, en mobile abriendo el wizard (ver `reservar` en la
  // página del perfil).
  const hrefReservar = `${href}${href.includes("?") ? "&" : "?"}reservar=1#reservar`;
  const conReservaDirecta = doctor.destacado && doctor.reservaPublicaHabilitada;
  const prepagasVisibles = doctor.prepagas.slice(0, MAX_PREPAGAS_EN_TARJETA);
  const prepagasRestantes = doctor.prepagas.length - prepagasVisibles.length;

  // La tarjeta entera es clickeable vía el `after:` del link del nombre (en
  // vez de envolver todo en un <Link>), porque la de un destacado tiene un
  // segundo link adentro ("Reservar turno") y no se pueden anidar <a>.
  return (
    <div
      className={cn(
        "group relative flex w-full flex-col gap-3.5 rounded-2xl border p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
        doctor.destacado ? "border-primary/40 bg-primary/[0.04] shadow-md shadow-primary/5" : "border-border/60 bg-card"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading text-lg font-bold text-primary">
          {doctor.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctor.fotoUrl}
              alt={`Foto de ${nombreCompleto}${doctor.especialidad ? `, ${ESPECIALIDAD_LABELS[doctor.especialidad]}` : ""}`}
              width={52}
              height={52}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            iniciales
          )}
        </div>
        <div className="min-w-0">
          <Link
            href={href}
            className="block truncate font-heading text-[15px] font-bold outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {nombreCompleto}
          </Link>
          {(doctor.especialidad || doctor.destacado) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {doctor.especialidad && (
                <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  {ESPECIALIDAD_LABELS[doctor.especialidad]}
                </span>
              )}
              {doctor.destacado && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                  <Star className="size-3 fill-current" />
                  Destacado
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {doctor.distanciaKm != null ? (
        // Con una búsqueda por ubicación activa, la ciudad relevante es la
        // del lugar que matcheó -- mostrar todas acá confundiría cuál es la
        // cercana.
        (doctor.ciudad || doctor.distanciaKm != null) && (
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {doctor.ciudad}
            {doctor.ciudad && " · "}
            {`a ${formatDistancia(doctor.distanciaKm)}`}
          </div>
        )
      ) : (
        // Sin búsqueda activa, mostrar todas las ciudades donde atiende --
        // un médico con perfil en una ciudad y un consultorio en otra no
        // debería parecer que solo atiende en una.
        doctor.ciudades.length > 0 && (
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {doctor.ciudades.join(", ")}
          </div>
        )
      )}

      {doctor.biografia && (
        <p
          className={cn(
            "text-[13px] leading-relaxed text-muted-foreground",
            doctor.destacado ? "line-clamp-6" : "line-clamp-2"
          )}
        >
          {doctor.biografia}
        </p>
      )}

      {prepagasVisibles.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Coberturas que acepta">
          {prepagasVisibles.map((nombre) => (
            <li key={nombre} className="rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {nombre}
            </li>
          ))}
          {prepagasRestantes > 0 && (
            <li className="rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              +{prepagasRestantes}
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-3.5">
        {conReservaDirecta && doctor.proximoTurno ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-accent">
            <CalendarClock className="size-3.5 shrink-0" />
            Próximo turno: {formatProximoTurno(doctor.proximoTurno)}
          </span>
        ) : doctor.reservaPublicaHabilitada ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-2.5 py-1 text-[11px] font-bold text-brand-accent">
            <span className="size-1.5 rounded-full bg-brand-accent" />
            Reserva online
          </span>
        ) : (
          <span />
        )}
        {conReservaDirecta ? (
          <Link
            href={hrefReservar}
            className="relative z-10 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Reservar turno
          </Link>
        ) : (
          <span className="text-[13px] font-bold text-primary">Ver perfil →</span>
        )}
      </div>
    </div>
  );
}
