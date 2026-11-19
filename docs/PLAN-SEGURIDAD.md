# Plan de mejoras de seguridad

Auditoría del 2026-11-19 (rama `dev`, commit `2cbd28d`). Hallazgos Alta/Media verificados en el código.
Se trabaja **fase por fase**; cada fase se verifica con `npm run build`, tests y prueba manual del flujo
afectado. **No se commitea ni deploya sin autorización explícita.**

Estado: `[ ]` pendiente · `[~]` en curso · `[x]` hecho (anotar fecha y nota breve).

> ⚠️ Este documento describe vulnerabilidades explotables. No subirlo a un repo público ni compartirlo
> fuera del equipo hasta que estén corregidas.

## Decisiones pendientes
- [ ] **D1.** ¿Un médico con plan vencido puede seguir **leyendo y exportando** su HC? Recomendación: sí
  (Ley 26.529, conservación/disponibilidad), bloquear solo escritura. Afecta F5.
- [ ] **D2.** ¿Una secretaria con `isAdmin` puede exportar HC desde /admin? Recomendación: no. Afecta F12.

---

## Prioridad 1 — Hoy

### [x] F0 · Dependencias con vulnerabilidades críticas
> Hecho 2026-11-19: `next` y `eslint-config-next` 16.3.2 → 16.4.6 + `npm audit fix`. Prod: 0 high/critical
> (antes 15 high + 2 critical). Tests 52/52, build y lint limpios, smoke test con `next start` OK
> (incluye `/opengraph-image` vía `next/og`). Con `next dev` reiniciado: login por credenciales, páginas
> internas, ficha + HC, directorio, OG del perfil y disponibilidad pública OK, sin errores en el log.
> No se creó una reserva real (escribiría en la base y pasa por Turnstile).
> Quedan (no bloqueantes): `shadcn` (moderate, es un CLI → mover a devDependencies o subir a 1.x) y
> `tinypool` vía `vitest` 3 (critical, **solo dev**, el fix exige vitest 5 = cambio mayor).

- `next` 16.3.2 → **16.4.6**: RCE sin autenticación en `next/og` (usado en `opengraph-image.tsx` del
  directorio y en `/api/admin/marketing/bienvenidas/[id]/placa`), cache poisoning, SSRF.
  Leer antes `node_modules/next/dist/docs/` (ver AGENTS.md).
- `npm audit fix` para transitivas (zod, prisma, sharp, undici, proxy-addr, …).
- Verificar: build, tests, OG images, login, reserva pública.

### [x] F1 · XSS guardado vía foto de perfil SVG
> Hecho 2026-11-19: nuevo `src/lib/imagen-perfil.ts` (valida por magic bytes PNG/JPEG y re-codifica con
> `sharp`, ahora dependencia directa 0.35.5: quita EXIF/GPS, máx. 1024px, tope de píxeles). Usado en
> `POST /api/perfil/foto`; la ruta pública `foto` sirve solo PNG/JPEG verificados con MIME por bytes +
> `nosniff` + `CSP sandbox`; aprobar en moderación rechaza (422) fotos no válidas. 12 tests nuevos.
> Script `scripts/limpiar-fotos-invalidas.ts` (reporte por defecto, `--apply` para limpiar): local 0
> inválidas. **Pendiente: correrlo en QA/prod (solo reporte primero) con autorización.**

- `src/lib/perfil-schema.ts:101` solo exige `startsWith("data:image/")` → acepta `image/svg+xml`.
- `src/app/api/directorio/[slug]/foto/route.ts:21-27` la sirve en el dominio propio con el
  `Content-Type` declarado por el médico. Un SVG con `<script>` aprobado en moderación ejecuta JS con la
  sesión de quien abra el link → lectura de HC.
- Fix: whitelist PNG/JPEG/WebP validando magic bytes y re-codificando con `sharp`; en la ruta `foto`,
  content-type de whitelist + `X-Content-Type-Options: nosniff` + `CSP: default-src 'none'; sandbox`;
  limpiar `fotoPerfilBase64`/`fotoPublicaBase64` existentes con otro tipo.

