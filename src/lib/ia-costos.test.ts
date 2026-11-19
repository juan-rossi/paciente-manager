import { describe, expect, it } from "vitest";
import { costoDictadoMaximoUsd, costoDictadoUsd, costoResumenMaximoUsd, costoResumenUsd } from "./ia-costos";

// La reserva previa al pedido (ver `reservarUsoIA`) usa estas estimaciones:
// tienen que ser una cota SUPERIOR del costo real para que el tope no se
// pueda pasar con pedidos en paralelo.
describe("estimaciones de costo máximo", () => {
  it("dictado: cubre el audio grabado a 24 kbps (3.000 bytes por segundo)", () => {
    const segundos = 10 * 60;
    const bytes = segundos * 3000;
    expect(costoDictadoMaximoUsd(bytes)).toBeGreaterThanOrEqual(costoDictadoUsd(segundos));
  });

  it("dictado: respeta el mínimo facturado aun con muy poco audio", () => {
    expect(costoDictadoMaximoUsd(100)).toBeGreaterThanOrEqual(costoDictadoUsd(0));
  });

  it("resumen: cubre ~3 caracteres por token, el system prompt y la salida máxima", () => {
    const caracteres = 100_000;
    const tokensEntradaReales = Math.ceil(caracteres / 3) + 1500;
    expect(costoResumenMaximoUsd(caracteres, 4096)).toBeGreaterThanOrEqual(
      costoResumenUsd(tokensEntradaReales, 4096)
    );
  });

  it("resumen: el pedido más caro posible cuesta centavos (exceso acotado sobre el tope)", () => {
    expect(costoResumenMaximoUsd(100_000, 4096)).toBeLessThan(0.1);
  });
});
