# 0005 · Android primero, iOS en el hito M12

- **Estado**: Aceptada
- **Fecha**: 2026-11-24
- **Tarea relacionada**: M12

## Contexto

El desarrollador trabaja en Windows y solo dispone de un móvil Android físico: sin Mac ni iPhone no se puede probar
iOS (push APNs, cámara, permisos, revisión de Apple).

## Decisión

El MVP se publica primero en Google Play. El código es multiplataforma desde el día 1 y el CI compila iOS en EAS
(simulador) para detectar roturas sin dispositivo. La validación real de iOS se hace en el hito M12, cuando haya un
iPhone (propio, prestado o de un tester por TestFlight).

## Alternativas descartadas

| Opción | Por qué no |
| ------ | ---------- |
| Conseguir un iPhone antes de empezar | Decisión del usuario: no por ahora. |
| Solo nube (simuladores y granja de dispositivos) | No sustituye probar push y cámara reales. |

## Consecuencias

Riesgo de sorpresas de iOS tarde; colchón de 1–2 semanas en M12. Google exige una prueba cerrada con ≥ 12 testers
durante 14 días a cuentas personales nuevas: conviene abrirla en cuanto haya un build instalable.
