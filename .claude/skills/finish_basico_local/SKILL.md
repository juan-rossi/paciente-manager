---
name: finish_basico_local
description: Deja al doctor Pablo Rossi (jrossiq@gmail.com) en el entorno LOCAL con el plan Básico CADUCADO (sin acceso), ya sea por un pago único cuyo período terminó o por una suscripción mensual cuyo cobro falló y la gracia venció. Usar cuando el usuario pide "finish_basico_local", "que se le venza el Básico a Pablo en local", "simulá un Básico caducado en local", o similar.
---

# Básico caducado (para pruebas en local)

Deja a Pablo Rossi (`jrossiq@gmail.com`) en la base **local** con el plan
Básico ya vencido, reusando `scripts/caducar-basico.ts` (no reimplementes la
lógica a mano). Sirve para probar la UI de plan caducado y el flujo de
reactivación sin tocar QA. Es la versión local de `finish_basico`.

Los pagos y el `mpPreapprovalId` que deja son placeholders locales: no
existen en MercadoPago. Avisale esto al usuario al terminar.

## 0. Elegir el escenario

Preguntá con `AskUserQuestion`:

- **Pago único**: había pagado 6 meses de Básico de una vez y el período
  terminó ayer. Sin suscripción (`mpPreapprovalId`/estado `null`).
- **Suscripción mensual con pago fallido**: tenía suscripción recurrente,
  el cobro del mes siguiente fue rechazado, la gracia (5 días) ya venció y la
  preapproval quedó `PAUSED`.

Mapeo a `ESCENARIO`: pago único → `UNICO`; suscripción → `SUSCRIPCION`.

## 1. Obtener la DATABASE_URL local

`DATABASE_URL` sale de `.env` en la raíz del repo (no alcanza con que exista
el archivo, `tsx` no lo carga solo):

```bash
DB_URL=$(grep -E '^DATABASE_URL' .env | sed -E 's/^DATABASE_URL="?//; s/"$//')
```

No hace falta Vercel. Si falla con `ECONNREFUSED`, el Prisma Dev server
local no está corriendo -- arrancalo primero (`npx prisma dev start
paciente-manager`) y reintentá.

## 2. Aplicar el cambio

No listes ni preguntes por el médico: siempre es Pablo Rossi.

```bash
DATABASE_URL="$DB_URL" DOCTOR_EMAIL="jrossiq@gmail.com" \
  ESCENARIO=<UNICO|SUSCRIPCION> npx tsx scripts/caducar-basico.ts
```

El script deja `plan: BASICA`, `planEndsAt` y `trialEndsAt` en el pasado
(así `esActivo()` da false), limpia `planPendiente`/`planDuracionPendiente`
y los datos de cancelación, y registra los `PagoSuscripcion` placeholder:

- **UNICO**: `planDuracion: SEMESTRAL`, sin preapproval, `pagoEnGracia: false`,
  un pago aprobado de 6 meses de Básico de hace ~6 meses.
- **SUSCRIPCION**: `planDuracion: MENSUAL`, preapproval placeholder en
  `PAUSED`, `pagoEnGracia: true` con `graciaVenceEl` ya vencida, un pago
  aprobado viejo y uno `rejected` reciente.

## 3. Confirmar

Mostrale el resultado exacto que imprimió el script y recordale que se hizo
en el entorno **local**, y que los pagos/preapproval son falsos (reactivar de
verdad pasa por el checkout real de prueba; "Cancelar suscripción" contra el
`mpPreapprovalId` local fallaría).
