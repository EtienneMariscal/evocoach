# evocoach — Plan de implementación (v1, tras tus respuestas)

> Fecha: 2026-11-24 · Repo: `C:\Users\etien\GitHub\evocoach` (vacío, solo `.git`) · Máquina: Windows 11 (Node v24.3.0, npm 11.12.1, git 2.42) · Sin código escrito.
> Leyenda de fiabilidad: **[V]** verificado hoy (fuentes en §17) · **[S]** suposición mía (corrígela) · **[?]** pendiente de verificar antes de la fase indicada.

---

## 0. Resumen ejecutivo

- **Qué se construye**: app nativa Expo/React Native con dos roles (PROFESIONAL / CLIENTE). El profesional crea dietas y rutinas por cliente (con plantillas) y sigue su adherencia; el cliente ve su plan del día, registra comidas, entrenos, peso, medidas, fotos y check-ins, con modo offline.
- **Backend**: Supabase (Postgres + RLS + Auth + Storage + Edge Functions) en región UE (Frankfurt) **[V región · ? DPA vigente]**.
- **Decisiones que tomaste** (las respuestas del cuestionario): offline con **outbox propia**, **1 cliente = 1 profesional**, **Android primero** (iOS en un hito posterior), **beta gratuita** (cobros en fase 2), **~20 h/semana**, **persona física** por ahora.
- **Ajustes que hago por esas decisiones** (revísalos): (1) *sin login social en el MVP* (Apple exige Sign in with Apple si hay login de terceros y no puedes probar iOS) → email + contraseña + OTP por email; (2) el vínculo profesional-cliente se modela con tabla propia + índice único parcial, de modo que pasar a N:M sea una migración barata; (3) iOS se compila en CI (simulador, sin dispositivo) para que no se rompa, y se valida de verdad en un hito M12.
- **Esfuerzo estimado**: 389 h netas de tareas (1–3 h cada una) hasta beta Android → con 30 % de colchón ≈ 505 h ≈ **25 semanas a 20 h/semana** (si empiezas el 1-dic-2026 y sin contar vacaciones: build instalable y apertura de la prueba cerrada ≈ finales de marzo 2027, producción Android ≈ junio 2027) **[S]**. La prueba cerrada obligatoria de Google (14 días) corre en paralelo mientras terminas los hitos M7–M10.

---

## 1. Preguntas del punto 1 → respuestas y supuestos

| # | Tema | Decisión | Origen |
|---|---|---|---|
| A1 | Ingresos MVP | Beta gratuita/cerrada; suscripción profesional y cobros en fase 2 | **Tú** |
| A2 | Entidad/cuentas | Persona física por ahora; constituir autónomo/SL antes de abrir al público y antes de la fase 2 | **Tú** |
| A3 | Rol RGPD | Profesional = responsable; evocoach = encargado (art. 28, DPA) y responsable solo de datos de cuenta/uso. Tras desvincular: el profesional pierde el acceso; el cliente puede exportar. **Validar con abogado** | ★ defecto [S] |
| A4 | Edad mínima | 18+ | ★ defecto |
| B1 | Cardinalidad | **1 cliente = 1 profesional** (tabla de vínculo + índice parcial; sin organizaciones) | **Tú** |
| B2 | Cliente sin invitación | No puede registrarse sin invitación (App Review necesitará cuenta demo) | ★ defecto |
| B3 | Base de alimentos | Alimentos propios + importación CSV + semilla pequeña de fuente abierta (licencias **[?]**) | ★ defecto |
| B4 | Dieta | kcal + P/C/G (+ fibra opcional); sin micronutrientes ni equivalencias | ★ defecto |
| B5 | Ejercicios | Catálogo semilla en texto + ejercicios propios con enlace a vídeo externo | ★ defecto |
| B6 | Check-in | Escala 1–10, número, sí/no, opción única/múltiple, texto; sin lógica condicional; semanal con día configurable | ★ defecto |
| B7 | Registro de entreno | kg + reps reales por serie, RPE opcional | ★ defecto |
| B8 | Fotos | 3 poses, borrables por el cliente, bucket privado + URLs firmadas cortas, EXIF eliminado | ★ defecto |
| C1 | Dispositivos | Android físico; sin iPhone ni Mac → **Android primero** | **Tú** |
| C2 | Dedicación | ~20 h/semana | **Tú** |
| C3 | Presupuesto | ≤ 100 €/mes en beta | ★ defecto |
| C4 | Nombre/dominio | Comprar dominio y comprobar marca (OEPM/EUIPO) **antes** de crear el App ID (es permanente) | ★ defecto |
| D1 | Offline | Outbox propia + caché persistida de TanStack Query, tras repositorios intercambiables | **Tú** |
| D2 | Login | **Ajustado**: email + contraseña + OTP por email; TOTP opcional para profesionales (palanca de recorte); social (Google/Apple) en M12 | Ajuste mío |
| D3 | Analítica | Sentry (UE, sin PII) siempre + PostHog UE solo con opt-in y sin datos de salud | ★ defecto |
| D4 | Idiomas | es-ES con i18n listo; catalán/inglés en fase 2 | ★ defecto |

**Consecuencias que conviene tener presentes**
1. **1:1** → un cliente que trabaja con nutricionista *y* entrenador necesitará dos cuentas (o un profesional que cubra ambas especialidades). Es la limitación más visible para el usuario; reversible por diseño (§4).
2. **Android primero** → no podrás probar push de APNs, cámara ni permisos en iOS hasta M12 (necesitas un iPhone: propio, prestado o de un tester vía TestFlight). Mitigación en §14.
3. **Persona física** → Google exige a cuentas personales creadas tras 13-nov-2023 una **prueba cerrada con ≥12 testers durante 14 días seguidos** antes de producción **[V]**; además tus datos de contacto pueden mostrarse en la ficha (estado de "trader" DSA) **[?]**. Aun siendo beta gratuita, trataréis datos de salud de terceros: firma DPA con cada profesional y, antes de abrir al público, constituye autónomo/SL (consúltalo con una gestoría) **[S]**.

---

## 2. Alcance, exclusiones y criterios de éxito

### 2.1 Dentro del MVP (Android)
| Área | Incluye |
|---|---|
| Auth/onboarding | Registro email+contraseña, verificación por OTP, recuperación; onboarding por rol; consentimientos granulares |
| Vinculación | Invitación por código/enlace (un solo uso, caduca); canje; desvincular |
| Profesional | Lista de clientes, ficha del cliente, biblioteca de alimentos y ejercicios (semilla + propios), constructor de dieta y de rutina, plantillas (guardar/asignar), cuestionario de check-in configurable, panel con adherencia y alertas de inactividad, bandeja de check-ins con feedback |
| Cliente | Hoy (comidas + entreno), marcar comidas, registro de entreno por serie, peso, medidas, fotos de progreso, check-in semanal, historial/gráficos simples |
| Notificaciones | Push (inactividad, check-in vencido, plan actualizado) + recordatorios **locales** del cliente |
| Offline | Consultar plan; registrar comidas/entrenos/peso/medidas/check-in sin conexión y sincronizar después |
| Cuenta/RGPD | Exportar mis datos, borrar cuenta, retirar consentimientos, "quién ha accedido a mis datos" |
| Operación | CI/CD, entornos dev/staging/prod, Sentry, métricas de producto opt-in |

### 2.2 Fuera del MVP (preparado en la arquitectura, §3.7)
Chat, agenda de citas, suscripciones/cobros, base de alimentos ampliada (código de barras), wearables/Health Connect/HealthKit, informes PDF, panel web, login social, N:M profesional-cliente, organizaciones/centros, subida de vídeo, fotos offline, sincronización en segundo plano, release en iOS (hito M12), tablets, catalán/inglés, micronutrientes y equivalencias de alimentos.

### 2.3 Criterios de éxito medibles **[S: ajusta los umbrales]**
| Dimensión | Métrica | Objetivo | Cómo se mide |
|---|---|---|---|
| Activación pro | Profesionales que publican ≥1 plan a un cliente en 7 días | ≥ 70 % | PostHog (opt-in) + consulta SQL |
| Activación cliente | Clientes que registran algo en 48 h tras vincularse | ≥ 60 % | SQL sobre tablas de registro |
| Uso | Clientes con ≥1 registro/semana en semana 4 | ≥ 60 % | SQL |
| Check-ins | Check-ins semanales completados | ≥ 60 % | SQL |
| Beta | Profesionales activos / clientes vinculados a 8 semanas | ≥ 5 / ≥ 25 | SQL |
| Calidad | Sesiones sin fallos (Sentry/Android vitals) | ≥ 99,5 % | Sentry + Play Console |
| Sync | Operaciones de outbox sincronizadas ≤ 24 h tras reconexión | ≥ 99 % | Contador en cliente (sin datos) + Sentry |
| Seguridad | Casos negativos de RLS (cross-tenant) que pasan | 100 % | pgTAP en CI |
| Rendimiento | Arranque en frío en Android de gama media | ≤ 3 s | Perfilado manual + Sentry |
| Rendimiento | Pantalla "Hoy" offline desde caché | ≤ 500 ms | Perfilado |
| Usabilidad | Un profesional monta una semana de dieta desde plantilla | ≤ 10 min | Test con 3 profesionales |
| Proceso | Tarea ≤ 3 h, CI verde en `main` | 100 % | GitHub Actions |

---

## 3. Stack, arquitectura y estrategia técnica

### 3.1 Validación del stack (versiones de npm consultadas hoy **[V]**)

| Capa | Decisión | Versión hoy | Veredicto / alternativa descartada |
|---|---|---|---|
| Framework | Expo SDK **58** + React Native 0.88 (Nueva Arquitectura obligatoria), *development builds* (no Expo Go), CNG/prebuild (`android/` y `ios/` generados y en `.gitignore`) | expo 58.0.26 · RN 0.88.1 · react 19.3.1 (la doc de SDK 58 lista 19.2.x: usa siempre `npx expo install --check`) | **Se confirma.** Flutter (cambio de lenguaje; los agentes rinden mejor en TS) y nativo Swift/Kotlin (inviable en solitario) descartados |
| Navegación | Expo Router (alineado con SDK) con grupos por rol | expo-router 58.0.32 | Se confirma. `Stack.Protected` para guards **[?] comprobar API en SDK 58 (T0.6)** |
| Lenguaje | TypeScript estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | npm `latest` = 7.0.2 | **Cuestiono**: usa la versión que fije la plantilla del SDK 58; no saltes a TS 7 hasta comprobar compatibilidad con typescript-eslint, jest-expo y Expo **[?]** |
| Backend | Supabase UE: Auth, Postgres+RLS, Storage, Edge Functions, `pg_cron`. Claves **publishable/secret** + JWT asimétrico + `getClaims()` | supabase-js 2.119.2 | **Se confirma** (claves legacy se retiran a finales de 2026 **[V]**). Firebase descartado (modelo relacional + RLS encajan mejor). Riesgo: proveedor de matriz estadounidense → ver §14 R11 |
| Estado servidor | TanStack Query v5 con `networkMode: 'offlineFirst'` + persistencia | 5.108.4 | Se confirma (una fuente hablaba de "v6", **no confirmada**: npm latest es 5.x) |
| Estado cliente/UI | Zustand mínimo (sesión, preferencias UI) | 5.1.0 | Se confirma; **sin** Redux. Formularios: react-hook-form 7.92 + Zod |
| Validación | Zod en los bordes (formularios, respuestas de repos/Edge Functions, payloads de outbox) | 4.6.7 | Se confirma |
| Local/offline | `expo-sqlite` para outbox + blob de caché de Query; **sin MMKV** (una dependencia nativa menos) | expo-sqlite 58.0.18 | **Se confirma** la decisión D1. PowerSync (otro subencargado de datos de salud, coste, dependencia) y WatermelonDB (sync a mano + fricción Expo) descartados para el MVP; los repositorios permiten cambiarlo |
| Notificaciones | `expo-notifications` + Expo Push Service + FCM v1; recordatorios del cliente = notificaciones locales | 58.1.9 | Se confirma; payload sin datos de salud (Expo es subencargado en tránsito) |
| Estilos/tema | Tokens en `src/ui/theme`; librería: **react-native-unistyles v3** si el spike de 1 h pasa; si no, `StyleSheet` + contexto con la misma API `createStyles(theme => …)` | unistyles 3.8.2 | **[?] spike en T2.1.** NativeWind y Tamagui descartados (más superficie, más deps) |
| Listas/imagen | `@shopify/flash-list` v2, `expo-image`, `expo-image-picker`, `expo-image-manipulator` | flash-list 2.3.3 | Se confirma |
| i18n | i18next + react-i18next + expo-localization | 27.2.7 · 18.0.3 | Se confirma |
| Observabilidad | Sentry RN (región UE) siempre; PostHog UE solo con opt-in | 8.36.0 · 4.87.2 | Se confirma |
| Calidad | ESLint flat config + Prettier, Jest (`jest-expo`), RNTL, Maestro (E2E), pgTAP (DB), `deno test` (Edge Functions) | jest-expo 58.0.15 · RNTL 14.1.0 · eslint npm latest 10.15.0 | **[?] ESLint 10:** usa la major que soporte `eslint-config-expo` en SDK 58 (T0.7) |
| CI/CD | GitHub Actions + EAS Build/Submit/Update/Workflows | eas-cli 27.11.0 | Se confirma |

**Particularidades de tu entorno Windows [S/?]**: Supabase local necesita **Docker Desktop (WSL2)**; JDK 17 + Android Studio (SDK/emulador); las compilaciones locales de Android con Nueva Arquitectura pueden chocar con el límite de 260 caracteres de ruta → habilita *long paths* o compila con EAS; iOS solo en la nube (EAS). Los *builds* de simulador de iOS en EAS no deberían exigir cuenta Apple Developer **[? T0.12]**.

### 3.2 Estructura de carpetas

