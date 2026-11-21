import { describe, expect, it } from "vitest";
import {
  ANTECEDENTE_LABELS,
  alertasClinicas,
  alertasOdontologicas,
  antecedenteAplicaAlSexo,
  ayudasDiagnostico,
  datosEvaluacionNutricional,
  datosGinecoObstetricos,
  esSaludMental,
  EXAMEN_PSIQUICO,
  antecedentesPara,
  etiquetasHistoriaClinica,
  usaSesiones,
} from "./constants";
import { TIPO_ANTECEDENTE_VALUES } from "@/lib/patient-schema";

describe("antecedentesPara", () => {
  it("cada grupo tiene su checklist", () => {
    expect(antecedentesPara("MEDICA").orden.map((a) => a.tipo)).toContain("PROSTATA");
    expect(antecedentesPara("PSICOLOGIA").orden.map((a) => a.tipo)).toContain("AUTOLESIONES");
    const odonto = antecedentesPara("ODONTOLOGICA").orden.map((a) => a.tipo);
    expect(odonto).toContain("ANTICOAGULANTES");
    expect(odonto).not.toContain("PROSTATA");
    const fono = antecedentesPara("FONOAUDIOLOGIA").orden.map((a) => a.tipo);
    expect(fono).toContain("HIPOACUSIA");
    expect(fono).not.toContain("PROSTATA");
    const pediatria = antecedentesPara("PEDIATRICA").orden.map((a) => a.tipo);
    expect(pediatria).toContain("VACUNACION_INCOMPLETA");
    expect(pediatria).not.toContain("PROSTATA");
  });

  it("los antecedentes reusados por pediatría mantienen su etiqueta de siempre", () => {
    expect(ANTECEDENTE_LABELS.get("ALERGIA")).not.toBe("Alergias");
    expect(ANTECEDENTE_LABELS.get("DISLIPEMIA")).toBe("Dislipemia");
    expect(ANTECEDENTE_LABELS.get("NOD_MAMAS")).toBe("Nod. mamas");
    expect(ANTECEDENTE_LABELS.get("EMBARAZO")).toBe("Embarazo");
  });

  it("los antecedentes reusados por fonoaudiología mantienen su etiqueta médica", () => {
    expect(ANTECEDENTE_LABELS.get("NEUROLOGICAS")).toBe("Neurológicas");
  });

  it("no repite tipos dentro de un grupo y todos son valores válidos", () => {
    for (const grupo of [
      "MEDICA",
      "PEDIATRICA",
      "GINECOLOGICA",
      "PSIQUIATRICA",
      "NUTRICION",
      "OFTALMOLOGICA",
      "ORL",
      "DERMATOLOGICA",
      "LOCOMOTOR",
      "ONCOLOGICA",
      "PSICOLOGIA",
      "ODONTOLOGICA",
      "FONOAUDIOLOGIA",
    ] as const) {
      const tipos = antecedentesPara(grupo).orden.map((a) => a.tipo);
      expect(new Set(tipos).size).toBe(tipos.length);
      for (const tipo of tipos) expect(TIPO_ANTECEDENTE_VALUES).toContain(tipo);
    }
  });

  it("todos los antecedentes tienen etiqueta", () => {
    for (const tipo of TIPO_ANTECEDENTE_VALUES) expect(ANTECEDENTE_LABELS.has(tipo)).toBe(true);
  });
});

describe("etiquetasHistoriaClinica", () => {
  it("odontología llama plan de tratamiento al tratamiento", () => {
    expect(etiquetasHistoriaClinica("ODONTOLOGICA").tratamiento).toBe("Plan de tratamiento");
    expect(etiquetasHistoriaClinica("MEDICA").tratamiento).toBe("Tratamiento");
  });

  it("fonoaudiología tiene sus propias etiquetas", () => {
    expect(etiquetasHistoriaClinica("FONOAUDIOLOGIA").diagnosticoPresuntivo).toBe("Diagnóstico fonoaudiológico");
  });
});

