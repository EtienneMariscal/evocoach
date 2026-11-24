# 0004 · Supabase en la UE y claves nuevas

- **Estado**: Aceptada (DPA vigente y cifrado en reposo por verificar en T0.3)
- **Fecha**: 2026-11-24
- **Tarea relacionada**: T0.3

## Contexto

Los datos de nutrición, peso, medidas y fotos son datos de salud (RGPD art. 9). Supabase retira las claves legacy
`anon`/`service_role` a finales de 2026.

## Decisión

Proyectos Supabase `staging` y `prod` en la región UE `eu-central-1` (Frankfurt). Claves **publishable/secret** y JWT
con firma asimétrica desde el inicio; verificar el JWT con `getClaims()`. Firmar el DPA con Supabase y guardarlo en
`docs/legal/`. La clave secret/`service_role` solo existe en secretos de Edge Functions y de CI, nunca en la app.

## Alternativas descartadas

| Opción | Por qué no |
| ------ | ---------- |
| Firebase | Modelo documental; el modelo relacional con RLS encaja mejor. |
| Postgres autoalojado en la UE | Más operación para un desarrollador en solitario; queda como plan de salida (Supabase es de código abierto). |

## Consecuencias

El proveedor tiene matriz en EE. UU.: se mitiga con región UE, DPA/SCC, minimización y plan de salida. La región es un
control de ubicación, no hace conforme a la app por sí sola.
