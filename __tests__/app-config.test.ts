import type { ConfigContext } from 'expo/config';

import createConfig, {
  BASE_APPLICATION_ID,
  BASE_APPLICATION_ID_CONFIRMED,
  resolveVariant,
} from '../app.config';

const context = {
  config: { name: 'evocoach', slug: 'evocoach', android: { allowBackup: false } },
} as ConfigContext;

const originalVariant = process.env.APP_VARIANT;

afterEach(() => {
  if (originalVariant === undefined) {
    delete process.env.APP_VARIANT;
  } else {
    process.env.APP_VARIANT = originalVariant;
  }
});

describe('resolveVariant', () => {
  it('usa development cuando no hay APP_VARIANT', () => {
    expect(resolveVariant(undefined)).toBe('development');
    expect(resolveVariant('')).toBe('development');
  });

  it('acepta las variantes conocidas', () => {
    expect(resolveVariant('staging')).toBe('staging');
    expect(resolveVariant('production')).toBe('production');
  });

  it('rechaza una variante desconocida', () => {
    expect(() => resolveVariant('prod')).toThrow(/no es válido/);
  });
});

describe('app.config', () => {
  it('construye la variante development con su propio applicationId y esquema', () => {
    process.env.APP_VARIANT = 'development';
    const config = createConfig(context);

    expect(config.name).toBe('evocoach (Dev)');
    expect(config.scheme).toBe('evocoach-development');
    expect(config.android?.package).toBe(`${BASE_APPLICATION_ID}.dev`);
    expect(config.extra?.appVariant).toBe('development');
  });

  it('construye la variante staging', () => {
    process.env.APP_VARIANT = 'staging';
    const config = createConfig(context);

    expect(config.name).toBe('evocoach (Staging)');
    expect(config.android?.package).toBe(`${BASE_APPLICATION_ID}.staging`);
  });

  it('conserva la configuración estática de app.json', () => {
    process.env.APP_VARIANT = 'development';

    expect(createConfig(context).android?.allowBackup).toBe(false);
  });

  it('bloquea la variante production hasta confirmar el applicationId', () => {
    process.env.APP_VARIANT = 'production';

    if (BASE_APPLICATION_ID_CONFIRMED) {
      expect(createConfig(context).android?.package).toBe(BASE_APPLICATION_ID);
    } else {
      expect(() => createConfig(context)).toThrow(/bloqueada/);
    }
  });
});
