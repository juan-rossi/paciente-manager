---
name: reset_basico
description: Deja a un médico activo con una suscripción MENSUAL recurrente del plan Básico ya "pagada" (sin pasar por MercadoPago), para probar la UI de plan activo. Usar cuando el usuario pide "activame el plan Básico de", "poné a X como que ya está pagando Básico", o similar, en local o en QA.
---

# Activar Básico mensual (para pruebas)

Deja a un médico como si ya tuviera una suscripción MENSUAL recurrente del
plan Básico activa y pagada, reusando `scripts/activar-basico.ts` (no
reimplementes la lógica a mano: ese script ya sabe listar médicos y aplicar
el cambio). Pensada para desarrollo/QA -- nunca la corras contra
producción real (semio360.com o el proyecto de un médico dado de alta) sin
que el usuario lo pida explícitamente.

El `mpPreapprovalId` que deja es un placeholder local, no existe en
MercadoPago -- si se prueba "Cancelar suscripción" con esta cuenta, esa
llamada va a fallar contra la API real. Avisale esto al usuario después de
aplicar el cambio.

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
DATABASE_URL="$DB_URL" npx tsx scripts/activar-basico.ts
```

Mostrale al usuario la lista (email, nombre, plan actual, duración,
`planEndsAt`, `mpPreapprovalStatus`) en texto plano -- no uses
`AskUserQuestion` para elegir médico, esa herramienta limita a 4 opciones y
puede haber más. Pedile que te diga cuál (por email o nombre).

## 2. Aplicar el cambio

```bash
DATABASE_URL="$DB_URL" DOCTOR_EMAIL="<email elegido>" npx tsx scripts/activar-basico.ts
```

El script deja: `plan: BASICA`, `planDuracion: MENSUAL`, `planEndsAt` a un
mes desde hoy, `mpPreapprovalStatus: AUTHORIZED`, un `mpPreapprovalId`
placeholder, y limpia `planPendiente`/`planDuracionPendiente`/
`pagoEnGracia`/`graciaVenceEl`.

## 3. Confirmar

Mostrale al usuario el resultado exacto que imprimió el script, en qué
entorno lo hiciste, y recordale que "Cancelar suscripción" no va a
funcionar de verdad con esta cuenta (el `mpPreapprovalId` es local, no
existe en MercadoPago).
