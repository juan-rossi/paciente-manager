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

3. Copiar `.env` y ajustar `DATABASE_URL`, `JWT_SECRET` y las credenciales del usuario semilla
   (`SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NOMBRE`).

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
- Turnos del día en el dashboard (por ahora placeholder "Próximamente").
