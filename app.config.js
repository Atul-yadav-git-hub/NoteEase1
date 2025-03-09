// Dynamic configuration for Expo
const config = require('./app.json');

// Check if we're in a production environment
const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

// Add runtime configuration
module.exports = {
  ...config.expo,
  // Make sure splash screen works in all environments
  splash: {
    image: './assets/images/resized/splash-icon-2048.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  android: {
    ...config.expo.android,
    splash: {
      image: './assets/images/resized/splash-icon-2048.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
  },
  ios: {
    ...config.expo.ios,
    splash: {
      image: './assets/images/resized/splash-icon-2048.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
  },
  extra: {
    ...config.expo.extra,
    eas: {
      ...config.expo.extra?.eas,
    },
    // Configure splash screen behavior
    splashScreenStayVisible: false,
    // Production mode flag
    isProduction: isProd,
    buildMode: isProd ? 'production' : 'development',
  },
  // Ensure all plugins are properly configured
  plugins: config.expo.plugins,
  updates: {
    // Add auto-update functionality
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/16944356-3582-43b7-af71-d080c6e4f2db'
  },
}; 