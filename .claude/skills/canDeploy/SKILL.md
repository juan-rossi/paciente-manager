---
name: canDeploy
description: Consulta (solo lectura) la base de PRODUCCIÓN de Semio360 y dice si en este momento algún médico tiene un horario de atención activo. Si no hay nadie, avisa que se puede deployar; si hay, dice cuánto falta para que nadie tenga horario activo. Usar cuando el usuario pide "canDeploy", "¿puedo deployar?", "¿hay alguien atendiendo?", "¿cuándo puedo deployar sin molestar?", o similar.
---

# ¿Puedo deployar ahora?

Chequeo de solo lectura contra producción (`semio360.com`), reusando
`scripts/can-deploy.ts` (no reimplementes la lógica a mano). El script no
escribe nada, así que no hace falta pedir confirmación para correrlo.

Esta skill **no deploya**: solo informa. Aunque el resultado sea "libre",
no deployes sin que el usuario lo pida explícitamente.

## 1. Connection string de producción

Proyecto de Neon `semio360` (`cold-hat-82556307`), usando la sesión de
`neonctl` ya autenticada en esta máquina (si pide login, seguí el flujo
OAuth que imprime):

```bash
CONN=$(npx neonctl connection-string --project-id cold-hat-82556307 --pooled)
```

No imprimas ni muestres la connection string.

## 2. Correr el chequeo

```bash
DATABASE_URL="$CONN" npx tsx scripts/can-deploy.ts
```

Qué considera "horario activo":

- `WorkScheduleBlock` (plantilla semanal) del día/hora actual en Buenos Aires.
- `HorarioExcepcional` (fechas puntuales habilitadas) que cubran este instante.
- Ignora lugares dados de baja (`deletedAt`). **No** descuenta
  `BloqueoHorario` (criterio conservador: si alguien bloqueó el día, igual
  cuenta como activo).

Si hay horarios activos, el script encadena los que se superponen o se
tocan (p. ej. uno termina 13:00 y otro empieza 13:00) y reporta el primer
instante en que no queda nadie, más cuánto dura esa ventana libre.

## 3. Responder

En español, corto:

- **LIBRE** → "No hay ningún médico con horario activo ahora, podés
  deployar." Agregá cuándo empieza el próximo horario (y en cuánto tiempo),
  para que sepa de cuánto margen dispone.
- **OCUPADO** → decí cuántos médicos están con horario activo (nombre y
  lugar, hasta qué hora cada uno), **cuánto falta** para que nadie tenga
  horario activo y a qué hora (BA) sería, y cuánto dura esa ventana libre.

Si la consulta falla (neonctl sin sesión, timeout, etc.), mostrá el error y
no asumas ningún resultado.
