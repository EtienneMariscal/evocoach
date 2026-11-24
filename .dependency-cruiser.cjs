/**
 * Reglas de arquitectura (ver CLAUDE.md y el plan, seccion 3.3).
 * Capas por feature: domain (puro) -> data (repositorios) -> hooks (TanStack Query) -> ui.
 * Se ejecuta con `npm run deps`.
 */
const NPM_FRAMEWORKS =
  '^node_modules/(react|react-dom|react-native|expo|expo-[^/]+|@expo|@supabase|@tanstack|zustand|i18next|react-i18next)(/|$)';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Las dependencias circulares dificultan los tests y los cambios.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'Todo import debe resolverse.',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment:
        'domain/ es TypeScript puro: sin React, React Native, Expo, Supabase, TanStack, Zustand ni i18n.',
      from: { path: '^src/features/[^/]+/domain/' },
      to: { path: NPM_FRAMEWORKS },
    },
    {
      name: 'domain-no-infra',
      severity: 'error',
      comment: 'domain/ solo puede importar domain/ y core/utils (puro).',
      from: { path: '^src/features/[^/]+/domain/' },
      to: {
        path: ['^src/core/(?!utils/)', '^src/(ui|app)/', '^src/features/[^/]+/(data|hooks|ui)/'],
      },
    },
    {
      name: 'data-no-ui',
      severity: 'error',
      comment: 'data/ (repositorios) no conoce hooks ni UI.',
      from: { path: '^src/features/[^/]+/data/' },
      to: { path: ['^src/features/[^/]+/(hooks|ui)/', '^src/(ui|app)/'] },
    },
    {
      name: 'hooks-no-ui',
      severity: 'error',
      comment: 'hooks/ no conoce la UI.',
      from: { path: '^src/features/[^/]+/hooks/' },
      to: { path: ['^src/features/[^/]+/ui/', '^src/(ui|app)/'] },
    },
    {
      name: 'ui-no-data',
      severity: 'error',
      comment: 'La UI de una feature accede a los datos solo a traves de hooks/.',
      from: { path: '^src/features/[^/]+/ui/' },
      to: { path: '^src/features/[^/]+/data/' },
    },
    {
      name: 'feature-isolation',
      severity: 'error',
      comment: 'Una feature solo puede usar otra a traves de su index.ts.',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/([^/]+)/',
        pathNot: ['^src/features/$1/', '^src/features/[^/]+/index\\.tsx?$'],
      },
    },
    {
      name: 'core-no-features',
      severity: 'error',
      comment: 'core/ es infraestructura: no depende de features, ui ni rutas.',
      from: { path: '^src/core/' },
      to: { path: '^src/(features|ui|app)/' },
    },
    {
      name: 'design-system-isolated',
      severity: 'error',
      comment: 'src/ui (sistema de diseño) no depende de features, rutas ni infraestructura.',
      from: { path: '^src/ui/' },
      to: { path: ['^src/(features|app)/', '^src/core/(?!utils/)'] },
    },
    {
      name: 'app-routes-are-thin',
      severity: 'error',
      comment: 'src/app solo importa el index.ts de cada feature.',
      from: { path: '^src/app/' },
      to: {
        path: '^src/features/[^/]+/',
        pathNot: '^src/features/[^/]+/index\\.tsx?$',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.(test|spec)\\.tsx?$|__tests__|__mocks__' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
