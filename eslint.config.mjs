import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

const CORE_LAYERS = ['domain', 'ports', 'application', 'testing'];
const coreLayer = (layer) => `packages/core/src/*/${layer}/**`;

// Which core modules each module must never import. Modules not listed may import any other module.
const CORE_MODULE_BANS = {
  shared: ['entries', 'subjects', 'conversations', 'timeline'],
  entries: ['conversations', 'timeline'],
  subjects: ['entries', 'conversations', 'timeline'],
};
const NO_RUNTIME_DEPENDENCY = { regex: '^[^./]', message: 'core has zero runtime dependencies' };
const coreImportRules = (bans = []) => ({
  'no-restricted-imports': ['error', {
    patterns: [
      NO_RUNTIME_DEPENDENCY,
      ...bans.map((module) => ({ group: [`**/${module}/**`], message: `this module never depends on ${module}` })),
    ],
  }],
});
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

const elements = [
  ...CORE_LAYERS.map((layer) => ({ type: `core-${layer}`, pattern: coreLayer(layer) })),
  { type: 'core-testing-entry', pattern: 'packages/core/src/testing.ts', mode: 'file' },
  { type: 'core-entry', pattern: 'packages/core/src/index.ts', mode: 'file' },
  ...Object.entries(packageElements).map(([type, pattern]) => ({ type, pattern })),
];

const allowances = [
  { from: 'core-domain', values: ['core-domain'] },
  { from: 'core-ports', types: ['core-domain', 'core-ports'] },
  { from: 'core-application', values: ['core-domain', 'core-ports'] },
  { from: 'core-testing', values: ['core-domain', 'core-ports'] },
  { from: 'core-entry', values: ['core-domain', 'core-ports', 'core-application'] },
  { from: 'core-testing-entry', values: ['core-domain', 'core-ports', 'core-testing'] },
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

const selfAllowed = (from) => from !== 'core-ports';

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
    rules: {
      ...coreImportRules(),
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
  ...Object.entries(CORE_MODULE_BANS).map(([module, bans]) => ({
    files: [`packages/core/src/${module}/**/*.ts`],
    rules: coreImportRules(bans),
  })),
  {
    files: ['**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
]);
