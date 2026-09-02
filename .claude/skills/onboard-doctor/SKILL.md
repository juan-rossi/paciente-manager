---
name: onboard-doctor
description: Da de alta un entorno de producción nuevo para un médico — proyecto de Neon (DB propia, solo seed), proyecto de Vercel (URL propia) con sus env vars, primer deploy, y actualiza el manifest de backups y ENTORNOS.md. Usar cuando el usuario pide "dar de alta un médico nuevo", "crear un entorno nuevo", "deployar para un doctor nuevo".
---

# Alta de un médico nuevo (entorno propio)

Este proceso crea un entorno de producción completo y aislado para un médico
nuevo: su propia base en Neon (arranca vacía, solo con el usuario semilla —
nada de datos de otros médicos), su propio proyecto de Vercel con su propia
URL, y lo suma al backup automático. Reusa el mismo repo/código que ya existe
(`juan-rossi/paciente-manager`) — no se toca el entorno de ningún otro médico.

Muchos pasos acá tocan cuentas de Neon/Vercel/GitHub reales (crear proyectos,
setear env vars, pushear). Estas acciones van a requerir confirmación del
usuario cada vez — es esperable, no lo saltees ni lo automatices por tu cuenta.

## 0. Reunir los datos

Si `args` ya trae nombre, usuario y contraseña en un formato claro, usalos.
Si no, preguntá con `AskUserQuestion` (una pregunta con `multiSelect: false`
por cada dato, o las tres juntas):

1. **Nombre y Apellido** del médico (ej. "María Alonso").
2. **Usuario** (email) para el login inicial.
3. **Contraseña** inicial (si el usuario quiere que la generes vos, usá
   `openssl rand -base64 12` y mostrásela para que la guarde).

Con el nombre, derivá un slug para nombrar los recursos (minúsculas, sin
acentos, espacios → guiones):

```bash
SLUG=$(node -e "console.log(process.argv[1].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''))" "María Alonso")
# SLUG=maria-alonso
```

Convenciones de nombres que se usan en el resto del proceso:
- Proyecto de Neon: `paciente-manager-$SLUG`
- Proyecto de Vercel: `paciente-manager-$SLUG`
- URL esperada: `https://paciente-manager-$SLUG.vercel.app` (Vercel la asigna
  sola si el nombre no está tomado; si está tomado, usar la que Vercel
  devuelva y anotarla igual en `ENTORNOS.md`).

## 1. Crear el proyecto de Neon (DB propia)

```bash
npx neonctl projects create --name "paciente-manager-$SLUG" -o json
```

Guardá del output: `id` (es el `neonProjectId`) y, dentro de
`connection_uris[0].connection_uri`, la connection string — esa es la que se
usa como `DATABASE_URL` en los pasos siguientes. Si el comando pide
autenticarse (primera vez en esta máquina), seguí el flujo OAuth que imprime.

## 2. Migraciones + seed contra la DB nueva

Desde la raíz del repo (el checkout normal, no hace falta un worktree para
esto — `prisma migrate deploy`/`db seed` no tocan Vercel):

```bash
export DATABASE_URL="<connection_uri del paso 1>"
npx prisma migrate deploy
SEED_USER_EMAIL="<email>" SEED_USER_PASSWORD="<password>" SEED_USER_NOMBRE="<Nombre Apellido>" npx prisma db seed
unset DATABASE_URL
```

Esto crea únicamente las tablas + el usuario médico semilla — la base queda
sin ningún dato de otros médicos.

## 3. Proyecto de Vercel (aislado, sin tocar el link del repo actual)

El repo principal ya está linkeado al proyecto de Dr. Beligoy
(`.vercel/project.json`). Para no pisarlo, todo el trabajo de Vercel para el
médico nuevo se hace en un **worktree aparte** (mismo código, otro
`.vercel/project.json`):

```bash
WORKDIR="$(mktemp -d)/paciente-manager-$SLUG"
git worktree add --detach "$WORKDIR" main
cd "$WORKDIR"

npx vercel project add "paciente-manager-$SLUG"
npx vercel link --yes --project "paciente-manager-$SLUG"
```

Cargar las env vars de producción (una por una, con `echo "valor" | npx vercel env add NOMBRE production`):

- `DATABASE_URL` → la connection string del paso 1.
- `JWT_SECRET` → generar una nueva, nunca reusar la de otro entorno:
  `openssl rand -base64 32`
- `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER_NOMBRE` → los datos del
  paso 0.
- `DOCTOR_NAME` → "Dr./Dra. Nombre Apellido".

No hace falta setear `TZ` — es un nombre reservado en Vercel y además la app
ya maneja el horario de Argentina en código (`src/lib/timezone.ts`), no por
variable de entorno.

Deployar:

```bash
npx vercel --prod
```

Anotá la URL de "Production:" que imprime (y el alias corto
`paciente-manager-$SLUG.vercel.app` si aparece uno).

Limpiar el worktree cuando termines (no hace falta mantenerlo — el próximo
deploy de este médico se hace repitiendo este mismo patrón: worktree +
`vercel link --yes --project paciente-manager-$SLUG` + `vercel --prod`):

```bash
cd "d:/Dev projects/paciente-manager"
git worktree remove "$WORKDIR" --force
```

## 4. Sumarlo al backup automático

Agregar una entrada a `.github/environments.json` (array, no lleva
credenciales — solo IDs):

```json
{
  "doctorName": "<Nombre Apellido>",
  "vercelProject": "paciente-manager-<slug>",
  "neonProjectId": "<id del paso 1>"
}
```

Commitear y pushear ese archivo a `main` (con confirmación del usuario) — a
partir de ese push, el workflow de backup respalda también a este médico en
cada deploy futuro. No hace falta ningún secret nuevo en GitHub: todos los
proyectos de Neon comparten el mismo `NEON_API_KEY` de cuenta.

## 5. Actualizar ENTORNOS.md

Agregar una fila a la tabla de "Entornos activos" en `ENTORNOS.md` (en la
raíz del repo — este archivo NO se commitea, es local/gitignored) con:
médico, URL, usuario, contraseña, proyecto de Vercel, Neon project ID, y la
fecha de alta. Confirmá con el usuario que efectivamente puede loguearse con
esas credenciales antes de darlo por terminado.
