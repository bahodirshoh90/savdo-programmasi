// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure asset extensions to exclude .ico files
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'ico');

// Exclude problematic image types
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json'];

module.exports = config;
