import { todayPartsBA } from "@/lib/timezone";

type FechaPartes = { year: number; month: number; day: number };

const DIA_MS = 86_400_000;
// Más allá de 44 semanas la FUM ya no es de este embarazo (o está mal cargada).
const MAX_DIAS_GESTACION = 44 * 7;

function utcDe(fecha: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  if (!match) return null;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(ms) ? null : ms;
}

// Edad gestacional y fecha probable de parto a partir de la FUM
// ("YYYY-MM-DD"), por regla de Naegele (FUM + 280 días). Null si la FUM no es
// válida, es futura o da más de 44 semanas. `hoy` es para los tests.
export function edadGestacional(
  fum: string | null | undefined,
  hoy: FechaPartes = todayPartsBA()
): { semanas: number; dias: number; fpp: string } | null {
  if (!fum) return null;
  const inicio = utcDe(fum);
  if (inicio == null) return null;
  const transcurridos = Math.round((Date.UTC(hoy.year, hoy.month - 1, hoy.day) - inicio) / DIA_MS);
  if (transcurridos < 0 || transcurridos > MAX_DIAS_GESTACION) return null;
  return {
    semanas: Math.floor(transcurridos / 7),
    dias: transcurridos % 7,
    fpp: new Date(inicio + 280 * DIA_MS).toISOString().slice(0, 10),
  };
}

export function formatEdadGestacional(eg: { semanas: number; dias: number }): string {
  return eg.dias > 0 ? `${eg.semanas} semanas y ${eg.dias} días` : `${eg.semanas} semanas`;
}

// "G2 P1 C1 A0". Vacío si no se cargó ninguno; los que falten van con "-".
export function formulaObstetrica(f: {
  gestas?: string | null;
  partos?: string | null;
  cesareas?: string | null;
  abortos?: string | null;
}): string {
  const partes = [f.gestas, f.partos, f.cesareas, f.abortos].map((v) => v?.trim() ?? "");
  if (partes.every((p) => p === "")) return "";
  const [g, p, c, a] = partes.map((v) => v || "-");
  return `G${g} P${p} C${c} A${a}`;
}
