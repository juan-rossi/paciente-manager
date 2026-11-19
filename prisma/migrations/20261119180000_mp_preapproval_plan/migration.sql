-- Plan que cobra la suscripción (preapproval) vigente -- se escribe junto con
-- `mpPreapprovalId`. El webhook deja de usar `planPendiente` (que cada
-- checkout pisa aunque no se pague) para decidir qué otorgar.
ALTER TABLE "User" ADD COLUMN "mpPreapprovalPlan" "PlanTipo";

-- Backfill de las suscripciones existentes: una preapproval recién creada
-- y todavía sin cobrar tiene su plan en `planPendiente` (con duración
-- MENSUAL); una ya cobrada lo tiene en `plan` (el webhook limpia
-- `planPendiente`). Si después hubo un checkout de pago único, la
-- preapproval se canceló en ese checkout y `planDuracionPendiente` no es
-- MENSUAL: vale `plan`.
UPDATE "User"
SET "mpPreapprovalPlan" = CASE
  WHEN "planPendiente" IS NOT NULL AND "planDuracionPendiente" = 'MENSUAL' THEN "planPendiente"
  ELSE "plan"
END
WHERE "mpPreapprovalId" IS NOT NULL;
