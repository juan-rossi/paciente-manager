-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMENINO');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTERO', 'CASADO', 'VIUDO', 'CONCUBINO');

-- CreateEnum
CREATE TYPE "TipoAntecedente" AS ENUM ('DISLIPEMIA', 'HIPOTIROIDISMO', 'HIPERTIROIDISMO', 'ARTRITIS', 'DIABETES', 'ALERGIA', 'NEOPLASIAS', 'ARRITMIAS', 'HTA', 'ARTROSIS', 'ALCOHOLISMO', 'PSIQUIATRICAS', 'INFECCIOSAS', 'PROSTATA', 'NOD_MAMAS', 'EPOC', 'CARDIOPATIAS', 'NEUROLOGICAS', 'ASMA', 'OTROS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "nombreYApellido" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "sexo" "Sexo",
    "estadoCivil" "EstadoCivil",
    "profesion" TEXT,
    "nroDocumento" TEXT,
    "nacionalidad" TEXT,
    "obraSocial" TEXT,
    "obraSocialNro" TEXT,
    "domicilio" TEXT,
    "telefono" TEXT,
    "contactoEmergencia" TEXT,
    "telefonoEmergencia" TEXT,
    "autoValidoTotal" TEXT,
    "autoValidoParcial" TEXT,
    "dependiente" TEXT,
    "motivoConsulta" TEXT,
    "antecedentesEnfermedad" TEXT,
    "habitoAlcohol" BOOLEAN NOT NULL DEFAULT false,
    "habitoCigarrillos" BOOLEAN NOT NULL DEFAULT false,
    "habitoDrogas" BOOLEAN NOT NULL DEFAULT false,
    "frecuenciaCardiaca" TEXT,
    "pulsoRadial" TEXT,
    "ritmo" TEXT,
    "presionArterial" TEXT,
    "frecuenciaRespiratoria" TEXT,
    "pesoActual" TEXT,
    "pesoHabitual" TEXT,
    "estatura" TEXT,
    "temperatura" TEXT,
    "craneo" TEXT,
    "ojo" TEXT,
    "oido" TEXT,
    "pcfg" TEXT,
    "toraxForma" TEXT,
    "toraxMamas" TEXT,
    "auscultacionMV" TEXT,
    "auscultacionVV" TEXT,
    "rales" TEXT,
    "excursion" TEXT,
    "acvR1" TEXT,
    "acvR2" TEXT,
    "soplos" TEXT,
    "carotideo" TEXT,
    "radial" TEXT,
    "femoral" TEXT,
    "pedio" TEXT,
    "ppRenalDerecha" TEXT,
    "ppRenalIzquierda" TEXT,
    "mamas" TEXT,
    "cuelloPalpacion" TEXT,
    "cuelloTamanio" TEXT,
    "cuelloAuscultacion" TEXT,
    "abdomenInspeccion" TEXT,
    "abdomenPalpacion" TEXT,
    "abdomenAuscultacion" TEXT,
    "columnaCervical" TEXT,
    "dorsal" TEXT,
    "lumbar" TEXT,
    "articulaciones" TEXT,
    "movilidad" TEXT,
    "dolor" TEXT,
    "tumefaccion" TEXT,
    "sensorio" TEXT,
    "lenguaje" TEXT,
    "marcha" TEXT,
    "temblor" TEXT,
    "taxia" TEXT,
    "reflejosFotomotor" TEXT,
    "reflejosAcomodacion" TEXT,
    "osteotendinosos" TEXT,
    "sensibilidad" TEXT,
    "diagnosticoPresuntivo" TEXT,
    "metodosComplementarios" TEXT,
    "tratamiento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAntecedente" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tipo" "TipoAntecedente" NOT NULL,
    "respuesta" BOOLEAN NOT NULL DEFAULT false,
    "descripcion" TEXT,
    "fechaInicio" TEXT,
    "medicacion" TEXT,
    "resolucion" TEXT,

    CONSTRAINT "PatientAntecedente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientEvolucion" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "contenido" TEXT NOT NULL,

    CONSTRAINT "PatientEvolucion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Patient_nroDocumento_idx" ON "Patient"("nroDocumento");

-- CreateIndex
CREATE INDEX "Patient_nombreYApellido_idx" ON "Patient"("nombreYApellido");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAntecedente_patientId_tipo_key" ON "PatientAntecedente"("patientId", "tipo");

-- AddForeignKey
ALTER TABLE "PatientAntecedente" ADD CONSTRAINT "PatientAntecedente_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientEvolucion" ADD CONSTRAINT "PatientEvolucion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
