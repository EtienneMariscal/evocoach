# 0002 · Offline con outbox propia

- **Estado**: Aceptada
- **Fecha**: 2026-11-24
- **Tarea relacionada**: T6.1–T6.12

## Contexto

El cliente debe consultar su plan y registrar comidas, entrenos, peso, medidas y check-ins sin conexión, y
sincronizar después. Los planes los edita solo el profesional, así que el cliente no genera conflictos de edición
sobre el plan: solo añade registros.

## Decisión

Caché de lectura persistida de TanStack Query + **outbox propia** en `expo-sqlite` para las escrituras del cliente:
registros idempotentes con UUIDv7 generado en el dispositivo y `client_updated_at`; el servidor resuelve con
último-escritor-gana (`ON CONFLICT … DO UPDATE … WHERE excluded.client_updated_at > …`). Un único procesador
single-flight, con orden garantizado por entidad. Una base SQLite por usuario. Fotos y edición de planes: solo online.
El acceso a datos va tras repositorios intercambiables.

## Alternativas descartadas

| Opción | Por qué no |
| ------ | ---------- |
| PowerSync | Añade un subencargado más que trata datos de salud, coste y dependencia; su estado en 2026 no está verificado. Sigue siendo el plan B gracias a los repositorios. |
| WatermelonDB | Hay que escribir la capa de sincronización a mano y la integración con Expo tiene fricción. |

## Consecuencias

Menos dependencias y control total, a cambio de mantener la sincronización propia: se cubre con pruebas de caos
(duplicados, reordenación, cierre de app). Dos dispositivos del mismo cliente escribiendo a la vez la misma
comida: gana el último (riesgo bajo, aceptado).
