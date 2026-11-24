# 0011 · Línea base de herramientas

- **Estado**: Aceptada
- **Fecha**: 2026-11-24
- **Tarea relacionada**: T0.6–T0.10

## Contexto

El plan se escribió con versiones de npm que luego se contrastaron con la plantilla de Expo SDK 58 y con la
compatibilidad real de los plugins. Esta ADR fija las desviaciones respecto al plan.

## Decisión

| Tema                                | Decisión                                                                                         | Motivo                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| TypeScript                          | `~6.0.3` (el de la plantilla de SDK 58), no 7                                                    | Es la versión que fija Expo.                                                                        |
| ESLint                              | **9.x**, no 10                                                                                   | `eslint-plugin-react` y `eslint-plugin-import` (usados por `eslint-config-expo`) solo soportan ≤ 9. |
| Plugin a11y de ESLint               | No se usa `eslint-plugin-react-native-a11y`                                                      | Solo soporta ESLint ≤ 8. La accesibilidad se verifica con tests de primitivas y auditoría manual.   |
| `exactOptionalPropertyTypes`        | Diferido                                                                                         | Fricción conocida con los tipos de React Native; se reevaluará con código real.                     |
| `react-dom`                         | Fijado a la versión de `react` (19.3.0)                                                          | `expo-router` lo trae como peer; sin fijarlo npm lo resuelve a otra versión y rompe `react`.        |
| React Compiler                      | Activado (`experiments.reactCompiler`, viene en la plantilla)                                    | Soportado en SDK 58.                                                                                |
| Soporte web                         | Eliminado (`react-native-web`, config `web`)                                                     | El alcance es solo móvil; el panel web es fase 2.                                                   |
| Dependencias de la plantilla        | Quitadas: `@expo/ui`, `expo-symbols`, `expo-glass-effect`, `expo-device`, `expo-web-browser`, Reanimated, Worklets | Menos dependencias nativas hasta que haga falta; se añaden con `expo install`. |
| Arquitectura en CI                  | `dependency-cruiser` (no `import/no-restricted-paths`)                                           | Permite reglas por feature con referencias (`$1`).                                                  |
| Formato                             | Prettier por separado (`format:check`), `eslint-config-prettier` solo desactiva reglas           | Más rápido y menos ruido que `eslint-plugin-prettier`.                                              |

## Consecuencias

Revisar esta tabla al subir de SDK. Si se añade Reanimated o un plugin que lo necesite, se hace con `npx expo install`.
