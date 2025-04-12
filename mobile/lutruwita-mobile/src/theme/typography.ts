/**
 * Typography definitions for the Lutruwita Mobile app
 */

import { Platform } from 'react-native';

// Define font families
const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    light: 'System',
    thin: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    light: 'Roboto-Light',
    thin: 'Roboto-Thin',
  },
  default: {
    regular: 'sans-serif',
    medium: 'sans-serif-medium',
    light: 'sans-serif-light',
    thin: 'sans-serif-thin',
  },
});

// Define font weights
export const fontWeights = {
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  bold: '700' as const,
  black: '900' as const,
};

// Define font sizes
export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Define line heights
export const lineHeights = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 36,
  xxxl: 40,
};

// Define typography variants
export const typography = {
  h1: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xxxl,
    lineHeight: lineHeights.xxxl,
    fontWeight: fontWeights.bold as '700',
    letterSpacing: 0.25,
  },
  h2: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    fontWeight: fontWeights.bold as '700',
    letterSpacing: 0.15,
  },
  h3: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.medium as '500',
    letterSpacing: 0.15,
  },
  subtitle1: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.medium as '500',
    letterSpacing: 0.15,
  },
  subtitle2: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium as '500',
    letterSpacing: 0.1,
  },
  body1: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular as '400',
    letterSpacing: 0.5,
  },
  body2: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular as '400',
    letterSpacing: 0.25,
  },
  button: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium as '500',
    letterSpacing: 1.25,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular as '400',
    letterSpacing: 0.4,
  },
  overline: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium as '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
};

export type Typography = typeof typography;
