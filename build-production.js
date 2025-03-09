/**
 * Production Build Script
 * 
 * This script simplifies building for production with various options.
 */

const { execSync } = require('child_process');
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
const isAndroid = args.includes('--android') || args.includes('-a');
const isIos = args.includes('--ios') || args.includes('-i');
const isSimulator = args.includes('--simulator') || args.includes('-s');
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
Production Build Script
=======================

Usage:
  node build-production.js [options]

Options:
  -a, --android    Build for Android
  -i, --ios        Build for iOS (requires macOS)
  -s, --simulator  Build for simulator/emulator (faster)
  -h, --help       Show this help message

Examples:
  node build-production.js -a           Production Android build
  node build-production.js -i           Production iOS build
  node build-production.js -a -s        Production Android simulator build
`);
  process.exit(0);
}

// Determine platform and build profile
const platform = isIos ? 'ios' : (isAndroid ? 'android' : undefined);
const profile = isSimulator ? 'production-simulator' : 'production';

if (!platform) {
  console.error('❌ Error: You must specify a platform with -a or -i');
  process.exit(1);
}

console.log('======================================');
console.log('🚀 Starting production build process');
console.log('======================================');
console.log(`Platform: ${platform}`);
console.log(`Profile: ${profile}`);
console.log('======================================');

// Clean prebuild
console.log('🧹 Cleaning previous builds...');
try {
  execSync('npx expo prebuild --clean', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Error cleaning builds:', e.message);
}

// Run the build
console.log('🔨 Building production app...');
try {
  const command = `eas build --platform ${platform} --profile ${profile} --non-interactive`;
  console.log(`Executing: ${command}`);
  execSync(command, { stdio: 'inherit' });
  console.log('✅ Build command completed successfully!');
} catch (e) {
  console.error('❌ Error during build:', e.message);
  process.exit(1);
} 