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
import LaunchScreen from './LaunchScreen';
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
    // Check if we're running in Expo Go or a standalone app
    const checkForUpdates = async () => {
      try {
        // This will throw an error in Expo Go
        const isUpdateAvailable = await Updates.checkForUpdateAsync();
        logger.log('Update check result:', isUpdateAvailable);
        
        if (isUpdateAvailable.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error: any) {
        // If we get a specific error about Expo Go, log it clearly
        if (error?.message?.includes('Expo Go')) {
          logger.log('Running in Expo Go, updates not available');
        } else {
          logger.error('Update check failed:', error);
        }
      }
    };
    
    // Only run in a try/catch to prevent app crashes
    checkForUpdates().catch((e: Error) => {
      logger.error('Unexpected error during update check:', e);
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
  const { isDarkMode, initialize, isInitialized, resetAppData } = useStore();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const [isAppReady, setIsAppReady] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  const [showSplashTester, setShowSplashTester] = useState(false);
  const theme = isDarkMode ? DarkTheme : DefaultTheme;
  const appStateRef = useRef(AppState.currentState);

  // Create a more aggressive splash screen hiding mechanism
  const hideSplashScreen = useCallback(async () => {
    if (splashHidden) return; // Avoid multiple hide attempts
    
    logger.log('Attempting to hide splash screen');
    setSplashHidden(true);
    
    // Try multiple approaches to hide the splash screen
    const tryHide = async () => {
      try {
        await SplashScreen.hideAsync();
        logger.log('Splash screen hidden successfully via hideAsync');
        return true;
      } catch (e) {
        logger.error('Error hiding splash screen via hideAsync', e);
        return false;
      }
    };
    
    // First attempt
    const firstAttempt = await tryHide();
    if (!firstAttempt) {
      // Retry with delay on failure
      setTimeout(async () => {
        const secondAttempt = await tryHide();
        if (!secondAttempt) {
          logger.warn('Multiple attempts to hide splash screen failed');
        }
      }, Platform.OS === 'android' ? 500 : 300);
    }
  }, [splashHidden]);

  // App state change handler to help with splash screen issues
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active' &&
        !splashHidden
      ) {
        // App came to foreground - good time to try hiding splash again
        logger.log('App came to foreground, attempting to hide splash screen');
        hideSplashScreen();
      }
      
      appStateRef.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, [hideSplashScreen, splashHidden]);

  // Initialize quick actions
  useEffect(() => {
    initializeQuickActions();
    const subscription = QuickActions.addListener(handleQuickAction);
    return () => {
      subscription.remove();
    };
  }, []);

  // Emergency manual reset - totally outside of the store
  const emergencyReset = async () => {
    try {
      await AsyncStorage.removeItem('noteease-data');
      await AsyncStorage.removeItem('noteease-theme');
      await AsyncStorage.removeItem('noteease-categories');
      await AsyncStorage.clear();
      
      Alert.alert(
        "Emergency Reset Complete", 
        "All app data has been cleared. The app will now restart.",
        [{ 
          text: "OK", 
          onPress: async () => {
            try {
              await Updates.reloadAsync();
            } catch (e) {
              if (resetAppData) {
                await resetAppData();
                setInitializationFailed(false);
                setInitAttempts(0);
              }
            }
          }
        }]
      );
      
      if (resetAppData) {
        await resetAppData();
      }
      
      setInitializationFailed(false);
      setInitAttempts(0);
    } catch (error) {
      Alert.alert("Error", "Failed to reset. Please restart the app manually.");
    }
  };

  // Initialize the store on app startup
  useEffect(() => {
    logger.log('App initialization started - loaded:', loaded, 'initialized:', isInitialized);
    
    const initApp = async () => {
      try {
        if (initialize && !isInitialized) {
          logger.log('Running store initialization');
          setInitAttempts(prev => prev + 1);
          await initialize();
          logger.log('Store initialization complete');
        }
        
        // Set app ready flag when everything is initialized
        if (loaded && isInitialized) {
          logger.log('Assets loaded and store initialized, app ready');
          setIsAppReady(true);
          
          // Use platform-specific delays for hiding the splash screen
          const delay = Platform.OS === 'android' ? 300 : 200;
          setTimeout(() => {
            hideSplashScreen();
          }, delay);
        }
      } catch (error) {
        logger.error('Error initializing app:', error);
        setInitializationFailed(true);
        
        // After 2 attempts, give up and show emergency reset option
        if (initAttempts >= 2) {
          logger.warn('Multiple initialization attempts failed, showing emergency UI');
          setIsAppReady(true);
          hideSplashScreen();
        } else {
          // Try again one more time
          setTimeout(initApp, 1000);
        }
      }
    };
    
    if (!isInitialized) {
      initApp();
    } else if (loaded) {
      logger.log('Already initialized with loaded assets, app ready');
      setIsAppReady(true);
      hideSplashScreen();
    }
  }, [initialize, loaded, isInitialized, initAttempts, hideSplashScreen]);

  // Multiple safety nets to ensure splash screen is hidden
  useEffect(() => {
    // Safety net 1: Hide after a timeout
    const SPLASH_TIMEOUT = Platform.OS === 'android' ? 4000 : 3000;
    const timeoutId = setTimeout(() => {
      if (!isAppReady || !splashHidden) {
        logger.warn(`Forcing app ready and hiding splash after ${SPLASH_TIMEOUT}ms timeout`);
        setIsAppReady(true);
        hideSplashScreen();
      }
    }, SPLASH_TIMEOUT);
    
    // Safety net 2: Additional attempt after another delay
    const secondTimeoutId = setTimeout(() => {
      if (!splashHidden) {
        logger.warn('Second forced attempt to hide splash screen');
        hideSplashScreen();
      }
    }, SPLASH_TIMEOUT + 2000);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(secondTimeoutId);
    };
  }, [isAppReady, hideSplashScreen, splashHidden]);

  // Show emergency reset screen if initialization fails
  if (initializationFailed) {
    return (
      <View style={styles.emergencyContainer}>
        <Text style={styles.emergencyTitle}>App Initialization Failed</Text>
        <Text style={styles.emergencyText}>
          The app is unable to load your data due to a storage error.
          You can try resetting the app data to fix this issue.
        </Text>
        <TouchableOpacity 
          style={styles.emergencyButton}
          onPress={() => {
            Alert.alert(
              "Reset App Data",
              "This will delete ALL your notes and settings. This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: emergencyReset }
              ]
            );
          }}
        >
          <Text style={styles.emergencyButtonText}>Reset App Data</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Return a loading placeholder that doesn't interfere with native splash
  if (!loaded || !isInitialized) {
    return (
      <View style={{flex: 1, backgroundColor: '#ffffff'}} />
    );
  }

  // Return the layout with optional splash screen tester
  return (
    <ThemeProvider value={theme}>
      {/* Only show LaunchScreen until the app is ready */}
      {!isAppReady && <LaunchScreen onReady={false} />}

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

      {/* Special transition component to help with splash screen hiding */}
      {isAppReady && !splashHidden && (
        <LaunchScreen onReady={true} />
      )}

      {/* Splash screen testing utility (only in development) */}
      {enableSplashScreenTesting && isAppReady && showSplashTester && (
        <SplashScreenTester onDismiss={() => setShowSplashTester(false)} />
      )}

      {/* Button to show the splash screen tester */}
      {enableSplashScreenTesting && isAppReady && !showSplashTester && (
        <TouchableOpacity 
          style={{
            position: 'absolute', 
            bottom: 20, 
            right: 20, 
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: 10,
            borderRadius: 5,
          }}
          onPress={() => setShowSplashTester(true)}
        >
          <Text style={{ color: 'white' }}>Test Splash</Text>
        </TouchableOpacity>
      )}
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
