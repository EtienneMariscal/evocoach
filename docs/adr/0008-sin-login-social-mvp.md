# 0008 · Sin login social en el MVP

- **Estado**: Aceptada
- **Fecha**: 2026-11-24
- **Tarea relacionada**: T2.6, M12

## Contexto

Apple exige ofrecer una opción equivalente a "Iniciar sesión con Apple" si la app tiene login de terceros, y
no se puede probar iOS hasta M12. Google/Apple Sign-In añaden configuración de OAuth y revisión de tiendas.

## Decisión

MVP con **email + contraseña + OTP por email** (y TOTP opcional para profesionales como palanca de recorte).
Login con Google y Apple se añade en M12, junto con la revocación del token de Apple al borrar la cuenta.

## Alternativas descartadas

| Opción | Por qué no |
| ------ | ---------- |
| Google ahora y Apple en M12 | Obliga a ofrecer Apple en iOS y no se puede probar sin dispositivo. |
| Solo magic link/OTP sin contraseña | Más fricción de correo; el SMTP propio es imprescindible en cualquier caso. |

## Consecuencias

Menos superficie en el MVP. Requiere SMTP propio en la UE (el de Supabase por defecto no sirve en producción).
