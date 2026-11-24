# evocoach — Guía para agentes

@AGENTS.md

## Qué es

App móvil (Expo SDK 58, React Native 0.88, TypeScript estricto, Expo Router) + Supabase (UE) para
profesionales de nutrición/entrenamiento (rol PROFESIONAL) y sus clientes (rol CLIENTE).
Maneja DATOS DE SALUD (RGPD art. 9). Android primero; iOS en el hito M12. Offline con outbox propia.

Documentos de referencia (léelos antes de tareas grandes):

- Plan completo: `docs/plan/evocoach-plan-v1.md` (tareas T0.x–T12.x, modelo de datos, RLS, riesgos).
- Decisiones de arquitectura: `docs/adr/` (índice en `docs/adr/README.md`).
- Estado actual: M0 (fundaciones) en curso. Los comandos marcados "(pendiente)" aún no existen.

## Comandos (Windows / PowerShell)

- `npm run check` → format:check + lint + typecheck + deps + test (OBLIGATORIO antes de abrir un PR)
- `npm run lint` · `npm run lint:fix` · `npm run format` · `npm run typecheck` · `npm run deps` (capas)
- `npm test` · `npm run test:watch` · `npm run test:coverage`
- `npm start` · `npm run android` (dev client; ver "Entorno" más abajo)
- `npx expo install <paquete>` (NUNCA `npm i` para paquetes de Expo/RN) · `npx expo install --check` · `npx expo-doctor`
- Supabase: `supabase start | stop | db reset | test db | migration new <nombre>` (pendiente: T0.5/T1.1;
  se ejecuta como `npx supabase …` cuando se añada al proyecto) · `npm run db:types` (pendiente: T1.18)
- E2E con Maestro: `npm run e2e` (pendiente: T2.13) · EAS: `npx eas-cli build -p android --profile development`
  (pendiente: T0.12)

Nota: `expo install … -- --save-dev` deja a veces paquetes en `dependencies`; revisa `package.json` y muévelos a
`devDependencies` si son de desarrollo.

## Arquitectura (resumen; detalle en el plan §3 y en docs/adr)

- Por feature (`src/features/<x>/`): `domain` (TS puro) → `data` (repositorios) → `hooks` (TanStack Query) → `ui`.
  Las reglas de capas están en `.dependency-cruiser.cjs` y las aplica `npm run deps`.
  `src/app` solo contiene rutas finas que importan el `index.ts` de cada feature.
- Fuera de features: `src/core/` (infraestructura, sin negocio) y `src/ui/` (sistema de diseño con tokens).
- Estado de servidor: TanStack Query. Estado UI/sesión: Zustand mínimo. Formularios: react-hook-form + Zod.
  Zod en todos los bordes (formularios, repositorios, Edge Functions, outbox).
- Offline: el cliente solo escribe registros idempotentes (UUIDv7 + `client_updated_at`) a través de la outbox.
  Los planes los edita solo el profesional (online).
- Supabase: CRUD simple vía repositorios bajo RLS; RPC para operaciones atómicas; Edge Functions solo para
  secretos y servicios externos.

## Reglas innegociables

1. NUNCA `service_role`/secret key en la app ni en el bundle. Solo variables `EXPO_PUBLIC_*` públicas.
2. Toda tabla nueva: RLS activado en la MISMA migración + tests pgTAP positivos y negativos (cross-tenant). Sin excepciones.
3. Migraciones: solo hacia delante; NO editar migraciones ya aplicadas; una responsabilidad por migración; regenerar tipos.
4. Datos de salud: no en logs, ni en payloads de push, ni en eventos de analítica, ni en mensajes de error.
   Usa el `logger` (con lista de campos permitidos).
5. Fotos: solo vía `photo-access` (profesional) o URL firmada propia (cliente). Nunca URLs públicas.
6. Todo texto visible usa i18n (`t('feature.key')`). Sin cadenas literales en JSX (lo comprueba ESLint).
7. Todo estilo usa tokens de `src/ui/theme`. Sin colores, espaciados ni números mágicos literales.
8. Accesibilidad: label/role/state en interactivos, objetivo táctil ≥ 48 dp, soportar fuente grande.
9. Fechas "de día" = `local_date` (YYYY-MM-DD). Decimales con `parseDecimal` (coma es-ES).
10. Sin `any`, sin `@ts-ignore` (usa `@ts-expect-error` con motivo de ≥ 10 caracteres), sin `console.*`.
    Promesas siempre esperadas o marcadas con `void` (`no-floating-promises`).

## No tocar sin ADR o permiso explícito

`supabase/migrations/*` ya aplicadas · `src/core/supabase/database.types.ts` (generado) · credenciales de `eas.json` ·
`android/` e `ios/` (generados con CNG, en .gitignore) · `.env*` · edición manual del lockfile ·
políticas RLS existentes (cambiar solo con tests nuevos) · versiones de expo/react-native/react/react-dom
(se suben por SDK con `npx expo install --fix`) · `react-dom` está fijado a la versión de `react` porque
`expo-router` lo trae como peer: no lo quites ni lo actualices por separado.

## Cómo probar

- Unit/integración: `npm test` (ficheros `*.test.ts(x)` junto al código o en `__tests__/`; nunca dentro de `src/app/`,
  porque Expo Router lo trataría como ruta). BD: `supabase test db`. Edge Functions: `deno test`. E2E: Maestro.
- Cada tarea trae criterios de aceptación y comando de verificación: ejecútalo y pega la salida en el PR.
  No marques nada como hecho sin ejecutarlo.
- Cambios de UI: probar en el Android real con fuente grande y TalkBack al menos una vez por hito.

## Estilo de código

TypeScript estricto (`noUncheckedIndexedAccess` activo) · funciones pequeñas · código y nombres en inglés,
textos de usuario en español vía i18n · ficheros `kebab-case.ts`, componentes `PascalCase.tsx`, hooks `useX`,
repositorios `xRepository` · sin lógica de negocio en componentes (va en `domain/`) · errores como `AppError` ·
dependencias nuevas solo con justificación en el PR. Prettier manda (100 columnas, comillas simples).

## Git y commits

Trunk-based. Rama `feat|fix|chore/T4.9-descripcion-corta`. 1 tarea = 1 PR (≤ ~400 líneas). Squash merge. CI verde obligatorio.
Conventional Commits en inglés imperativo (`feat(plans): add meal reordering`, `fix(sync): retry on 401 after refresh`,
`chore(db): add index`); lo comprueba `commitlint` en el hook `commit-msg`. No usar `--no-verify`.
Cada PR enlaza la tarea y lista los comandos de verificación ejecutados.

## Flujo del agente

1. Leer la tarea y los ADR relevantes.
2. Escribir primero los tests si es dominio o RLS.
3. Implementar lo mínimo.
4. `npm run check` (+ `supabase test db` si tocaste la BD).
5. Autorrevisión con `/code-review`; para migraciones/RLS pedir revisión del agente `security-auditor`.
6. Actualizar docs/ADR si cambió una decisión.

## Entorno (Windows 11)

- Node 24, npm 11. Docker Desktop + WSL2 disponibles (para Supabase local). JDK 17 y `adb` en el PATH: pendientes (T0.5).
- iOS no se compila en local: solo en EAS (Android primero; iOS en M12).
- Las compilaciones locales de Android con Nueva Arquitectura pueden fallar por rutas largas: `LongPathsEnabled` ya está activo.

## Sistema de diseño

La estética está pendiente. Usa SOLO tokens semánticos de `src/ui/theme` (se crean en T2.1); no inventes
colores ni tipografías.
