// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude expo-sqlite web worker from web bundling
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Skip expo-sqlite web worker on web platform
  if (platform === 'web' && moduleName.includes('expo-sqlite/web/worker')) {
    return {
      type: 'empty',
    };
  }
  
  // Use default resolution for other modules
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

