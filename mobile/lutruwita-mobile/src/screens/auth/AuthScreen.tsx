import React from 'react';
import { View, StyleSheet, Image, SafeAreaView } from 'react-native';
import { Button, Text, Surface, ActivityIndicator, useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

const AuthScreen = () => {
  const { login, isLoading } = useAuth();
  const theme = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.authCard} elevation={1}>
        {/* Replace with your app logo */}
        <Image 
          source={require('../../../assets/icon.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Welcome to Cya Trails
        </Text>
        
        <Text style={styles.subtitle}>
          Discover and explore Tasmania's best routes
        </Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <>
            <Button 
              mode="contained" 
              style={styles.loginButton}
              onPress={login}
              disabled={isLoading}
            >
              Sign In / Sign Up
            </Button>
            
            <Button 
              mode="outlined" 
              style={styles.guestButton}
              onPress={() => {/* Handle guest mode */}}
              disabled={isLoading}
            >
              Continue as Guest
            </Button>
          </>
        )}
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  authCard: {
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.7,
  },
  loginButton: {
    width: '100%',
    marginBottom: 16,
    paddingVertical: 8,
  },
  guestButton: {
    width: '100%',
    paddingVertical: 8,
  },
  loader: {
    marginVertical: 24,
  },
});

export default AuthScreen;
