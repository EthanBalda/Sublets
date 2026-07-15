const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo so Metro sees changes in packages/shared.
// Keep Expo's default watch folders (expo-doctor checks for them).
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Resolve hoisted packages from the workspace root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
