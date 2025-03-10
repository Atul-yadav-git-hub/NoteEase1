import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback, useRef } from 'react';
import 'react-native-reanimated';
import { useColorScheme, View, Text, TouchableOpacity, Alert, StyleSheet, Image, Platform, AppState } from 'react-native';
import { useStore } from '../store/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import * as QuickActions from 'expo-quick-actions';
import { initializeQuickActions, handleQuickAction } from '../utils/quickActions';
import Constants from 'expo-constants';
import { SplashScreenTester } from './utils/splashScreenTester';

// PRODUCTION SIMULATION FLAG - set to true to simulate production in dev mode
const SIMULATE_PRODUCTION = true;

// Check if we're in production or simulating production
const isProductionEnv = !__DEV__ || SIMULATE_PRODUCTION;

// Configuration flags
const enableDebugLogsInProduction = true;
const enableSplashScreenTesting = __DEV__ && !SIMULATE_PRODUCTION;

// Universal logger that always works in both dev and production
const logger = {
  log: (...args: any[]) => {
    if (__DEV__ || enableDebugLogsInProduction) console.log('[NoteEase]', ...args);
  },
  warn: (...args: any[]) => {
    if (__DEV__ || enableDebugLogsInProduction) console.warn('[NoteEase]', ...args);
  },
  error: (...args: any[]) => {
    if (__DEV__ || enableDebugLogsInProduction) console.error('[NoteEase]', ...args);
  }
};

// Log production simulation status
if (SIMULATE_PRODUCTION && __DEV__) {
  logger.log('⚠️ SIMULATING PRODUCTION ENVIRONMENT');
}

// Preload images
const iconImage = require('../assets/images/resized/icon-1024.png');
const splashImage = require('../assets/images/resized/splash-icon-2048.png');
const adaptiveIconImage = require('../assets/images/resized/adaptive-icon-1024.png');

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// PRODUCTION OPTIMIZATIONS
if (isProductionEnv) {
  // In production, make sure we check for app updates
  try {
    const checkForUpdates = async () => {
      try {
        // Only check for updates in production builds
        if (!__DEV__) {
          const isUpdateAvailable = await Updates.checkForUpdateAsync();
          logger.log('Update check result:', isUpdateAvailable);
          
          if (isUpdateAvailable.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } else {
          logger.log('Update checking skipped in development mode');
        }
      } catch (error: any) {
        // Only log real errors, not the expected development mode message
        if (!error.message?.includes('not supported in development')) {
          logger.error('Update check failed:', error);
        }
      }
    };
    
    // Only run in a try/catch to prevent app crashes
    checkForUpdates().catch((e: Error) => {
      // Only log unexpected errors
      if (!e.message?.includes('not supported in development')) {
        logger.error('Unexpected error during update check:', e);
      }
    });
  } catch (e: any) {
    logger.error('Error setting up updates:', e);
  }
}

// Use a try-catch for preventAutoHideAsync to avoid app crashes
try {
  logger.log('Attempting to prevent auto hide of splash screen');
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  logger.warn('Could not prevent splash screen auto-hide', e);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isDarkMode, initialize, isInitialized } = useStore();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const theme = isDarkMode ? DarkTheme : DefaultTheme;
  const isMounted = useRef(true);
  const initializationAttempted = useRef(false);

  // Handle app initialization
  useEffect(() => {
    async function initializeApp() {
      try {
        // Prevent auto-hide of splash screen
        await SplashScreen.preventAutoHideAsync();
        
        if (!initialize || initializationAttempted.current) return;
        initializationAttempted.current = true;

        // Initialize store
        await initialize();
        
        // Once everything is ready, hide the splash screen
        if (isMounted.current && loaded && isInitialized) {
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        logger.error('Error during app initialization:', error);
        // Still try to hide splash screen on error
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          logger.error('Failed to hide splash screen:', e);
        }
      }
    }

    initializeApp();

    return () => {
      isMounted.current = false;
    };
  }, [initialize, loaded, isInitialized]);

  // Show a blank screen while loading
  if (!loaded || !isInitialized) {
    return null;
  }

  // Main app layout
  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="trash" options={{ headerShown: false }} />
        <Stack.Screen 
          name="note/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_right'
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  emergencyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  emergencyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#d32f2f',
  },
  emergencyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  emergencyButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
