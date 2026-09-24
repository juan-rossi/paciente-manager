// Agrupa una lista plana de slots (ya generados por `generarSlots` para un
// día puntual) en los "bloques de horario reales" de ese día -- ej. con
// Particular 9-11, Particular 13-15 y Consultorio1 16-18, da 3 bloques (dos
// de ellos comparten lugar pero no rango horario). Vive acá (no en
// `turnos-calendar.tsx`, que es donde nació) porque tanto el cliente (para
// el picker de sobreturno y el diálogo de bloqueo de horarios) como el
// server (para recalcular server-side qué bloque real corresponde a un
// `bloqueKey` antes de crear un `BloqueoHorario`, sin confiar en rangos
// horarios que mande el cliente) necesitan exactamente la misma lógica.
export type SlotLike = {
  inicio: string;
  fin: string;
  lugarId: string;
};

export function rangesOverlap(aInicio: string, aFin: string, bInicio: string, bFin: string) {
  return new Date(aInicio) < new Date(bFin) && new Date(aFin) > new Date(bInicio);
}

export type LugarGrupo<T extends SlotLike> = {
  lugarId: string;
  slots: T[];
  sobreturnos: T[];
};

// Un médico con más de un lugar de trabajo puede tener horarios en horas
// bien separadas del día (mañana en un consultorio, tarde en otro) -- ver
// esa fecha como una única grilla continua deja un hueco vacío y sin
// explicación entre ambos tramos. Agrupar por lugar (en el orden en que
// aparece cada uno por primera vez, ya vienen ordenados cronológicamente)
// permite que cada lugar tenga su propia mini-grilla acotada a su propio
// rango horario, sin ese hueco muerto.
export function agruparPorLugar<T extends SlotLike>(slots: T[], sobreturnos: T[]): LugarGrupo<T>[] {
  const orden: string[] = [];
  const grupos = new Map<string, LugarGrupo<T>>();
  function ensure(lugarId: string) {
    let grupo = grupos.get(lugarId);
    if (!grupo) {
      grupo = { lugarId, slots: [], sobreturnos: [] };
      grupos.set(lugarId, grupo);
      orden.push(lugarId);
    }
    return grupo;
  }
  for (const slot of slots) ensure(slot.lugarId).slots.push(slot);
  for (const sob of sobreturnos) ensure(sob.lugarId).sobreturnos.push(sob);
  return orden.map((lugarId) => grupos.get(lugarId)!);
}

// Dentro de un mismo lugar puede haber más de un bloque de horario cargado
// para el mismo día (ej.: mañana y tarde, con un corte al mediodía) -- una
// sola grilla continua de 09:00 a 16:45 deja un espacio enorme y vacío en
// el medio, porque esa franja "sin horario" ocupa proporcionalmente el
// mismo lugar que cualquier hora con turnos. Partir `slots` (ya vienen
// ordenados cronológicamente) en tramos contiguos -- cortando apenas el
// fin de un slot no coincide con el inicio del siguiente -- permite darle
// a cada tramo su propia mini-grilla acotada a su propio rango horario.
export function partirEnBloquesContiguos<T extends SlotLike>(slots: T[]): T[][] {
  const bloques: T[][] = [];
  for (const slot of slots) {
    const bloqueActual = bloques[bloques.length - 1];
    const ultimoSlot = bloqueActual?.[bloqueActual.length - 1];
    if (ultimoSlot && ultimoSlot.fin === slot.inicio) {
      bloqueActual.push(slot);
    } else {
      bloques.push([slot]);
    }
  }
  return bloques;
}

export type BloqueDelDia<T extends SlotLike> = {
  key: string;
  lugarId: string;
  inicio: string;
  fin: string;
  slots: T[];
  sobreturnos: T[];
};

// A qué tramo (índice) pertenece cada sobreturno: al que solapa de verdad
// (sobreturno "junto a un turno"), o si no solapa a ninguno -- arranca
// justo donde termina uno, sin overlap real -- al tramo anterior más
// cercano (sobreturno "al final de la lista"). Sin este segundo paso, dos
// sobreturnos agregados uno tras otro "al final" quedaban ambos fuera de
// cualquier tramo, así que el segundo recalculaba el mismo horario que el
// primero en vez de encadenarse después -- terminaban superpuestos.
export function asignarSobreturnosATramos<T extends SlotLike>(
  tramos: { inicio: string; fin: string }[],
  sobreturnos: T[]
): T[][] {
  const porTramo: T[][] = tramos.map(() => []);
  for (const sob of sobreturnos) {
    let index = tramos.findIndex((t) => rangesOverlap(sob.inicio, sob.fin, t.inicio, t.fin));
    if (index === -1) {
      let mejorFin: string | null = null;
      tramos.forEach((t, i) => {
        if (t.fin <= sob.inicio && (mejorFin === null || t.fin > mejorFin!)) {
          mejorFin = t.fin;
          index = i;
        }
      });
    }
    porTramo[index === -1 ? 0 : index].push(sob);
  }
  return porTramo;
}

// Aplana `agruparPorLugar` + `partirEnBloquesContiguos` en una sola lista de
// "bloques de horario reales" del día. Se usa tanto para el diálogo de
// sobreturno ("en qué bloque estamos") como para el de bloqueo de horarios
// ("qué bloques específicos bloqueo"), y server-side para validar contra
// qué bloque real corresponde un `bloqueKey` recibido del cliente.
export function bloquesDelDia<T extends SlotLike>(grupos: LugarGrupo<T>[]): BloqueDelDia<T>[] {
  const bloques: BloqueDelDia<T>[] = [];
  for (const grupo of grupos) {
    const tramosSlots = partirEnBloquesContiguos(grupo.slots);
    const tramos = tramosSlots.map((tramoSlots) => ({
      inicio: tramoSlots[0].inicio,
      fin: tramoSlots[tramoSlots.length - 1].fin,
    }));
    const sobreturnosPorTramo = asignarSobreturnosATramos(tramos, grupo.sobreturnos);
    tramosSlots.forEach((tramoSlots, i) => {
      bloques.push({
        key: `${grupo.lugarId}-${tramos[i].inicio}`,
        lugarId: grupo.lugarId,
        inicio: tramos[i].inicio,
        fin: tramos[i].fin,
        slots: tramoSlots,
        sobreturnos: sobreturnosPorTramo[i],
      });
    });
  }
  return bloques;
}
