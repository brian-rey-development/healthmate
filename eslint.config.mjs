import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

const CORE_LAYERS = ['domain', 'ports', 'application', 'testing'];
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
  ...CORE_LAYERS.map((layer) => ({ type: `core-${layer}`, pattern: `packages/core/src/${layer}/**` })),
  { type: 'core-entry', pattern: 'packages/core/src' },
  ...Object.entries(packageElements).map(([type, pattern]) => ({ type, pattern })),
];

const allowances = [
  { from: 'core-domain', values: ['core-domain'] },
  { from: 'core-ports', types: ['core-domain', 'core-ports'] },
  { from: 'core-application', values: ['core-domain', 'core-ports'] },
  { from: 'core-testing', values: ['core-domain', 'core-ports'] },
  { from: 'core-entry', values: ['core-domain', 'core-ports', 'core-application'] },
  { from: 'contracts', values: [] },
  { from: 'database', values: ['core-entry'] },
  { from: 'agent', values: ['core-entry', 'contracts'] },
  { from: 'providers', types: ['agent'] },
  { from: 'evals', values: ['agent', 'core-entry', 'providers'] },
  { from: 'api', values: ['core-entry', 'core-testing', 'contracts', 'database', 'agent', 'providers'] },
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
      'no-restricted-imports': ['error', { patterns: [{ regex: '^[^./]', message: 'core has zero runtime dependencies' }] }],
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: 'inject Clock from ports' },
        { object: 'Math', property: 'random', message: 'inject IdGenerator from ports' },
        { object: 'crypto', property: 'randomUUID', message: 'inject IdGenerator from ports' },
      ],
      'no-restricted-syntax': ['error', { selector: 'NewExpression[callee.name="Date"]', message: 'inject Clock from ports' }],
    },
  },
  {
    files: ['packages/core/src/domain/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: 'AwaitExpression', message: 'domain is synchronous' },
        { selector: ':function[async=true]', message: 'domain is synchronous' },
        { selector: 'NewExpression[callee.name="Date"]', message: 'inject Clock from ports' },
      ],
    },
  },
  {
    files: ['packages/core/src/ports/**/*.ts'],
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
