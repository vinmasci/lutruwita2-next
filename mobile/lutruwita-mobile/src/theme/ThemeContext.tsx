/**
 * Theme context provider for the Lutruwita Mobile app
 * Manages theme preferences and provides theme switching functionality
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider } from 'react-native-paper';
import { createPaperTheme } from './paper-theme';
import type { AppTheme } from './paper-theme';

// Key for storing theme preference in AsyncStorage
const THEME_PREFERENCE_KEY = 'lutruwita_theme_preference';

// Theme preference options
export type ThemePreference = 'light' | 'dark' | 'system';

// Theme context type
interface ThemeContextType {
  theme: AppTheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

// Create the theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme provider component
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get the system color scheme
  const colorScheme = useColorScheme();
  
  // State for theme preference
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  
  // Determine if dark mode based on preference and system
  const isDark = 
    themePreference === 'system' 
      ? colorScheme === 'dark' 
      : themePreference === 'dark';
  
  // Create the theme
  const theme = createPaperTheme(isDark);
  
  // Load saved preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedPreference) {
          setThemePreference(savedPreference as ThemePreference);
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Save preference when it changes
  const updateThemePreference = async (newPreference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, newPreference);
      setThemePreference(newPreference);
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  };
  
  // Toggle between light and dark
  const toggleTheme = () => {
    const newPreference = isDark ? 'light' : 'dark';
    updateThemePreference(newPreference);
  };
  
  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        themePreference, 
        setThemePreference: updateThemePreference, 
        isDark,
        toggleTheme 
      }}
    >
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use the theme context
 * @returns The theme context
 * @throws Error if used outside of ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
