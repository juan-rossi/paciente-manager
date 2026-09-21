import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatNombreConTitulo } from "@/lib/titulo-cortesia";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import type { DoctorPublico } from "@/lib/directorio";

function formatDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
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

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3.5 rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading text-lg font-bold text-primary">
          {doctor.fotoPerfilBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.fotoPerfilBase64} alt="" className="size-full object-cover" />
          ) : (
            iniciales
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate font-heading text-[15px] font-bold">{nombreCompleto}</div>
          {doctor.especialidad && (
            <span className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {ESPECIALIDAD_LABELS[doctor.especialidad]}
            </span>
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
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {doctor.biografia}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-dashed border-border pt-3.5">
        {doctor.reservaPublicaHabilitada ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-2.5 py-1 text-[11px] font-bold text-brand-accent">
            <span className="size-1.5 rounded-full bg-brand-accent" />
            Reserva online
          </span>
        ) : (
          <span />
        )}
        <span className="text-[13px] font-bold text-primary">Ver perfil →</span>
      </div>
    </Link>
  );
}
