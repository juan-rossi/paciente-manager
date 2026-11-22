import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ImportacionEstado, Prisma } from "@/generated/prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Borra el contenido de los archivos de una importación (el nombre y el
 * tamaño quedan para el historial) y le quita el permiso al equipo. Con
 * `estado`, además la pasa a ese estado. Idempotente.
 */
export async function borrarArchivosImportacion(
  db: Db,
  importacionId: string,
  datos: { estado?: ImportacionEstado } & Prisma.ImportacionHCUpdateInput = {}
): Promise<void> {
  await db.importacionArchivo.updateMany({
    where: { importacionId, datos: { not: null } },
    data: { datos: null },
  });
  await db.importacionHC.update({
    where: { id: importacionId },
    data: { ...datos, accesoHasta: null, archivosBorradosAt: new Date() },
  });
}

/**
 * Borrado definitivo de una cuenta dada de baja (Acuerdo de tratamiento de
 * datos, punto 6), al vencer el plazo para descargar. Borra pacientes, HC,
 * turnos, agenda, configuración, tickets e importaciones. La fila del médico
 * no se borra sino que se anonimiza: la referencian sus pagos
 * (`PagoSuscripcion`, que se conservan por razones contables) y los costos de
 * IA (`UsoIA`, sin datos de pacientes). Sin email ni contraseña válidos,
 * nadie puede volver a entrar con ella.
 */
export async function eliminarCuenta(doctorId: string): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // Primero lo que referencia a pacientes y lugares sin borrado en cascada.
      await tx.turno.deleteMany({ where: { doctorId } });
      await tx.patient.deleteMany({ where: { doctorId } });
      await tx.auditLog.deleteMany({ where: { doctorId } });

      await tx.importacionHC.deleteMany({ where: { doctorId } });
      await tx.workScheduleBlock.deleteMany({ where: { userId: doctorId } });
      await tx.bloqueoHorario.deleteMany({ where: { userId: doctorId } });
      await tx.horarioExcepcional.deleteMany({ where: { userId: doctorId } });
      await tx.lugarDeTrabajo.deleteMany({ where: { userId: doctorId } });
      await tx.doctorSecretaria.deleteMany({ where: { doctorId } });
      await tx.pacienteVisto.deleteMany({ where: { userId: doctorId } });
      await tx.doctorPrepaga.deleteMany({ where: { doctorId } });
      await tx.doctorArancelPractica.deleteMany({ where: { doctorId } });
      await tx.moderacionPerfil.deleteMany({ where: { userId: doctorId } });
      await tx.cambioEmail.deleteMany({ where: { userId: doctorId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: doctorId } });
      await tx.marketingBienvenida.deleteMany({ where: { doctorId } });
      await tx.ticketSoporte.deleteMany({ where: { autorId: doctorId } });
      await tx.ticketSoporte.updateMany({ where: { doctorId }, data: { doctorId: null } });

      // Asistentes que tenían a este médico elegido en el selector.
      await tx.user.updateMany({
        where: { activeDoctorId: doctorId },
        data: { activeDoctorId: null, activeLugarId: null },
      });

      await tx.user.update({
        where: { id: doctorId },
        data: {
          email: `eliminada+${doctorId}@cuentas.semio360.invalid`,
          passwordHash: randomBytes(32).toString("hex"),
          nombre: "Cuenta",
          apellido: "eliminada",
          nroMatricula: "",
          montoConsultaParticular: null,
          montoConsultaVisible: false,
          fotoPerfilBase64: null,
          biografia: null,
          fotoPublicaBase64: null,
          biografiaPublica: null,
          atencionTipo: null,
          nombreConsultorio: null,
          telefono: null,
          direccion: null,
          ciudad: null,
          latitud: null,
          longitud: null,
          perfilPublico: false,
          whatsappComunidadUrl: null,
          instagramUrl: null,
          facebookUrl: null,
          tiktokUrl: null,
          youtubeUrl: null,
          reservaPublicaHabilitada: false,
          publicSlug: null,
          sessionVersion: { increment: 1 },
          eliminadaAt: new Date(),
        },
      });
    },
    { timeout: 120_000, maxWait: 10_000 }
  );
}
