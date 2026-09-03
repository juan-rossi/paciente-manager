---
name: deploy
description: Deploya los últimos cambios de main a producción para un médico elegido — primero hace un backup de su base en Neon, después deploya a su proyecto de Vercel. Usar cuando el usuario pide "deployar", "subir cambios a producción", "deployar al entorno de <médico>".
---

# Deploy a producción (con backup previo)

Deploya el estado actual de `main` al proyecto de Vercel de un médico
puntual. Siempre hace un backup de su base en Neon **antes** de deployar —
nunca al revés. No toca ningún otro entorno.

## 0. Elegir el entorno

Leé `.github/environments.json` — cada entrada tiene `doctorName`,
`vercelProject` y `neonProjectId`. Si el usuario ya dijo a qué médico
deployar (por nombre), usá esa entrada directo. Si no, preguntá con
`AskUserQuestion` (una opción por entorno listado en el archivo).

## 1. Backup de la DB en Neon (siempre antes del deploy)

Desde la raíz del repo (no hace falta worktree para esto):

```bash
NEON_PROJECT_ID="<neonProjectId del entorno elegido>" npm run backup:db
```

Reusa `scripts/backup-db.ts` (el mismo que corre el workflow de GitHub
Actions en cada push) — crea una branch `backup-<timestamp>` sin compute y
poda las más viejas, dejando las últimas 15. Corriendo local no hace falta
`NEON_API_KEY`: usa la sesión de `neonctl` ya autenticada en esta máquina (si
pide login, es la primera vez acá — seguí el flujo OAuth que imprime).

Si este paso falla, **no sigas** al deploy — avisá al usuario y resolvé el
backup primero.

## 2. Migraciones pendientes contra esa misma DB

**No te lo saltees.** Ya pasó una vez: un cambio de schema se deployó sin
correr la migración en producción, y el login quedó roto (columna
inexistente) hasta que alguien lo notó. Esto corre siempre, haya o no
migraciones nuevas — es barato y `prisma migrate deploy` no hace nada si ya
está todo aplicado.

```bash
CONN=$(npx neonctl connection-string --project-id "<neonProjectId del entorno elegido>" --pooled)
DATABASE_URL="$CONN" npx prisma migrate deploy
```

Si aplica migraciones, revisá que el resumen tenga sentido (no debería
haber ninguna sorpresa — son las mismas que ya corriste en local antes de
pushear). Si falla, **no sigas** al deploy.

## 3. Deploy al proyecto de Vercel de ese médico

El repo principal está linkeado al proyecto de Dr. Beligoy
(`.vercel/project.json`). Para no pisarlo (deployando a cualquier entorno,
incluido el de Beligoy), siempre se usa un **worktree aparte**, igual que en
`.claude/skills/onboard-doctor/SKILL.md`:

```bash
WORKDIR="$(mktemp -d)/deploy-<slug-del-medico>"
git worktree add --detach "$WORKDIR" main
cd "$WORKDIR"
npm install

npx vercel link --yes --project "<vercelProject del entorno elegido>"
npx vercel --prod
```

Anotá la URL "Aliased:" que imprime al final. Probala apenas termine
(`curl -o /dev/null -w "%{http_code}" .../login`, debería dar 200). Si da 404
en todo con el build limpio en los logs, no es propagación de dominio — ver
la nota sobre `vercel.json`/Framework Preset en `ENTORNOS.md`.

Limpiar el worktree al final:

```bash
cd "d:/Dev projects/paciente-manager"
git worktree remove "$WORKDIR" --force
```

## 4. Confirmar

Contale al usuario: qué backup se creó (nombre de la branch), qué
migraciones se aplicaron (si alguna), la URL deployada, y el resultado del
chequeo de `/login`. Si el médico elegido usa login con Google, no hace
falta volver a probarlo — el deploy no cambia las credenciales ni la DB,
solo el código.
