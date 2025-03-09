import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { useColorScheme, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import * as QuickActions from 'expo-quick-actions';
import { initializeQuickActions, handleQuickAction } from '../utils/quickActions';

// Only log in development mode
const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (__DEV__) console.error(...args);
  }
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isDarkMode, initialize, isInitialized, resetAppData } = useStore();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);

  // Initialize quick actions
  useEffect(() => {
    initializeQuickActions();

    // Set up quick action listener
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
    const initApp = async () => {
      try {
        if (initialize && !isInitialized) {
          setInitAttempts(prev => prev + 1);
          await initialize();
        }
        
        // Hide splash screen once everything is ready
        if (loaded && isInitialized) {
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitializationFailed(true);
        
        // After 2 attempts, give up and show emergency reset option
        if (initAttempts >= 2) {
          await SplashScreen.hideAsync();
        } else {
          // Try again one more time
          setTimeout(initApp, 1000);
        }
      }
    };
    
    if (!isInitialized) {
      initApp();
    } else if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [initialize, loaded, isInitialized, initAttempts]);

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

  if (!loaded || !isInitialized) {
    return null;
  }

  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
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
