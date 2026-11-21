// Número de un campo de texto libre ("72,5 kg", "1.68 m", "168"). Null si no
// hay un número.
function numeroDe(valor: string | null | undefined): number | null {
  const match = /\d+(?:[.,]\d+)?/.exec(valor ?? "");
  if (!match) return null;
  const n = Number(match[0].replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Índice de masa corporal a partir del peso y la estatura tal como se cargan
// (texto libre). La estatura puede venir en metros ("1,68") o en centímetros
// ("168"). Null si falta alguno o el resultado no es plausible.
export function calcularImc(
  peso: string | null | undefined,
  estatura: string | null | undefined
): number | null {
  const kg = numeroDe(peso);
  let metros = numeroDe(estatura);
  if (kg == null || metros == null) return null;
  if (metros > 3) metros /= 100;
  const imc = kg / (metros * metros);
  if (!Number.isFinite(imc) || imc < 8 || imc > 100) return null;
  return Math.round(imc * 10) / 10;
}

// Clasificación de la OMS para adultos. En menores de 18 el IMC se lee por
// percentiles según edad y sexo, así que no se clasifica.
export function clasificacionImc(imc: number): string {
  if (imc < 18.5) return "Bajo peso";
  if (imc < 25) return "Peso normal";
  if (imc < 30) return "Sobrepeso";
  if (imc < 35) return "Obesidad grado I";
  if (imc < 40) return "Obesidad grado II";
  return "Obesidad grado III";
}

// "27,3 (Sobrepeso)" o, para menores, solo el número. Vacío si no se puede
// calcular.
export function imcLegible(
  peso: string | null | undefined,
  estatura: string | null | undefined,
  menorDeEdad: boolean
): string {
  const imc = calcularImc(peso, estatura);
  if (imc == null) return "";
  const numero = imc.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return menorDeEdad ? numero : `${numero} (${clasificacionImc(imc)})`;
}
