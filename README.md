# Paciente Manager

Historias clínicas del consultorio. Migrado desde una app de escritorio (.NET WPF + SQL Server)
a Next.js + Postgres.

## Requisitos

- Node.js 20+
- Una base Postgres local (ver opciones abajo)

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Levantar Postgres local. Dos opciones:

   - **Docker**: `docker compose up -d` (usa `docker-compose.yml`, expone `localhost:5432`).
   - **Prisma Dev** (sin Docker): `npx prisma dev` — imprime una connection string local,
     pegala en `DATABASE_URL` dentro de `.env`.

3. Copiar `.env` y ajustar `DATABASE_URL`, `AUTH_SECRET`, las credenciales del usuario semilla
   (`SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NOMBRE`) y `DOCTOR_NAME` (nombre que se
   muestra en el header de la app — configurar distinto por entorno/deploy). `TZ` no hace falta
   tocarlo: la app maneja el horario de Argentina en código (`src/lib/timezone.ts`), no por
   variable de entorno (Vercel ni siquiera permite setearla, es un nombre reservado).

   Login con Google es opcional además del usuario/contraseña — para habilitarlo hace falta un
   Client ID/Secret de Google Cloud Console, en `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`. Sin esos
   valores, el login por contraseña sigue funcionando igual — solo queda sin efecto el botón de
   "Continuar con Google". Solo puede loguearse por esta vía un email que ya sea un usuario
   existente (nadie se crea por OAuth).

4. Crear las tablas y el usuario médico inicial:

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. Levantar la app:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000) e ingresar con las credenciales del
   usuario semilla.

## Estructura

- `prisma/schema.prisma` — modelo de datos (Postgres). Ver `prisma/seed.ts` para el usuario
  inicial.
- `src/app/(app)` — dashboard y ficha de paciente (rutas protegidas por sesión).
- `src/app/api` — endpoints REST usados por el frontend (auth, pacientes, evoluciones).
- `src/components/patient-form` — formulario de alta/edición de paciente, con una pestaña por
  cada sección de la historia clínica (Datos Personales, Consulta Inicial, Antecedentes
  Personales, Exámen Físico, Diagnóstico, Evolución Clínica).
- `db/` — scripts SQL Server originales, conservados como referencia histórica.

## Pendiente (fases futuras)

- Migración de los datos reales de pacientes desde SQL Server (fuera del alcance de esta
  primera versión).
