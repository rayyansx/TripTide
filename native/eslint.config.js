// Flat config, mirroring shared/'s and server/'s use of typescript-eslint
// (see their eslint.config.js) scoped down to what a React Native app needs
// — no DOM-specific rules, no react-native-specific plugin yet (Phase 3 can
// add one if false positives on RN-only APIs start showing up).
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['node_modules', '.expo', 'dist'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  }
);
