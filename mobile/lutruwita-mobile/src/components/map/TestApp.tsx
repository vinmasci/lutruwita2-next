import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import MinimalMapboxTest from './MinimalMapboxTest';

const TestApp = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <MinimalMapboxTest />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TestApp;
