# 0003 · Vínculo profesional-cliente 1:1 y reversible

- **Estado**: Aceptada
- **Fecha**: 2026-11-24
- **Tarea relacionada**: T1.4

## Contexto

El producto arranca con un cliente por profesional. Un cliente que trabaje con nutricionista y entrenador necesitaría
dos cuentas, pero no se quiere pagar ahora la complejidad de N:M ni de organizaciones.

## Decisión

`client_links` es una tabla propia (con histórico) y la regla 1:1 vive en **un único índice único parcial**
`(client_id) WHERE status IN ('pending','active')`. Todas las políticas RLS se escriben a través de ese vínculo
(`private.is_pro_of`), nunca asumiendo la cardinalidad.

## Alternativas descartadas

| Opción | Por qué no |
| ------ | ---------- |
| Columna `professional_id` en `client_profiles` | Cambiar a N:M obligaría a migrar datos y reescribir políticas. |
| N:M u organizaciones desde el MVP | Más complejo y alarga el MVP sin demanda demostrada. |

## Consecuencias

Pasar a N:M es una migración barata: eliminar el índice (y, para equipos, añadir `organization_id`).
La limitación visible para el usuario es la de las dos cuentas.
