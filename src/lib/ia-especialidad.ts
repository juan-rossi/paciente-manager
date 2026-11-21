import type { Especialidad } from "@/lib/especialidad";

// Ajustes del dictado y del resumen con IA para las especialidades del grupo
// médico, que comparten la historia clínica pero no el vocabulario. Las que
// no figuran usan lo general de clínica médica.

// Prompt del transcriptor (Whisper toma este texto como "transcripción
// previa" y sesga el vocabulario): términos, estudios y drogas de cada
// especialidad. Corto: Whisper usa solo los últimos ~220 tokens.
export const VOCABULARIO_DICTADO: Partial<Record<Especialidad, string>> = {
  CARDIOLOGIA:
    "Consulta de cardiología en español. Tensión arterial 140/90, frecuencia cardíaca 72, ritmo sinusal. Electrocardiograma con bloqueo de rama izquierda, fibrilación auricular, extrasístoles. Ecocardiograma: fracción de eyección 45 por ciento, hipertrofia ventricular izquierda, insuficiencia mitral. Ergometría, Holter, cinecoronariografía, angioplastia con stent. Insuficiencia cardíaca, cardiopatía isquémica, angina. Enalapril, losartán, carvedilol, bisoprolol, amlodipina, furosemida, espironolactona, atorvastatina, rosuvastatina, aspirina, clopidogrel, apixaban, rivaroxabán, acenocumarol, RIN.",
  DIABETOLOGIA:
    "Consulta de diabetología en español. Diabetes tipo 2, hemoglobina glicosilada 7,8 por ciento, glucemia en ayunas 145, monitoreo continuo de glucosa, hipoglucemias. Metformina 850, sitagliptina, empagliflozina, dapagliflozina, semaglutida, liraglutida, insulina glargina 20 unidades, insulina lispro, corrección según glucemia. Fondo de ojo, microalbuminuria, pie diabético, neuropatía.",
  ENDOCRINOLOGIA:
    "Consulta de endocrinología en español. Hipotiroidismo, TSH 6,2, T4 libre 0,9, anticuerpos antiTPO positivos, nódulo tiroideo, ecografía tiroidea, punción, TIRADS. Levotiroxina 75 microgramos, metimazol. Hipertiroidismo, enfermedad de Graves, síndrome de ovario poliquístico, osteoporosis, densitometría, vitamina D, cortisol, prolactina, insuficiencia suprarrenal.",
  NEFROLOGIA:
    "Consulta de nefrología en español. Enfermedad renal crónica estadio 3b, creatinina 1,8, filtrado glomerular 38, proteinuria de 24 horas, relación albúmina creatinina, potasio 5,4, hiperpotasemia, acidosis metabólica, anemia renal. Hemodiálisis, diálisis peritoneal, fístula arteriovenosa, trasplante renal. Enalapril, losartán, dapagliflozina, furosemida, bicarbonato, eritropoyetina, calcitriol, sevelamer.",
  NEUMONOLOGIA:
    "Consulta de neumonología en español. Saturación 94 por ciento, espirometría con VEF1 62 por ciento del predicho, relación VEF1 sobre CVF 0,65, prueba broncodilatadora positiva. EPOC, asma, bronquiectasias, fibrosis pulmonar, nódulo pulmonar, apnea del sueño, polisomnografía, CPAP. Tomografía de tórax. Salbutamol, budesonida formoterol, fluticasona, tiotropio, montelukast, prednisona, oxigenoterapia domiciliaria.",
  GASTROENTEROLOGIA:
    "Consulta de gastroenterología en español. Videoendoscopía digestiva alta con gastritis, Helicobacter pylori, esofagitis por reflujo, Barrett. Videocolonoscopía con pólipos, biopsia. Enfermedad celíaca, colon irritable, enfermedad de Crohn, colitis ulcerosa, dispepsia, constipación, diarrea crónica. Omeprazol, pantoprazol, domperidona, mesalazina, lactulosa, polietilenglicol.",
  HEPATOLOGIA:
    "Consulta de hepatología en español. Hígado graso, esteatohepatitis, cirrosis Child-Pugh B, MELD 14, hepatitis B y C, carga viral, elastografía, Fibroscan, ascitis, várices esofágicas, encefalopatía hepática. Transaminasas TGO TGP, bilirrubina, fosfatasa alcalina, GGT, albúmina, RIN. Ácido ursodesoxicólico, propranolol, espironolactona, lactulosa, rifaximina.",
  COLOPROCTOLOGIA:
    "Consulta de coloproctología en español. Hemorroides internas grado 2, trombosis hemorroidal, fisura anal, fístula perianal, absceso, prolapso rectal, incontinencia. Tacto rectal, anoscopía, rectosigmoidoscopía, videocolonoscopía, manometría anorrectal. Ligadura con banda elástica, esfinterotomía, hemorroidectomía.",
  UROLOGIA:
    "Consulta de urología en español. Hiperplasia prostática benigna, PSA 4,2, volumen prostático 45 gramos, tacto rectal, IPSS, residuo postmiccional, litiasis renal, cólico renal, infección urinaria, urocultivo, hematuria, incontinencia. Ecografía renal y vesical, biopsia prostática, resonancia multiparamétrica, cistoscopía. Tamsulosina, dutasterida, finasteride, solifenacina.",
  INFECTOLOGIA:
    "Consulta de infectología en español. HIV, carga viral indetectable, CD4 450, tratamiento antirretroviral con bictegravir, emtricitabina, tenofovir, dolutegravir. Hepatitis B y C, sífilis, VDRL, tuberculosis, PPD, profilaxis PrEP. Hemocultivos, urocultivo, antibiograma, germen multirresistente. Amoxicilina clavulánico, ceftriaxona, ciprofloxacina, vancomicina, trimetoprima sulfametoxazol, fluconazol.",
  ALERGIA_E_INMUNOLOGIA:
    "Consulta de alergia e inmunología en español. Rinitis alérgica, asma, urticaria crónica, angioedema, alergia alimentaria, alergia a medicamentos, anafilaxia, dermatitis de contacto. Prick test positivo para ácaros y pólenes, IgE total, IgE específica, prueba de provocación. Inmunoterapia sublingual, antihistamínicos, cetirizina, desloratadina, montelukast, omalizumab, adrenalina autoinyectable.",
  GERIATRIA:
    "Consulta de geriatría en español. Valoración geriátrica integral, índice de Barthel 75, Lawton, minimental 22, deterioro cognitivo, demencia, delirium, caídas, fragilidad, sarcopenia, polifarmacia, desprescripción, incontinencia, úlceras por presión. Escala de depresión geriátrica de Yesavage. Donepecilo, memantina, quetiapina, vitamina D, calcio.",
  FLEBOLOGIA:
    "Consulta de flebología en español. Insuficiencia venosa crónica, clasificación CEAP C2, várices, telangiectasias, edema, úlcera venosa, trombosis venosa profunda, eco-Doppler venoso con reflujo safeno. Escleroterapia, láser endovenoso, media de compresión. Diosmina, hesperidina, rivaroxabán.",
};

