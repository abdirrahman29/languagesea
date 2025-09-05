import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const QuranScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Quran Screen - Public Access</Text>
      <Text style={styles.debugText}>This should work now!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5dc',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  debugText: {
    fontSize: 16,
    color: '#666',
  },
});

export default QuranScreen;