---
name: reset_premium
description: Deja a un médico (en QA, Carlos Gonzalez) con un pago ÚNICO de 6 meses del plan Premium ya "pagado" (sin pasar por MercadoPago) y a 13 o 2 días de que termine, para probar el aviso de plan por vencer (ámbar/rojo) y el flujo de renovación. Usar cuando el usuario pide "poné a X con Premium a punto de vencer", "probar la alerta de renovación", "reset_premium", o similar, en local o en QA.
---

# Premium pago único a punto de vencer (para pruebas)

Deja a un médico como si hubiera hecho un pago único de 6 meses del plan
Premium y le quedaran pocos días de acceso, reusando
`scripts/activar-premium-pago-unico.ts` (no reimplementes la lógica a mano:
ese script ya sabe listar médicos y aplicar el cambio). Pensada para
desarrollo/QA -- nunca la corras contra producción real (semio360.com o el
proyecto de un médico dado de alta) sin que el usuario lo pida
explícitamente.

Sirve para probar dos cosas en el dashboard del médico:

- **13 días**: aviso **ámbar** "Tu plan vence pronto".
- **2 días**: aviso **rojo** "Tu acceso termina en 2 días".

Y en Configuración > Plan, la lógica de renovación (volver a contratar
mientras el plan sigue vigente).

## 0. Elegir el entorno

Preguntá con `AskUserQuestion`: **Local** o **QA**.

- **Local**: `DATABASE_URL` sale de `.env` en la raíz del repo. Armala así
  (no alcanza con que exista el archivo, `tsx` no lo carga solo):

  ```bash
  DB_URL=$(grep -E '^DATABASE_URL' .env | sed -E 's/^DATABASE_URL="?//; s/"$//')
  ```

  Si falla con `ECONNREFUSED`, el Prisma Dev server local no está
  corriendo -- arrancalo primero (`npx prisma dev start
  paciente-manager`) y reintentá.

- **QA**: el repo principal no debe quedar linkeado a ningún proyecto de Vercel
  (no hay `.vercel/project.json`; si aparece uno, avisale al usuario y no lo
  pises). Linkeá solo para esta tarea y borrá el link al terminar:

  ```bash
  npx vercel link --yes --project semio360-qa
  npx vercel env pull .env.qa.tmp --environment=production --yes
  ```

  Sacá `DATABASE_URL` de `.env.qa.tmp`. **Al terminar (siempre, incluso
  si algo falla a mitad de camino)**: borrá `.vercel/project.json` (dejá el
  repo sin link) y borrá `.env.qa.tmp`.

## 1. Elegir el médico

- **QA**: siempre es `test_user_7349428072332520577@testuser.com` (Carlos
  Gonzalez). No listes ni preguntes: andá directo al paso 2.
- **Local**: corré el script sin `DOCTOR_EMAIL` -- en ese modo solo lista, no
  toca nada:

  ```bash
  DATABASE_URL="$DB_URL" npx tsx scripts/activar-premium-pago-unico.ts
  ```

  Mostrale la lista (email, nombre, plan, duración, `planEndsAt`) en texto
  plano -- no uses `AskUserQuestion` para elegir médico (límite de 4
  opciones). Pedile que te diga cuál.

## 2. Elegir los días que faltan

Preguntá con `AskUserQuestion` (en la misma pregunta que el entorno si
todavía no lo elegiste, como dos preguntas): **13 días** (aviso ámbar) o
**2 días** (aviso rojo). Son las dos únicas opciones.

## 3. Aplicar el cambio

```bash
DATABASE_URL="$DB_URL" DOCTOR_EMAIL="<email>" DIAS_RESTANTES=<13|2> \
  npx tsx scripts/activar-premium-pago-unico.ts
```

El script deja: `plan: PREMIUM`, `planDuracion: SEMESTRAL`, `planEndsAt` a
esa cantidad de días desde ahora, `mpPreapprovalId`/`mpPreapprovalStatus` en
`null` (es un pago único, no una suscripción), limpia
`planPendiente`/`planDuracionPendiente`/`pagoEnGracia`/`graciaVenceEl` y los
datos de cancelación, y registra un `PagoSuscripcion` aprobado por el total
de 6 meses de Premium con un id de pago placeholder.

## 4. Confirmar

Mostrale el resultado exacto que imprimió el script y en qué entorno lo
hiciste. Recordale que el aviso del dashboard se puede cerrar con la X y
vuelve recién al día siguiente; para volver a verlo hoy hay que borrar la
clave `plan_por_vencer_aviso_cerrado_el` del `localStorage` del navegador.
Y que el pago es falso: no existe en MercadoPago, así que renovar de verdad
sí pasa por el checkout real (de prueba en QA).