describe("usaSesiones", () => {
  it("psicología y fonoaudiología registran sesiones; médicos y odontólogos no", () => {
    expect(usaSesiones("PSICOLOGIA")).toBe(true);
    expect(usaSesiones("FONOAUDIOLOGIA")).toBe(true);
    expect(usaSesiones("MEDICA")).toBe(false);
    expect(usaSesiones("ODONTOLOGICA")).toBe(false);
    expect(usaSesiones("PEDIATRICA")).toBe(false);
  });
});

describe("alertasOdontologicas", () => {
  it("solo avisa los críticos marcados en SI, con el detalle cargado", () => {
    expect(
      alertasOdontologicas([
        { tipo: "ANTICOAGULANTES", respuesta: true, medicacion: "acenocumarol 4 mg" },
        { tipo: "ALERGIA_ANESTESICOS", respuesta: true },
        { tipo: "BIFOSFONATOS", respuesta: false, medicacion: "alendronato" },
        { tipo: "DIABETES", respuesta: true },
      ])
    ).toEqual(["Alergia a anestésicos locales", "Anticoagulado (acenocumarol 4 mg)"]);
  });

  it("sin antecedentes no hay alertas", () => {
    expect(alertasOdontologicas([])).toEqual([]);
  });
});

describe("alertasClinicas", () => {
  it("pediatría avisa alergias, cardiopatías y convulsiones", () => {
    expect(
      alertasClinicas("PEDIATRICA", [
        { tipo: "ALERGIA", respuesta: true, descripcion: "amoxicilina" },
        { tipo: "CONVULSIONES", respuesta: true },
        { tipo: "ASMA", respuesta: true },
      ])
    ).toEqual(["Alergia (amoxicilina)", "Convulsiones"]);
  });

  it("los grupos sin antecedentes críticos no tienen alertas", () => {
    expect(alertasClinicas("MEDICA", [{ tipo: "ALERGIA", respuesta: true }])).toEqual([]);
  });
});

describe("datosGinecoObstetricos", () => {
  it("lista solo lo cargado, con la fórmula obstétrica armada", () => {
    expect(
      datosGinecoObstetricos({ menarca: "12", gestas: "2", partos: "2", cesareas: "0", abortos: "0", ultimoPap: "" }, false)
    ).toEqual([
      { label: "Menarca", value: "12" },
      { label: "Fórmula obstétrica", value: "G2 P2 C0 A0" },
    ]);
  });

  it("sin embarazo marcado no calcula edad gestacional", () => {
    const datos = datosGinecoObstetricos({ fum: "2026-06-01" }, false);
    expect(datos.map((d) => d.label)).toEqual(["FUM"]);
    expect(datos[0].value).toBe("1/6/2026");
  });
});

describe("psiquiatría", () => {
  it("comparte con psicología el riesgo y la historia personal, pero no las sesiones", () => {
    expect(esSaludMental("PSIQUIATRICA")).toBe(true);
    expect(esSaludMental("PSICOLOGIA")).toBe(true);
    expect(esSaludMental("MEDICA")).toBe(false);
    expect(usaSesiones("PSIQUIATRICA")).toBe(false);
  });

  it("avisa intentos de suicidio previos y embarazo", () => {
    expect(
      alertasClinicas("PSIQUIATRICA", [
        { tipo: "INTENTOS_SUICIDIO", respuesta: true, descripcion: "2019" },
        { tipo: "EMBARAZO", respuesta: true },
        { tipo: "CONSUMO_SUSTANCIAS", respuesta: true },
      ])
    ).toEqual(["Intentos de suicidio previos (2019)", "Embarazo o lactancia"]);
  });

  it("todos los campos del examen psíquico son del formulario", () => {
    const campos = EXAMEN_PSIQUICO.map((e) => e.campo);
    expect(new Set(campos).size).toBe(campos.length);
    expect(campos.every((c) => c.startsWith("ep"))).toBe(true);
  });

  it("los reusados mantienen su etiqueta de siempre", () => {
    expect(ANTECEDENTE_LABELS.get("CARDIOPATIAS")).toBe("Cardiopatías");
    expect(ANTECEDENTE_LABELS.get("MEDICACION_PSIQUIATRICA")).toBe("Medicación psiquiátrica");
  });
});

