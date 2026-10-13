import { formatHoraBA, TIME_ZONE } from "@/lib/timezone";
import type { TurnoCanceladoPorPaciente } from "@/lib/turnos-cancelados-por-pacientes";

function fecha(date: Date) {
  return date.toLocaleDateString("es-AR", { timeZone: TIME_ZONE, day: "numeric", month: "numeric", year: "numeric" });
}

// Registro al final de Turnos: los turnos que el paciente canceló (perfil
// público o link `{cancelar}` del recordatorio). Esos horarios ya están libres.
export function TurnosCanceladosOnline({ turnos }: { turnos: TurnoCanceladoPorPaciente[] }) {
  if (turnos.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h2 className="text-sm font-semibold">Cancelados por pacientes</h2>
        <p className="text-xs text-muted-foreground">
          Turnos que el paciente canceló desde tu perfil o desde el link del recordatorio. El horario ya quedó libre en la agenda.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {turnos.map((t) => {
          const inicio = new Date(t.inicio);
          const canceladoAt = new Date(t.canceladoAt);
          return (
            <li key={t.id} className="flex flex-col gap-0.5 rounded-md border border-border border-l-[3px] border-l-destructive bg-card p-2.5 shadow-sm sm:p-3">
              <p className="truncate text-sm font-medium">{t.nombreYApellido}</p>
              <p className="text-xs text-muted-foreground">
                Era el {fecha(inicio)} a las {formatHoraBA(inicio)}
                {t.lugarNombre && ` · ${t.lugarNombre}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Canceló el {fecha(canceladoAt)} a las {formatHoraBA(canceladoAt)} · Tel. {t.telefono}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
