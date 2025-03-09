import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

/**
 * Utility to test splash screen behavior without production builds
 * Use this to simulate different splash screen scenarios
 */
export const testSplashScreenHiding = async (delay = 1000): Promise<boolean> => {
  console.log('[SplashTest] Testing splash screen hiding with delay:', delay);
  
  // Wait for the specified delay
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    // Try to hide the splash screen
    await SplashScreen.hideAsync();
    console.log('[SplashTest] Successfully hid splash screen');
    return true;
  } catch (e) {
    console.error('[SplashTest] Failed to hide splash screen:', e);
    return false;
  }
};

/**
 * Simple component for local splash screen testing
 * Renders a UI to test different splash screen behaviors
 */
export const SplashScreenTester = ({ onDismiss }: { onDismiss: () => void }) => {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const runTest = async (name: string, ms: number) => {
    setTestStatus(`Running test: ${name}`);
    setIsLoading(true);
    
    try {
      const success = await testSplashScreenHiding(ms);
      setTestStatus(`Test ${name}: ${success ? 'SUCCESS' : 'FAILED'}`);
    } catch (e) {
      setTestStatus(`Test ${name}: ERROR - ${e}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Splash Screen Test Utility</Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.statusText}>{testStatus}</Text>
        </View>
      ) : (
        <>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => runTest('Quick', 500)}
            >
              <Text style={styles.buttonText}>Quick Test (500ms)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => runTest('Medium', 2000)}
            >
              <Text style={styles.buttonText}>Medium Test (2s)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => runTest('Slow', 5000)}
            >
              <Text style={styles.buttonText}>Slow Test (5s)</Text>
            </TouchableOpacity>
          </View>
          
          {testStatus && (
            <Text style={styles.statusText}>{testStatus}</Text>
          )}
        </>
      )}
      
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissButtonText}>Dismiss Tester</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonsContainer: {
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statusText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  dismissButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#333',
  },
}); 