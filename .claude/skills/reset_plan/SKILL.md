---
name: reset_plan
description: Resetea el plan/trial de un médico a un estado limpio (sin plan pago, trial fresco o a N días de vencer) para volver a probar el flujo de pago de MercadoPago desde cero. Usar cuando el usuario pide "resetear el plan de", "mandar a X de nuevo al trial", "sacale la suscripción a", o similar, en local o en QA.
---

# Reset de plan (para pruebas)

Resetea el plan de un médico a un estado de trial limpio, reusando
`scripts/reset-plan.ts` (no reimplementes la lógica del reset a mano: ese
script ya sabe listar médicos y aplicar el reset). Pensada para
desarrollo/QA -- nunca la corras contra producción real (semio360.com o
el proyecto de un médico dado de alta) sin que el usuario lo pida
explícitamente.

## 0. Elegir el entorno

Preguntá con `AskUserQuestion`: **Local** o **QA**.

- **Local**: `DATABASE_URL` sale de `.env` en la raíz del repo. Armala así
  (no alcanza con que exista el archivo, `tsx` no lo carga solo):

  ```bash
  DB_URL=$(grep -E '^DATABASE_URL' .env | sed -E 's/^DATABASE_URL="?//; s/"$//')
  ```

  Si falla con `ECONNREFUSED`, el Prisma Dev server local no está
  corriendo -- arrancalo primero (`npx prisma dev start
  paciente-manager`, ver memoria "Local dev DB needs manual start") y
  reintentá.

- **QA**: sin tocar el `.vercel/project.json` del repo principal (que
  apunta a `paciente-manager`, el proyecto de otro médico), primero
  guardá su contenido actual para restaurarlo después. Después:

  ```bash
  npx vercel link --yes --project semio360-qa
  npx vercel env pull .env.qa.tmp --environment=production --yes
  ```

  Sacá `DATABASE_URL` de `.env.qa.tmp`. **Al terminar (siempre, incluso
  si algo falla a mitad de camino)**: restaurá `.vercel/project.json` a
  su contenido original y borrá `.env.qa.tmp`.

## 1. Listar los médicos

Corré el script sin `DOCTOR_EMAIL` -- en ese modo solo lista, no toca nada:

```bash
DATABASE_URL="$DB_URL" npx tsx scripts/reset-plan.ts
```

Mostrale al usuario la lista (email, nombre, plan actual, `trialEndsAt`,
`planEndsAt`) en texto plano -- no uses `AskUserQuestion` para elegir
médico, esa herramienta limita a 4 opciones y puede haber más. Pedile
que te diga cuál (por email o nombre).

## 2. Preguntar cuántos días de trial le quedan

Preguntá con `AskUserQuestion`: **Trial fresco (60 días)** o **A punto de
vencer (elegís cuántos días)**. Si elige la segunda, preguntale el
número de días (un entero positivo; 5 es un valor típico para probar el
aviso de "trial por terminar").

## 3. Aplicar el reset

```bash
DATABASE_URL="$DB_URL" DOCTOR_EMAIL="<email elegido>" \
  TRIAL_DIAS_RESTANTES="<60 o el número elegido>" \
  npx tsx scripts/reset-plan.ts
```

El script deja: `plan: BASICA`, `trialEndsAt` a esa cantidad de días,
`planDuracion`/`planEndsAt`/`planPendiente`/`planDuracionPendiente`
en `null`, y `mpPreapprovalId`/`mpPreapprovalStatus` en `null` (sin
preapproval ni pago único en curso).

## 4. Confirmar

Mostrale al usuario el resultado exacto que imprimió el script (mismo
`select` que el update) y en qué entorno lo hiciste.
