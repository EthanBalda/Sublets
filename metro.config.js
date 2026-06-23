// Metro config for Expo in npm workspaces monorepo.
//
// Expo SDK 49+ detects npm workspaces and uses the workspace root as Metro's
// project root. Metro therefore loads this file (not apps/mobile/metro.config.js)
// and the entry point is read from this package.json's "main" field.
//
// getDefaultConfig(projectRoot) tells Expo Router where the app lives so it
// discovers routes in apps/mobile/src/app/ correctly.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const workspaceRoot = __dirname;
const projectRoot = path.resolve(workspaceRoot, "apps/mobile");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo so Metro sees changes in packages/shared.
config.watchFolders = [workspaceRoot];

// Resolve packages from both app-local and workspace-root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
