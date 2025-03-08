import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from 'react-native';
import { useStore } from '../store/useStore';

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
  const { isDarkMode, initialize, isInitialized } = useStore();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize the store on app startup
  useEffect(() => {
    const initApp = async () => {
      if (initialize) {
        await initialize();
      }
      
      // Hide splash screen once everything is ready
      if (loaded && isInitialized) {
        await SplashScreen.hideAsync();
      }
    };
    
    initApp();
  }, [initialize, loaded, isInitialized]);

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
      {/* <StatusBar style={isDarkMode ? 'light' : 'dark'} /> */}
    </ThemeProvider>
  );
}