### [x] F2 · Pagos MercadoPago: plan/duración tomados del usuario, no del pago
> Hecho 2026-11-19 (falta probar en QA): nuevo `src/lib/mp-compra.ts`. La preferencia lleva en `metadata`
> tipo/plan/duración/monto (+ `hasta` en upgrades); el webhook decide con `resolverPagoUnico` a partir
> de esa metadata y del monto pagado. Monto menor, upgrade con plan vencido o con vencimiento
> extendido, o pago sin datos → se registra sin otorgar y se loguea "a revisar manualmente".
> Preferencias viejas sin metadata: se infiere por monto solo si coincide con un único total.
> Suscripción: nueva columna `User.mpPreapprovalPlan` (migración `20261119180000_mp_preapproval_plan`
> con backfill), escrita junto con `mpPreapprovalId`; el cobro recurrente otorga ese plan y MENSUAL.
> Scripts `activar-basico`/`caducar-basico` la setean. 14 tests nuevos.
> **No se hizo** el chequeo de antigüedad de `ts`: si MP reutiliza el `ts` en reintentos rechazaría
> pagos legítimos, y el beneficio es casi nulo (el webhook re-consulta todo y es idempotente).
> **Pendiente QA:** pago único Básico y Premium, upgrade, suscripción mensual con tarjetas de prueba;
> verificar en el pago devuelto por MP que `metadata` llega con estas claves.
- `src/app/api/mercadopago/webhook/route.ts:195` (pago único) y `:127` (recurrente) usan
  `user.planPendiente` / `planDuracionPendiente`, que `checkout/route.ts` pisa en cada intento aunque no
  se pague. Exploit: generar link Básico/semestral, luego pedir Premium/bianual y abandonarlo, pagar el
  primero → Premium 24 meses. También: upgrade (paga solo diferencia) pagado tras vencer `planEndsAt`
  entra por la rama normal y suma meses completos.
- Fix: guardar plan/duración/monto/tipo en `metadata` o tabla `CheckoutIntent` (id en
  `external_reference`); el webhook lee del pago devuelto por la API de MP; validar
  `transaction_amount` == esperado; upgrade sobre plan vencido no otorga meses; rechazar firmas con `ts`
  > 5 min. Probar en QA con pagos de prueba.

### [x] F3 · Médico puede tomar la cuenta de su secretaria
> Hecho 2026-11-19 (opción mínima): `datosEditables` ahora es false ante CUALQUIER relación con otro
> médico, incluidas invitaciones pendientes (son filas atadas al id de la cuenta). Cambiar el email
> incrementa `sessionVersion` de la secretaria y avisa al email anterior
> (`src/lib/email-acceso-cambiado.ts`). No se quitó al médico la edición del email: la secretaria no
> tiene forma de cambiarlo ella misma y no habría cómo corregir un email mal cargado. Con la
> restricción, tomar la cuenta de una secretaria exclusiva no da acceso a nada nuevo.
> E2E local: con invitación pendiente de otro médico → 403; edición normal → 200.
> Mejora futura (no seguridad): cambio de email self-service con confirmación desde la casilla nueva.
- `src/app/api/users/[id]/route.ts:58-63` deja al médico cambiar el email de login de la secretaria
  (sin verificación, sin invalidar sesiones); `src/lib/secretarias.ts:40` solo cuenta asignaciones
  aceptadas. Con "recuperar contraseña" entra como ella y acepta invitaciones pendientes de otro médico.
- Fix: el médico no edita el email (solo la secretaria, con confirmación al nuevo email). Mínimo:
  contar invitaciones pendientes en `datosEditables`, `sessionVersion++`, aviso al email anterior.

## Prioridad 2 — Esta semana