```
evocoach/
├─ CLAUDE.md                      # reglas para agentes (§15)
├─ app.config.ts  eas.json  package.json  tsconfig.json  eslint.config.js  jest.config.js
├─ src/
│  ├─ app/                        # Expo Router: SOLO rutas finas (importan screens de features)
│  │  ├─ _layout.tsx              # providers, bootstrap de sesión, guards por rol
│  │  ├─ (auth)/                  # login, registro, verificar, recuperar
│  │  ├─ (onboarding)/            # rol, código de invitación, consentimientos
│  │  ├─ (professional)/(tabs)/   # panel, clientes, biblioteca, ajustes
│  │  ├─ (client)/(tabs)/         # hoy, plan, progreso, check-in, ajustes
│  │  └─ (shared)/                # modales y detalle: constructor, entreno, fotos…
│  ├─ features/
│  │  ├─ auth/ invitations/ clients/ plans/ library/ today/ tracking/
│  │  ├─ checkins/ dashboard/ notifications/ privacy/ settings/
│  │  │   └─ cada feature:  domain/  data/  hooks/  ui/  schemas.ts  index.ts
│  ├─ core/                       # infraestructura sin negocio
│  │  ├─ supabase/ (client, database.types.ts GENERADO, storage adapter)
│  │  ├─ offline/  (outbox, sync-engine, connectivity, cache-persister)
│  │  ├─ query/    (queryClient, key factories)
│  │  ├─ errors/   (AppError, mapSupabaseError, ErrorBoundary)
│  │  ├─ logging/  (logger, redacción, adaptador Sentry)
│  │  ├─ i18n/     (config, locales/es/*.json)
│  │  ├─ config/   (env validado con Zod, feature flags)
│  │  ├─ analytics/ (envoltorio con consentimiento)
│  │  └─ utils/    (fechas locales, decimales es-ES, ids UUIDv7, unidades)
│  └─ ui/                         # sistema de diseño (hueco §16)
│     ├─ theme/ (tokens, themes light/dark, provider)
│     ├─ primitives/ (Text, Box, Button, Input, Card, Screen…)
│     └─ components/ (compuestos reutilizables)
├─ shared/contracts/              # esquemas Zod de contratos API (sin imports de RN) [? bundling T0.11]
├─ supabase/ (config.toml, migrations/, functions/, tests/ pgTAP, seed.sql)
├─ e2e/                           # flujos Maestro
├─ scripts/                       # import-catalog, gen-types, utilidades
└─ docs/ (adr/, legal/, architecture/, runbooks/)
```

### 3.3 Capas y reglas de dependencia

| Capa | Contiene | Puede importar | NO puede importar |
|---|---|---|---|
| `domain/` | Reglas puras: macros/kcal, adherencia, reglas de asignación de plantillas, fechas, máquina de estados de outbox | solo TS puro y otros `domain` | React, RN, Expo, Supabase, `core/*` |
| `data/` | Repositorios: llamadas Supabase, mapeo a tipos de dominio, parseo Zod, encolado en outbox | `domain`, `core` | `ui`, `hooks` |
| `hooks/` | Hooks TanStack Query (`useXQuery`/`useXMutation`), orquestación | `data`, `domain`, `core` | `ui` |
| `ui/` (de feature) | Pantallas y componentes | `hooks`, `domain`, `src/ui`, `core` | `data` directamente |
| `src/app/` | Rutas | `features/*/index.ts` | internals de features |
| `shared/contracts` | Zod de contratos | solo Zod | nada de RN/Supabase |

Se hace cumplir en CI con `dependency-cruiser` o `import/no-restricted-paths`. Las features no se importan entre sí salvo a través de su `index.ts`. **Preparación para web/monorepo**: `domain/` y `shared/contracts` no tocan RN, así que extraerlos a `packages/` en fase 2 es mecánico.

### 3.4 Dónde vive cada tipo de estado

| Estado | Herramienta | Persistencia |
|---|---|---|
| Datos del servidor (plan, clientes, historial) | TanStack Query (`offlineFirst`) | Blob persistido en SQLite (throttle 1 s, buster por versión de esquema) |
| Escrituras pendientes del cliente | Outbox (SQLite) | Sí, por usuario |
| Sesión y preferencias UI | Zustand | Sesión: Supabase + adaptador cifrado; UI: SQLite/`kv` |
| Formularios | react-hook-form + Zod | No (borradores locales solo en check-in y constructor) |
| Estado efímero de pantalla | `useState`/`useReducer` | No |

### 3.5 Estrategia offline y de sincronización (decisión D1)

**Principio**: el cliente solo *añade registros* (idempotentes y con UUID generado en el dispositivo); los planes los edita únicamente el profesional → no hay edición concurrente sobre el plan. Eso reduce la sincronización a: **leer snapshot + reproducir cola de escrituras idempotentes**.

| Entidad | ¿Escritura offline? | Clave de idempotencia | Resolución de conflicto |
|---|---|---|---|
| `meal_completions` | Sí | `(client_id, meal_id, date)` | Último-escritor-gana por `client_updated_at` |
| `workout_logs` / `workout_set_logs` | Sí | UUID de cliente; `(log, ejercicio, nº serie)` | LWW por serie; el log se crea una vez |
| `body_measurements` (peso incluido) | Sí | `(client_id, measured_on, type)` | LWW |
| Envío de check-in | Sí (se encola) | `checkin_id` | Primer envío gana; 409/23505 = éxito |
| `progress_photos` | **No** (solo online en MVP) | — | — |
| Planes, plantillas, clientes, biblioteca | **No** (pro online; lectura de caché obsoleta) | — | — |

**Lectura offline**: al iniciar sesión y al volver a primer plano se hace *prefetch* del "snapshot del cliente": plan activo (±7 días), ejercicios referenciados, últimos 30 días de peso/medidas, últimos entrenos ("última vez: 40 kg × 8"), check-in pendiente. Se invalida por `plans.version` (el profesional lo incrementa al publicar). Indicador "Última sincronización" visible.

**Outbox** (`outbox(id, user_id, entity, entity_key, op, payload_json, created_at, attempts, next_attempt_at, status, last_error)`):
- Un único procesador *single-flight*; orden garantizado **por entidad** (`entity_key`), no global → un mensaje "envenenado" no bloquea el resto.
- Disparadores: reconexión (NetInfo), primer plano, tras cada mutación, botón manual. Sin sync en segundo plano en el MVP.
- Clasificación de errores: red/5xx → reintento con *backoff* exponencial + *jitter* (tope 5 min) · 401 → refrescar sesión y reintentar; si falla, pausar cola y pedir login (**nunca descartar**) · 23505/409 → éxito idempotente · 42501 (RLS), 23503 (FK, p. ej. plan archivado), 400 → *permanente*: estado `failed`, visible en "Pendiente de sincronizar" con reintentar/descartar, conservado 30 días.
- Servidor: *upserts* idempotentes con `ON CONFLICT … DO UPDATE … WHERE excluded.client_updated_at > tabla.client_updated_at`; el servidor *acota* `client_updated_at` a `now()` (desfase de reloj).
- Una base SQLite **por usuario** (`evocoach-{userId}.db`) para aislar datos en dispositivos compartidos; el cierre de sesión con pendientes avisa y exige sincronizar o descartar.
- Cifrado local: SQLCipher si el spike lo permite **[? T0.13]**; si no, clave en `expo-secure-store` + cifrado de campos sensibles del blob; `android:allowBackup=false`.

**Fallo aceptado de diseño**: dos dispositivos del mismo cliente escribiendo a la vez la misma comida → gana el último; riesgo bajo, documentado.

### 3.6 Errores y logging

- **Taxonomía** `AppError{ code, kind, userMessageKey, retryable, cause }` con `kind ∈ network | auth | forbidden | not_found | conflict | validation | rate_limited | server | unknown`. Los repositorios traducen PostgREST/Storage/Edge a `AppError`; la UI solo conoce `AppError` y claves i18n.
- **Reintentos**: nunca en 4xx/RLS; *backoff* en red/5xx (TanStack `retry` por función); mutaciones críticas pasan por outbox.
- **Límites**: `ErrorBoundary` por grupo de rutas; *toasts* para errores recuperables; pantallas de error con acción.
- **Logging**: `logger` (debug/info/warn/error) con **allowlist de campos** y redacción (nunca valores de peso/medidas/notas/email); breadcrumbs a Sentry; `no-console` en ESLint; `sendDefaultPii: false`; **sin Session Replay** (capturaría pantallas de salud).

### 3.7 Preparado para la fase 2 (sin implementar)

| Funcionalidad fase 2 | Punto de extensión ya previsto |
|---|---|
| Chat | `client_links` como ámbito RLS; patrón de políticas por vínculo; Realtime habilitable; tablas `conversations/messages` documentadas en `docs/architecture`; pipeline de notificaciones reutilizable; adjuntos en Storage |
| Agenda | Zonas horarias ya modeladas (`profiles.timezone`); notificaciones programables; tipo `appointment_*` extensible en el enum de notificaciones |
| Suscripciones/cobros | Hook `useEntitlement(feature)` (en MVP devuelve `true` desde `app_config`); webhooks → Edge Function; tabla `subscriptions` se crea en fase 2 (migraciones baratas); candidata RevenueCat **[?]** |
| Alimentos ampliados | `foods.source/source_ref/locale`, `food_portions`, script `import-catalog` repetible |
| Wearables | Puerto `HealthDataSource` en `core/health` (interfaz vacía) + propósito de consentimiento propio |
| PDF | Datos de informe servidos por RPC estructurada; render intercambiable (`expo-print` en dispositivo o función en servidor) |
| Panel web | Misma API/RLS; `domain` y `contracts` sin RN; Expo Router web o app aparte |
| N:M o equipos | Índice único parcial sobre `client_links(client_id)`; `organization_id` se añade por migración |

### 3.8 ADRs iniciales (se escriben en `docs/adr/` durante M0)
001 Nombre/ID/dominio · 002 Offline con outbox propia · 003 Vínculo 1:1 con tabla + índice parcial · 004 Supabase UE + claves nuevas · 005 Android primero · 006 Estilos y tokens · 007 Contratos compartidos app/Edge Functions · 008 Sin login social en MVP · 009 Cifrado local · 010 Proveedor de push y payloads sin datos de salud.

---

## 4. Modelo de datos, RLS y migraciones

### 4.1 Principios
- **UUID en todas las PK**; las tablas de registro del cliente usan **UUIDv7 generado en el dispositivo** (idempotencia + índices ordenados).
- **Fechas "de día" = `date` local** del cliente (`local_date`), no `timestamptz`, para evitar errores de zona horaria; los instantes (`started_at`, `submitted_at`) van en `timestamptz` UTC. Los *cron* usan `profiles.timezone`.
- **Unidades en SI** (kg, cm, g, kcal); la conversión es solo de presentación.
- **Snapshots**: los ítems de plan guardan nombre y macros calculados (`food_name`, `kcal`, …) para que cambiar un alimento del catálogo no altere planes publicados, y para que el cliente **no necesite leer** `foods`/`exercises` (minimización).
- **RLS activado en la misma migración que crea cada tabla.** Ninguna tabla de `public` sin RLS (lo comprueba CI).
- **Escrituras sensibles por RPC**; el rol `anon` no accede a nada.

### 4.2 Enums
`user_role(professional, client)` · `specialty(nutrition, training)` · `link_status(pending, active, ended)` · `invitation_status(pending, redeemed, expired, revoked)` · `plan_kind(diet, routine)` · `plan_status(draft, active, archived)` · `meal_type(breakfast, mid_morning, lunch, snack, dinner, other)` · `completion_status(done, skipped)` · `workout_status(in_progress, completed, skipped)` · `measure_type(weight, waist, hip, chest, arm, thigh, body_fat_pct)` · `photo_pose(front, side, back)` · `question_type(scale, number, yes_no, single_choice, multi_choice, text)` · `checkin_status(pending, submitted, reviewed)` · `notification_kind(checkin_due, plan_published, client_inactive, invitation_redeemed, reminder)` · `notification_status(queued, sent, failed, cancelled)` · `consent_purpose(terms, privacy_policy, health_data, progress_photos, analytics)` · `access_action(view_client, view_photo, view_measurements, view_checkin, export_data)` · `sex(female, male, other, unspecified)`.

### 4.3 Tablas (todas en `public`, salvo funciones auxiliares en `private`)

**Identidad y vínculo**
| Tabla | Columnas clave | Restricciones / índices |
|---|---|---|
| `profiles` | `id` (PK → `auth.users`, cascade), `role` (**nullable** hasta completar onboarding; inmutable después por trigger), `full_name`, `locale` (def. `es-ES`), `timezone` (def. `Europe/Madrid`), `avatar_path`, `onboarding_completed_at`, `deleted_at`, `created_at`, `updated_at` | idx `(role)` |
| `professional_profiles` | `user_id` PK, `specialties specialty[]` (no vacío), `business_name`, `bio`, `registration_number` (colegiado, autodeclarado, opcional), `inactivity_threshold_days` (def. 3, 1–30) | — |
| `client_profiles` | `user_id` PK, `birth_date` (CHECK ≥18 años), `sex`, `height_cm` (80–250), `goal_text` | Solo campos con finalidad clara (minimización) |
| `invitations` | `id`, `professional_id`, `code` (8 car. base32 sin ambiguos), `status`, `expires_at` (def. +7 d), `redeemed_by`, `redeemed_at` | UNIQUE `(code)`; idx `(professional_id, status)` |
| `client_links` | `id`, `professional_id`, `client_id`, `status`, `invitation_id`, `started_at`, `ended_at`, `ended_by`, `checkin_template_id`, `checkin_weekday` (1–7) | **UNIQUE parcial `(client_id) WHERE status IN ('pending','active')`** ← aquí vive el 1:1; para N:M se elimina ese índice. idx `(professional_id, status)` |

**Catálogo y planes**
| Tabla | Columnas clave | Restricciones / índices |
|---|---|---|
| `foods` | `id`, `owner_id` (NULL = catálogo global, solo `service_role`), `name`, `brand`, `kcal_100g`, `protein_100g`, `carbs_100g`, `fat_100g`, `fiber_100g`, `source` (`bedca`/`off`/`custom`), `source_ref`, `locale`, `archived_at` | GIN trigram sobre `unaccent(lower(name))`; UNIQUE parcial `(source, source_ref)`; idx `(owner_id)` |
| `food_portions` | `id`, `food_id`, `label`, `grams` | idx `(food_id)` |
| `exercises` | `id`, `owner_id` (NULL = catálogo), `name`, `muscle_group`, `equipment`, `instructions`, `video_url` (CHECK `https://`), `source`, `locale`, `archived_at` | GIN trigram `name`; idx `(owner_id)` |
| `plans` | `id`, `professional_id`, `client_id` (**NULL = plantilla**), `kind`, `name`, `description`, `status`, `starts_on`, `ends_on`, `source_template_id`, `version` (def. 1), `kcal_target`, `protein_target_g`, `carbs_target_g`, `fat_target_g`, `published_at` | UNIQUE parcial `(client_id, kind) WHERE status='active'` (publicar archiva el anterior); idx `(professional_id, kind) WHERE client_id IS NULL`; idx `(client_id, kind, status)` |
| `plan_days` | `id`, `plan_id`, `position`, `name`, `weekdays smallint[]` (1=lunes…7, opcional) | UNIQUE `(plan_id, position)` |
| `diet_meals` | `id`, `plan_day_id`, `position`, `meal_type`, `label`, `time_hint`, `notes` | idx `(plan_day_id, position)` |
| `diet_meal_items` | `id`, `meal_id`, `position`, `food_id` (SET NULL), `food_name`, `quantity_g`, `portion_id`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `notes` | Trigger calcula macros desde `foods` en INSERT/UPDATE |
| `routine_exercises` | `id`, `plan_day_id`, `position`, `exercise_id` (SET NULL), `exercise_name`, `sets` (1–20), `reps_min`, `reps_max` (≥ min), `rest_seconds`, `target_rpe`, `notes` | idx `(plan_day_id, position)` |

