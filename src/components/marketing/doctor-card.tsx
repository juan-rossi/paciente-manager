import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatNombreConTitulo } from "@/lib/titulo-cortesia";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import type { DoctorPublico } from "@/lib/directorio";

export function DoctorCard({ doctor }: { doctor: DoctorPublico }) {
  const nombreCompleto = formatNombreConTitulo(
    doctor.tituloCortesia,
    `${doctor.nombre} ${doctor.apellido}`.trim()
  );
  const iniciales = `${doctor.nombre.charAt(0)}${doctor.apellido.charAt(0)}`.toUpperCase();

  return (
    <Link
      href={`/directorio/${doctor.publicSlug}`}
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

      {doctor.ciudad && (
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          {doctor.ciudad}
        </div>
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
