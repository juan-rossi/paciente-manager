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

## 1. Proyecto de Vercel (aislado, sin tocar el link del repo actual)

El repo principal ya está linkeado al proyecto de Dr. Beligoy
(`.vercel/project.json`). Para no pisarlo, todo el trabajo de Vercel para el
médico nuevo se hace en un **worktree aparte** (mismo código, otro
`.vercel/project.json`, y su propio `node_modules` — no lo symlinkees desde
el repo principal, `npm install` real y listo; un symlink de directorio en
Windows tarda muchísimo y Node no siempre lo resuelve bien):

```bash
WORKDIR="$(mktemp -d)/paciente-manager-$SLUG"
git worktree add --detach "$WORKDIR" main
cd "$WORKDIR"
npm install

npx vercel project add "paciente-manager-$SLUG"
npx vercel link --yes --project "paciente-manager-$SLUG"
```

## 2. Crear la DB (proyecto de Neon, vía la integración de Vercel)

Esta cuenta de Neon está gestionada por Vercel (`neonctl projects create`
falla con "organization is managed by Vercel") — la única forma soportada de
crear una base nueva es a través del marketplace de Vercel, y de paso te
conecta el proyecto automáticamente:

```bash
npx vercel integration add neon --name "paciente-manager-$SLUG" --plan free_v3 -e production -e preview -e development
```

Esto provisiona la base, la conecta al proyecto (inyecta `DATABASE_URL` y
otras env vars automáticamente en Vercel) y descarga un `.env.local` acá
mismo con esas mismas variables — incluido `NEON_PROJECT_ID`, que es el que
va al manifest de backups (paso 4).

## 3. Migraciones + seed contra la DB nueva

Usando el `DATABASE_URL` que bajó `.env.local` en el paso anterior. `prisma.config.ts`
carga `.env` automáticamente (no `.env.local`), así que armá un `.env` con
solo esa variable:

```bash
node -e "
const fs = require('fs');
const m = fs.readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=\"?([^\"\n]+)\"?/m);
fs.writeFileSync('.env', 'DATABASE_URL=' + JSON.stringify(m[1]) + '\n');
"
npx prisma migrate deploy
SEED_USER_EMAIL="<email>" SEED_USER_PASSWORD="<password>" SEED_USER_NOMBRE="<Nombre Apellido>" npx prisma db seed
rm .env .env.local
```

Esto crea únicamente las tablas + el usuario médico semilla — la base queda
sin ningún dato de otros médicos.

## 3.b Resto de las env vars + deploy

Cargar el resto de las env vars de producción (una por una, con
`echo "valor" | npx vercel env add NOMBRE production`):

- `JWT_SECRET` → generar una nueva, nunca reusar la de otro entorno:
  `openssl rand -base64 32`
- `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER_NOMBRE` → los datos del
  paso 0.
- `DOCTOR_NAME` → "Dr./Dra. Nombre Apellido".

(`DATABASE_URL` ya quedó cargada por la integración de Neon en el paso 2 —
no hace falta tocarla. Tampoco hace falta `TZ`: es un nombre reservado en
Vercel y además la app ya maneja el horario de Argentina en código,
`src/lib/timezone.ts`.)

Deployar:

```bash
npx vercel --prod
```

Anotá la URL "Aliased:" que imprime al final — normalmente
`https://paciente-manager-$SLUG.vercel.app`. Probala apenas termine el
deploy (`curl -o /dev/null -w "%{http_code}" .../login`): con `vercel.json`
declarando `"framework": "nextjs"` (ya está en el repo) debería dar 200 de
entrada. Si alguna vez vuelve a dar 404 en TODAS las rutas (raíz, /login,
etc.) con el build limpio en los logs, no es propagación de dominio — es
que el proyecto quedó con "Framework Preset: Other" en vez de "Next.js"
(`vercel project inspect <proyecto>` lo muestra). Eso pasó la primera vez
que corrió este proceso: un proyecto creado con `vercel project add` no
autodetecta el framework, así que el build compila bien pero Vercel rutea
como sitio estático (busca `public/`) y nunca encuentra las rutas de
Next.js. El `vercel.json` del repo ya lo fuerza para todos los entornos —
si igual pasara, confirmá que `vercel.json` viajó al deploy (tiene que estar
en la raíz del worktree) y volvé a deployar.

Limpiar el worktree cuando termines (no hace falta mantenerlo — el próximo
deploy de este médico se hace repitiendo este mismo patrón: worktree +
`npm install` + `vercel link --yes --project paciente-manager-$SLUG` +
`vercel --prod`):

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
  "neonProjectId": "<id del paso 2 (NEON_PROJECT_ID en .env.local)>"
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
