# Decisiones de arquitectura (ADR)

Una decisión por fichero `NNNN-titulo-corto.md`, con estado `Propuesta`, `Aceptada` o `Sustituida por NNNN`.
Plantilla: [0000-plantilla.md](0000-plantilla.md). No se editan las aceptadas: se escribe una nueva que las sustituya.

| Nº   | Decisión                                                    | Estado                                  |
| ---- | ----------------------------------------------------------- | --------------------------------------- |
| 0001 | Nombre, dominio y `applicationId`                           | Pendiente (T0.1: requiere dominio)      |
| 0002 | [Offline con outbox propia](0002-offline-outbox.md)         | Aceptada                                |
| 0003 | [Vínculo 1:1 reversible](0003-vinculo-1-a-1.md)             | Aceptada                                |
| 0004 | [Supabase en la UE y claves nuevas](0004-supabase-ue.md)    | Aceptada (DPA por verificar en T0.3)    |
| 0005 | [Android primero, iOS en M12](0005-android-primero.md)      | Aceptada                                |
| 0006 | Estilos y tokens de tema                                    | Pendiente (T2.1: spike de Unistyles v3) |
| 0007 | Contratos compartidos app ↔ Edge Functions                  | Pendiente (T0.11: spike de empaquetado) |
| 0008 | [Sin login social en el MVP](0008-sin-login-social-mvp.md)  | Aceptada                                |
| 0009 | Cifrado de datos locales                                    | Pendiente (T0.13: spike SQLCipher)      |
| 0010 | Proveedor de push y payloads sin datos de salud             | Pendiente (T8.5–T8.7)                   |
| 0011 | [Línea base de herramientas](0011-linea-base-herramientas.md) | Aceptada                              |
