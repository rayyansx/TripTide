const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * @trek/shared's package.json declares subpath exports (`./i18n`, `./i18n/*`,
 * `./roadtrip`) that only resolve through Node's package-exports algorithm —
 * off by default in this Metro version, so `@trek/shared/i18n/en` (used by
 * src/i18n/TranslationContext.tsx to reuse the shared locale bundles) fails
 * to resolve without this.
 */
config.resolver.unstable_enablePackageExports = true;

/**
 * `@trek/shared` is a `file:../shared` dependency, so npm installs it as a
 * real symlink (node_modules/@trek/shared -> ../../../shared) rather than a
 * copy. Metro doesn't follow out-of-root symlinks by default, so it can't
 * see the real package even with package-exports enabled above — this is
 * the standard fix for an Expo app inside an npm-workspaces-style monorepo.
 */
config.resolver.unstable_enableSymlinks = true;
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')];

module.exports = config;
