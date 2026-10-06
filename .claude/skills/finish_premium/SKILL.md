---
name: finish_premium
description: Deja al doctor Carlos Gonzalez en semio360-qa con el plan Premium CADUCADO (sin acceso), ya sea por un pago único cuyo período terminó o por una suscripción mensual cuyo cobro falló y la gracia venció. Usar cuando el usuario pide "finish_premium", "que se le venza el Premium a Carlos", "simulá un Premium caducado", o similar, en QA.
---

# Premium caducado (para pruebas en QA)

Deja a Carlos Gonzalez (`test_user_7349428072332520577@testuser.com`) en
**semio360-qa** con el plan Premium ya vencido, reusando
`scripts/caducar-basico.ts` con `PLAN=PREMIUM` (no reimplementes la lógica a
mano). Sirve para probar la UI de plan caducado y el flujo de reactivación.
Pensada solo para QA -- nunca contra producción real (semio360.com o el
proyecto de un médico).

Los pagos y el `mpPreapprovalId` que deja son placeholders locales: no
existen en MercadoPago. Avisale esto al usuario al terminar.

## 0. Elegir el escenario

Preguntá con `AskUserQuestion`:

- **Pago único**: había pagado 6 meses de Premium de una vez y el período
  terminó ayer. Sin suscripción (`mpPreapprovalId`/estado `null`).
- **Suscripción mensual con pago fallido**: tenía suscripción recurrente,
  el cobro del mes siguiente fue rechazado, la gracia (5 días) ya venció y la
  preapproval quedó `PAUSED`.

Mapeo a `ESCENARIO`: pago único → `UNICO`; suscripción → `SUSCRIPCION`.

## 1. Obtener la DATABASE_URL de QA

El repo principal no debe quedar linkeado a ningún proyecto de Vercel (no hay
`.vercel/project.json`; si aparece uno, avisale al usuario y no lo pises).
Linkeá solo para esta tarea:

```bash
npx vercel link --yes --project semio360-qa
npx vercel env pull .env.qa.tmp --environment=production --yes
DB_URL=$(grep -E '^DATABASE_URL' .env.qa.tmp | sed -E 's/^DATABASE_URL="?//; s/"$//')
```

**Al terminar (siempre, incluso si algo falla a mitad de camino)**: borrá
`.vercel/project.json` (dejá el repo sin link) y `.env.qa.tmp`.

## 2. Aplicar el cambio

No listes ni preguntes por el médico: siempre es Carlos Gonzalez.

```bash
DATABASE_URL="$DB_URL" DOCTOR_EMAIL="test_user_7349428072332520577@testuser.com" \
  PLAN=PREMIUM ESCENARIO=<UNICO|SUSCRIPCION> npx tsx scripts/caducar-basico.ts
```

El script deja `plan: PREMIUM`, `planEndsAt` y `trialEndsAt` en el pasado
(así `esActivo()` da false), limpia `planPendiente`/`planDuracionPendiente`
y los datos de cancelación, y registra los `PagoSuscripcion` placeholder:

- **UNICO**: `planDuracion: SEMESTRAL`, sin preapproval, `pagoEnGracia: false`,
  un pago aprobado de 6 meses de Premium de hace ~6 meses.
- **SUSCRIPCION**: `planDuracion: MENSUAL`, preapproval placeholder en
  `PAUSED`, `pagoEnGracia: true` con `graciaVenceEl` ya vencida, un pago
  aprobado viejo y uno `rejected` reciente.

## 3. Confirmar

Mostrale el resultado exacto que imprimió el script y recordale que se hizo
en **QA**, y que los pagos/preapproval son falsos (reactivar de verdad pasa
por el checkout real de prueba; "Cancelar suscripción" contra el
`mpPreapprovalId` local fallaría).
