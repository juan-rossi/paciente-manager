import "dotenv/config";
import fs from "node:fs";
import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const EXPORT_DIR =
  "C:/Users/JP/AppData/Local/Temp/claude/d--Dev-projects-paciente-manager/cfb25938-90f2-4fda-a5a3-6deb1cb297a5/scratchpad/legacy-export";

// `prisma dev`'s local proxy is flaky under concurrent load ("Server has closed
// the connection") — same pool tuning as src/lib/prisma.ts, and imports run
// sequentially with retries below.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 100,
  connectionTimeoutMillis: 0,
});
const prisma = new PrismaClient({ adapter });

async function withRetry(fn, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      const transient = /connection/i.test(error.message ?? "");
      if (!transient || i === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * i));
    }
  }
}

function loadJson(file) {
  const txt = fs.readFileSync(`${EXPORT_DIR}/${file}`, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(txt);
}

function blankToNull(value) {
  if (value === null || value === undefined) return null;
  return value === "" ? null : value;
}

function mapSexo(value) {
  if (value === "M") return "MASCULINO";
  if (value === "F") return "FEMENINO";
  return null;
}

const ESTADO_CIVIL_BY_ID = { 1: "SOLTERO", 2: "CASADO", 3: "VIUDO", 4: "CONCUBINO" };
function mapEstadoCivil(id) {
  return ESTADO_CIVIL_BY_ID[id] ?? null;
}

const TIPO_ANTECEDENTE_BY_ID = {
  1: "DISLIPEMIA",
  2: "HIPOTIROIDISMO",
  3: "HIPERTIROIDISMO",
  4: "ARTRITIS",
  5: "DIABETES",
  6: "ALERGIA",
  7: "NEOPLASIAS",
  8: "ARRITMIAS",
  9: "HTA",
  10: "ARTROSIS",
  11: "ALCOHOLISMO",
  12: "PSIQUIATRICAS",
  13: "INFECCIOSAS",
  14: "PROSTATA",
  15: "NOD_MAMAS",
  16: "EPOC",
  17: "CARDIOPATIAS",
  18: "NEUROLOGICAS",
  19: "ASMA",
  20: "OTROS",
};

// Legacy values look like "06/14/1987" or "11/12/1989 12:00:00 AM" (M/D/YYYY, not zero-padded).
function parseLegacyDateParts(value) {
  if (!value) return null;
  const datePart = value.split(" ")[0];
  const match = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2026) return null;
  return { year, month, day };
}

function parseFechaNacimiento(value) {
  const parts = parseLegacyDateParts(value);
  return parts ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day)) : null;
}

