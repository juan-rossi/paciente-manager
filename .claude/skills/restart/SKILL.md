---
name: restart
description: Reinicia el entorno LOCAL de Semio360 completo y en orden seguro — frena `next dev`, reinicia la base Prisma Dev `paciente-manager` y vuelve a levantar `next dev` — y verifica que el login funcione de punta a punta. Usar cuando el usuario pide "restart", "reiniciá el servidor local", "reiniciá next", "levantá el server de nuevo", "se cayó el local", o cuando el local da "Server has closed the connection" / JWTSessionError / login que rebota.
---

# Reiniciar el servidor local

El local son **dos procesos**: `next dev` (puerto 3000) y la base, un
servidor **Prisma Dev** con nombre `paciente-manager` (PGlite, NO el
`docker-compose.yml`). Tienen una trampa: cuando a `next dev` se lo mata de
golpe (Ctrl+C, `taskkill /F`), corta sus conexiones y la base queda
**medio muerta** (`npx prisma dev ls` puede seguir diciendo `running` pero
las queries fallan con "Server has closed the connection" y el login rebota a
/login sin error). Por eso reiniciar next **siempre** implica reiniciar
también la base, en este orden:

1. Frenar `next dev`.
2. Frenar y volver a arrancar la base.
3. Verificar que la base responda.
4. Levantar `next dev`.
5. Verificar el login de punta a punta.

No preguntes nada: es una operación local y reversible. Nunca toques QA ni
prod. Nunca borres datos de la base (es un dump anonimizado de prod, no se
puede regenerar).

## 1. Frenar `next dev`

Buscá el proceso de next de **este** proyecto por línea de comandos (no por
puerto: otro proyecto del usuario, LoteoAguila, ocupa el 3000 de IPv4 y no
hay que matarlo):

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'next' -and $_.CommandLine -match 'paciente-manager' } |
  Select-Object ProcessId, ParentProcessId, CommandLine
```

Si hay un `next dev` corriendo como tarea en segundo plano de esta misma
sesión de Claude, frenalo con `TaskStop`. Si no, matá el árbol con
`taskkill /PID <pid> /T /F` (el padre `npm run dev`/`node ... next dev`).
Excluí siempre procesos de `prisma dev` (su línea de comandos tiene
`@prisma/dev` o `daemon.cjs`) — esos se frenan en el paso 2.

Si no había ningún next corriendo, seguí igual (el usuario puede querer
solo levantarlo).

## 2. Reiniciar la base Prisma Dev

```bash
npx prisma dev stop paciente-manager
npx prisma dev start paciente-manager
npx prisma dev ls
```

`start` a veces **termina en silencio sin arrancar** (`ls` dice
`not_running`). En ese caso, en orden:

1. Correr `npx prisma dev start paciente-manager` **otra vez** (muchas veces
   alcanza).
2. Si sigue sin arrancar, revisar si otro proceso ocupa los puertos
   reservados del servidor (los muestra `npx prisma dev ls`): `netstat -ano`
   + `Get-CimInstance Win32_Process -Filter "ProcessId=<pid>"`. Ya pasó con
   el Pylance de VS Code. Si es eso, avisale al usuario qué proceso es; no
   lo mates sin preguntar.
3. Si no hay colisión, levantar el daemon directo en segundo plano
   (`run_in_background`) para ver su log real:
   `node "<ruta>/@prisma/dev/dist/daemon.cjs" paciente-manager`. La ruta
   está en `%TEMP%/@prisma/cli-dev@latest-<n>/node_modules/@prisma/dev/dist/`
   (o en la caché de npx); buscala con Glob. Si muere con `ELOCKED` sobre
   `server.lock`, es un lock huérfano del `start` fallido: esperá ~10 s y
   relanzalo.

Nunca mates el daemon de la base con `/F` si `prisma dev stop` funciona:
forzarlo obliga a una recuperación del WAL al próximo arranque.

## 3. Verificar que la base responda

`ls` diciendo `running` no alcanza. Hacé una query real:

```bash
npx prisma migrate status
```

Tiene que terminar en "Database schema is up to date!" (o listar migraciones
pendientes: eso también prueba que responde; avisale al usuario si hay
pendientes, pero no las apliques sin que lo pida). Si da error de conexión,
volvé al paso 2.

## 4. Levantar `next dev`

Desde la raíz del repo (`d:\Dev projects\paciente-manager`), con
`run_in_background: true` para que siga vivo entre turnos:

```bash
npm run dev
```

Esperá a que el log diga `Ready` (usá `Monitor` sobre la salida de la tarea,
no `sleep`). Si falla porque el puerto está ocupado, revisá con el paso 1 que
no haya quedado otro next de este proyecto colgado.

## 5. Verificar el login de punta a punta

Contra `http://[::1]:3000` (IPv6: en IPv4 el 3000 lo puede tener
LoteoAguila), con las credenciales `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`
de `.env` (leelas del archivo; no las muestres en el chat):

1. `GET /api/auth/csrf` guardando cookies → `csrfToken`.
2. `POST /api/auth/callback/credentials` (form: `csrfToken`, `email`,
   `password`) con las mismas cookies.
3. `GET /api/auth/session` → tiene que devolver un `user`.

Si la sesión vuelve vacía y el log de next muestra `JWTSessionError` o
"Server has closed the connection", la base quedó mal: volvé al paso 1
(sí, de nuevo todo en orden).

## 6. Cierre

Contale al usuario en una o dos líneas: que el local está arriba en
http://localhost:3000, si hubo que reintentar algo con la base, y que
`next dev` ahora corre como tarea en segundo plano de esta sesión de Claude
(se frena si se cierra la sesión; si prefiere tenerlo en su propia terminal,
que corra `npm run dev` ahí).