// Regla extra del resumen: qué datos de cada especialidad conservar tal cual.
export const REGLA_RESUMEN: Partial<Record<Especialidad, string>> = {
  CARDIOLOGIA:
    "- Conservá exactos tensión arterial, frecuencia cardíaca, ritmo, hallazgos del electrocardiograma, fracción de eyección y demás datos del ecocardiograma, y las dosis de antihipertensivos, anticoagulantes y estatinas.",
  DIABETOLOGIA:
    "- Conservá exactos los valores de glucemia y HbA1c, las hipoglucemias, y el esquema de insulina (tipo, unidades y horarios) y de antidiabéticos.",
  ENDOCRINOLOGIA:
    "- Conservá exactos los valores hormonales (TSH, T4 libre, cortisol, etc.), los hallazgos de la ecografía (TIRADS, tamaño de los nódulos) y las dosis de levotiroxina u otras hormonas.",
  NEFROLOGIA:
    "- Conservá exactos creatinina, filtrado glomerular, proteinuria, electrolitos (potasio, sodio) y el esquema de diálisis si lo hay.",
  NEUMONOLOGIA:
    "- Conservá exactos la saturación, los valores de la espirometría (VEF1, CVF, relación, respuesta broncodilatadora) y los inhaladores con su dosis.",
  GASTROENTEROLOGIA:
    "- Conservá exactos los hallazgos endoscópicos y de biopsia, y las dosis indicadas.",
  HEPATOLOGIA:
    "- Conservá exactos transaminasas, bilirrubina, albúmina, RIN, los puntajes (Child-Pugh, MELD) y el resultado de la elastografía.",
  COLOPROCTOLOGIA: "- Conservá exactos el grado y la ubicación horaria de las lesiones y los hallazgos de cada estudio.",
  UROLOGIA:
    "- Conservá exactos el PSA, el volumen prostático, el puntaje IPSS, el residuo postmiccional y el tamaño y la ubicación de los cálculos.",
  INFECTOLOGIA:
    "- Conservá exactos CD4, carga viral, el esquema antirretroviral o antibiótico (drogas, dosis, duración) y los resultados de cultivos y serologías.",
  ALERGIA_E_INMUNOLOGIA:
    "- Conservá exactos los alérgenos, el resultado de las pruebas cutáneas o de IgE, las reacciones descriptas y el esquema de inmunoterapia.",
  GERIATRIA:
    "- Conservá exactos los puntajes de las escalas (Barthel, Lawton, minimental), las caídas y la lista de medicación (con los cambios por desprescripción).",
  FLEBOLOGIA: "- Conservá exactos la clasificación CEAP, los hallazgos del eco-Doppler y el lado afectado.",
};
