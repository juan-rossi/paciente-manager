-- Auditoría de las sanciones que aplica/levanta un admin de plataforma sobre
-- la cuenta de un médico (antes al levantarla se borraba quién la había
-- aplicado, sin rastro).
ALTER TYPE "AuditAccion" ADD VALUE 'SANCIONAR';
ALTER TYPE "AuditAccion" ADD VALUE 'LEVANTAR_SANCION';
ALTER TYPE "AuditEntidad" ADD VALUE 'CUENTA';
