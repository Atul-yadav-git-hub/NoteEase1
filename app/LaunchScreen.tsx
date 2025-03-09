import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

// Simplified LaunchScreen component that just shows the splash image
const LaunchScreen = ({ onReady }: { onReady: boolean }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/resized/splash-icon-2048.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  image: {
    width: width * 0.5,
    height: width * 0.5,
  },
});

export default LaunchScreen; 