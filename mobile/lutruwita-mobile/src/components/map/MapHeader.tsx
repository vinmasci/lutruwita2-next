import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text, Platform, StatusBar, StatusBarStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MapHeaderProps {
  title: string;
  color?: string;
  logoUrl?: string | null;
  username?: string;
  onBack: () => void;
}

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Helper function to calculate relative luminance
const getLuminance = (hexColor: string): number => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 0; // Default to dark if conversion fails (treat as black)

  const { r, g, b } = rgb;
  // Formula from WCAG 2.0: https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const a = [r, g, b].map((v) => {
    v /= 255; // Normalize to 0-1
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};


/**
 * MapHeader component for the mobile app
 * Displays the map name, logo, and attribution
 * Also includes a back button
 */
const MapHeader: React.FC<MapHeaderProps> = ({
  title,
  color = '#ff4d4d',
  logoUrl,
  username,
  onBack
}) => {
  // Get safe area insets to handle notches and status bars
  const insets = useSafeAreaInsets();
  
  // Calculate the top padding based on the platform and insets
  const topPadding = Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0;

  // Determine status bar style based on background color luminance
  const headerColor = color || '#ff4d4d'; // Use default if color is not provided
  const luminance = getLuminance(headerColor);
  // Use light text/icons on dark backgrounds (luminance < 0.5)
  // Use dark text/icons on light backgrounds (luminance >= 0.5)
  const statusBarStyle: StatusBarStyle = luminance >= 0.5 ? 'dark-content' : 'light-content';

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: color || '#ff4d4d',
        paddingTop: topPadding, // Use exact safe area inset
      }
    ]}>
      {/* Set Status Bar style based on header color */}
      <StatusBar 
        barStyle={statusBarStyle} 
        backgroundColor={headerColor} // Match status bar background to header on Android
        translucent={Platform.OS === 'ios'} // Keep iOS status bar translucent
      />
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to the previous screen"
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Logo and Title Container */}
        <View style={styles.centerContent}>
          {/* Logo (if available) */}
          {logoUrl && (
            <Image 
              source={{ uri: logoUrl }} 
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel={`${title} logo`}
            />
          )}
          
          {/* Title and Attribution */}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title || 'Untitled Map'}
            </Text>
            
            {username && (
              <Text style={styles.attribution} numberOfLines={1}>
                by {username}
              </Text>
            )}
          </View>
        </View>
        
        {/* Empty View for spacing */}
        <View style={styles.spacer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12, // Consistent padding all around
  },
  backButton: {
    width: 40, // Reduced from 44px to 40px
    height: 40, // Reduced from 44px to 40px
    borderRadius: 20, // Adjusted to match new size
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Slightly darker for better visibility
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12, // Increased from 8 to 12 for more space
    maxWidth: '70%', // Limit width to prevent overlap with back button
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
    borderRadius: 4, // Slight rounding of logo corners
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16, // Reduced from 18px to 16px
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  attribution: {
    color: '#fff',
    fontSize: 12, // Reduced from 14px to 12px
    opacity: 0.9,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  spacer: {
    width: 40, // Updated to match new back button width
  },
});

export default MapHeader;