describe("nutrición", () => {
  it("avisa celiaquía, alergias alimentarias y TCA", () => {
    expect(
      alertasClinicas("NUTRICION", [
        { tipo: "ENFERMEDAD_CELIACA", respuesta: true },
        { tipo: "ALERGIA", respuesta: true, descripcion: "maní" },
        { tipo: "TRASTORNOS_CONDUCTA_ALIMENTARIA", respuesta: true },
        { tipo: "DIABETES", respuesta: true },
      ])
    ).toEqual(["Celiaquía", "Alergia alimentaria (maní)", "Trastorno de la conducta alimentaria"]);
  });

  it("la evaluación lista lo cargado con el IMC calculado", () => {
    expect(
      datosEvaluacionNutricional({ pesoActual: "82,4", estatura: "1,65", circunferenciaCintura: "98" }, false)
    ).toEqual([
      { label: "Peso", value: "82,4" },
      { label: "Estatura", value: "1,65" },
      { label: "IMC", value: "30,3 (Obesidad grado I)" },
      { label: "Circunferencia de cintura", value: "98" },
    ]);
  });

  it("los reusados mantienen su etiqueta de siempre", () => {
    expect(ANTECEDENTE_LABELS.get("DIABETES")).toBe("Diabetes");
    expect(ANTECEDENTE_LABELS.get("ANTECEDENTES_FAMILIARES")).toBe("Enfermedades familiares relevantes");
  });
});

describe("exámenes de órgano", () => {
  it("cada uno avisa lo suyo", () => {
    expect(alertasClinicas("OFTALMOLOGICA", [{ tipo: "GLAUCOMA", respuesta: true, descripcion: "OD" }])).toEqual([
      "Glaucoma o hipertensión ocular (OD)",
    ]);
    expect(alertasClinicas("ORL", [{ tipo: "ANTICOAGULANTES", respuesta: true }])).toEqual(["Anticoagulado"]);
    expect(alertasClinicas("DERMATOLOGICA", [{ tipo: "EMBARAZO", respuesta: true }])).toEqual(["Embarazo o lactancia"]);
    expect(alertasClinicas("LOCOMOTOR", [{ tipo: "ANTICOAGULANTES", respuesta: true }])).toEqual(["Anticoagulado"]);
    expect(alertasClinicas("ONCOLOGICA", [{ tipo: "INMUNOSUPRESION", respuesta: true }])).toEqual(["Inmunosuprimido"]);
  });
});

describe("ayudasDiagnostico", () => {
  it("los médicos conservan la ayuda que tenían; los grupos con nombre propio no la necesitan", () => {
    expect(ayudasDiagnostico("MEDICA").tratamiento).toContain("dosis");
    expect(ayudasDiagnostico("PSIQUIATRICA").tratamiento).toContain("Psicofármacos");
    expect(ayudasDiagnostico("ODONTOLOGICA")).toEqual({});
  });
});

describe("antecedenteAplicaAlSexo", () => {
  it("oculta próstata en pacientes mujeres, salvo que esté marcada", () => {
    expect(antecedenteAplicaAlSexo("PROSTATA", "FEMENINO", false)).toBe(false);
    expect(antecedenteAplicaAlSexo("PROSTATA", "FEMENINO", true)).toBe(true);
    expect(antecedenteAplicaAlSexo("PROSTATA", "MASCULINO", false)).toBe(true);
    expect(antecedenteAplicaAlSexo("PROSTATA", "", false)).toBe(true);
    expect(antecedenteAplicaAlSexo("NOD_MAMAS", "MASCULINO", false)).toBe(true);
  });
});
