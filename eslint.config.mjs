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

// A test file can import any core layer, so a domain or application test can use fixtures and fakes.
const elements = [
  { type: 'core-test', pattern: 'packages/core/src/**/*.test.ts', mode: 'file' },
  ...coreElements,
  { type: 'core-testing-entry', pattern: 'packages/core/src/testing.ts', mode: 'file' },
  { type: 'core-entry', pattern: 'packages/core/src/index.ts', mode: 'file' },
  ...Object.entries(packageElements).map(([type, pattern]) => ({ type, pattern })),
];

const allowances = [
  ...coreAllowances,
  { from: 'core-test', values: coreTypes(CORE_MODULES, CORE_LAYERS) },
  { from: 'core-entry', values: coreTypes(CORE_MODULES, ['domain', 'ports', 'application']) },
  { from: 'core-testing-entry', values: coreTypes(CORE_MODULES, ['domain', 'ports', 'testing']) },
  { from: 'contracts', values: [] },
  { from: 'database', values: ['core-entry'] },
  { from: 'agent', values: ['core-entry', 'contracts'] },
  { from: 'providers', types: ['agent'] },
  { from: 'evals', values: ['agent', 'core-entry', 'providers'] },
  { from: 'api', values: ['core-entry', 'core-testing-entry', 'contracts', 'database', 'agent', 'providers'] },
  { from: 'telegram', values: ['contracts'] },
  { from: 'mobile', values: ['contracts'] },
  { from: 'site', values: [] },
];

const selfAllowed = (from) => !from.endsWith('-ports');

const toPolicies = ({ from, values = [], types = [] }) => {
  const allValues = selfAllowed(from) ? [from, ...values] : values;
  const valuePolicy = allValues.length
    ? [{ from: { element: { type: from } }, allow: { to: { element: { type: allValues } } } }]
    : [];
  const typePolicy = types.length
    ? [{ from: { element: { type: from } }, allow: { to: { element: { type: types } }, dependency: { kind: 'type' } } }]
    : [];
  return [...valuePolicy, ...typePolicy];
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
    },
    plugins: { boundaries },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': ['error', { default: 'disallow', policies: dependencyPolicies }],
      'max-lines-per-function': ['error', { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
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
    rules: { 'max-lines-per-function': 'off' },
  },
]);