Una **plantilla** es un `plans` con `client_id IS NULL`; **asignar** = copia profunda (RPC `assign_template`), de modo que editar la plantilla no altera planes ya entregados.

**Registro del cliente (escrito por el cliente, con `client_updated_at`)**
| Tabla | Columnas clave | Restricciones / índices |
|---|---|---|
| `meal_completions` | `id` (UUIDv7 cliente), `client_id`, `plan_id`, `meal_id`, `local_date`, `status`, `client_updated_at` | UNIQUE `(client_id, meal_id, local_date)`; idx `(client_id, local_date)` |
| `workout_logs` | `id`, `client_id`, `plan_id`, `plan_day_id`, `local_date`, `started_at`, `finished_at`, `status`, `notes`, `client_updated_at` | idx `(client_id, local_date DESC)` |
| `workout_set_logs` | `id`, `workout_log_id` (cascade), `client_id` (desnormalizado para RLS barata), `routine_exercise_id`, `exercise_name`, `set_index`, `reps`, `weight_kg`, `rpe`, `client_updated_at` | UNIQUE `(workout_log_id, routine_exercise_id, set_index)`; idx `(client_id)` |
| `body_measurements` | `id`, `client_id`, `local_date`, `type`, `value`, `note`, `client_updated_at` | UNIQUE `(client_id, local_date, type)`; CHECK de rango por `type`; idx `(client_id, type, local_date DESC)` |
| `progress_photos` | `id`, `client_id`, `local_date`, `pose`, `storage_path`, `width`, `height`, `size_bytes` | UNIQUE `(storage_path)`; idx `(client_id, local_date DESC)` |
| `client_activity` | `client_id` PK, `last_activity_at`, `last_weight_on`, `last_checkin_at`, `adherence_7d`, `adherence_computed_at` | Actualizada por triggers y *cron* nocturno |

**Check-ins**
| Tabla | Columnas clave | Restricciones / índices |
|---|---|---|
| `checkin_templates` | `id`, `professional_id`, `name`, `is_default`, `archived_at` | idx `(professional_id)` |
| `checkin_questions` | `id`, `template_id`, `position`, `type`, `label`, `help`, `required`, `config jsonb` (min/max/step/unit/opciones), `archived_at` | **Append-only**: editar una pregunta crea otra fila y archiva la anterior (las respuestas históricas siguen apuntando a la pregunta original) |
| `checkins` | `id`, `client_id`, `professional_id`, `template_id`, `due_on`, `status`, `submitted_at`, `reviewed_at`, `professional_feedback`, `client_updated_at` | UNIQUE `(client_id, due_on)`; idx `(professional_id, status, due_on)` |
| `checkin_answers` | `id`, `checkin_id` (cascade), `question_id`, `value_number`, `value_text`, `value_json` | UNIQUE `(checkin_id, question_id)` |

**Notificaciones y dispositivos**
| Tabla | Columnas clave | Restricciones / índices |
|---|---|---|
| `push_tokens` | `id`, `user_id`, `expo_token`, `platform`, `device_label`, `last_seen_at`, `revoked_at` | UNIQUE `(expo_token)`; idx `(user_id)` |
| `notification_preferences` | `user_id`, `kind`, `enabled`, `quiet_start`, `quiet_end` | PK `(user_id, kind)` |
| `reminders` | `id`, `user_id`, `kind`, `local_time`, `weekdays`, `enabled` | idx `(user_id)` |
| `notifications` | `id`, `user_id`, `kind`, `payload jsonb` (**solo ids, sin datos de salud**), `dedupe_key`, `scheduled_for`, `status`, `sent_at`, `read_at`, `expo_ticket_id`, `error` | UNIQUE parcial `(user_id, dedupe_key)`; idx parcial `(status, scheduled_for) WHERE status='queued'` |

**Cumplimiento y operación**
| Tabla | Columnas clave | Restricciones / índices |
|---|---|---|
| `consents` | `id`, `user_id`, `purpose`, `policy_version`, `granted`, `granted_at`, `source`, `text_hash` | **Append-only** (retirar = nueva fila `granted=false`); idx `(user_id, purpose, granted_at DESC)`; vista `current_consents` |
| `access_logs` | `id bigint identity`, `actor_id`, `subject_id`, `action`, `resource_type`, `resource_id`, `at`, `via` | idx `(subject_id, at DESC)`; retención 12 meses **[S]** |
| `deletion_requests` | `id`, `user_id`, `requested_at`, `execute_after` (+14 d), `cancelled_at`, `completed_at` | idx parcial pendientes |
| `data_exports` | `id`, `user_id`, `requested_at`, `ready_at`, `storage_path`, `expires_at` | — |
| `app_config` | `key` PK, `value jsonb` (flags, versión mínima de app, `entitlements_enabled`) | Lectura para `authenticated` |
| `job_runs`, `rate_limits` | latido de *cron* y contadores de intentos (invitaciones) | Solo `service_role`/funciones |

### 4.4 Políticas RLS por rol

**Funciones auxiliares** (schema `private`, `SECURITY DEFINER`, `SET search_path = ''`, `EXECUTE` solo a `authenticated`; los *wrappers* públicos son los únicos expuestos por la API): `private.my_role()`, `private.is_pro_of(client_id)` (vínculo `active`), `private.owns_plan(plan_id)`, `private.client_owns_plan(plan_id)` (plan del cliente y no `draft`), `private.has_consent(client_id, purpose)`, `private.can_view_exercise(exercise_id)`.
Patrón de rendimiento: usar `(select auth.uid())` en las políticas e indexar las columnas que filtran.

