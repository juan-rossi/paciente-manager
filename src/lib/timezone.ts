/**
 * Los turnos siempre corren en horario de Argentina (America/Argentina/Buenos_Aires,
 * UTC-3 fijo, sin horario de verano desde 2009). El proceso de Node puede correr en
 * cualquier zona horaria (Vercel usa UTC por defecto) — para lógica de turnos, nunca usar
 * Date.setHours()/getHours()/getDay()/getFullYear() ni toLocaleDateString() sin
 * `timeZone` explícito; usar estas funciones en su lugar, que no dependen del TZ del proceso.
 */

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const BA_UTC_OFFSET_HOURS = 3;

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partsBA(date: Date) {
  const raw = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(raw.year),
    month: Number(raw.month),
    day: Number(raw.day),
    hour: Number(raw.hour),
    minute: Number(raw.minute),
  };
}

/** Instante UTC correspondiente a esa fecha/hora de pared en Buenos Aires. */
function fromPartsBA(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + BA_UTC_OFFSET_HOURS, minute, 0, 0));
}

/** Día de la semana en Buenos Aires (0 = domingo … 6 = sábado). */
export function getDayBA(date: Date): number {
  const { year, month, day } = partsBA(date);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/** "HH:MM" en Buenos Aires. */
export function formatHoraBA(date: Date): string {
  const { hour, minute } = partsBA(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Minutos desde la medianoche (Buenos Aires). */
export function getMinutesSinceMidnightBA(date: Date): number {
  const { hour, minute } = partsBA(date);
  return hour * 60 + minute;
}

/** true si `a` y `b` caen en el mismo día calendario en Buenos Aires. */
export function isSameDayBA(a: Date, b: Date): boolean {
  return formatDateParamBA(a) === formatDateParamBA(b);
}

/** "YYYY-MM-DD" en Buenos Aires. */
export function formatDateParamBA(date: Date): string {
  const { year, month, day } = partsBA(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Mismo día calendario (en Buenos Aires) que `date`, a la hora de pared indicada. */
export function setTimeBA(date: Date, hour: number, minute: number): Date {
  const { year, month, day } = partsBA(date);
  return fromPartsBA(year, month, day, hour, minute);
}

/** Medianoche (00:00, Buenos Aires) del día calendario que contiene a `date`. */
export function startOfDayBA(date: Date): Date {
  return setTimeBA(date, 0, 0);
}

/** Parsea "YYYY-MM-DD" como medianoche en Buenos Aires (no depende del TZ del proceso). */
export function dateParamToDateBA(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return fromPartsBA(Number(match[1]), Number(match[2]), Number(match[3]));
}
