import { describe, expect, it } from "vitest";
import {
  dateParamToDateBA,
  formatDateParamBA,
  formatHoraBA,
  getDayBA,
  getMinutesSinceMidnightBA,
  isSameDayBA,
  setTimeBA,
  startOfDayBA,
} from "@/lib/timezone";

describe("timezone (Buenos Aires, UTC-3)", () => {
  it("corre con un TZ de proceso distinto al de Argentina", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Asia/Tokyo");
  });

  it("dateParamToDateBA parsea como medianoche en BA", () => {
    expect(dateParamToDateBA("2026-10-10")?.toISOString()).toBe("2026-10-10T03:00:00.000Z");
  });

  it("dateParamToDateBA rechaza formatos inválidos", () => {
    expect(dateParamToDateBA("")).toBeNull();
    expect(dateParamToDateBA("10/10/2026")).toBeNull();
    expect(dateParamToDateBA("2026-1-5")).toBeNull();
  });

  it("formatDateParamBA usa el día de BA, no el UTC", () => {
    // 01:00 UTC del 11 = 22:00 del 10 en BA.
    expect(formatDateParamBA(new Date("2026-10-11T01:00:00Z"))).toBe("2026-10-10");
    expect(formatDateParamBA(new Date("2026-10-11T03:00:00Z"))).toBe("2026-10-11");
  });

  it("formatHoraBA y getMinutesSinceMidnightBA", () => {
    const d = new Date("2026-10-10T12:05:00Z");
    expect(formatHoraBA(d)).toBe("09:05");
    expect(getMinutesSinceMidnightBA(d)).toBe(9 * 60 + 5);
  });

  it("getDayBA cerca de la medianoche", () => {
    // Sábado 10/10 a las 23:30 en BA (ya domingo en UTC y en Tokio).
    expect(getDayBA(new Date("2026-10-11T02:30:00Z"))).toBe(6);
  });

  it("setTimeBA y startOfDayBA mantienen el día calendario de BA", () => {
    const tardeDelSabado = new Date("2026-10-11T02:30:00Z");
    expect(setTimeBA(tardeDelSabado, 9, 30).toISOString()).toBe("2026-10-10T12:30:00.000Z");
    expect(startOfDayBA(tardeDelSabado).toISOString()).toBe("2026-10-10T03:00:00.000Z");
  });

  it("isSameDayBA", () => {
    expect(isSameDayBA(new Date("2026-10-10T03:00:00Z"), new Date("2026-10-11T02:59:00Z"))).toBe(true);
    expect(isSameDayBA(new Date("2026-10-10T02:59:00Z"), new Date("2026-10-10T03:00:00Z"))).toBe(false);
  });
});
