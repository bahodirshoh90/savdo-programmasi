// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure asset extensions to exclude .ico files and x-icon MIME types
if (config.resolver && config.resolver.assetExts) {
  config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'ico');
}

// Exclude problematic image types
if (config.resolver && config.resolver.sourceExts) {
  config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json'];
}

// Disable Jimp for .ico files
config.transformer = {
  ...config.transformer,
  assetPlugins: (config.transformer?.assetPlugins || []).filter(
    (plugin) => !plugin.includes('jimp')
  ),
};

module.exports = config;
