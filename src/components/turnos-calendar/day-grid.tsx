import Link from "next/link";
import { Lock } from "lucide-react";
import { asignarSobreturnosATramos, partirEnBloquesContiguos } from "@/lib/bloques-dia";
import { getMinutesSinceMidnightBA } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";
import type { Slot } from "./types";
import {
  OnlineBadge,
  agruparBloqueados,
  formatHora,
  getGridRange,
  mergeSobreturnos,
  minutesFromMidnight,
} from "./utils";

// La grilla de un solo tramo contiguo de horario -- se usa una vez por cada
// bloque de `partirEnBloquesContiguos`. Cada instancia calcula su propio
// rango horario (arranca en su primer slot, termina en su último) para no
// arrastrar el eje de tiempo de otro tramo ni de otro lugar.
function BloqueContiguoGrid({
  slots,
  sobreturnos,
  role,
  isPastDay,
  isToday,
  onOpenEdit,
  onOpenBooking,
  onUnblock,
  puedeBloquearHorarios,
}: {
  slots: Slot[];
  sobreturnos: Slot[];
  role: UserRole;
  isPastDay: boolean;
  isToday: boolean;
  onOpenEdit: (slot: Slot) => void;
  onOpenBooking: (slot: Slot) => void;
  onUnblock: (bloqueoId: string, lugarId: string, rango: string, rangoInicio: string, rangoFin: string) => void;
  puedeBloquearHorarios: boolean;
}) {
  const { mergedRows, standalone: standaloneSobreturnos, consumedInicios } = mergeSobreturnos(
    slots,
    sobreturnos
  );
  const bloqueadosRows = agruparBloqueados(slots);
  const bloqueadosInicios = new Set(bloqueadosRows.flatMap((row) => row.slots.map((s) => s.inicio)));
  const { startMinutes, endMinutes } = getGridRange([...slots, ...sobreturnos]);
  const totalMinutes = endMinutes - startMinutes;
  const nowOffsetPct =
    ((getMinutesSinceMidnightBA(new Date()) - startMinutes) / totalMinutes) * 100;
  const showNowLine = isToday && nowOffsetPct >= 0 && nowOffsetPct <= 100;

  // Un turno movido a un día sin horario configurado (ver "Mover a un día
  // libre" en bloqueo-conflictos.ts) no tiene ningún slot real ese día --
  // solo bailar cuando TAMPOCO hay sobreturnos, para no perderlo de vista.
  if (slots.length === 0 && sobreturnos.length === 0) return null;

  // El piso en píxeles tiene que alcanzar para TODAS las filas que se
  // dibujan dentro de este rango horario, no solo los slots de la grilla:
  // un sobreturno "al final de la lista" extiende `totalMinutes` más allá
  // del último slot (ver `getGridRange`) y ocupa su propia franja de
  // tiempo -- si no se cuenta acá, esa franja termina midiendo menos de
  // 44px reales y su `minHeight` forzado la hace pisar a la fila de al
  // lado. Un sobreturno fusionado en `mergedRows` no suma franja nueva:
  // comparte el mismo rango horario que el slot al que está pegado.
  const filasMinimas = slots.length + standaloneSobreturnos.length;

  return (
    <div
      className="relative flex-1 min-h-0"
      style={{ minHeight: Math.max(filasMinimas * 44, 220) }}
    >
      {slots.map((slot) => {
        const top = ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
        return (
          <div
            key={slot.inicio}
            className="absolute inset-x-0 border-t border-border/70"
            style={{ top: `${top}%` }}
          >
            <span className="absolute left-0 top-0 w-12 -translate-y-1/2 bg-card px-1 text-right text-xs text-muted-foreground">
              {formatHora(slot.inicio)}
            </span>
          </div>
        );
      })}

      {// Un día sin horario real (ej. un turno movido a un día libre, sin
      // "Habilitar turnos nuevos ese día") no tiene ningún slot que dibuje
      // el eje de horas de arriba -- sin esto, la(s) card(s) de sobreturno
      // quedan flotando sin ninguna referencia horaria a la izquierda. Se
      // marca el inicio Y el fin de cada una (a diferencia de los slots
      // reales, que solo marcan su inicio porque el de al lado ya cubre el
      // otro extremo) porque acá no hay ningún vecino que lo haga.
      slots.length === 0 &&
        [
          ...new Map(
            standaloneSobreturnos
              .flatMap((slot) => [slot.inicio, slot.fin])
              .map((iso) => [iso, iso])
          ).values(),
        ].map((iso) => {
          const top = ((minutesFromMidnight(iso) - startMinutes) / totalMinutes) * 100;
          return (
            <div
              key={`ruler-sobreturno-${iso}`}
              className="absolute inset-x-0 border-t border-border/70"
              style={{ top: `${top}%` }}
            >
              <span className="absolute left-0 top-0 w-12 -translate-y-1/2 bg-card px-1 text-right text-xs text-muted-foreground">
                {formatHora(iso)}
              </span>
            </div>
          );
        })}

      <div className="absolute inset-y-0 left-12 w-[calc(100%-3rem)]">
        {slots.map((slot) => {
          if (consumedInicios.has(slot.inicio) || bloqueadosInicios.has(slot.inicio)) return null;
          const top = ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
          const height =
            ((minutesFromMidnight(slot.fin) - minutesFromMidnight(slot.inicio)) / totalMinutes) *
            100;
          const ocupado = Boolean(slot.turno);

          return (
            <button
              key={slot.inicio}
              type="button"
              disabled={isPastDay}
              onClick={() => (slot.turno ? onOpenEdit(slot) : onOpenBooking(slot))}
              style={{
                top: `${top}%`,
                height: `${height}%`,
                minHeight: ocupado ? 44 : 22,
              }}
              aria-label={
                ocupado
                  ? `Turno de ${slot.turno!.nombreYApellido}, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Editar."}`
                  : `Libre, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Reservar."}`
              }
              className={cn(
                "absolute left-1 flex w-[calc(100%-0.5rem)] flex-col justify-center gap-0.5 rounded-md border py-1 pr-2 pl-6 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
                ocupado
                  ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25"
                  : "border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/40 hover:text-foreground"
              )}
            >
              {ocupado ? (
                <>
                  <span className="flex items-center justify-between gap-1.5">
                    <strong className="min-w-0 text-xs leading-tight font-semibold break-words">
                      {slot.turno!.nombreYApellido}
                    </strong>
                    {slot.turno!.origen === "ONLINE" && <OnlineBadge />}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] leading-tight opacity-80">
                    <span className="shrink-0">
                      [ {formatHora(slot.inicio)} - {formatHora(slot.fin)} ]
                    </span>
                    {role === "DOCTOR" && slot.turno!.patientId && (
                      <Link
                        href={`/patients/${slot.turno!.patientId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 underline-offset-2 hover:underline"
                      >
                        Ver ficha
                      </Link>
                    )}
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1 overflow-hidden text-xs">
                  <strong className="shrink-0 font-semibold">Libre</strong>
                  <span className="truncate">
                    [ {formatHora(slot.inicio)} - {formatHora(slot.fin)} ]
                  </span>
                </span>
              )}
            </button>
          );
        })}

        {bloqueadosRows.map((row) => {
          const primero = row.slots[0];
          const ultimo = row.slots[row.slots.length - 1];
          const top = ((minutesFromMidnight(primero.inicio) - startMinutes) / totalMinutes) * 100;
          const height =
            ((minutesFromMidnight(ultimo.fin) - minutesFromMidnight(primero.inicio)) / totalMinutes) *
            100;

          return (
            <div
              key={row.key}
              style={{ top: `${top}%`, height: `${height}%`, minHeight: 44 }}
              className="absolute left-1 flex w-[calc(100%-0.5rem)] flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-center text-muted-foreground"
            >
              <span className="flex items-center gap-2 text-xs">
                <Lock className="size-3.5 shrink-0" />
                <strong className="shrink-0 font-semibold">Bloqueado</strong>
                <span>
                  [ {formatHora(primero.inicio)} - {formatHora(ultimo.fin)} ]
                  {row.motivo ? ` · ${row.motivo}` : ""}
                </span>
              </span>
              {puedeBloquearHorarios && (
                <button
                  type="button"
                  disabled={isPastDay}
                  onClick={() =>
                    onUnblock(
                      row.bloqueoId,
                      row.slots[0].lugarId,
                      `${formatHora(primero.inicio)} a ${formatHora(ultimo.fin)}${row.motivo ? ` · ${row.motivo}` : ""}`,
                      primero.inicio,
                      ultimo.fin
                    )
                  }
                  className="mt-2 shrink-0 rounded-md border border-border bg-card px-3 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  Desbloquear
                </button>
              )}
            </div>
          );
        })}

        {mergedRows.map((row) => {
          const pieces = [...row.leftPieces].sort((a, b) => a.inicio.localeCompare(b.inicio));
          const allTimes = [...pieces, ...row.sobreturnosAqui];
          const rangeStart = Math.min(...allTimes.map((p) => minutesFromMidnight(p.inicio)));
          const rangeEnd = Math.max(...allTimes.map((p) => minutesFromMidnight(p.fin)));
          const top = ((rangeStart - startMinutes) / totalMinutes) * 100;
          const height = ((rangeEnd - rangeStart) / totalMinutes) * 100;

          return (
            <div
              key={row.key}
              style={{ top: `${top}%`, height: `${height}%` }}
              className="absolute left-1 min-h-11 w-[calc(100%-0.5rem)] overflow-hidden rounded-md border border-border bg-card shadow-sm"
            >
              <div className="flex h-full flex-row">
                <div className="flex flex-1 flex-col">
                  {pieces.map((piece, index) => {
                    const ocupado = Boolean(piece.turno);
                    return (
                      <button
                        key={piece.inicio}
                        type="button"
                        disabled={isPastDay}
                        onClick={() => (piece.turno ? onOpenEdit(piece) : onOpenBooking(piece))}
                        aria-label={
                          ocupado
                            ? `Turno de ${piece.turno!.nombreYApellido}, ${formatHora(piece.inicio)} a ${formatHora(piece.fin)}${isPastDay ? "." : ". Editar."}`
                            : `Libre, ${formatHora(piece.inicio)} a ${formatHora(piece.fin)}${isPastDay ? "." : ". Reservar."}`
                        }
                        className={cn(
                          "flex w-full flex-1 flex-col items-start justify-center px-2 py-1 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
                          index > 0 && "border-t border-dashed border-border/70",
                          ocupado
                            ? "bg-primary/15 text-primary hover:bg-primary/25"
                            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                        )}
                      >
                        {ocupado ? (
                          <>
                            <span className="flex w-full items-center justify-between gap-1.5">
                              <strong className="min-w-0 text-[11px] leading-tight font-semibold break-words">
                                {piece.turno!.nombreYApellido}
                              </strong>
                              {piece.turno!.origen === "ONLINE" && (
                                <OnlineBadge className="hidden sm:inline-block" />
                              )}
                            </span>
                            <span className="flex items-center gap-2 text-[10px] leading-tight opacity-80">
                              <span className="shrink-0">
                                [ {formatHora(piece.inicio)} - {formatHora(piece.fin)} ]
                              </span>
                              {role === "DOCTOR" && piece.turno!.patientId && (
                                <Link
                                  href={`/patients/${piece.turno!.patientId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 underline-offset-2 hover:underline"
                                >
                                  Ver ficha
                                </Link>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px]">
                            <strong className="font-semibold">Libre</strong>{" "}
                            [ {formatHora(piece.inicio)} - {formatHora(piece.fin)} ]
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-1 flex-col border-l border-dashed border-amber-500/70">
                  {row.sobreturnosAqui.map((sob, index) => (
                    <button
                      key={sob.inicio}
                      type="button"
                      disabled={isPastDay}
                      onClick={() => onOpenEdit(sob)}
                      aria-label={`Sobreturno de ${sob.turno!.nombreYApellido}, ${formatHora(sob.inicio)} a ${formatHora(sob.fin)}${isPastDay ? "." : ". Editar."}`}
                      className={cn(
                        "flex w-full flex-1 flex-col items-start justify-center bg-amber-500/15 px-2 py-1 text-left text-amber-800 transition-colors hover:bg-amber-500/25 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400",
                        index > 0 && "border-t border-dashed border-amber-500/40"
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-1.5">
                        <strong className="min-w-0 text-[11px] leading-tight font-semibold break-words">
                          {sob.turno!.nombreYApellido}
                        </strong>
                        {sob.turno!.origen === "ONLINE" && (
                          <OnlineBadge className="hidden sm:inline-block" />
                        )}
                      </span>
                      <span className="text-[10px] leading-tight opacity-80">
                        [ {formatHora(sob.inicio)} - {formatHora(sob.fin)} ] · Sobreturno
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {standaloneSobreturnos.map((slot) => {
          const top = ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
          const height =
            ((minutesFromMidnight(slot.fin) - minutesFromMidnight(slot.inicio)) / totalMinutes) *
            100;

          return (
            <button
              key={`sobreturno-${slot.inicio}`}
              type="button"
              disabled={isPastDay}
              onClick={() => onOpenEdit(slot)}
              style={{ top: `${top}%`, height: `${height}%`, minHeight: 44 }}
              aria-label={`Sobreturno de ${slot.turno!.nombreYApellido}, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Editar."}`}
              className="absolute left-1 flex w-[calc(100%-0.5rem)] flex-col justify-center gap-0.5 rounded-md border border-dashed border-amber-500/70 bg-amber-500/15 py-1 pr-2 pl-6 text-left text-amber-800 shadow-sm transition-colors hover:bg-amber-500/25 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400"
            >
              <span className="flex items-center justify-between gap-1.5">
                <strong className="min-w-0 text-xs leading-tight font-semibold break-words">
                  {slot.turno!.nombreYApellido}
                </strong>
                {slot.turno!.origen === "ONLINE" && <OnlineBadge />}
              </span>
              <span className="flex items-center gap-2 text-[11px] leading-tight opacity-80">
                <span className="shrink-0">
                  [ {formatHora(slot.inicio)} - {formatHora(slot.fin)} ] · Sobreturno
                </span>
                {role === "DOCTOR" && slot.turno!.patientId && (
                  <Link
                    href={`/patients/${slot.turno!.patientId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 underline-offset-2 hover:underline"
                  >
                    Ver ficha
                  </Link>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {showNowLine && (
        <div
          className="pointer-events-none absolute left-12 z-10 flex w-[calc(100%-3rem)] items-center"
          style={{ top: `${nowOffsetPct}%` }}
        >
          <span className="-ml-1 size-2 shrink-0 rounded-full bg-destructive" />
          <div className="h-px flex-1 bg-destructive" />
        </div>
      )}
    </div>
  );
}

// La grilla de un lugar entero -- se usa una vez por cada grupo de
// `agruparPorLugar` (o una sola vez, sin agrupar, cuando el médico tiene un
// único lugar). Si ese lugar tiene más de un tramo de horario ese día,
// cada uno se dibuja por separado (ver `BloqueContiguoGrid`), apilados con
// una línea divisoria entre ellos en vez de un único eje horario continuo
// que dejaría un hueco vacío enorme entre ambos.
export function LugarDayGrid({
  slots,
  sobreturnos,
  role,
  isPastDay,
  isToday,
  onOpenEdit,
  onOpenBooking,
  onUnblock,
  puedeBloquearHorarios,
}: {
  slots: Slot[];
  sobreturnos: Slot[];
  role: UserRole;
  isPastDay: boolean;
  isToday: boolean;
  onOpenEdit: (slot: Slot) => void;
  onOpenBooking: (slot: Slot) => void;
  onUnblock: (bloqueoId: string, lugarId: string, rango: string, rangoInicio: string, rangoFin: string) => void;
  puedeBloquearHorarios: boolean;
}) {
  // Igual que en `BloqueContiguoGrid`: un día sin horario configurado que
  // igual tiene un turno (movido ahí vía "Mover a un día libre") no tiene
  // slots, pero no hay que ocultarlo si hay sobreturnos para mostrar.
  if (slots.length === 0 && sobreturnos.length === 0) return null;

  const bloques = partirEnBloquesContiguos(slots);
  if (bloques.length <= 1) {
    return (
      <BloqueContiguoGrid
        slots={slots}
        sobreturnos={sobreturnos}
        role={role}
        isPastDay={isPastDay}
        isToday={isToday}
        onOpenEdit={onOpenEdit}
        onOpenBooking={onOpenBooking}
        onUnblock={onUnblock}
        puedeBloquearHorarios={puedeBloquearHorarios}
      />
    );
  }

  const tramos = bloques.map((bloqueSlots) => ({
    inicio: bloqueSlots[0].inicio,
    fin: bloqueSlots[bloqueSlots.length - 1].fin,
  }));
  const sobreturnosPorTramo = asignarSobreturnosATramos(tramos, sobreturnos);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {bloques.map((bloqueSlots, index) => {
        return (
          <div key={bloqueSlots[0].inicio}>
            {index > 0 && <hr className="my-6 border-t border-muted-foreground/30" />}
            <BloqueContiguoGrid
              slots={bloqueSlots}
              sobreturnos={sobreturnosPorTramo[index]}
              role={role}
              isPastDay={isPastDay}
              isToday={isToday}
              onOpenEdit={onOpenEdit}
              onOpenBooking={onOpenBooking}
              onUnblock={onUnblock}
              puedeBloquearHorarios={puedeBloquearHorarios}
            />
          </div>
        );
      })}
    </div>
  );
}