// El input de fechaInicio en el formulario es <input type="date">, que espera "YYYY-MM-DD".
function parseFechaInicioAntecedente(value) {
  const parts = parseLegacyDateParts(value);
  if (!parts) return null;
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

// PowerShell ConvertTo-Json serializes [datetime] as "/Date(ms)/".
function parsePsDate(value) {
  const match = /^\/Date\((\d+)\)\/$/.exec(value ?? "");
  if (!match) return null;
  return new Date(Number(match[1]));
}

async function runBatched(items, concurrency, worker) {
  let index = 0;
  const results = [];
  async function next() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
  return results;
}

async function main() {
  const limit = process.argv[2] ? Number(process.argv[2]) : null;
  let patients = loadJson("patients.json");
  if (limit) patients = patients.slice(0, limit);
  const antecedentes = loadJson("antecedentes.json");
  const habitos = loadJson("habitos.json");
  const evoluciones = loadJson("evoluciones.json");

  const antecedentesByHistoria = new Map();
  for (const a of antecedentes) {
    const list = antecedentesByHistoria.get(a.historiaId) ?? [];
    list.push(a);
    antecedentesByHistoria.set(a.historiaId, list);
  }

  const habitosByHistoria = new Map();
  for (const h of habitos) {
    const set = habitosByHistoria.get(h.historiaId) ?? new Set();
    set.add(h.tipoHabitoId);
    habitosByHistoria.set(h.historiaId, set);
  }

  const evolucionesByHistoria = new Map();
  for (const e of evoluciones) {
    const list = evolucionesByHistoria.get(e.historiaId) ?? [];
    list.push(e);
    evolucionesByHistoria.set(e.historiaId, list);
  }

  let created = 0;
  let fechaNacimientoFallbacks = 0;
  const errors = [];

  await runBatched(patients, 3, async (p) => {
    const fechaNacimiento = parseFechaNacimiento(p.fechaNacimiento);
    if (!fechaNacimiento) fechaNacimientoFallbacks++;

    const habitosSet = habitosByHistoria.get(p.historiaId) ?? new Set();
    const antecedentesLegacy = antecedentesByHistoria.get(p.historiaId) ?? [];
    const evolucionesLegacy = evolucionesByHistoria.get(p.historiaId) ?? [];

    const data = {
      nombreYApellido: p.nombreYApellido,
      fechaNacimiento,
      sexo: mapSexo(p.sexo),
      estadoCivil: mapEstadoCivil(p.estadoCivilId),
      profesion: blankToNull(p.profesion),
      nroDocumento: blankToNull(p.nroDocumento),
      nacionalidad: blankToNull(p.nacionalidad),
      obraSocial: blankToNull(p.obraSocial),
      obraSocialNro: blankToNull(p.obraSocialNro),
      domicilio: blankToNull(p.domicilio),
      telefono: blankToNull(p.telefono),
      contactoEmergencia: blankToNull(p.contactoEmergencia),
      telefonoEmergencia: blankToNull(p.telefonoEmergencia),

      autoValidoTotal: blankToNull(p.autoValidoTotal),
      autoValidoParcial: blankToNull(p.autoValidoParcial),
      dependiente: blankToNull(p.dependiente),
      motivoConsulta: blankToNull(p.motivoConsulta),
      antecedentesEnfermedad: blankToNull(p.antecedentesEnfermedad),
      habitoAlcohol: habitosSet.has(1),
      habitoCigarrillos: habitosSet.has(2),
      habitoDrogas: habitosSet.has(3),

      frecuenciaCardiaca: blankToNull(p.frecuenciaCardiaca),
      pulsoRadial: blankToNull(p.pulsoRadial),
      ritmo: blankToNull(p.ritmo),
      presionArterial: blankToNull(p.presionArterial),
      frecuenciaRespiratoria: blankToNull(p.frecuenciaRespiratoria),
      pesoActual: blankToNull(p.pesoActual),
      pesoHabitual: blankToNull(p.pesoHabitual),
      estatura: blankToNull(p.estatura),
      temperatura: blankToNull(p.temperatura),

      craneo: blankToNull(p.craneo),
      ojo: blankToNull(p.ojo),
      oido: blankToNull(p.oido),
      pcfg: blankToNull(p.pcfg),
      toraxForma: blankToNull(p.toraxForma),
      toraxMamas: blankToNull(p.toraxMamas),
      auscultacionMV: blankToNull(p.auscultacionMV),
      auscultacionVV: blankToNull(p.auscultacionVV),
      rales: blankToNull(p.rales),
      excursion: blankToNull(p.excursion),
      acvR1: blankToNull(p.acvR1),
      acvR2: blankToNull(p.acvR2),
      soplos: blankToNull(p.soplos),
      carotideo: blankToNull(p.carotideo),
      radial: blankToNull(p.radial),
      femoral: blankToNull(p.femoral),
      pedio: blankToNull(p.pedio),
      ppRenalDerecha: blankToNull(p.ppRenalDerecha),
      ppRenalIzquierda: blankToNull(p.ppRenalIzquierda),
      mamas: blankToNull(p.mamas),

      cuelloPalpacion: blankToNull(p.cuelloPalpacion),
      cuelloTamanio: blankToNull(p.cuelloTamanio),
      cuelloAuscultacion: blankToNull(p.cuelloAuscultacion),

      abdomenInspeccion: blankToNull(p.abdomenInspeccion),
      abdomenPalpacion: blankToNull(p.abdomenPalpacion),
      abdomenAuscultacion: blankToNull(p.abdomenAuscultacion),

      columnaCervical: blankToNull(p.columnaCervical),
      dorsal: blankToNull(p.dorsal),
      lumbar: blankToNull(p.lumbar),
      articulaciones: blankToNull(p.articulaciones),
      movilidad: blankToNull(p.movilidad),
      dolor: blankToNull(p.dolor),
      tumefaccion: blankToNull(p.tumefaccion),

      sensorio: blankToNull(p.sensorio),
      lenguaje: blankToNull(p.lenguaje),
      marcha: blankToNull(p.marcha),
      temblor: blankToNull(p.temblor),
      taxia: blankToNull(p.taxia),
      reflejosFotomotor: blankToNull(p.reflejosFotomotor),
      reflejosAcomodacion: blankToNull(p.reflejosAcomodacion),
      osteotendinosos: blankToNull(p.osteotendinosos),
      sensibilidad: blankToNull(p.sensibilidad),

      diagnosticoPresuntivo: blankToNull(p.diagnosticoPresuntivo),
      metodosComplementarios: blankToNull(p.metodosComplementarios),
      tratamiento: blankToNull(p.tratamiento),

      antecedentes: {
        create: antecedentesLegacy.map((a) => ({
          tipo: TIPO_ANTECEDENTE_BY_ID[a.tipoAntecedenteId],
          respuesta: true,
          descripcion: blankToNull(a.descripcion),
          fechaInicio: parseFechaInicioAntecedente(a.fechaInicio),
          medicacion: blankToNull(a.medicacion),
          resolucion: blankToNull(a.resolucion),
        })),
      },
      evoluciones: {
        create: evolucionesLegacy.map((e) => ({
          fecha: parsePsDate(e.fecha) ?? new Date(0),
          contenido: e.contenido,
        })),
      },
    };

    try {
      await withRetry(() => prisma.patient.create({ data }));
      created++;
    } catch (error) {
      errors.push({ historiaId: p.historiaId, message: error.message });
    }
  });

  console.log(`Pacientes creados: ${created}/${patients.length}`);
  console.log(`fechaNacimiento no parseable (quedó null): ${fechaNacimientoFallbacks}`);
  console.log(`Errores: ${errors.length}`);
  if (errors.length > 0) {
    console.log(JSON.stringify(errors.slice(0, 20), null, 2));
  }

  await prisma.$disconnect();
}

main();
