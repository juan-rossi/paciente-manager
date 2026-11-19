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

### [ ] F0 · Dependencias con vulnerabilidades críticas
- `next` 16.3.2 → **16.4.6**: RCE sin autenticación en `next/og` (usado en `opengraph-image.tsx` del
  directorio y en `/api/admin/marketing/bienvenidas/[id]/placa`), cache poisoning, SSRF.
  Leer antes `node_modules/next/dist/docs/` (ver AGENTS.md).
- `npm audit fix` para transitivas (zod, prisma, sharp, undici, proxy-addr, …).
- Verificar: build, tests, OG images, login, reserva pública.

### [ ] F1 · XSS guardado vía foto de perfil SVG
- `src/lib/perfil-schema.ts:101` solo exige `startsWith("data:image/")` → acepta `image/svg+xml`.
- `src/app/api/directorio/[slug]/foto/route.ts:21-27` la sirve en el dominio propio con el
  `Content-Type` declarado por el médico. Un SVG con `<script>` aprobado en moderación ejecuta JS con la
  sesión de quien abra el link → lectura de HC.
- Fix: whitelist PNG/JPEG/WebP validando magic bytes y re-codificando con `sharp`; en la ruta `foto`,
  content-type de whitelist + `X-Content-Type-Options: nosniff` + `CSP: default-src 'none'; sandbox`;
  limpiar `fotoPerfilBase64`/`fotoPublicaBase64` existentes con otro tipo.

### [ ] F2 · Pagos MercadoPago: plan/duración tomados del usuario, no del pago
- `src/app/api/mercadopago/webhook/route.ts:195` (pago único) y `:127` (recurrente) usan
  `user.planPendiente` / `planDuracionPendiente`, que `checkout/route.ts` pisa en cada intento aunque no
  se pague. Exploit: generar link Básico/semestral, luego pedir Premium/bianual y abandonarlo, pagar el
  primero → Premium 24 meses. También: upgrade (paga solo diferencia) pagado tras vencer `planEndsAt`
  entra por la rama normal y suma meses completos.
- Fix: guardar plan/duración/monto/tipo en `metadata` o tabla `CheckoutIntent` (id en
  `external_reference`); el webhook lee del pago devuelto por la API de MP; validar
  `transaction_amount` == esperado; upgrade sobre plan vencido no otorga meses; rechazar firmas con `ts`
  > 5 min. Probar en QA con pagos de prueba.

### [ ] F3 · Médico puede tomar la cuenta de su secretaria
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
