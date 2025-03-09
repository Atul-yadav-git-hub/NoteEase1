import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, Platform, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Production flag from configuration
const SIMULATE_PRODUCTION = true;
const isProductionEnv = !__DEV__ || SIMULATE_PRODUCTION;

// Create a universal logger that always logs in development and production
const logger = (tag: string) => ({
  log: (...args: any[]) => {
    if (!isProductionEnv || tag === 'CRITICAL') {
      console.log(`[${tag}]`, ...args);
    }
  },
  warn: (...args: any[]) => {
    // Always log warnings
    console.warn(`[${tag}]`, ...args);
  },
  error: (...args: any[]) => {
    // Always log errors
    console.error(`[${tag}]`, ...args);
  }
});

const log = logger('LaunchScreen');

// Enhanced LaunchScreen component with production optimizations
const LaunchScreen = ({ onReady }: { onReady: boolean }) => {
  const [fadeAnim] = useState(new Animated.Value(1));
  const [hasAttemptedHide, setHasAttemptedHide] = useState(false);

  // Production-optimized fade out animation
  useEffect(() => {
    if (onReady) {
      log.log('LaunchScreen ready to hide, starting fade animation');
      
      // Try to hide the native splash screen immediately in production
      const hideNativeSplash = async () => {
        if (!hasAttemptedHide) {
          setHasAttemptedHide(true);
          try {
            await SplashScreen.hideAsync();
            log.log('Native splash screen hidden from LaunchScreen component');
          } catch (e) {
            log.error('Error hiding native splash from LaunchScreen:', e);
          }
        }
      };
      
      // Production-optimized animation duration (shorter in production)
      const animDuration = isProductionEnv ? 200 : 400;
      
      // Start fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: animDuration,
        useNativeDriver: true,
      }).start(() => {
        log.log('Fade out animation completed');
        // After animation completes, try hiding the native splash again
        hideNativeSplash();
      });
      
      // Also try hiding immediately
      hideNativeSplash();
    }
  }, [onReady, fadeAnim, hasAttemptedHide]);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim }
      ]}
      // Ensure this is always at the top of the view hierarchy
      pointerEvents="none"
    >
      <Image
        source={require('../assets/images/resized/splash-icon-2048.png')}
        style={styles.image}
        resizeMode="contain"
        // Force image to load immediately
        fadeDuration={0}
        // Production-optimized event handlers
        onLoadStart={() => !isProductionEnv && log.log('Splash image load started')}
        onLoad={() => !isProductionEnv && log.log('Splash image loaded')}
        onError={(e) => log.error('Error loading splash image:', e.nativeEvent.error)}
      />
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    // Use the maximum possible values to ensure visibility
    zIndex: 9999,
    elevation: Platform.OS === 'android' ? 9999 : undefined,
  },
  image: {
    width: width * 0.5,
    height: width * 0.5,
  },
});

export default LaunchScreen; 