### [ ] F4 · Headers de seguridad (`next.config.ts` → `headers()`)
- HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: microphone=(self), camera=(), geolocation=()`.
- CSP primero en `Report-Only` (Turnstile, MercadoPago, Google OAuth/Places, imágenes), luego enforce.

### [ ] F5 · Cuenta activa en `/api/*` (`src/proxy.ts` solo cubre páginas)
- Helper `requireCuentaActiva()` en `src/lib/api-auth.ts`: plan vigente (`esActivo`) y `suspendidoAt`
  de la **cuenta del tenant** (cubre a la secretaria de un médico suspendido).
- Para SECRETARY: revalidar `DoctorSecretaria` aceptada para `activeDoctorId`; si no, limpiarlo y 403.
- `aceptarInvitacion` (`src/lib/invitacion-secretaria.ts:89-100`) en transacción interactiva.
- Excepciones explícitas: pagos, soporte, perfil, "Mi plan" y (según D1) lectura/export.

### [ ] F6 · Desbloqueo de horarios (`src/app/api/horarios-bloqueados/[id]/route.ts`)
- SECRETARY con `activeLugarId === null` → 404 (hoy matchea los "Día completo" del médico, `lugarId: null`).
- `lugarId` del query: debe ser el del bloqueo, del tenant y (SECRETARY) su lugar activo.
- `inicio/fin` deben quedar dentro del bloqueo original.

### [ ] F7 · Sesiones y login
- `src/app/api/perfil/password/route.ts:34`: `sessionVersion++` al cambiar contraseña (y reemitir JWT actual).
- `src/auth.ts:81`: exigir `profile.email_verified === true` en Google.
- Quitar `isAdmin` → `sessionVersion++`.
- Open redirect en `src/app/login/login-form.tsx:42` (`?from=/\evil.com`): validar mismo origen.

### [ ] F8 · Reserva pública revela si un DNI tiene turno
- `src/app/api/directorio/[slug]/reservar/route.ts:59-76`: el 409 "ya tenés turno" corre antes de
  validar el slot → oráculo (dato de salud). Validar slot primero y responder genérico.

## Prioridad 3 — Después

### [ ] F9 · Export de HC (`src/lib/exportar-historia-clinica.ts`)
- Incluir odontogramas + prácticas y presupuestos + ítems (hoy faltan; Ley 26.529 art. 18).
- Streaming/lotes; rate limit; una fila de auditoría por export (hoy una por paciente).

### [ ] F10 · Tope de gasto IA (`src/lib/ia-tope.ts`, `src/lib/ia-auth.ts`)
- Reservar costo estimado antes de llamar al proveedor, concurrencia por médico (p.ej. 2),
  registrar costo también en refusal / resumen vacío (`ia/resumir/route.ts:119-129`).

### [ ] F11 · Doble reserva (race)
- Índice único parcial `(doctorId, inicio)` para turnos confirmados o transacción `Serializable`
  (`turnos/route.ts:77-107`, `directorio/[slug]/reservar/route.ts:95-132`). Contemplar sobreturnos.

### [ ] F12 · Auditoría de acciones admin
- Auditar suspensión y levantamiento; no borrar `suspendidoPorId`. Resolver D2.

## Prioridad 4 — Mantenimiento
- [ ] `.max()` en strings/arrays de `patient-schema`, `evolucion-schema`, `consentimiento-schema`,
  `turno-schema`; fechas con regex ISO (evitar 500 por Invalid Date).
- [ ] Soft-delete: `deletedAt: null` en GET `patients/[id]/presupuestos/route.ts:21`; evoluciones y
  consentimientos con `patient: { doctorId, deletedAt: null }`.
- [ ] Auditoría: registrar el `nroDocumento` quitado a otro paciente por conflicto de DNI
  (`patients/route.ts:113`, `patients/[id]/route.ts:102`) y el diff de antecedentes.
- [ ] `POST /api/turnos`: validar `lugarId` del tenant y no eliminado también para DOCTOR.
- [ ] `get-day-slots.ts:171-179`: `select` explícito (no exponer `cancelTokenHash`, `linkCodigo`, `creadoPorId`).
- [ ] Login: contar solo intentos fallidos / Turnstile al superar umbral (evitar lockout de víctima).
- [ ] Contraseñas: mínimo 10 caracteres; bcrypt costo 12.
- [ ] Enumeración de emails en `/api/users`: respuesta uniforme + rate limit.
- [ ] Rate limit en `soporte/[id]/mensajes`; job de limpieza de `IntentoReserva`.
- [ ] Google Places: `encodeURIComponent(placeId)` + validación (`google-places.ts:73`); bajar tope
  global y poner cuota en Google Cloud.
- [ ] `complete-profile` → `requireDoctor`; páginas de `/admin` revalidan `isPlatformAdmin` por sí mismas.

---

## Lo que se revisó y está bien
Sin IDOR entre tenants; la secretaria no accede a HC por ningún camino; tokens de reset/invitación
correctos (32 bytes, SHA-256, expiración, un solo uso); suspensión invalida JWT del médico
(`sessionVersion`); webhook MP con HMAC en tiempo constante; `external_reference` lo fija el servidor;
sin SQL crudo; todas las rutas `/api/admin/**` con `requireAdmin`; JSON-LD escapado; sin `.env` versionados.

## Registro de avance
| Fecha | Fase | Nota |
|---|---|---|
| 2026-11-19 | F0 | Next 16.4.6 + audit fix; verificado con tests/build/lint/smoke. Sin commitear. |
| 2026-11-19 | F0, F1 | Commiteados (`735693e`, `9315603`). Fotos inválidas en prod: confirmado por el usuario que no hay. |
| 2026-11-19 | F2 | Metadata de compra + `mpPreapprovalPlan`; 78/78 tests, build OK; migración aplicada en local. Commit `258d602` en `seguridad`; falta QA con pagos de prueba. |
| 2026-11-19 | F3 | Invitaciones pendientes bloquean edición de email; cambio de email cierra sesiones + aviso. Rama `seguridad`. |
