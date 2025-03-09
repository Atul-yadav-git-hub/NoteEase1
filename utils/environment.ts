import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Check if the app is running in Expo Go
 */
export const isExpoGo = () => {
  if (Platform.OS === 'web') return false;
  
  const { executionEnvironment } = Constants;
  
  return (
    executionEnvironment === 'storeClient' ||
    executionEnvironment === 'standalone' ||
    !Constants.appOwnership ||
    Constants.appOwnership === 'expo'
  );
};

/**
 * Check if the app is running as a standalone app (production build)
 */
export const isStandaloneApp = () => {
  if (Platform.OS === 'web') return false;
  
  return (
    (Constants.appOwnership as string | null) === 'standalone' ||
    Constants.executionEnvironment === 'standalone'
  );
}; 