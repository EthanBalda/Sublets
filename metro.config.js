// Metro config for Expo in npm workspaces monorepo.
//
// Expo SDK 49+ detects npm workspaces and uses the workspace root as Metro's
// project root. Metro therefore loads this file (not apps/mobile/metro.config.js)
// and the entry point is read from this package.json's "main" field.
//
// getDefaultConfig(projectRoot) tells Expo Router where the app lives so it
// discovers routes in apps/mobile/app/ correctly.

const { getDefaultConfig } = require("expo/metro-config");
const { loadProjectEnv } = require("@expo/env");
const path = require("path");

const workspaceRoot = __dirname;
const projectRoot = path.resolve(workspaceRoot, "apps/mobile");

// Expo in monorepo mode sets the Metro root to the workspace root, so it
// loads .env from here instead of apps/mobile/. Explicitly load the mobile
// project's .env so EXPO_PUBLIC_* vars are available during bundling.
loadProjectEnv(projectRoot);

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo so Metro sees changes in packages/shared.
config.watchFolders = [workspaceRoot];

// Resolve packages from both app-local and workspace-root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Resolve the @/ alias used in route files.
// babel-plugin-module-resolver cannot be installed due to a pre-existing
// npm Invalid Version bug in the dependency tree, so we handle this here.
// @/assets/* -> projectRoot/assets/*   (matches tsconfig @/assets/* path)
// @/*        -> projectRoot/src/*      (matches tsconfig @/* path)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/assets/")) {
    const subPath = moduleName.slice("@/assets/".length);
    return context.resolveRequest(
      context,
      path.resolve(projectRoot, "assets", subPath),
      platform
    );
  }
  if (moduleName.startsWith("@/")) {
    const subPath = moduleName.slice(2);
    return context.resolveRequest(
      context,
      path.resolve(projectRoot, "src", subPath),
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
