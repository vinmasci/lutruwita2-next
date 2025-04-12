/**
 * React Native Paper theme configuration for the Lutruwita Mobile app
 */

import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { darkColors, lightColors } from './colors';
import { typography } from './typography';

/**
 * Creates a React Native Paper theme based on the app's color scheme
 * @param isDark Whether to use dark mode
 * @returns A configured React Native Paper theme
 */
export const createPaperTheme = (isDark: boolean) => {
  const colors = isDark ? darkColors : lightColors;
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      onPrimary: '#ffffff',
      primaryContainer: isDark ? '#3a1314' : '#ffcdd2',
      onPrimaryContainer: isDark ? '#ffcdd2' : '#3a1314',
      secondary: colors.info,
      onSecondary: '#ffffff',
      secondaryContainer: isDark ? '#001e3c' : '#cce4ff',
      onSecondaryContainer: isDark ? '#cce4ff' : '#001e3c',
      tertiary: colors.success,
      onTertiary: '#ffffff',
      tertiaryContainer: isDark ? '#0a2918' : '#c8e6d3',
      onTertiaryContainer: isDark ? '#c8e6d3' : '#0a2918',
      error: colors.error,
      onError: '#ffffff',
      errorContainer: isDark ? '#3a1314' : '#ffcdd2',
      onErrorContainer: isDark ? '#ffcdd2' : '#3a1314',
      background: colors.background,
      onBackground: colors.text,
      surface: colors.surface,
      onSurface: colors.text,
      surfaceVariant: isDark ? colors.elevation.level2 : colors.elevation.level2,
      onSurfaceVariant: colors.text,
      outline: colors.border,
      outlineVariant: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      shadow: isDark ? '#000000' : 'rgba(0, 0, 0, 0.15)',
      scrim: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)',
      inverseSurface: isDark ? lightColors.surface : darkColors.surface,
      inverseOnSurface: isDark ? lightColors.text : darkColors.text,
      inversePrimary: isDark ? '#ff8a8b' : '#c41c1d',
      elevation: {
        level0: colors.elevation.level1,
        level1: colors.elevation.level1,
        level2: colors.elevation.level2,
        level3: colors.elevation.level3,
        level4: colors.elevation.level4,
        level5: colors.elevation.level5,
      },
      surfaceDisabled: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      onSurfaceDisabled: isDark ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)',
      backdrop: colors.backdrop,
    },
    // Apply our typography to the theme
    fonts: {
      displayLarge: typography.h1,
      displayMedium: typography.h2,
      displaySmall: typography.h3,
      headlineLarge: typography.h1,
      headlineMedium: typography.h2,
      headlineSmall: typography.h3,
      titleLarge: typography.subtitle1,
      titleMedium: typography.subtitle2,
      titleSmall: typography.subtitle2,
      bodyLarge: typography.body1,
      bodyMedium: typography.body1,
      bodySmall: typography.body2,
      labelLarge: typography.button,
      labelMedium: typography.caption,
      labelSmall: typography.overline,
    },
    // Customize roundness
    roundness: 8,
    // Animation settings
    animation: {
      scale: 1.0,
    },
  };
};

export type AppTheme = ReturnType<typeof createPaperTheme>;