| Tabla | CLIENTE | PROFESIONAL | Otros |
|---|---|---|---|
| `profiles` | Ver/editar el suyo (sin cambiar `role`) | Ver el suyo y el de clientes con vínculo activo (lectura) | `anon`: nada |
| `professional_profiles` | Ver el de su profesional | CRUD el suyo | — |
| `client_profiles` | CRUD el suyo | Solo lectura de clientes vinculados | — |
| `invitations` | — | CRUD las suyas | Canje solo por RPC |
| `client_links` | Ver el suyo | Ver los suyos | Alta/baja solo por RPC |
| `foods`, `exercises` | Catálogo global: lectura. Los propios del profesional: solo ejercicios usados en su plan (`can_view_exercise`) | Catálogo global: lectura; propios: CRUD | Globales las inserta `service_role` |
| `plans` y tablas hijas | Lectura de los planes asignados y no `draft` | CRUD de los suyos (`owns_plan`) | — |
| Registro (`meal_completions`, `workout_*`, `body_measurements`) | CRUD propio **y** `WITH CHECK` de que el `plan_id` es suyo | Solo lectura con vínculo activo (`is_pro_of`) | Ninguna escritura del profesional |
| `progress_photos` | CRUD propio | Lectura de metadatos solo con vínculo activo **y** consentimiento de fotos | Los objetos solo vía Edge Function |
| `checkin_templates/questions` | Lectura de las de su plantilla asignada | CRUD las suyas | — |
| `checkins`, `checkin_answers` | Ver/crear/enviar los suyos | Ver los de sus clientes; feedback **solo por RPC** `review_checkin` | — |
| `notifications` | Ver y marcar leído las suyas | Ídem | Inserta solo `service_role` |
| `push_tokens`, `reminders`, `notification_preferences` | CRUD propio | CRUD propio | — |
| `consents` | Insert/select propio (sin update ni delete) | Ídem | — |
| `access_logs` | **Select** de los registros donde `subject_id = yo` (transparencia) | Sin acceso | Insert solo por funciones definer/`service_role` |
| `client_activity` | Sin acceso | Lectura de sus clientes | Escribe trigger/*cron* |

Ejemplo del patrón (ilustrativo, no es código de la app):
```sql
-- helper
create function private.is_pro_of(p_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.client_links l
    where l.client_id = p_client and l.professional_id = (select auth.uid()) and l.status = 'active');
$$;
-- política: el profesional solo lee mediciones de clientes vinculados
create policy "pro_reads_linked_measurements" on public.body_measurements
  for select to authenticated using (private.is_pro_of(client_id));
create policy "client_owns_measurements" on public.body_measurements
  for all to authenticated using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));
```
Las vistas se crean con `security_invoker = true` para que respeten RLS.

### 4.5 Storage
- Bucket **`progress-photos`** privado: máx. 3 MB, solo `image/jpeg`, ruta `{client_id}/{photo_id}.jpg`. Políticas `INSERT/SELECT/DELETE` solo para el dueño (`(storage.foldername(name))[1] = (select auth.uid())::text`). **El profesional no tiene política de lectura**: accede únicamente mediante la Edge Function `photo-access`, que verifica vínculo + consentimiento, registra el acceso y devuelve una URL firmada de 60 s.
- Bucket **`exports`** privado: solo `service_role` escribe; descarga por URL firmada de 24 h.

### 4.6 Migraciones versionadas
Reglas: Supabase CLI (`supabase migration new`), **solo hacia delante**, una responsabilidad por migración, jamás editar una migración ya aplicada, cambios destructivos en dos pasos (expandir/contraer), RLS e índices dentro de la propia migración, *staging* antes que *prod* (con aprobación manual), tipos regenerados y commiteados (`database.types.ts`), CI detecta deriva de esquema. Semillas: `supabase/seed.sql` (solo local/test) y `scripts/import-catalog` (idempotente, para staging/prod).

| Nº | Migración |
|---|---|
| 001 | Extensiones (`pg_trgm`, `unaccent`, `pg_cron`, `pg_net`), enums, schema `private` |
| 002 | Identidad (`profiles`, `professional_profiles`, `client_profiles`) + triggers (`handle_new_user`, inmutabilidad de `role`) + RLS |
| 003 | Vínculo (`invitations`, `client_links` + índice parcial) + RLS |
| 004 | Catálogo (`foods`, `food_portions`, `exercises`) + índices de búsqueda + RLS |
| 005 | Planes (`plans`, `plan_days`, `diet_*`, `routine_exercises`) + trigger de macros + RLS |
| 006 | Registro del cliente + `client_activity` + triggers + RLS |
| 007 | Check-ins + RLS |
| 008 | Notificaciones y dispositivos + RLS |
| 009 | Cumplimiento (`consents`, `access_logs`, `deletion_requests`, `data_exports`, `app_config`) + RLS |
| 010 | RPC de onboarding e invitaciones (`complete_onboarding`, `create_invitation`, `redeem_invitation`, `preview_invitation`, `end_link`) con limitador SQL |
| 011 | RPC de planes (`assign_template`, `publish_plan`, `duplicate_plan`) |
| 012 | RPC de sincronización (upserts idempotentes con LWW, `submit_checkin`, `get_client_snapshot`) |
| 013 | RPC de panel y revisión (`get_dashboard`, `review_checkin`, `log_client_access`, `record_consent`, `request_account_deletion`) |
| 014 | Buckets y políticas de Storage |
| 015 | Jobs `pg_cron` (check-ins, inactividad, retención, borrado diferido, recálculo de adherencia) |

### 4.7 Borrado y anonimización
- **Cliente**: borrado en cascada de todas sus filas y objetos de Storage; el profesional pierde el acceso al instante.
- **Profesional**: se cierran los vínculos; sus datos personales se eliminan; el contenido de planes asignados a clientes se conserva **anonimizado** ("Profesional eliminado") hasta que el cliente lo borre o se desvincule **[S: validar con abogado]**.
- Las copias de seguridad de Supabase conservan datos borrados hasta que caduquen; se documenta en la política de privacidad.

---

## 5. Mapa de pantallas y flujos

### 5.1 Profesional
| Ruta | Pantalla | Contenido clave | Offline |
|---|---|---|---|
| `(auth)/login` `register` `verify-otp` `forgot-password` | Acceso | Email+contraseña, OTP de 6 dígitos, recuperación | — |
| `(onboarding)/role` → `professional-profile` → `consents` | Alta | Rol, nombre, especialidades, consentimientos (términos, privacidad) | No |
| `(tabs)/index` | **Panel** | KPIs (adherencia media, clientes inactivos, check-ins pendientes), lista ordenada por riesgo | Caché obsoleta |
| `(tabs)/clients` | Clientes | Lista + búsqueda + filtros (activo/inactivo), botón **Invitar** | Caché obsoleta |
| `(tabs)/library` | Biblioteca | Pestañas: Plantillas · Alimentos · Ejercicios · Cuestionarios | No |
| `(tabs)/settings` | Ajustes | Perfil, umbral de inactividad, notificaciones, privacidad, cerrar sesión | Parcial |
| `clients/[id]` | **Ficha del cliente** | Pestañas: Resumen · Planes · Seguimiento · Check-ins | Caché obsoleta |
| `clients/[id]/progress` | Seguimiento | Gráficas de peso/medidas, historial de entrenos | Caché obsoleta |
| `clients/[id]/photos` | Fotos (pantalla segura) | Galería y comparador vía `photo-access` | No |
| `plans/[id]` + `plans/[id]/day/[dayId]` | **Constructor** de dieta o rutina | Días → comidas/ejercicios, totales en vivo, reordenar, duplicar, autoguardado | No |
| `pickers/food` · `pickers/exercise` | Selectores | Búsqueda con *debounce*, crear propio | No |
| `templates/assign` (modal) | Asignar plantilla | Cliente, fechas | No |
| `checkin-templates/[id]` | Cuestionario | Tipos de pregunta, orden, obligatoriedad | No |
| `checkins/[id]` | Revisar check-in | Respuestas + feedback | No |
| `invite` (modal) | Invitar | Código + compartir enlace | No |
| `privacy` | Centro de privacidad | Exportar, borrar cuenta, consentimientos | No |

### 5.2 Cliente
| Ruta | Pantalla | Contenido clave | Offline |
|---|---|---|---|
| `(onboarding)/invite-code` → `client-profile` → `consents` | Alta | Código (o *deep link*), confirmación del nombre del profesional, datos opcionales, consentimientos granulares (salud, fotos, analítica opt-in) | No |
| `(tabs)/index` | **Hoy** | Comidas del día con macros, entreno del día, estado de sincronización | **Sí** |
| `(tabs)/plan` | Plan | Vista semanal, adherencia propia | **Sí** |
| `(tabs)/progress` | Progreso | Peso, medidas, entrenos, fotos | Lectura sí; escritura de peso/medidas sí |
| `(tabs)/checkin` | Check-in | Pendiente/histórico | Responder sí (cola) |
| `(tabs)/settings` | Ajustes | Recordatorios, notificaciones, privacidad, cerrar sesión | Parcial |
| `workout/[dayId]` → `workout/session/[logId]` | Entreno | Lista, sesión en curso (kg/reps/RPE por serie, temporizador de descanso) | **Sí** |
| `progress/weight/new` · `progress/measurements/new` | Registrar | Entrada con coma decimal | **Sí** |
| `progress/photos` · `photos/capture` · `photos/compare` | Fotos | Captura con permisos en contexto, comparador de dos fechas | Solo online |
| `checkin/[id]` | Formulario dinámico | Validado con Zod, borrador local | **Sí** (encolado) |
| `pending-sync` | Pendiente de sincronizar | Cola con reintentar/descartar | **Sí** |
| `privacy` | Centro de privacidad | Consentimientos, exportar, borrar cuenta, "quién ha accedido a mis datos" | Parcial |

### 5.3 Flujos principales
1. **Profesional**: alta → invitar cliente → (cliente acepta) → crear/asignar plan → publicar → notificación al cliente.
2. **Cliente**: instalar → crear cuenta → introducir código → consentimientos → perfil → "Hoy".
3. **Día del cliente**: Hoy → marcar comida / iniciar entreno → registrar series → finalizar → resumen.
4. **Offline**: modo avión → registrar → insignia "n pendientes" → reconectar → sincronización automática → insignia verde. Si un registro falla de forma permanente, aparece en "Pendiente de sincronizar".
5. **Check-in**: *cron* crea el check-in y notifica → cliente responde → profesional lo revisa y deja feedback.
6. **Alertas**: *cron* de inactividad → push al profesional → Panel → ficha del cliente.
7. **Desvincular**: cualquiera de las partes → acceso revocado → el cliente puede exportar sus datos.
8. **Cuenta**: Privacidad → exportar (JSON+CSV+fotos) o borrar (doble confirmación, 14 días de gracia).

---

## 6. API, contratos y Edge Functions

**Principios**: (1) CRUD simple con `supabase-js` bajo RLS desde los repositorios (sin capa REST propia); (2) **RPC (SQL)** para operaciones atómicas o con privilegios; (3) **Edge Functions** solo para secretos, servicios externos, `service_role` y limitación de tasa; (4) cada contrato tiene su **esquema Zod** en `shared/contracts/`; (5) errores estables `{ error: { code, message } }` con códigos mapeados a claves i18n; (6) idempotencia por UUID de cliente; (7) paginación por *keyset* `(created_at, id)`; (8) fechas "de día" `YYYY-MM-DD`, instantes ISO-8601 UTC.

### 6.1 RPC (funciones SQL)
| RPC | Quién | Entrada | Salida | Errores |
|---|---|---|---|---|
| `complete_onboarding` | Cualquier usuario sin rol | `role`, `full_name`, `specialties?`, `invitation_code?`, `locale`, `timezone` | perfil | `already_onboarded`, `invitation_invalid`, `invitation_expired`, `underage`, `rate_limited` |
| `create_invitation` / `revoke_invitation` | Profesional | — / `id` | `{id, code, expires_at}` | `forbidden` |
| `preview_invitation` | Autenticado | `code` | nombre del profesional | `invitation_invalid`, `rate_limited` |
| `redeem_invitation` | Cliente | `code` | vínculo | `invitation_invalid`, `already_linked`, `rate_limited` |
| `end_link` | Cliente o profesional | `link_id` | — | `forbidden`, `not_found` |
| `assign_template` | Profesional | `template_id`, `client_id`, `starts_on` | `plan_id` (copia profunda) | `forbidden`, `not_linked` |
| `publish_plan` | Profesional | `plan_id` | plan (archiva el anterior, `version`+1, encola notificación) | `forbidden`, `plan_empty` |
| `duplicate_plan` | Profesional | `plan_id` | `plan_id` | `forbidden` |
| `upsert_meal_completion`, `upsert_workout_log`, `upsert_set_logs(batch)`, `upsert_measurement` | Cliente | Registro con `id` (UUIDv7) y `client_updated_at` | fila | `forbidden`, `plan_archived`, `validation` |
| `submit_checkin` | Cliente | `checkin_id`, `answers[]` | check-in | `already_submitted` (tratado como éxito), `validation` |
| `review_checkin` | Profesional | `checkin_id`, `feedback` | check-in | `forbidden` |
| `get_client_snapshot` | Cliente | `from`, `to` | JSON: plan activo + ejercicios + 30 días de registros + check-in pendiente | — |
| `get_dashboard` | Profesional | `days` | filas: cliente, `last_activity_at`, `adherence_7d`, estado de check-in, banderas | — |
| `log_client_access` | Profesional | `client_id`, `action`, `resource?` | — | `forbidden` |
| `record_consent` | Autenticado | `purpose`, `granted`, `policy_version` | — | — |
| `request_account_deletion` / `cancel_account_deletion` | Autenticado | — | `execute_after` | — |

Los *upserts* de registro son `SECURITY INVOKER` (RLS aplica) y usan `ON CONFLICT … DO UPDATE … WHERE excluded.client_updated_at > actual`.

### 6.2 Edge Functions (Deno)
| Función | Disparo | Qué hace | Seguridad |
|---|---|---|---|
| `photo-access` | App (profesional/cliente) | Verifica vínculo + consentimiento, escribe `access_logs`, devuelve URL firmada de 60 s | JWT obligatorio; limitada por usuario |
| `send-push` | `pg_cron`/`pg_net` | Toma `notifications` en cola, envía por lotes a Expo Push, procesa recibos y revoca tokens `DeviceNotRegistered` | Cabecera con secreto interno; no invocable por usuarios |
| `delete-account` | `pg_cron` (cuando vence `execute_after`) | Borra Storage → filas → usuario de Auth; (en M12: revoca token de Apple) | `service_role` solo en la función |
| `export-my-data` | App | Genera JSON+CSV+fotos (zip) en bucket `exports`, crea `data_exports`, notifica; URL firmada 24 h | JWT; una exportación activa por usuario |

Los *jobs* programados (check-ins, inactividad, retención, recálculo de adherencia) son funciones SQL con `pg_cron`; solo se usa Edge Function cuando hay efecto externo (push). `scripts/import-catalog` es un script, no una Edge Function.

### 6.3 Convenciones
- **Códigos de error** estables (`invitation_expired`, `rate_limited`, `consent_missing`, `plan_archived`…) → `errors.<code>` en i18n.
- **Versionado**: `v1` implícito; un cambio incompatible crea `*_v2` y mantiene el anterior hasta que caduque la versión mínima de app (`app_config`).
- **Contratos compartidos app ↔ Edge Functions**: carpeta `shared/contracts/`; **[? T0.11]** comprobar que el empaquetado de Edge Functions admite imports fuera de `supabase/functions`; si no, plan B: carpeta `_shared` de la función + alias de ruta en la app.

---

## 7. Seguridad y privacidad (datos de salud, RGPD art. 9)

> Nada de esta sección sustituye asesoría jurídica. Los puntos marcados **[abogado]** deben validarse antes de abrir la beta a profesionales reales.

### 7.1 Roles y bases de licitud
| Tratamiento | Responsable | Encargado | Base de licitud [S, abogado] |
|---|---|---|---|
| Datos de salud del cliente (peso, medidas, plan, check-ins, fotos) | **Profesional** | **evocoach** (art. 28: DPA firmado por cada profesional) | Art. 6.1.b (relación profesional-cliente) + **art. 9.2.a consentimiento explícito** del cliente, por finalidades separadas |
| Cuenta, autenticación, seguridad, diagnóstico | **evocoach** | Subencargados (§7.3) | Art. 6.1.b/f |
| Analítica de producto (UX) | evocoach | PostHog UE | Consentimiento opt-in (art. 6.1.a) |

Nota: para nutricionistas/dietistas (profesión sanitaria) podría invocarse también el art. 9.2.h; para entrenadores no. **Se usa el consentimiento explícito como base común** **[abogado]**.

### 7.2 Requisitos → implementación → verificación
| Requisito | Implementación | Verificación |
|---|---|---|
| **Consentimiento explícito y granular** | Pantalla en onboarding y en Ajustes con propósitos separados: *tratamiento de datos de salud*, *fotos de progreso*, *analítica (opt-in)*. Tabla `consents` append-only con `policy_version` y `text_hash`. Sin casillas premarcadas. Retirar = nueva fila `granted=false` con efecto inmediato | Test pgTAP (profesional no ve fotos sin consentimiento) + E2E (retirar y comprobar) |
| **Minimización** | Solo campos con finalidad; fecha de nacimiento y sexo opcionales; el cliente no lee `foods`/`exercises`; payload de push sin datos de salud; Sentry sin PII y sin *replay*; eventos de analítica sin valores de salud | Revisión en PR (lista de campos) + lint de eventos permitidos |
| **Cifrado** | TLS en tránsito; cifrado en reposo del proveedor **[? confirmar en docs de Supabase]**; sesión en almacenamiento cifrado (patrón `LargeSecureStore`: clave AES en SecureStore **[?]**); SQLite local cifrado si el spike lo permite; `allowBackup=false` | Spike T0.13 + revisión del manifiesto |
| **Fotos seguras** | Bucket privado; el profesional **no** tiene política de lectura: solo `photo-access` (vínculo + consentimiento + log → URL de 60 s); EXIF eliminado al re-codificar; `expo-image` sin caché en disco para URLs firmadas; `FLAG_SECURE` en pantallas de fotos | Tests de Storage RLS + prueba manual de captura de pantalla |
| **Registro de accesos** | `access_logs` escrito por `photo-access` y `log_client_access`; el cliente ve "Quién ha accedido a mis datos". *Limitación documentada*: Postgres no registra `SELECT` por fila, por lo que la lectura de ficha se registra al abrir la pantalla vía RPC | Test: abrir ficha/foto genera registro |
| **Borrado de cuenta (art. 17 + Apple/Google)** | En la app (no por web): doble confirmación, 14 días de gracia cancelables, después `delete-account` borra Storage → filas → Auth. Además URL pública de solicitud de borrado exigida por Google Play **[V]** | Test de borrado completo (T9.11): no quedan filas ni objetos |
| **Exportación (art. 20)** | `export-my-data`: JSON + CSV + fotos en zip, URL firmada de 24 h, una activa por usuario | Test: el zip contiene todas las tablas del sujeto |
| **Retención** | Ver §7.4 | *Cron* + test |
| **Derechos del cliente tras desvincular** | El profesional pierde el acceso al instante; el cliente conserva sus datos y puede exportarlos o borrarlos **[abogado: conservación obligatoria del profesional]** | pgTAP |
| **Brechas (art. 33/34)** | Runbook: detectar → contener (rotar claves) → evaluar → notificar a la AEPD en ≤72 h y a afectados si procede | Simulacro anual (documentado en `docs/runbooks`) |
| **EIPD (art. 35)** | Hacer una EIPD ligera antes de la beta pública (tratamiento de categorías especiales + perfilado de adherencia) **[abogado]**; RAT (art. 30) y DPA plantilla en `docs/legal/` | Documentos versionados |
| **Menores** | 18+: la fecha de nacimiento, si se informa, se valida; términos lo declaran | Test de `underage` |
| **Seguridad de la app** | Sin `service_role` en la app; validación Zod en bordes; RPC con `search_path=''`; límites de tamaño; revisión de dependencias; `gitleaks`; sin *logs* con PII | Revisión de seguridad por segundo agente (M10) |

### 7.3 Subencargados previstos
| Proveedor | Datos | Región/garantía | Estado |
|---|---|---|---|
| Supabase | Todos los datos de la app | Frankfurt `eu-central-1` **[V]**; DPA/SCC y lista de subencargados publicados **[V, comprobar versión vigente]** | Firmar DPA en T0.3 |
| Expo Push → FCM/APNs | Token + notificación genérica en tránsito | EE. UU. (Expo/Google/Apple) | Payload sin datos de salud; documentar |
| Sentry | Errores sin PII | UE (Frankfurt) **[V]** | Configurar DSN UE |
| PostHog | Eventos opt-in | UE (Frankfurt) **[V]** | Solo con consentimiento |
| Proveedor SMTP | Email del usuario | Elegir proveedor UE **[? T2.6]** | Necesario: el SMTP por defecto de Supabase no sirve para producción **[?]** |
| EAS / GitHub | Código y builds, sin datos de usuario | — | — |

### 7.4 Retención **[S]**
| Dato | Retención |
|---|---|
| Datos de salud del cliente | Mientras exista la cuenta; borrado en cascada al eliminarla |
| Vínculo terminado | El profesional pierde el acceso; datos del cliente permanecen en su cuenta |
| `access_logs` | 12 meses |
| `notifications` entregadas | 90 días |
| `data_exports` | URL 24 h; fila y objeto se purgan a los 7 días |
| Outbox `failed` | 30 días en el dispositivo |
| Copias de seguridad del proveedor | Hasta su caducidad (se declara en la política) |

---

## 8. Rendimiento, accesibilidad e i18n

### 8.1 Rendimiento
| Área | Medida | Presupuesto |
|---|---|---|
| Arranque en frío (Android gama media) | Sentry + perfilado manual en tu móvil | ≤ 3 s hasta "Hoy" interactiva |
| "Hoy" offline | Render desde caché | ≤ 500 ms |
| Listas largas (clientes, alimentos) | FlashList v2, paginación *keyset*, `estimatedItemSize` | 60 fps en scroll |
| Búsqueda de alimentos | Índice trigram + *debounce* 250 ms | p95 < 400 ms servidor |
| Guardado de constructor | Escritura por lotes + autoguardado | p95 ≤ 1 s |
| Una llamada por pantalla | `get_client_snapshot` y `get_dashboard` agregan en servidor | ≤ 1 RPC por pantalla principal |
| Gráficas | Líneas simples con `react-native-svg` (sin Skia) **[S]** | — |
| Imágenes | Redimensionar a ≤1600 px, JPEG q≈0,8 en cliente; `expo-image` | ≤ 600 KB por foto |
| Caché persistida | Tope ~2 MB, buster por versión de esquema | — |
| JS | Hermes, rutas pesadas con carga diferida, React Compiler **[? comprobar en SDK 58]** | — |
Medición continua: tracing de Sentry (muestreo 10 %), Android vitals y revisión manual cada hito.

### 8.2 Accesibilidad (objetivo WCAG 2.2 AA)
- **Tamaño de texto**: `allowFontScaling` activo; diseño probado con la fuente y el tamaño de pantalla máximos de Android; sin alturas fijas en texto; **tokens de tipografía en `sp`**.
- **Contraste**: ≥ 4,5:1 texto normal, ≥ 3:1 texto grande/iconos; el script de verificación de tokens falla el CI si un par semántico no cumple.
- **Lectores de pantalla** (TalkBack ahora, VoiceOver en M12): `accessibilityLabel/Role/State` obligatorios en primitivas interactivas (regla ESLint `react-native-a11y`), orden de foco lógico, anuncios de errores con `accessibilityLiveRegion`.
- **Objetivos táctiles** ≥ 48 dp; estado nunca solo por color (adherencia con icono + texto); respeta "reducir movimiento".
- **Formularios**: etiquetas visibles, teclado numérico con **coma decimal es-ES**, errores asociados al campo.
- Normativa: la Ley Europea de Accesibilidad rige desde 28-jun-2025; las microempresas de servicios podrían estar exentas **[? abogado]**; se aplica igualmente como estándar de calidad.

### 8.3 i18n
| Aspecto | Decisión |
|---|---|
| Librería | i18next + react-i18next + expo-localization; claves tipadas; espacios de nombres por feature (`plans`, `tracking`…) |
| Texto | Ninguna cadena literal en componentes (regla ESLint `no-literal-string` en `ui/`); sin concatenar; plurales con ICU/i18next |
| Servidor | Errores como **códigos**; notificaciones push localizadas por `profiles.locale` en `send-push`; las tablas guardan enums, no etiquetas |
| Formatos | `Intl` para fechas/números; unidades métricas; **entrada con coma o punto** (`parseDecimal`) |
| Zona horaria | `profiles.timezone` + `local_date` del dispositivo |
| Catálogos | `foods.locale`/`exercises.locale`; contenido en español en el MVP |
| Idiomas | es-ES ahora; añadir `ca`/`en` = copiar `locales/es` + traducir (CI comprueba claves huérfanas y faltantes) |

---

## 9. Estrategia de pruebas

### 9.1 Pirámide
| Nivel | Herramienta | Qué cubre | Cuándo corre | Umbral |
|---|---|---|---|---|
| Unitarias | Jest + `jest-expo` | `domain/` (macros, adherencia, fechas, `parseDecimal`), máquina de outbox, mapeo de errores | Cada commit (local) y PR | ≥ 90 % líneas en `domain/` y `core/offline`; sin cuota global |
| Componentes/integración | React Native Testing Library | Formularios, constructor, "Hoy", estados vacío/error/carga con repositorios *fake* inyectados | PR | Flujos críticos cubiertos |
| Base de datos | **pgTAP** (`supabase test db`) | RLS, RPC, triggers, restricciones, índices parciales | PR | 100 % de la matriz RLS |
| Edge Functions | `deno test` + Supabase local | `photo-access`, `send-push`, `delete-account`, `export-my-data` | PR | Casos felices y de rechazo |
| Contratos | Zod + tipos generados (`satisfies`) | Que Zod y `database.types.ts` no diverjan | PR | — |
| Caos de sincronización | Jest (simula duplicados, reordenación, fallos intermedios, cierre de app) | Idempotencia de outbox | PR | Sin pérdidas ni duplicados |
| E2E | **Maestro** (Android) | Humo y flujos críticos | Noche + PR de release | 6–8 flujos estables |
| Accesibilidad | ESLint a11y + lista manual TalkBack/200 % | Etiquetas, foco, contraste | Cada hito | Lista sin bloqueantes |
| Manual en dispositivo real | Tu Android físico | Push, cámara, permisos, rendimiento | Cada hito | Checklist |

### 9.2 Cómo verificar RLS (el riesgo principal)
Actores de prueba: `anon`, `cliA` (vinculado a `proA`), `cliB` (vinculado a `proB`), `cliSinRol`, `proA`, `proB`, `proSinVínculo`.
1. **Matriz automática**: por cada tabla de `public` y cada operación (`select/insert/update/delete`) y cada actor → resultado esperado (permitir/denegar) en pgTAP.
2. **Guardas estructurales** (fallan el CI): toda tabla de `public` tiene RLS activado y ≥1 política; `anon` no puede `select` ninguna tabla ni ejecutar RPC; vistas con `security_invoker`; funciones `SECURITY DEFINER` con `search_path=''`.
3. **Casos negativos críticos** (mínimo): `cliA` no lee mediciones/fotos/check-ins/planes de `cliB`; `cliA` no inserta registros con `client_id` de otro ni con `plan_id` ajeno; `proA` no lee nada de `cliB`; `proA` no escribe registros de `cliA`; tras `end_link`, `proA` pierde el acceso; sin consentimiento de fotos `proA` no obtiene URL; `proA` no lee `access_logs`; `cliA` no cambia su `role`; `cliSinRol` no lee nada; canje de invitación caducada/usada/ajena falla; fuerza bruta de códigos queda limitada.
4. **Storage**: el profesional no puede `select` en `progress-photos`; un cliente no puede escribir fuera de su carpeta.
5. **Smoke en *staging*** tras cada despliegue: script con sesiones reales de usuarios *seed* que repite los casos negativos clave.
6. **Revisión humana/agente independiente** de cada migración que toque políticas (agente `security-auditor`).

### 9.3 Flujos E2E (Maestro)
(1) registro/login profesional · (2) invitar y canjear · (3) crear dieta y rutina, publicar · (4) cliente ve "Hoy" y marca comida · (5) registrar entreno · (6) **offline: modo avión → registrar → reconectar → ver en profesional** **[? comprobar comando de modo avión de Maestro; plan B: *hook* de prueba que simula offline]** · (7) check-in end-to-end · (8) exportar y borrar cuenta.
Ejecución: Android emulator en EAS Workflows/Maestro Cloud **[? límites y disponibilidad]**, y local en tu móvil por USB.

---

## 10. CI/CD, entornos y secretos

### 10.1 Pipelines (GitHub Actions + EAS)
| Pipeline | Disparo | Pasos |
|---|---|---|
| `app-check` | PR/push | `npm ci` · `expo-doctor` · `npx expo install --check` · ESLint · `tsc --noEmit` · Jest · límites de capas · claves i18n · `gitleaks` |
| `db-check` | PR/push | `supabase start` · `db reset` · `supabase test db` (pgTAP) · regenerar tipos y fallar si hay *diff* · `deno test` · lint de esquema/advisors **[?]** |
| `e2e` | Nocturno + PR de release | Build de desarrollo/preview en EAS → Maestro en emulador Android |
| `ios-compile` | Semanal o al fusionar a `main` | `eas build -p ios` perfil *simulator* para detectar roturas sin dispositivo **[? sin cuenta Apple]** |
| `preview` | PR con etiqueta | EAS Update al canal `staging` (solo JS) |
| `release` | Tag `v*` | Migraciones a *prod* (**aprobación manual**, entorno protegido de GitHub) → EAS Build AAB → EAS Submit a pista interna de Google Play |

Rama `main` protegida; *squash merge*; **PR ≤ ~400 líneas**; Conventional Commits; revisión del propio agente `code-review` y, para migraciones/RLS, `security-auditor`. Hooks locales con `lefthook` (ESLint+Prettier sobre ficheros staged, escaneo de secretos). Las dependencias gestionadas por Expo se actualizan **a mano** por SDK (excluidas de Renovate/Dependabot); actualizar SDK dentro de ~2 meses desde su salida **[? el ritmo de SDK ha cambiado en 2026]**.

### 10.2 Entornos
| Entorno | Supabase | Variante de app (`applicationId`) | Perfil/canal EAS | Distribución | Datos |
|---|---|---|---|---|---|
| **dev** | Local (Docker) | `app.evocoach.dev` | `development` (dev client) | APK en tu móvil | Sintéticos (`seed.sql`) |
| **staging** | `evocoach-staging` (Frankfurt) | `app.evocoach.staging` | `preview` · canal `staging` | APK interna / pista interna | Sintéticos + testers internos; **nunca datos reales de clientes** |
| **prod** | `evocoach-prod` (Frankfurt, plan Pro) | `app.evocoach` | `production` · canal `production` | Google Play | Reales |

`app.config.ts` lee `APP_VARIANT` para nombre, icono, `applicationId`, esquema de *deep link* y claves públicas. Se pueden instalar las tres variantes a la vez.

### 10.3 Secretos
| Secreto | Dónde vive | Quién lo lee |
|---|---|---|
| URL y clave **publishable** de Supabase, DSN de Sentry, clave pública de PostHog | Variables `EXPO_PUBLIC_*` de EAS por entorno (públicas por diseño) | App |
| Clave **secret** / `service_role`, secretos internos de `send-push` | `supabase secrets` (por proyecto) | Solo Edge Functions |
| `SUPABASE_ACCESS_TOKEN`, contraseña de BD, `EXPO_TOKEN` | GitHub Secrets (por entorno protegido) | CI |
| Cuenta de servicio de Google (FCM v1 y Play Submit) | Credenciales de EAS | EAS |
| Clave de subida de Android | EAS-managed + **copia cifrada fuera de línea** (Play App Signing activo) | Tú |
Reglas: nada de secretos en el repo ni en el *bundle*; escaneo en CI; rotación documentada en `docs/runbooks`.

### 10.4 Actualizaciones OTA (EAS Update)
`runtimeVersion` por *fingerprint* **[? valor por defecto en SDK 58]** → una OTA solo llega a binarios compatibles. Solo JS/recursos; nunca cambios que alteren la finalidad de la app; despliegue progresivo y reversión (`eas update:rollback`). Cambios nativos requieren nuevo build.

---

## 11. Publicación en tiendas

### 11.1 Google Play (MVP)
| Requisito | Detalle | Estado |
|---|---|---|
| Cuenta de desarrollador | 25 USD (pago único), verificación de identidad | T0.2 **[V coste: comprobar]** |
| **Prueba cerrada obligatoria** | Cuenta personal creada tras 13-nov-2023: ≥12 testers con opt-in continuo ≥14 días antes de pedir producción | **[V]** → reclutar desde M7 |
| API objetivo | Android 16 (API 36) desde 31-ago-2026 | **[V]** |
| Páginas de memoria de 16 KB | Comprobar compatibilidad del build (RN/Expo recientes la cumplen) | **[?]** |
| Formato | AAB con Play App Signing | EAS Build |
| **Declaración de apps de salud** | Obligatoria en Play Console para todas las apps | **[V]** |
| **Seguridad de los datos** | Declarar datos de salud/fitness, fotos, info personal, y recogida por proveedores de servicio | M10 |
| **Borrado de cuenta** | Opción dentro de la app **y** URL web de solicitud en el formulario | **[V]** → T9.8 |
| Política de privacidad | URL pública (es) | T9.1, T9.8 |
| Clasificación IARC y público | 18+; categoría Salud y bienestar; sin anuncios | M10 |
| Permisos | Cámara y notificaciones (`POST_NOTIFICATIONS`); **selector de fotos del sistema** para no pedir `READ_MEDIA_IMAGES` **[?]**; evitar alarmas exactas | M7/M8 |
| Estado de "trader" (DSA) y dirección pública | Para cuenta personal, valorar constitución previa | **[? T0.2]** |
| Ficha | Icono 512, gráfico 1024×500, ≥2 capturas, textos en español | M10 |
| Lanzamiento | Pista interna → cerrada → producción con despliegue progresivo (5→20→100 %) | M10–M11 |

### 11.2 Apple (hito M12, después del MVP)
Cuenta Apple Developer (99 USD/año; la de organización exige entidad y D-U-N-S, tarda semanas) · compilar con **Xcode 26+/SDK 26** (obligatorio desde 28-abr-2026 **[V]**) · **iPhone real** · **borrado de cuenta dentro de la app (5.1.1(v)) [V]** y revocar token de Sign in with Apple al borrar **[V]** · **Sign in with Apple** si se ofrece login de terceros (4.8) **[V parcial]** · **5.1.3**: los datos de salud no se usan para publicidad/minería ni se guardan en iCloud **[V parcial; comprobar texto vigente]** · etiquetas de privacidad · cuenta demo con cliente y profesional ya vinculados + código de invitación para App Review · textos de permisos en español · `ITSAppUsesNonExemptEncryption` · capturas en los tamaños exigidos **[?]**.

### 11.3 Política de privacidad (contenido mínimo)
Identidad del responsable/encargado, roles, categorías de datos, finalidades y bases de licitud, destinatarios y subencargados (con regiones), transferencias, plazos, derechos y cómo ejercerlos (en la app), consentimientos y retirada, copias de seguridad, contacto, versión. Versionada en `docs/legal/` y servida en la web estática.

### 11.4 Qué cambia con las suscripciones dentro de la app (fase 2)
| Tema | Regla / comisión | Verificación |
|---|---|---|
| Suscripción del **profesional** a evocoach (bien digital) | Apple: compra dentro de la app con IAP (3.1.1) salvo vías externas permitidas. Google: Play Billing para bienes digitales | **[V principio]** |
| Comisión **Apple** (UE desde 1-oct-2026) | Prensa: IAP estándar ≈ 26 %, Small Business Program 15 % (suscripciones tras el año 1 también 15 %); pagos alternativos 20 % / 10 %; enlaces externos con tarifa propia | **[? comprobar en Apple Developer]** |
| Comisión **Google** (desde 30-jun-2026, EEE/UK/EE. UU.) | Servicio ≈ 10 % en el primer millón anual + 5 % de facturación con Play Billing; **suscripciones: 10 % (blog) frente a 15 % (ayuda) → contradicción**; facturación alternativa/enlaces sin comisión de facturación | **[? contradicción]** |
| Cobros del **cliente al profesional** | Apple 3.1.3(d): servicios persona-a-persona en tiempo real pueden usar otros medios de pago; un plan asíncrono podría considerarse digital → riesgo de requerir IAP. Google: servicios reales fuera de la app admiten otros medios; coaching digital es ambiguo | **[? alto riesgo: consultar a App Review/Google antes de diseñar]** |
| Opción recomendada **[S]** | Cobros cliente→profesional por **Stripe en la cuenta del propio profesional** (pago web fuera de la app) y la app solo muestra "al día/pendiente"; suscripción del profesional vendida en la **web** (panel web de fase 2) con la app como cliente del servicio; evaluar RevenueCat si hace falta IAP | Decidir al empezar la fase 2 con verificación nueva |
| Impuestos | IAP: la tienda gestiona IVA como intermediario; Stripe: lo gestionas tú (IVA UE/OSS, Stripe Tax). Requiere entidad legal (autónomo/SL) | **[abogado/gestor]** |
| En la app | Pantalla de suscripción, **restaurar compras** (Apple), gestión/cancelación, validación en servidor (notificaciones del servidor de App Store y RTDN de Google), tabla `subscriptions` + `entitlements`, período de gracia, divulgación clara de precio/renovación | Fase 2 |

---

## 12. Observabilidad

| Área | Herramienta | Configuración |
|---|---|---|
| Fallos y ANR | **Sentry RN (UE)** | Release = versión + id de EAS Update; *sourcemaps* subidos en build; `sendDefaultPii:false`; `beforeSend` con redacción; sin *replay*; etiquetas: rol, variante, build (sin PII); muestreo de trazas 10 % |
| Salud de la app | Android vitals (Play Console) | Alertas de fallos/ANR por encima de umbral **[? valores vigentes]** |
| Backend | Supabase Reports/Logs | CPU, disco, errores 5xx, latencia; alertas por email |
| *Cron* | Tabla `job_runs` (latido) | Alerta si falta un latido esperado |
| Edge Functions | Logs + Sentry (Deno) opcional | Tasa de errores por función |
| **Métricas de producto (servidor, sin consentimiento de cliente)** | Consultas SQL agregadas (profesionales/clientes activos, activación, check-ins, adherencia) | Vistas guardadas; revisión semanal |
| **Analítica de UX (opt-in)** | PostHog UE | `autocapture` apagado; lista cerrada de eventos: `onboarding_completed(role)`, `invitation_created`, `client_linked`, `plan_published(kind)`, `meal_completed`, `workout_completed`, `measurement_logged(type)`, `checkin_submitted`, `sync_flush(resultado, tramo)`, `notification_opened(kind)`; **sin valores de salud ni texto libre**; id opaco |
| Alertas | Sentry (regresión, pico de errores), Supabase, latido de *cron* | Canal: email |

Objetivos operativos **[S]**: sesiones sin fallos ≥ 99,5 %, sincronización ≥ 99 % en 24 h, 0 fugas entre tenants.

---

## 13. Fases, hitos y tareas (1–3 h cada una)

**Definición de "hecha"** (aplica a toda tarea): criterios de aceptación cumplidos · comando de verificación ejecutado y su salida pegada en el PR · `npm run check` verde (y `supabase test db` si toca la BD) · tests nuevos para dominio/RLS · textos en i18n y estilos con tokens · ADR o docs actualizados si cambió una decisión · PR ≤ ~400 líneas.

**Plantilla de tarea para agentes**: *Contexto* (feature + ADR relevantes) · *Archivos esperados* · *Criterios de aceptación* · *Comando de verificación* · *Fuera de alcance*. Una tarea = una rama `feat/T4.9-…` = un PR.

**Semana 0 en paralelo (sin código, hacer ya)**: T0.1, T0.2, T0.3, T0.4, T0.14 y empezar a pensar en testers (profesionales + sus clientes).

### M0 · Fundaciones (28,5 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T0.1 | Comprar dominio, comprobar marca (OEPM/EUIPO), fijar `applicationId` y nombre; ADR-001 | 1 | — | Dominio activo; búsqueda anotada; ID decidido |
| T0.2 | Cuenta Google Play Console + iniciar verificación; revisar visibilidad de datos del desarrollador (DSA) | 1 | T0.1 | Cuenta verificada/en curso; decisión sobre "trader" anotada |
| T0.3 | Proyectos Supabase `staging` y `prod` (Frankfurt), claves publishable/secret, JWT asimétrico, DPA firmado | 1,5 | — | Región correcta en el panel; DPA en `docs/legal/` |
| T0.4 | Repo GitHub privado, protección de `main`, Environments `staging`/`production`, cuenta Expo/EAS | 1,5 | — | No se fusiona sin CI verde |
| T0.5 | Toolchain Windows: JDK 17, Android Studio + emulador, Docker Desktop (WSL2), Supabase CLI, EAS CLI, rutas largas | 3 | — | `supabase start` funciona; el emulador arranca |
| T0.6 | Proyecto Expo SDK 58 (TS estricto, Expo Router, `src/`) + spike de guards (`Stack.Protected`) | 2 | T0.5 | App abre en emulador; `npx expo-doctor` limpio |
| T0.7 | ESLint (major compatible), Prettier, alias, `dependency-cruiser`, reglas (`no-console`, a11y, `no-literal-string` en `ui/`) | 3 | T0.6 | `npm run lint` falla con un import prohibido de prueba |
| T0.8 | Jest + `jest-expo` + RNTL + scripts `check`/`typecheck`/`test` | 2 | T0.7 | `npm run check` verde con un test de humo |
| T0.9 | `CLAUDE.md` (§15), plantillas de ADR e issue, `lefthook`, commitlint | 2 | T0.7 | Un commit con mensaje inválido se rechaza |
| T0.10 | Workflow `app-check` en GitHub Actions | 2 | T0.8, T0.4 | PR de prueba pasa/falla según corresponda |
| T0.11 | Spike: contratos Zod compartidos app ↔ Edge Functions (empaquetado) → ADR-007 | 2 | T0.3 | Función de prueba importa un esquema compartido y se despliega en *staging* |
| T0.12 | `app.config.ts` con `APP_VARIANT`, `eas.json`, primer build de desarrollo en EAS instalado en tu móvil; probar build iOS simulador sin cuenta Apple; anotar cuotas gratuitas de EAS | 3 | T0.6, T0.4 | App instalada y abre; resultados anotados |
| T0.13 | Spike: `expo-sqlite` + SQLCipher + clave en SecureStore + medición de rendimiento → ADR-009 | 2,5 | T0.12 | Decisión y mediciones en el ADR |
| T0.14 | Gestoría/abogado: alta de autónomo, roles RGPD, plantilla de DPA | 2 | — | Notas y siguiente paso por escrito |

### M1 · Backend base (41 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T1.1 | Supabase local (`config.toml`: contraseña mín. 10, OTP, límites) + script de usuarios semilla | 2 | T0.5, T0.3 | `supabase start` + login con usuario semilla |
| T1.2 | Migración 001: extensiones, enums, schema `private` | 1,5 | T1.1 | `db reset` sin errores |
| T1.3 | Migración 002: identidad + triggers + RLS | 3 | T1.2 | pgTAP: un usuario no ve perfiles ajenos; `role` inmutable |
| T1.4 | Migración 003: vínculo + índice parcial 1:1 + RLS | 2 | T1.3 | Un cliente no puede tener 2 vínculos activos |
| T1.5 | Migración 004: catálogo + índices + RLS | 2 | T1.3 | Búsqueda trigram usa el índice (`EXPLAIN`) |
| T1.6 | Migración 005: planes + trigger de macros + RLS | 3,5 | T1.4, T1.5 | Macros del ítem = cálculo esperado |
| T1.7 | Migración 006: registro del cliente + `client_activity` + RLS | 3 | T1.6 | `WITH CHECK` rechaza `plan_id` ajeno |
| T1.8 | Migración 007: check-ins + RLS | 2 | T1.4 | Preguntas append-only |
| T1.9 | Migración 008: notificaciones/dispositivos + RLS | 1,5 | T1.3 | Solo `service_role` inserta notificaciones |
| T1.10 | Migración 009: cumplimiento + RLS | 1,5 | T1.3 | `consents` sin update/delete |
| T1.11 | Migración 010: RPC onboarding/invitaciones/`end_link` + limitador SQL | 3 | T1.4, T1.10 | Código caducado/usado/ajeno falla; 11.º intento limitado |
| T1.12 | Migración 011: RPC de planes (`assign_template`, `publish_plan`, `duplicate_plan`) | 3 | T1.6 | Copia profunda independiente de la plantilla |
| T1.13 | Migración 014: buckets y políticas de Storage | 1,5 | T1.7, T1.10 | Profesional no puede leer `progress-photos` |
| T1.14 | pgTAP: *harness* y actores de prueba | 2 | T1.3 | `supabase test db` ejecuta fixtures |
| T1.15 | pgTAP: matriz RLS (identidad, vínculo, catálogo, planes) | 3 | T1.14, T1.12 | 100 % de la matriz verde |
| T1.16 | pgTAP: matriz RLS (registro, check-ins, notificaciones, cumplimiento, Storage) | 3 | T1.14, T1.13, T1.8 | 100 % verde |
| T1.17 | Job CI `db-check` + guardas estructurales (RLS activo, `anon` denegado, *definer* seguro) | 2,5 | T1.14, T0.10 | Una tabla sin RLS rompe el CI |
| T1.18 | Script `gen types` + tipos commiteados + chequeo de deriva | 1 | T1.3 | Cambiar el esquema sin regenerar rompe el CI |

### M2 · Esqueleto de la app (37 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T2.1 | Tokens de tema + `ThemeProvider` + spike de Unistyles v3 (fallback a `StyleSheet`) → ADR-006 | 3 | T0.6 | Tema claro/oscuro conmutable; ADR escrito |
| T2.2 | Primitivas UI con a11y (Text, Box, Button, Input, Card, Screen, ListItem) + galería interna de dev | 4 | T2.1 | Galería muestra todas; test de a11y de roles/etiquetas |
| T2.3 | i18n (config, `es`, claves tipadas, script de claves huérfanas) | 2,5 | T0.6 | Cadena literal en `ui/` falla el lint |
| T2.4 | Cliente Supabase + almacenamiento cifrado de sesión + entorno validado con Zod | 2,5 | T0.12, T1.18 | La sesión sobrevive a reiniciar la app |
| T2.5 | Store de sesión (Zustand) + *bootstrap* + *splash* | 2 | T2.4 | Arranque en frío restaura sesión sin parpadeo |
| T2.6 | UI de auth: registro, login, OTP, recuperar + **SMTP propio UE** con SPF/DKIM | 5 | T2.2, T2.5, T0.1 | Email OTP llega y verifica en Android real |
| T2.7 | Onboarding por rol + consentimientos (RPC `complete_onboarding`, `record_consent`) | 4 | T2.6, T1.11 | Rol se fija una vez; cliente exige código válido |
| T2.8 | Navegación: grupos por rol, *guards*, pestañas vacías | 3 | T2.5, T2.2 | Cliente no puede abrir rutas de profesional (test) |
| T2.9 | Errores: `AppError`, `mapSupabaseError`, `ErrorBoundary`, *toasts* | 2,5 | T2.3 | Tests unitarios del mapeo |
| T2.10 | Logging + Sentry UE + redacción + *sourcemaps* | 3 | T2.9, T0.12 | Error de prueba aparece en Sentry sin PII |
| T2.11 | `QueryClient`, claves, `onlineManager` con NetInfo | 2 | T2.4 | Consulta se pausa sin red y se reanuda |
| T2.12 | Ajustes básicos (idioma, tema, cerrar sesión) | 1,5 | T2.8 | Cerrar sesión limpia caché |
| T2.13 | Maestro instalado + flujo de humo de login | 2 | T2.6 | `maestro test e2e/smoke-login.yaml` verde |

**Demo vertical al final de M2**: registro → rol → pantalla vacía por rol, con RLS probada en CI.

### M3 · Vinculación (17 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T3.1 | UI profesional: crear invitación + compartir + lista | 3 | T2.8, T1.11 | Código visible y compartible |
| T3.2 | *Deep link* `evocoach://invite/:code` + App Links (`assetlinks.json`) + código pendiente + Install Referrer **[?]** | 3,5 | T3.1, T0.1 | Enlace abre onboarding con el código |
| T3.3 | Cliente: pantalla de código + vista previa del profesional + canje | 2,5 | T2.7, T1.11 | Canje crea vínculo; segundo canje falla |
| T3.4 | Lista de clientes (FlashList, búsqueda, estados) | 3 | T2.8, T1.4 | 200 clientes semilla a 60 fps |
| T3.5 | Desvincular (RPC `end_link` + UI de ambos lados) | 2,5 | T3.4, T1.11 | Tras desvincular el profesional pierde el acceso (pgTAP) |
| T3.6 | Tests: pgTAP de invitaciones + E2E invitar/canjear | 2,5 | T3.3 | Flujo E2E verde |

### M4 · Constructor de planes del profesional (50,5 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T4.1 | Dominio: macros/kcal/totales por comida y día + tests | 2 | T0.8 | Casos de redondeo cubiertos |
| T4.2 | Repos de alimentos + búsqueda + pantalla Alimentos | 3 | T1.5, T2.11 | Búsqueda tolerante a acentos |
| T4.3 | Alta/edición de alimento propio (coma decimal) | 2,5 | T4.2 | "72,5" se acepta; validación de rangos |
| T4.4 | Script `import-catalog` (BEDCA/Open Food Facts, subconjunto ES) **tras verificar licencias** → *staging* | 3,5 | T1.5 | Idempotente; atribución registrada |
| T4.5 | Catálogo de ejercicios: semilla + búsqueda + ejercicio propio | 3 | T1.5, T2.11 | Alta de ejercicio con URL `https` válida |
| T4.6 | Ficha del cliente (shell + pestañas) | 3 | T3.4 | Navega entre pestañas; datos vía RLS |
| T4.7 | Lista de planes (plantillas/del cliente) + crear plan vacío | 2,5 | T4.6, T1.6 | Plan vacío creado como borrador |
| T4.8 | Constructor de dieta I: días y comidas | 3 | T4.7 | Estructura guardada |
| T4.9 | Constructor de dieta II: alimentos, cantidades, totales en vivo | 3,5 | T4.8, T4.1, T4.2 | Totales = trigger de BD |
| T4.10 | Constructor de dieta III: objetivos kcal/macros + avisos | 2 | T4.9 | Aviso si se desvía del objetivo |
| T4.11 | Reordenar/duplicar/borrar comida o día | 2,5 | T4.9 | Orden persistido |
| T4.12 | Constructor de rutina I: días y ejercicios (series, reps, descanso, notas) | 4 | T4.7, T4.5 | Validación reps_min ≤ reps_max |
| T4.13 | Constructor de rutina II: reordenar y duplicar | 2 | T4.12 | Orden persistido |
| T4.14 | Autoguardado + borradores + control de concurrencia (`updated_at`) | 2,5 | T4.9, T4.12 | Dos pestañas no se pisan en silencio |
| T4.15 | Plantillas: guardar como plantilla + biblioteca | 3 | T4.14 | Plantilla visible solo para su dueño |
| T4.16 | Asignar plantilla (RPC) + fechas | 2,5 | T4.15, T1.12 | El plan asignado es independiente |
| T4.17 | Publicar/archivar + notificación `plan_published` en cola | 2 | T4.16 | Publicar archiva el anterior |
| T4.18 | Tests: dominio + pgTAP + E2E "profesional crea dieta y rutina" | 4 | T4.17 | E2E verde |

### M5 · Cliente: Hoy y seguimiento (36,5 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T5.1 | Repos del plan activo + pantalla **Hoy** (comidas con macros) | 4 | T4.17, T2.8 | Cliente ve solo su plan publicado |
| T5.2 | Marcar comida completada (optimista, aún sin outbox) | 2 | T5.1, T1.7 | Estado persiste al reabrir |
| T5.3 | Pantalla de entreno del día + detalle de ejercicio | 3 | T5.1 | Muestra series/reps/descanso/notas |
| T5.4 | Sesión de entreno: series (kg/reps/RPE) + temporizador de descanso | 5 | T5.3 | Registro guardado por serie |
| T5.5 | Finalizar entreno + resumen + "última vez" | 2 | T5.4 | Resumen correcto |
| T5.6 | Peso: registrar, historial y gráfica SVG | 4 | T2.8, T1.7 | Un valor por día (upsert) |
| T5.7 | Medidas: tipos, formulario, historial | 3 | T5.6 | Validación por tipo |
| T5.8 | Pantalla Progreso (pestañas) | 2 | T5.6 | Navegación fluida |
| T5.9 | Vista semanal del plan + adherencia propia | 3 | T5.2, T5.5 | Adherencia coincide con el dominio |
| T5.10 | Ficha del profesional: gráficas de peso/medidas e historial de entrenos | 3 | T5.7, T4.6 | Solo con vínculo activo |
| T5.11 | Dominio de adherencia + tests | 3 | T0.8 | Definición: (comidas+entrenos hechos)/(planificados) en el periodo, sobre la estructura del plan activo **[S]** |
| T5.12 | E2E: cliente registra comida/entreno/peso; el profesional lo ve | 2,5 | T5.10 | E2E verde |

### M6 · Offline y sincronización (38,5 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T6.1 | ADR-002 + máquina de estados de la outbox (dominio puro) + tests | 2,5 | T0.8 | Transiciones cubiertas |
| T6.2 | SQLite por usuario + `OutboxRepository` | 3 | T6.1, T0.13 | Persiste tras matar la app |
| T6.3 | Motor de sync (*single-flight*, *backoff*+*jitter*, clasificación de errores, orden por entidad) | 4,5 | T6.2 | Un mensaje envenenado no bloquea a los demás |
| T6.4 | Disparadores: NetInfo, primer plano, tras mutación, manual | 2 | T6.3 | Reconectar vacía la cola |
| T6.5 | Migración 012: RPC de sync (upserts LWW, `submit_checkin`, `get_client_snapshot`) + pgTAP | 4 | T1.7, T1.8 | Reenviar 2 veces = mismo estado |
| T6.6 | Adaptadores de mutación (comida, entreno/series, medidas) vía outbox | 4 | T6.4, T6.5, T5.5, T5.7 | Registro offline llega al servidor |
| T6.7 | Persistencia de caché de Query en SQLite + *buster* de esquema | 3 | T6.2, T2.11 | "Hoy" abre en modo avión |
| T6.8 | *Prefetch* del snapshot (±7 días) + invalidación por `plan.version` | 3 | T6.5, T6.7 | Plan nuevo aparece tras sincronizar |
| T6.9 | UI de sync: insignia, "Última sincronización", pantalla de pendientes (reintentar/descartar) | 3 | T6.4 | Estados visibles y accesibles |
| T6.10 | Sesión offline: refresh diferido, expiración sin perder outbox, cierre de sesión con pendientes | 2,5 | T6.4, T2.5 | Cerrar sesión avisa de pendientes |
| T6.11 | Tests de caos (duplicados, reordenación, *kill* de app, errores permanentes) | 4 | T6.6 | Sin pérdidas ni duplicados |
| T6.12 | E2E offline (avión → registrar → reconectar → ver en profesional) | 3 | T6.6, T6.9 | E2E verde |

> **Tras T6.9 hay build instalable** con login + Hoy + registro: es el momento de **abrir la prueba cerrada de Google Play** para que los 14 días corran mientras terminas M7–M10 **[? comprobar qué formularios exige Play para pista cerrada]**.

### M7 · Fotos y check-ins (34,5 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T7.1 | Captura/selector del sistema + permisos en contexto + re-codificación (sin EXIF) | 3 | T5.8 | Foto ≤ 600 KB sin metadatos |
| T7.2 | Subida a Storage con progreso y reintento (online) | 3 | T7.1, T1.13 | Objeto en la carpeta del cliente |
| T7.3 | Edge Function `photo-access` + tests Deno | 3,5 | T1.13, T1.10, T2.4 | Sin vínculo/consentimiento → 403; URL caduca a 60 s |
| T7.4 | Galería del cliente + borrar + comparador | 3 | T7.2, T7.3 | Borrar elimina fila y objeto |
| T7.5 | Visor del profesional vía `photo-access` + pantalla segura | 3 | T7.3, T4.6 | Cada vista genera `access_logs` |
| T7.6 | Constructor de cuestionario (tipos, orden, obligatoriedad, *append-only*) | 4 | T1.8, T4.6 | Editar una pregunta archiva la anterior |
| T7.7 | Asignar cuestionario + día de check-in por cliente | 2 | T7.6 | Persistido en el vínculo |
| T7.8 | Job `pg_cron`: crear check-ins por zona horaria + `checkin_due` en cola | 3 | T7.7, T1.9 | Se crea a la hora local correcta |
| T7.9 | Formulario de check-in (dinámico, Zod, borrador local, envío por outbox) | 4 | T7.8, T6.6 | Funciona sin conexión |
| T7.10 | Bandeja del profesional + respuestas + feedback (`review_checkin`) | 3 | T7.9 | Feedback visible al cliente |
| T7.11 | Tests: pgTAP fotos/check-ins + unit + E2E | 3 | T7.10 | Todo verde |

### M8 · Panel y notificaciones (34,5 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T8.1 | SQL de adherencia + triggers de `client_activity` + *cron* de recálculo | 3 | T5.11, T1.7 | Coincide con el dominio en datos de prueba |
| T8.2 | RPC `get_dashboard` + índices + prueba con 200 clientes | 3 | T8.1 | p95 < 300 ms |
| T8.3 | Pantalla Panel (KPIs, lista por riesgo, filtros) | 4 | T8.2 | Clientes inactivos arriba |
| T8.4 | Umbral de inactividad por profesional | 1,5 | T8.3 | Cambia el criterio de alerta |
| T8.5 | Registro de tokens push + canal Android + permiso en contexto | 3 | T2.8 | Token guardado; revocado al cerrar sesión |
| T8.6 | FCM v1 + credenciales EAS + build con push | 1,5 | T8.5, T0.12 | Notificación de prueba llega |
| T8.7 | Edge Function `send-push` (cola, lotes, recibos, tokens inválidos) | 4,5 | T8.6, T1.9 | `DeviceNotRegistered` revoca token; payload sin datos de salud |
| T8.8 | Job de inactividad → notificación al profesional | 2,5 | T8.7, T8.1 | Una alerta por cliente y día (dedupe) |
| T8.9 | Preferencias de notificaciones + horas silenciosas | 2,5 | T8.7 | Respeta preferencias |
| T8.10 | Recordatorios locales del cliente (comida/entreno/peso/check-in) desde el plan, sin conexión | 4 | T8.5, T6.8 | Suenan en modo avión |
| T8.11 | *Deep links* desde notificaciones | 2 | T8.7 | Abre la pantalla correcta |
| T8.12 | Tests: Deno `send-push`, pgTAP del panel, prueba manual de push | 3 | T8.11 | Todo verde |

### M9 · RGPD y gestión de cuenta (35 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T9.1 | Textos legales (política, términos, avisos) con revisión legal | 3 | T0.14 | Versión 1.0 en `docs/legal/` |
| T9.2 | Pantalla de consentimientos granulares (onboarding + ajustes) | 3 | T2.7 | Sin casillas premarcadas; retirada efectiva |
| T9.3 | Efecto de retirar el consentimiento de fotos | 2 | T9.2, T7.5 | El profesional deja de verlas al instante |
| T9.4 | `delete-account` + UI (doble confirmación, gracia 14 d) | 4 | T1.10 | Cancelable durante la gracia |
| T9.5 | Purga de Storage + *cron* de huérfanos | 2 | T9.4 | No quedan objetos |
| T9.6 | `export-my-data` + UI | 4 | T1.13, T9.4 | Zip con todas las tablas del sujeto |
| T9.7 | `log_client_access` + vista "Quién ha accedido a mis datos" | 3 | T7.5, T4.6 | Aparecen accesos del profesional |
| T9.8 | Web estática (política, solicitud de borrado, soporte) | 3 | T9.1, T0.1 | URLs públicas válidas para Play |
| T9.9 | *Cron* de retención (notificaciones, logs 12 m, exports) | 2 | T1.10 | Filas antiguas purgadas |
| T9.10 | EIPD ligera + RAT + runbook de brechas | 4 | T9.1 | Documentos revisados |
| T9.11 | Pruebas de borrado completo y de exportación | 3 | T9.6, T9.5 | Ninguna fila/objeto residual |
| T9.12 | `allowBackup=false` + `FLAG_SECURE` + bloqueo biométrico opcional | 2 | T7.5 | Captura de pantalla bloqueada en fotos |

### M10 · Endurecimiento y beta cerrada (36 h)
| ID | Tarea | h | Dep. | Aceptación / verificación |
|---|---|---|---|---|
| T10.1 | Auditoría de accesibilidad (TalkBack, 200 %, contraste) + arreglos | 5 | M8 | Lista sin bloqueantes |
| T10.2 | Rendimiento en Android real (arranque, listas) | 4 | M8 | Cumple presupuestos de §8.1 |
| T10.3 | Estados vacío/error/carga en todas las pantallas | 4 | M8 | Revisión pantalla a pantalla |
| T10.4 | Suite E2E completa en CI | 4 | T9.11 | 6–8 flujos estables |
| T10.5 | Revisión de seguridad (agente independiente), dependencias, límites | 4 | T9.11 | Hallazgos críticos = 0 |
| T10.6 | Alertas de Sentry + vistas SQL de métricas + eventos PostHog opt-in | 3 | T2.10 | Alerta de prueba recibida |
| T10.7 | Ficha de Play: seguridad de datos, declaración de salud, IARC, capturas, textos | 4 | T9.8 | Formularios completos |
| T10.8 | Build de producción firmado + EAS Submit a pista interna | 3 | T10.2, T10.7 | AAB subido y aprobado |
| T10.9 | Reclutar ≥12 testers y abrir/mantener prueba cerrada (14 días continuos) | 2 + espera | T10.8 | 12 testers opt-in 14 días **(puede adelantarse a tras T6.9)** |
| T10.10 | Runbooks (rotación de claves, restauración de backup, incidente) | 3 | T9.10 | Restauración probada en *staging* |

### Hitos posteriores (fuera de las 389 h)
| ID | Tarea | h |
|---|---|---|
| M11 | **Producción Android**: solicitar acceso a producción (1) · despliegue progresivo 5→20→100 % con monitorización (3) · retrospectiva y backlog de fase 2 (2) | 6 |
| M12 | **iOS**: iPhone + cuenta Apple (2) · Sign in with Apple + revocación en borrado (4) · permisos, APNs, ajustes de UI iOS (5) · etiquetas de privacidad + cuenta demo + notas de revisión (3) · TestFlight + regresión + E2E en simulador (4) · envío a revisión y correcciones (4) | 22 |

### Calendario a 20 h/semana (orientativo **[S]**)
| Hito | Horas netas | Con +30 % | Semana acumulada |
|---|---|---|---|
| M0 Fundaciones | 28,5 | 37 | 2 |
| M1 Backend | 41 | 53 | 5 |
| M2 Esqueleto | 37 | 48 | 7 |
| M3 Vinculación | 17 | 22 | 8 |
| M4 Constructor | 50,5 | 66 | 11 |
| M5 Hoy y seguimiento | 36,5 | 47 | 14 |
| M6 Offline | 38,5 | 50 | 16 |
| M7 Fotos y check-ins | 34,5 | 45 | 19 |
| M8 Panel y push | 34,5 | 45 | 21 |
| M9 RGPD | 35 | 46 | 23 |
| M10 Beta | 36 | 47 | 25 |
| **Total** | **389** | **≈ 505 h** | **≈ 25 semanas** |

Si empiezas el 1-dic-2026 (sin contar vacaciones): *build* instalable ≈ semana 16 (finales de marzo), prueba cerrada corriendo desde entonces, producción Android ≈ junio 2027.
**Palancas de recorte** (≈ 20–25 h en total, ~1 semana): comparador de fotos (−1,5), recordatorios solo de entreno y check-in (−1,5), sin PostHog (−1,5), umbral de inactividad fijo (−1,5), biblioteca de plantillas sin carpetas, gráficas más simples. **No recortar** RLS, RGPD ni pruebas de sincronización: es mejor mover fechas.

---

## 14. Riesgos principales

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Sin dispositivo iOS → fallos y rechazos en M12 | Alta | Medio | Android primero; *build* iOS de simulador en CI; conseguir iPhone antes de M12 (o TestFlight con un tester); colchón de 1–2 semanas |
| R2 | Requisito de 12 testers × 14 días retrasa producción | Media-Alta | Medio | Abrir la prueba cerrada tras T6.9; reclutar profesionales y sus clientes; cuenta de organización tras constituir entidad |
| R3 | Incumplimiento RGPD (categoría especial, roles, DPA, EIPD) | Media | Alto | Asesoría; consentimiento granular; minimización; documentación en el repo; no usar datos reales hasta firmar DPA |
| R4 | Fuga entre tenants por RLS defectuosa | Baja-Media | Crítico | RLS en la misma migración; matriz pgTAP al 100 %; guardas estructurales; Storage sin lectura para profesional; revisión independiente; *smoke* en *staging* |
| R5 | Complejidad de la sincronización offline | Media | Alto | Alcance acotado (solo registros idempotentes); orden por entidad; tests de caos; repositorios intercambiables (PowerSync como plan B); UI de pendientes |
| R6 | Alcance excesivo / agotamiento en solitario | Alta | Alto | Tareas de 1–3 h; alcance congelado; colchón del 30 %; palancas de recorte; demo al final de cada hito |
| R7 | Cambios de Expo/RN (ritmo de SDK, Nueva Arquitectura, librerías sin soporte) | Media | Medio | SDK fijado; `expo-doctor` en CI; pocas librerías nativas; spikes en M0; actualización planificada por SDK |
| R8 | Proveedores con matriz en EE. UU. (Supabase, Expo, Sentry, PostHog) y transferencias | Media | Alto | Regiones UE; DPA/SCC/TIA; push sin datos de salud; analítica opt-in; plan de salida (Supabase autoalojado) |
| R9 | Reglas y comisiones de pago de las tiendas cambian o se interpretan distinto | Alta | Medio (fase 2) | Abstracción de *entitlements*; nueva verificación al arrancar la fase 2; consulta a App Review/Google |
| R10 | Rechazo o restricciones por la política de salud (declaraciones, borrado de cuenta) | Media | Medio | Declaraciones exactas; sin diagnósticos ni consejos automáticos; borrado dentro de la app |
| R11 | Riesgo clínico/reputacional (trastornos alimentarios, menores) | Media | Alto | 18+; el profesional es responsable de las pautas (términos); sin objetivos automáticos de peso; descargo; futuro: ocultar peso por vínculo |
| R12 | Pérdida de datos / copias insuficientes | Baja | Crítico | Plan Pro **[? retención de copias]**; valorar PITR (≈100 USD/mes por 7 días **[V]**) antes de abrir al público; restauración probada en *staging* |
| R13 | Pérdida de clave de firma o de la cuenta de desarrollador | Baja | Alto | Play App Signing; copia cifrada de la clave de subida; 2FA y códigos de recuperación |
| R14 | Licencias de catálogos de alimentos/ejercicios | Media | Medio | Verificar licencia y atribución antes de importar (T4.4/T4.5); alimentos propios; `source` registrado |
| R15 | Deriva entre entornos y migraciones | Media | Medio | Solo hacia delante; CI de deriva; *staging* antes de *prod*; aprobación manual |
| R16 | Fuerza bruta de códigos de invitación / spam | Media | Medio | 8 caracteres, 7 días, un uso, limitador SQL por usuario, bloqueo temporal |
| R17 | Errores de zona horaria / "día" | Alta | Bajo-Medio | `local_date`; *cron* por zona horaria; tests con varias zonas |
| R18 | Persona física: datos de contacto públicos en Play y sin entidad para contratos | Media | Medio | Constituir autónomo antes de la beta pública; revisar visibilidad en T0.2 |
| R19 | Costes superan el presupuesto (EAS, Supabase) | Media | Bajo-Medio | Presupuesto ≤ 100 €/mes; builds locales de Android; revisar cuotas de EAS **[?]** |
| R20 | Push poco fiable (ahorro de batería de Android) | Media | Bajo | Recordatorios locales; guía de exclusión de batería; nada crítico depende de push |

---

## 15. Borrador de `CLAUDE.md`

````markdown
# evocoach — Guía para agentes

## Qué es
App móvil (Expo SDK 58, React Native, TypeScript estricto, Expo Router) + Supabase (UE) para
profesionales de nutrición/entrenamiento (rol PROFESIONAL) y sus clientes (rol CLIENTE).
Maneja DATOS DE SALUD (RGPD art. 9). Android primero; iOS en el hito M12. Offline con outbox propia.

## Comandos (Windows / PowerShell)
- `npm run check`  → lint + typecheck + tests (OBLIGATORIO antes de abrir un PR)
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:watch`
- `npm start` · `npm run android`  (dev client en emulador o móvil)
- `npx expo install <paquete>`  (NUNCA `npm i` para paquetes de Expo/RN) · `npx expo install --check` · `npx expo-doctor`
- `supabase start | stop | db reset | test db | migration new <nombre>` · `npm run db:types`
- `npm run e2e` (Maestro) · `eas build -p android --profile development|preview|production`

## Arquitectura (resumen; detalle en docs/architecture y docs/adr)
- Por feature: `domain` (TS puro) → `data` (repositorios) → `hooks` (TanStack Query) → `ui`. CI hace cumplir los imports.
  `src/app` solo contiene rutas finas.
- Estado de servidor: TanStack Query. Estado UI/sesión: Zustand mínimo. Formularios: react-hook-form + Zod. Zod en todos los bordes.
- Offline: el cliente solo escribe registros idempotentes (UUIDv7 + `client_updated_at`) a través de la outbox.
  Los planes los edita solo el profesional (online).
- Supabase: CRUD simple vía repositorios bajo RLS; RPC para operaciones atómicas; Edge Functions solo para secretos/servicios externos.

## Reglas innegociables
1. NUNCA `service_role`/secret key en la app ni en el bundle. Solo variables `EXPO_PUBLIC_*` públicas.
2. Toda tabla nueva: RLS activado en la MISMA migración + tests pgTAP positivos y negativos (cross-tenant). Sin excepciones.
3. Migraciones: solo hacia delante; NO editar migraciones ya aplicadas; una responsabilidad por migración; regenerar tipos.
4. Datos de salud: no en logs, ni en payloads de push, ni en eventos de analítica, ni en mensajes de error. Usa el `logger` (allowlist).
5. Fotos: solo vía `photo-access` (profesional) o URL firmada propia (cliente). Nunca URLs públicas.
6. Todo texto visible usa i18n (`t('feature.key')`). Sin cadenas literales en UI.
7. Todo estilo usa tokens de `src/ui/theme`. Sin colores, espaciados ni números mágicos literales.
8. Accesibilidad: label/role/state en interactivos, objetivo táctil ≥ 48 dp, soportar fuente grande.
9. Fechas "de día" = `local_date` (YYYY-MM-DD). Decimales con `parseDecimal` (coma es-ES).
10. Sin `any`, sin `@ts-ignore` (usa `@ts-expect-error` con motivo), sin `console.log`.

## No tocar sin ADR o permiso explícito
`supabase/migrations/*` ya aplicadas · `src/core/supabase/database.types.ts` (generado) · credenciales de `eas.json` ·
`android/` e `ios/` (generados con CNG, en .gitignore) · `.env*` · edición manual del lockfile ·
políticas RLS existentes (cambiar solo con tests nuevos) · versiones de expo/react-native (se suben por SDK).

## Cómo probar
- Unit/integración: `npm test`. BD: `supabase test db`. Edge Functions: `deno test` en `supabase/functions`. E2E: Maestro (`e2e/`).
- Cada tarea trae criterios de aceptación y comando de verificación: ejecútalo y pega la salida en el PR. No marques nada como hecho sin ejecutarlo.
- Cambios de UI: probar en el Android real con fuente grande y TalkBack al menos una vez por hito.

## Estilo de código
TypeScript estricto · funciones pequeñas · código y nombres en inglés, textos de usuario en español vía i18n ·
ficheros `kebab-case.ts`, componentes `PascalCase.tsx`, hooks `useX`, repositorios `xRepository` ·
sin lógica de negocio en componentes (va en `domain/`) · errores como `AppError` ·
dependencias nuevas solo con justificación en el PR.

## Git y commits
Trunk-based. Rama `feat|fix|chore/T4.9-descripcion-corta`. 1 tarea = 1 PR (≤ ~400 líneas). Squash merge. CI verde obligatorio.
Conventional Commits en inglés imperativo: `feat(plans): add meal reordering`, `fix(sync): retry on 401 after refresh`, `chore(db): add index`.
Cada PR enlaza la tarea y lista los comandos de verificación ejecutados.

## Flujo del agente
1. Leer la tarea y los ADR relevantes. 2. Escribir primero los tests si es dominio o RLS. 3. Implementar lo mínimo.
4. `npm run check` (+ `supabase test db` si tocaste la BD). 5. Autorrevisión con `/code-review`;
   para migraciones/RLS pedir revisión del agente `security-auditor`. 6. Actualizar docs/ADR si cambió una decisión.

## Sistema de diseño
La estética está pendiente. Usa SOLO tokens semánticos de `src/ui/theme`; no inventes colores ni tipografías.
````

---

## 16. Hueco del sistema de diseño

La estética la defines aparte. Para aplicarla sin tocar pantallas, todo estilo pasa por **tokens semánticos** (`src/ui/theme/tokens.ts`) y por las **primitivas** (`src/ui/primitives`). El *placeholder* inicial es neutro y funcional.

| Grupo | Tokens (nombres fijos; los valores los pones tú después) |
|---|---|
| Color semántico | `bg.canvas`, `bg.surface`, `bg.raised`, `text.primary`, `text.secondary`, `text.inverse`, `border.default`, `border.focus`, `brand.primary`, `brand.onPrimary`, `feedback.success/warning/danger/info` (+ `on*`), `adherence.high/medium/low` (el estado nunca va solo por color) |
| Espaciado | Escala de 4 pt: `space.0…8` = 0, 4, 8, 12, 16, 24, 32, 48, 64 |
| Radios | `radius.none/sm/md/lg/full` |
| Tipografía | Familias: `display`, `body`, `numeric` (cifras tabulares para macros y pesos). Roles: `display`, `title`, `heading`, `body`, `bodyStrong`, `label`, `caption`, cada uno con tamaño (sp), interlineado, peso y espaciado; escalan con la fuente del sistema |
| Elevación | `elevation.0…3` |
| Movimiento | `duration.fast/base/slow`, `easing.standard`, respeta "reducir movimiento" |
| Tamaños | `touchTarget.min = 48`, tamaños de icono, anchos máximos |
| Estados | `opacity.disabled`, anillos de foco |
| Temas | `light` y `dark` con la misma forma; `ThemeProvider` + `createStyles(theme => …)` |

Garantías: ESLint prohíbe colores/espaciados literales; un script comprueba el contraste de pares semánticos (≥ 4,5:1 / 3:1) en CI; una ruta interna de desarrollo (galería) muestra todas las primitivas en claro/oscuro y con fuente grande.
**Cuando entregues la estética** (fuera de las 389 h): volcar tokens (≈ 2 h) · ajustar primitivas (≈ 4–6 h) · revisar pantallas (≈ 6–10 h) · re-verificar contraste y accesibilidad (≈ 2 h).

---

## 17. Verificaciones pendientes, fuentes y siguiente paso

### 17.1 Qué falta por verificar y cuándo
| Verificar | Cuándo | Cómo |
|---|---|---|
| DPA y subencargados vigentes de Supabase; cifrado en reposo | T0.3 | Documentación legal de Supabase |
| Retención de copias del plan Pro y precio de PITR | Antes de abrir al público | Docs de backups y precios |
| Comisión de Google en suscripciones (10 % vs 15 %) | Inicio de fase 2 | Ayuda de Play + Play Console |
| Condiciones de Apple en la UE | M12 / fase 2 | Apple Developer |
| Texto vigente de 3.1.3(d), 4.8 y 5.1.3 | M12 / fase 2 | Guidelines oficiales de Apple |
| `Stack.Protected` y APIs de Expo Router en SDK 58 | T0.6 | Documentación de Expo |
| ESLint major compatible; TypeScript 7 | T0.7 | `eslint-config-expo` / plantilla del SDK |
| Contratos compartidos con Edge Functions | T0.11 | Spike |
| *Build* iOS de simulador sin cuenta Apple; cuotas gratuitas de EAS | T0.12 | Spike |
| SQLCipher en `expo-sqlite` (SDK 58) | T0.13 | Spike |
| Unistyles v3 con SDK 58 | T2.1 | Spike |
| Estado "trader" DSA, prueba cerrada, páginas de 16 KB | T0.2 / T10.8 | Play Console |
| Licencias BEDCA / Open Food Facts / catálogos de ejercicios | T4.4 / T4.5 | Textos de licencia |
| Maestro: modo avión, Windows, runners en la nube | T2.13 / T6.12 | Spike |
| Selector de fotos del sistema sin `READ_MEDIA_IMAGES` | T7.1 | Documentación de `expo-image-picker` |
| React Compiler en SDK 58 | T10.2 | Documentación de Expo |
| Install Referrer para pasar el código de invitación | T3.2 | Documentación de `expo-application` |
| Exención de la Ley de Accesibilidad para microempresas | Antes de beta pública | Abogado |
| Ritmo de lanzamiento de SDK de Expo | Continuo | Changelog de Expo |

### 17.2 Fuentes consultadas hoy (2026-11-24)
- Expo: [SDK 58](https://expo.dev/changelog/sdk-58) · [guía de actualización](https://expo.dev/blog/how-to-upgrade-to-sdk-58) · [local-first](https://docs.expo.dev/guides/local-first/) · [E2E en EAS Workflows](https://docs.expo.dev/eas/workflows/examples/e2e-tests) · [credenciales FCM](https://docs.expo.dev/push-notifications/fcm-credentials)
- Supabase: [nuevas claves API](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys) · [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys) · [regiones](https://supabase.com/docs/guides/platform/regions) · [RGPD](https://supabase.com/docs/guides/security/gdpr-compliance) · [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum) · [copias de seguridad](https://supabase.com/docs/guides/platform/backups)
- Google Play: [API objetivo](https://developer.android.com/google/play/requirements/target-sdk) · [pruebas para cuentas personales](https://support.google.com/googleplay/android-developer/answer/14151465) · [borrado de cuenta](https://support.google.com/googleplay/android-developer/answer/13327111) · [declaración de apps de salud](https://developer.android.com/health-and-fitness/health-connect/declare-access) · [nuevas comisiones](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html) · [ayuda sobre comisiones](https://support.google.com/googleplay/android-developer/answer/112622)
- Apple: [requisitos próximos](https://developer.apple.com/news/upcoming-requirements/) · [cambios en la UE](https://developer.apple.com/news/?id=gmws0jgp) · [borrado de cuenta](https://developer.apple.com/support/offering-account-deletion-in-your-app) · [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Privacidad: [Sentry, ubicación de datos](https://docs.sentry.io/organization/data-storage-location/) · [PostHog y RGPD](https://posthog.com/docs/privacy/gdpr-compliance) · [AEPD, directrices para apps de salud y bienestar](https://www.aepd.es/prensa-y-comunicacion/notas-de-prensa/la-aepd-publica-unas-directrices-orientadas-aplicaciones)
- Versiones: registro de npm, consultado con `npm view` el 2026-11-24.

### 17.3 Qué ocurre al aprobar este plan
1. **Semana 0 (paralelo, sin código)**: T0.1–T0.4 y T0.14; empezar a identificar a los ≥12 testers.
2. **M0 técnico**: T0.5–T0.13 (toolchain Windows, proyecto Expo SDK 58, CI, primer build en tu móvil, spikes).
3. **Tres decisiones menores que no bloquean**: proveedor SMTP UE (T2.6), Unistyles frente a `StyleSheet` (T2.1) y cuándo abrir la prueba cerrada de Play (tras T6.9).
4. Primera **demo vertical** al final de M2 (registro → rol → RLS probada en CI).

