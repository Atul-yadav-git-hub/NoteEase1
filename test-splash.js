/**
 * Splash Screen Testing Utility
 * 
 * This script simplifies testing splash screen behavior without full production builds.
 * It clears the Expo cache and runs the app with specific flags enabled.
 */

const { execSync } = require('child_process');
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
const isAndroid = args.includes('--android') || args.includes('-a');
const isIos = args.includes('--ios') || args.includes('-i');
const shouldRebuild = args.includes('--rebuild') || args.includes('-r');
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
Splash Screen Testing Utility
=============================

Usage:
  node test-splash.js [options]

Options:
  -a, --android    Test on Android
  -i, --ios        Test on iOS (requires macOS)
  -r, --rebuild    Clean rebuild native code
  -h, --help       Show this help message

Examples:
  node test-splash.js -a           Test on Android
  node test-splash.js -i           Test on iOS
  node test-splash.js -a -r        Rebuild and test on Android
`);
  process.exit(0);
}

// Platform-specific steps
const platform = isIos ? 'ios' : (isAndroid ? 'android' : undefined);

console.log('======================================');
console.log('🧪 Splash Screen Testing Utility');
console.log('======================================');

// Step 1: Clear cache
console.log('🧹 Clearing cache...');
try {
  execSync('npx expo prebuild --clean', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Error clearing cache:', e.message);
}

// Step 2: Rebuild if requested
if (shouldRebuild) {
  console.log('🔨 Rebuilding native code...');
  try {
    if (platform) {
      execSync(`npx expo run:${platform}`, { stdio: 'inherit' });
    } else {
      console.log('⚠️ No platform specified for rebuild. Use -a or -i flag.');
    }
  } catch (e) {
    console.error('❌ Error rebuilding:', e.message);
  }
}

// Step 3: Run app with testing flags
console.log('🚀 Starting app with splash screen testing enabled...');
try {
  let command = 'npx expo start --clear';
  if (platform) {
    command += ` --${platform}`;
  }
  execSync(command, { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Error starting app:', e.message);
} 