import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Variantes de la app (plan §10.2). Cada una tiene su propio applicationId, así que se pueden
 * instalar las tres a la vez en el mismo móvil. La base estática está en `app.json`; aquí solo se
 * sobreescribe lo que cambia por variante. EAS fija `APP_VARIANT` desde cada perfil de `eas.json`.
 */
export const APP_VARIANTS = ['development', 'staging', 'production'] as const;
export type AppVariant = (typeof APP_VARIANTS)[number];

/**
 * ApplicationId base. Es PROVISIONAL: el de producción es permanente en Google Play y depende del
 * dominio y la marca (T0.1, ADR 0001). Mientras `BASE_APPLICATION_ID_CONFIRMED` sea `false`, la
 * variante `production` se niega a evaluarse, así que no se puede compilar por accidente.
 * Las variantes `development` y `staging` nunca se publican y se pueden renombrar sin coste.
 */
export const BASE_APPLICATION_ID = 'app.evocoach';
export const BASE_APPLICATION_ID_CONFIRMED = false;

const APP_NAME = 'evocoach';

const VARIANT_SUFFIX: Record<AppVariant, string> = {
  development: '.dev',
  staging: '.staging',
  production: '',
};

const VARIANT_LABEL: Record<AppVariant, string> = {
  development: ' (Dev)',
  staging: ' (Staging)',
  production: '',
};

/** Sin `APP_VARIANT` (p. ej. `npm start` en local) se usa `development`. */
export function resolveVariant(raw: string | undefined): AppVariant {
  if (raw === undefined || raw === '') {
    return 'development';
  }
  const variant = APP_VARIANTS.find((candidate) => candidate === raw);
  if (variant === undefined) {
    throw new Error(
      `APP_VARIANT "${raw}" no es válido. Valores permitidos: ${APP_VARIANTS.join(', ')}.`,
    );
  }
  return variant;
}

export default function createConfig({ config }: ConfigContext): ExpoConfig {
  const variant = resolveVariant(process.env.APP_VARIANT);

  if (variant === 'production' && !BASE_APPLICATION_ID_CONFIRMED) {
    throw new Error(
      'La variante production está bloqueada: el applicationId es permanente en Google Play y aún no ' +
        'está confirmado (T0.1 / ADR 0001). Confírmalo y pon BASE_APPLICATION_ID_CONFIRMED a true.',
    );
  }

  return {
    ...config,
    // `slug` es el mismo en todas las variantes: identifica el proyecto en EAS.
    slug: config.slug ?? APP_NAME,
    name: `${APP_NAME}${VARIANT_LABEL[variant]}`,
    // Un esquema por variante: evita que dos instalaciones se disputen los enlaces profundos.
    scheme: variant === 'production' ? APP_NAME : `${APP_NAME}-${variant}`,
    android: {
      ...config.android,
      package: `${BASE_APPLICATION_ID}${VARIANT_SUFFIX[variant]}`,
    },
    extra: {
      ...config.extra,
      appVariant: variant,
    },
  };
}
