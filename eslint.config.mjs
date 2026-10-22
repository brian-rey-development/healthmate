import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

// A core module imports only itself and the modules before it. A new module goes at its place in this list.
const CORE_MODULES = ['shared', 'users', 'subjects', 'entries', 'conversations'];
const CORE_LAYER_IMPORTS = {
  domain: { values: ['domain'] },
  ports: { types: ['domain', 'ports'] },
  application: { values: ['domain', 'ports', 'application'] },
  testing: { values: ['domain', 'ports'] },
};
const CORE_LAYERS = Object.keys(CORE_LAYER_IMPORTS);
const coreLayer = (layer) => `packages/core/src/*/${layer}/**`;
const coreType = (module, layer) => `core-${module}-${layer}`;
const coreTypes = (modules, layers = []) => modules.flatMap((module) => layers.map((layer) => coreType(module, layer)));
const modulesUpTo = (module) => CORE_MODULES.slice(0, CORE_MODULES.indexOf(module) + 1);

const coreElements = CORE_MODULES.flatMap((module) =>
  CORE_LAYERS.map((layer) => ({ type: coreType(module, layer), pattern: `packages/core/src/${module}/${layer}/**` })),
);

const coreAllowances = CORE_MODULES.flatMap((module) =>
  CORE_LAYERS.map((layer) => ({
    from: coreType(module, layer),
    values: coreTypes(modulesUpTo(module), CORE_LAYER_IMPORTS[layer].values),
    types: coreTypes(modulesUpTo(module), CORE_LAYER_IMPORTS[layer].types),
  })),
);

const MAX_FUNCTION_LINES = 20;
const MAX_FILE_LINES = 200;
const LINT_COMMENT_RULES = { skipBlankLines: true, skipComments: true };
const ASYNC_FILES = ['packages/*/**/*.ts', 'apps/api/**/*.ts', 'apps/telegram/**/*.ts'];

const packageElements = {
  contracts: 'packages/contracts/src/**',
  database: 'packages/database/src/**',
  agent: 'packages/agent/src/**',
  providers: 'packages/providers/src/**',
  evals: 'packages/evals/src/**',
  api: 'apps/api/src/**',
  telegram: 'apps/telegram/src/**',
  mobile: 'apps/mobile/src/**',
  site: 'apps/site/src/**',
};

const TEST = 'test';
const CORE_ENTRY = 'core-entry';
const CORE_TESTING_ENTRY = 'core-testing-entry';

// Single files are file categories, because element patterns match folders.
const elements = [
  ...coreElements,
  ...Object.entries(packageElements).map(([type, pattern]) => ({ type, pattern })),
];

const fileCategories = [
  { category: TEST, pattern: '**/*.test.ts' },
  { category: CORE_ENTRY, pattern: 'packages/core/src/index.ts' },
  { category: CORE_TESTING_ENTRY, pattern: 'packages/core/src/testing.ts' },
];

const allowances = [
  ...coreAllowances,
  { from: { file: { categories: TEST } }, values: coreTypes(CORE_MODULES, CORE_LAYERS) },
  { from: { file: { categories: CORE_ENTRY } }, values: coreTypes(CORE_MODULES, ['domain', 'ports', 'application']) },
  { from: { file: { categories: CORE_TESTING_ENTRY } }, values: coreTypes(CORE_MODULES, ['domain', 'ports', 'testing']) },
  { from: 'contracts', values: [] },
  { from: 'database', files: [CORE_ENTRY] },
  { from: 'agent', values: ['contracts'], files: [CORE_ENTRY] },
  { from: 'providers', types: ['agent'] },
  { from: 'evals', values: ['agent', 'providers'], files: [CORE_ENTRY] },
  { from: 'api', values: ['contracts', 'database', 'agent', 'providers'], files: [CORE_ENTRY, CORE_TESTING_ENTRY] },
  { from: 'telegram', values: ['contracts'] },
  { from: 'mobile', values: ['contracts'] },
  { from: 'site', values: [] },
];

const selfAllowed = (from) => typeof from === 'string' && !from.endsWith('-ports');
const fromSelector = (from) => (typeof from === 'string' ? { element: { type: from } } : from);
const policy = (from, to, dependency) => ({ from: fromSelector(from), allow: { to, ...(dependency && { dependency }) } });

const toPolicies = ({ from, values = [], types = [], files = [] }) => {
  const allValues = selfAllowed(from) ? [from, ...values] : values;
  return [
    ...(allValues.length ? [policy(from, { element: { type: allValues } })] : []),
    ...(types.length ? [policy(from, { element: { type: types } }, { kind: 'type' })] : []),
    ...(files.length ? [policy(from, { file: { categories: files } })] : []),
  ];
};

const dependencyPolicies = allowances.flatMap(toPolicies);

export default defineConfig([
  globalIgnores(['**/node_modules/**', '**/dist/**', '**/.turbo/**', '**/.astro/**']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    settings: {
      'import/resolver': { typescript: true },
      'boundaries/root-path': import.meta.dirname,
      'boundaries/include': ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
      'boundaries/elements': elements,
      'boundaries/files': fileCategories,
    },
    plugins: { boundaries },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': ['error', { default: 'disallow', policies: dependencyPolicies }],
      'max-lines-per-function': ['error', { max: MAX_FUNCTION_LINES, ...LINT_COMMENT_RULES }],
      'max-lines': ['warn', { max: MAX_FILE_LINES, ...LINT_COMMENT_RULES }],
      eqeqeq: 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    },
  },
  {
    // Type-aware rules need the TypeScript program, so they run only where promises exist.
    files: ASYNC_FILES,
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex: '^[^./]', message: 'core has zero runtime dependencies' }] }],
    },
  },
  {
    // Tests and fakes pin time and ids on purpose, so only production code must inject them.
    files: ['packages/core/src/**/*.ts'],
    ignores: ['**/*.test.ts', coreLayer('testing')],
    rules: {
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: 'inject Clock from ports' },
        { object: 'Math', property: 'random', message: 'inject IdGenerator from ports' },
        { object: 'crypto', property: 'randomUUID', message: 'inject IdGenerator from ports' },
      ],
      'no-restricted-syntax': ['error', { selector: 'NewExpression[callee.name="Date"]', message: 'inject Clock from ports' }],
    },
  },
  {
    files: [coreLayer('domain')],
    ignores: ['**/*.test.ts'],
    rules: {
      // A later 'no-restricted-syntax' block replaces the earlier one in flat config, so the Date ban repeats here.
      'no-restricted-syntax': ['error',
        { selector: 'AwaitExpression', message: 'domain is synchronous' },
        { selector: ':function[async=true]', message: 'domain is synchronous' },
        { selector: 'NewExpression[callee.name="Date"]', message: 'inject Clock from ports' },
      ],
    },
  },
  {
    files: [coreLayer('ports')],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: ':matches(Program, ExportNamedDeclaration, ExportDefaultDeclaration) > :matches(VariableDeclaration, FunctionDeclaration, ClassDeclaration)',
        message: 'ports hold interfaces and types only',
      }],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' }],
    },
  },
]);
