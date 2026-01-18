// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure asset extensions to exclude .ico files
if (config.resolver && config.resolver.assetExts) {
  config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'ico');
}

// Custom transformer to skip .ico files
const originalTransform = config.transformer?.transform;
if (originalTransform) {
  config.transformer.transform = async (params) => {
    // Skip .ico files
    if (params.filename && params.filename.endsWith('.ico')) {
      return {
        output: [
          {
            type: 'js',
            data: {
              code: 'module.exports = null;',
              map: null,
            },
          },
        ],
      };
    }
    return originalTransform(params);
  };
}

// Custom resolver to skip .ico files
const originalResolveRequest = config.resolver?.resolveRequest;
if (originalResolveRequest) {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Skip .ico files
    if (moduleName && moduleName.endsWith('.ico')) {
      return {
        type: 'empty',
      };
    }
    return originalResolveRequest(context, moduleName, platform);
  };
} else {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Skip .ico files
    if (moduleName && moduleName.endsWith('.ico')) {
      return {
        type: 'empty',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
