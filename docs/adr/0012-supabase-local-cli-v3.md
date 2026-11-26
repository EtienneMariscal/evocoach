# 0012 · Supabase local con CLI v3 y permisos explícitos

- **Estado**: Aceptada
- **Fecha**: 2026-11-24
- **Tarea relacionada**: T1.1

## Contexto

El plan hablaba de `supabase/config.toml` y de un CLI "v2". Verificado el 2026-11-24 en el registro de npm y en el
changelog de Supabase:

- El CLI v3 (`latest` en npm: 3.4.0) está disponible desde el 2026-11-02. Los comandos de base de datos van contra la
  pila **local** por defecto, los cambios en proyectos alojados piden confirmación (sin ella, en CI, fallan salvo con
  `--yes`) y `supabase init` genera `supabase/config.jsonc` en lugar de `config.toml`.
- El changelog del 2026-04-28 anuncia que las tablas nuevas de `public` dejan de exponerse a la Data API por defecto
  (obligatorio en todos los proyectos desde el 2026-10-30). La guía de seguridad todavía describe el comportamiento
  anterior para proyectos existentes, así que no se da por hecho: los `GRANT` se escriben siempre explícitos.
- Las funciones nuevas reciben `EXECUTE` para `PUBLIC` por defecto en Postgres; una función `SECURITY DEFINER` en un
  esquema expuesto sería invocable por `anon`.

## Decisión

1. **CLI v3 fijado en versión exacta** (`supabase@3.4.0` en `devDependencies`, sin `^`). Subirlo es un PR propio. Se
   ejecuta como `npx supabase …`. Los comandos sobre proyectos alojados llevan `--remote` y solo se lanzan a mano o desde
   el pipeline de release, nunca desde un agente sin permiso expreso.
2. **Configuración en `supabase/config.jsonc`** (el plan decía `config.toml`).
3. **`api.auto_expose_new_tables = false`** en local, y desactivar "Automatically expose new tables" en los proyectos
   alojados (T0.3). Toda migración que cree una tabla incluye, en la misma migración, RLS y `GRANT` mínimos a
   `authenticated` (nunca a `anon`). Las funciones RPC llevan `revoke execute … from public` y `grant execute` solo a
   `authenticated`; las auxiliares `SECURITY DEFINER` viven en el esquema `private`, que no se expone.
4. **La API solo expone `public`** (se quita `graphql_public`: no hay GraphQL).
5. **Auth**: contraseña de 10 caracteres como mínimo y sin reglas de composición (la longitud pesa más), correo
   verificado con código OTP de 6 dígitos que caduca a los 10 minutos, reenvío cada 60 s, sin inicios de sesión anónimos.
   El registro es abierto; el acceso real lo gobierna el onboarding con invitación (RPC `complete_onboarding`).
6. **Local ligero**: se apagan `analytics` (el servicio más pesado, y en Windows exige exponer el demonio de Docker por
   TCP) y los buckets vectoriales. No se usa el stack experimental (`SUPABASE_EXPERIMENTAL_STACK`).
7. **Semilla** (`supabase/seed.sql`): seis usuarios `@evocoach.test` con UUID fijos y el correo ya verificado; se niega a
   ejecutarse si hay usuarios que no sean de prueba.

## Alternativas descartadas

| Opción                                    | Por qué no                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Quedarse en `v2.stable`                   | Solo recibe correcciones de seguridad; v3 es más seguro por defecto (local primero, confirmación en remoto).   |
| `auto_expose_new_tables = true`           | Cómodo, pero una tabla sin `GRANT` revisado quedaría alcanzable por la API.                                    |
| Reglas de composición de contraseña       | Añaden fricción sin ganar seguridad real frente a una longitud mínima mayor.                                   |
| Usuarios semilla creados con un script JS | Necesita la clave `service_role` local y no se ejecuta solo con `db reset`; el SQL es determinista.            |

## Consecuencias

- Cada migración lleva algo más de SQL (`GRANT`/`REVOKE`), pero un `GRANT` olvidado falla en local y en pgTAP, no en
  producción. T1.17 añade una guarda estructural: `anon` no puede leer ninguna tabla ni ejecutar ninguna RPC.
- La configuración de los proyectos alojados (JWT asimétrico, longitud de contraseña, OTP, SMTP, exposición de tablas) no
  sale de `config.jsonc` por sí sola: se replica y se comprueba a mano en T0.3 y T2.6.
- Verificado en local: la plantilla de correo por defecto envía un **enlace** de confirmación, no el código. T2.6 debe
  personalizar las plantillas `confirmation` y `recovery` con `{{ .Token }}` (en local con `content_path`; en los
  proyectos alojados desde el panel o con `config push`).
- El CLI puede cambiar otra vez el formato de configuración; se vigila en cada subida de versión.
