---
name: add-admin-user
description: Da de alta (o le otorga acceso) a una cuenta ADMIN del panel /admin de Semio 360, preguntando los datos de a uno y en qué entorno (local o el proyecto de producción de un médico puntual). Usar cuando el usuario pide "agregar un admin", "dar acceso admin a alguien", "crear un usuario admin".
---

# Alta de un usuario ADMIN

Da de alta (o le da acceso a una cuenta ya existente) al panel `/admin`,
reusando `scripts/add-admin-user.ts` — ese script ya decide solo si hay que
**crear** una cuenta ADMIN nueva o **otorgarle** `isAdmin = true` a un
DOCTOR/SECRETARY que ya existe, según si el email ya está en esa base. No
reimplementes esa lógica: dejá que el script decida y usá su mensaje de
error para saber qué dato falta.

Cada entorno (local y cada médico en producción) tiene su propia base — un
alta hecha en un entorno no afecta a los demás. Preguntá siempre primero en
cuál hay que hacerlo.

## 0. Preguntar el entorno

Preguntá con `AskUserQuestion`: **Local** o **Producción**.

- **Local**: la base es el Prisma Dev server local (`.env` ya tiene su
  `DATABASE_URL` apuntando a `localhost`). Verificá que esté corriendo:

  ```bash
  npx prisma dev ls
  ```

  Si `paciente-manager` aparece `not_running`, arrancalo primero
  (`npx prisma dev start paciente-manager`) — si no, cualquier intento falla
  con `ECONNREFUSED`. `.env` **no** se carga solo: `prisma.config.ts` hace
  `import "dotenv/config"` pero eso solo aplica a comandos `npx prisma ...`,
  no a scripts sueltos con `tsx`. Armá `DATABASE_URL` a mano desde `.env`:

  ```bash
  DB_URL=$(grep -E '^DATABASE_URL' .env | sed -E 's/^DATABASE_URL="?//; s/"$//')
  ```

  Si `git status` muestra `prisma/schema.prisma` modificado (schema con
  cambios sin migrar todavía), corré primero `npx prisma migrate dev` — si
  dice "Already in sync" es porque la base ya tiene esas columnas pero el
  cliente generado quedó viejo; en ese caso alcanza con `npx prisma generate`.
  Sin esto, un campo nuevo del schema (como pasó con `isAdmin`) tira
  `PrismaClientValidationError: Unknown argument` aunque la base esté bien.

- **Producción**: leé `.github/environments.json` (mismo archivo que usa la
  skill `deploy`) — cada entrada tiene `doctorName`, `vercelProject` y
  `neonProjectId`. Si hay una sola entrada, confirmá que es esa. Si hay más
  de una, preguntá con `AskUserQuestion` cuál médico (una opción por
  entrada). Con el `neonProjectId` elegido, armá la connection string:

  ```bash
  CONN=$(npx neonctl connection-string --project-id "<neonProjectId>" --pooled)
  ```

  No hace falta `NEON_API_KEY`: usa la sesión de `neonctl` ya autenticada en
  esta máquina (si pide login, seguí el flujo OAuth que imprime).

## 1. Pedir el email

Preguntá el email de la cuenta a la que hay que dar acceso admin. Es el
único dato que siempre hace falta.

## 2. Primer intento (sin contraseña ni nombre)

Corré el script solo con el email y el `DATABASE_URL` del entorno elegido
(`$CONN` en producción, `$DB_URL` en local — ver paso 0):

```bash
DATABASE_URL="$CONN" ADMIN_EMAIL="<email>" npx tsx scripts/add-admin-user.ts
```

Esto ya resuelve dos de los tres casos posibles sin pedir nada más:

- Si el email **ya existe** como DOCTOR/SECRETARY → le setea `isAdmin = true`
  y termina. Listo, no sigas.
- Si el email **ya es** una cuenta ADMIN → avisa que no hace falta nada.
  Listo, no sigas.

## 3. Si el script pide más datos

Si el email **no existe todavía**, el script falla explícitamente pidiendo
`ADMIN_PASSWORD` (y opcionalmente `ADMIN_NOMBRE`/`ADMIN_APELLIDO`). Ahí, y
solo ahí, preguntale al usuario:

1. **Contraseña** inicial (mínimo 8 caracteres). Si quiere que la generes
   vos, usá `openssl rand -base64 12` y mostrásela para que la guarde — no
   hay otra forma de recuperarla después, el script solo guarda el hash.
2. **Nombre** (default "Owner" si no lo dan).
3. **Apellido** (opcional, puede quedar vacío).

Y volvé a correr el script agregando lo que falte:

```bash
DATABASE_URL="$CONN" ADMIN_EMAIL="<email>" ADMIN_PASSWORD="<password>" \
  ADMIN_NOMBRE="<nombre>" ADMIN_APELLIDO="<apellido>" \
  npx tsx scripts/add-admin-user.ts
```

## 4. Confirmar

Antes de este paso 3 en **producción**, mostrale al usuario el resumen
(entorno/médico, email, si es alta nueva o acceso a cuenta existente) y
esperá su confirmación — es una escritura directa contra una base real. En
**local** no hace falta, es descartable.

Al terminar, contale el resultado exacto que imprimió el script (creó
cuenta nueva / otorgó acceso / ya tenía acceso) y en qué entorno.
