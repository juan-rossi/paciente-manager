-- CreateTable
CREATE TABLE "PracticaOdontologica" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "capitulo" INTEGER NOT NULL,
    "subgrupo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticaOdontologica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticaOdontologica_codigo_key" ON "PracticaOdontologica"("codigo");

-- CreateIndex
CREATE INDEX "PracticaOdontologica_capitulo_idx" ON "PracticaOdontologica"("capitulo");

-- Seed: Nomenclador Nacional de Prestaciones Odontológicas (codificación
-- FOPBA, act. abril 2006), sin las prestaciones marcadas como "no incluidas
-- en Nomenclador Nacional".
INSERT INTO "PracticaOdontologica" ("id", "codigo", "descripcion", "capitulo", "subgrupo") VALUES
    -- Capítulo I - Consultas
    (gen_random_uuid()::text, '01.01', 'Examen, diagnóstico, fichado y plan de tratamiento', 1, NULL),
    (gen_random_uuid()::text, '01.03', 'Visita a domicilio', 1, NULL),
    (gen_random_uuid()::text, '01.04', 'Consulta de urgencia (prestación que no constituye paso intermedio y/o final de tratamiento)', 1, NULL),
    -- Capítulo II - Operatoria dental
    (gen_random_uuid()::text, '02.01', 'Obturación con amalgama. Cavidad simple', 2, NULL),
    (gen_random_uuid()::text, '02.02', 'Obturación con amalgama. Cavidad compuesta o compleja', 2, NULL),
    (gen_random_uuid()::text, '02.04', 'Obturación con amalgama. Reconstrucción con tornillo en conducto', 2, NULL),
    (gen_random_uuid()::text, '02.05', 'Obturación con cemento de silicato. Cavidad simple', 2, NULL),
    (gen_random_uuid()::text, '02.06', 'Obturación con cemento de silicato. Cavidad compuesta', 2, NULL),
    (gen_random_uuid()::text, '02.08', 'Restauración con material estético', 2, NULL),
    (gen_random_uuid()::text, '02.09', 'Reconstrucción de ángulo en dientes anteriores', 2, NULL),
    -- Capítulo III - Endodoncia
    (gen_random_uuid()::text, '03.01', 'Tratamiento unirradicular', 3, NULL),
    (gen_random_uuid()::text, '03.02', 'Tratamiento multirradicular', 3, NULL),
    (gen_random_uuid()::text, '03.05', 'Biopulpectomía parcial', 3, NULL),
    (gen_random_uuid()::text, '03.06', 'Necropulpectomía parcial (momificación)', 3, NULL),
    -- Capítulo IV - Prótesis
    (gen_random_uuid()::text, '04.01.01', 'Incrustación. Cavidad simple', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.02', 'Incrustación. Cavidad compuesta y compleja', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.03', 'Corona forjada', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.04', 'Corona colada', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.05', 'Corona colada con frente estético', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.06', 'Corona espiga', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.07', 'Corona colada revestida en acrílico', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.08', 'Perno muñón simple', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.09', 'Perno muñón seccionado', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.10', 'Tramo de puente colado', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.11', 'Corona de acrílico', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.01.12', 'Elemento provisorio, por unidad', 4, 'Prótesis fija'),
    (gen_random_uuid()::text, '04.02.01', 'Prótesis removible de acrílico, hasta cuatro dientes', 4, 'Prótesis removibles'),
    (gen_random_uuid()::text, '04.02.02', 'Prótesis removible de acrílico, de cinco o más dientes', 4, 'Prótesis removibles'),
    (gen_random_uuid()::text, '04.02.03', 'Prótesis removible colada de cromo cobalto, hasta cuatro dientes', 4, 'Prótesis removibles'),
    (gen_random_uuid()::text, '04.02.04', 'Prótesis removible colada de cromo cobalto, de cinco o más dientes', 4, 'Prótesis removibles'),
    (gen_random_uuid()::text, '04.02.05', 'Prótesis parcial inmediata', 4, 'Prótesis removibles'),
    (gen_random_uuid()::text, '04.03.01', 'Prótesis completa superior', 4, 'Prótesis completas'),
    (gen_random_uuid()::text, '04.03.02', 'Prótesis completa inferior', 4, 'Prótesis completas'),
    (gen_random_uuid()::text, '04.03.03', 'Prótesis completa inmediata', 4, 'Prótesis completas'),
    (gen_random_uuid()::text, '04.03.04', 'Base colada para prótesis completa', 4, 'Prótesis completas'),
    (gen_random_uuid()::text, '04.04.01', 'Compostura simple', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.02', 'Compostura con agregado de un diente', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.03', 'Compostura con agregado de un retenedor', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.04', 'Compostura con agregado de un diente y un retenedor', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.05', 'Diente subsiguiente, cada uno', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.06', 'Retenedor subsiguiente, cada uno', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.07', 'Soldado de retención en aparato de cromo cobalto con agregado de un diente', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.08', 'Retención subsiguiente', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.09', 'Carilla de acrílico', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.10', 'Rebasado de prótesis, cada uno', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.11', 'Cubeta individual', 4, 'Varios'),
    (gen_random_uuid()::text, '04.04.12', 'Levante de articulación en acrílico traslúcido y retenedores forjados en acero', 4, 'Varios'),
    -- Capítulo V - Odontología preventiva
    (gen_random_uuid()::text, '05.01', 'Tartrectomía y cepillado mecánico', 5, NULL),
    (gen_random_uuid()::text, '05.02', 'Consulta preventiva periódica. Cepillado previo y aplicación de flúor', 5, NULL),
    (gen_random_uuid()::text, '05.04', 'Enseñanza de técnicas de higiene bucal. Detección y control de placa bacteriana', 5, NULL),
    (gen_random_uuid()::text, '05.05', 'Sellante de puntos y fisuras, por pieza dental', 5, NULL),
    -- Capítulo VI - Ortodoncia u ortopedia funcional
    (gen_random_uuid()::text, '06.01', 'Consulta de estudio de ortodoncia', 6, NULL),
    (gen_random_uuid()::text, '06.02', 'Tratamiento de la dentición primaria o mixta', 6, NULL),
    (gen_random_uuid()::text, '06.03', 'Tratamiento de la dentición permanente', 6, NULL),
    (gen_random_uuid()::text, '06.04', 'Corrección de malposiciones simples con espacio', 6, NULL),
    -- Capítulo VII - Odontopediatría
    (gen_random_uuid()::text, '07.01', 'Motivación', 7, NULL),
    (gen_random_uuid()::text, '07.02', 'Mantenedor de espacio fijo', 7, NULL),
    (gen_random_uuid()::text, '07.03', 'Mantenedor de espacio removible', 7, NULL),
    (gen_random_uuid()::text, '07.04', 'Tratamiento de dientes primarios con formocresol', 7, NULL),
    (gen_random_uuid()::text, '07.05', 'Corona metálica de acero y similares', 7, NULL),
    (gen_random_uuid()::text, '07.06.01', 'Reducción de luxación con inmovilización dentaria', 7, NULL),
    (gen_random_uuid()::text, '07.06.02', 'Luxación total. Reimplante e inmovilización dentaria', 7, NULL),
    (gen_random_uuid()::text, '07.06.04', 'Fractura amelodentinaria. Protección pulpar con corona provisoria', 7, NULL),
    -- Capítulo VIII - Periodoncia
    (gen_random_uuid()::text, '08.01', 'Consulta de estudio, diagnóstico y pronóstico periodontal', 8, NULL),
    (gen_random_uuid()::text, '08.02', 'Tratamiento de gingivitis marginal crónica', 8, NULL),
    (gen_random_uuid()::text, '08.03', 'Tratamiento de periodontitis destructiva leve o moderada (bolsas de hasta 5 mm), por sector', 8, NULL),
    (gen_random_uuid()::text, '08.04', 'Tratamiento de periodontitis severa (bolsas de 6 mm o más), por sector', 8, NULL),
    (gen_random_uuid()::text, '08.05', 'Desgaste selectivo o armonización oclusal', 8, NULL),
    (gen_random_uuid()::text, '08.06', 'Placa oclusal de acrílico removible, cualquier tipo', 8, NULL),
    -- Capítulo IX - Radiología
    (gen_random_uuid()::text, '09.01.01', 'Radiografía periapical. Técnica de cono corto o cono largo', 9, 'Intraorales'),
    (gen_random_uuid()::text, '09.01.02', 'Radiografía bite-wing', 9, 'Intraorales'),
    (gen_random_uuid()::text, '09.01.03', 'Radiografía oclusal 6 x 8 cm', 9, 'Intraorales'),
    (gen_random_uuid()::text, '09.01.04', 'Media seriada de 7 películas', 9, 'Intraorales'),
    (gen_random_uuid()::text, '09.01.05', 'Seriada de 14 películas', 9, 'Intraorales'),
    (gen_random_uuid()::text, '09.02.01', 'Extrabucal. Primera exposición', 9, 'Extraorales'),
    (gen_random_uuid()::text, '09.02.02', 'Extrabucal. Por exposición subsiguiente', 9, 'Extraorales'),
    (gen_random_uuid()::text, '09.02.03', 'Articulación temporomandibular (6 tomas)', 9, 'Extraorales'),
    (gen_random_uuid()::text, '09.02.04', 'Pantomografía', 9, 'Extraorales'),
    (gen_random_uuid()::text, '09.02.05', 'Telerradiografía cefalométrica', 9, 'Extraorales'),
    (gen_random_uuid()::text, '09.02.06', 'Sialografía', 9, 'Extraorales'),
    -- Capítulo X - Cirugía
    (gen_random_uuid()::text, '10.01', 'Extracción simple', 10, NULL),
    (gen_random_uuid()::text, '10.02', 'Plástica de comunicación buco-sinusal', 10, NULL),
    (gen_random_uuid()::text, '10.03', 'Biopsia por punción o aspiración', 10, NULL),
    (gen_random_uuid()::text, '10.04', 'Alveolectomía estabilizadora (6 zonas), por zona', 10, NULL),
    (gen_random_uuid()::text, '10.05', 'Reimplante dentario inmediato al traumatismo', 10, NULL),
    (gen_random_uuid()::text, '10.06', 'Incisión y drenaje de abscesos por vía intrabucal', 10, NULL),
    (gen_random_uuid()::text, '10.07', 'Biopsia por escisión', 10, NULL),
    (gen_random_uuid()::text, '10.08', 'Alargamiento quirúrgico de la corona clínica', 10, NULL),
    (gen_random_uuid()::text, '10.09', 'Extracción de dientes retenidos o restos radiculares retenidos', 10, NULL),
    (gen_random_uuid()::text, '10.10', 'Germectomía', 10, NULL),
    (gen_random_uuid()::text, '10.11', 'Liberación de dientes retenidos', 10, NULL),
    (gen_random_uuid()::text, '10.12', 'Apicectomía', 10, NULL),
    (gen_random_uuid()::text, '10.13', 'Tratamiento de osteomielitis', 10, NULL),
    (gen_random_uuid()::text, '10.14', 'Extracción de cuerpo extraño', 10, NULL),
    (gen_random_uuid()::text, '10.15', 'Alveolectomía correctiva (6 zonas), por zona', 10, NULL);
