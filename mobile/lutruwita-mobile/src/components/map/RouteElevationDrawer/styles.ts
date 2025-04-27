import { StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { lightColors, darkColors } from '../../../theme/colors';

// Create a function that returns styles based on the theme
export const createStyles = (isDark: boolean) => {
  const colors = isDark ? darkColors : lightColors;
  
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#ffffff',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 10,
      zIndex: 100,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 8,
      position: 'relative',
      height: 30,
      width: '100%',
      zIndex: 10, // Ensure handle is above other content for better touch response
    },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    handleIcon: {
      marginLeft: 8,
    },
    tabsContainer: {
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 0,
      height: 24, // Increased from 16 to give more room for text
      borderBottomWidth: 0,
      marginBottom: 0,
    },
    tab: {
      paddingHorizontal: 12,
      paddingTop: 0,
      paddingBottom: 0,
      marginRight: 8,
      height: 24, // Increased from 16 to give more room for text
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      zIndex: 5, // Ensure tabs are above other content
    },
    activeTab: {
      borderBottomWidth: 2,
    },
    tabText: {
      color: '#121212',
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 4, // Increased from 1px to 4px space between text and line
    },
    controlButton: {
      position: 'absolute',
      right: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    // Minimized view styles
    minimizedContainer: {
      padding: 8, // Reduced from 12 to 8
      paddingLeft: 16, // Increased left padding to move stats away from the edge
      paddingRight: 16, // Added right padding for balance
      paddingTop: 4, // Reduced top padding
      paddingBottom: 0, // Reduced bottom padding since we have emptySpace
      backgroundColor: 'transparent',
      flexDirection: 'column',
      justifyContent: 'flex-start', // Changed from space-between to flex-start
      alignItems: 'stretch',
      height: '100%', // Ensure it takes full height
    },
    routeNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    stageNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    stageNavigationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    navButton: {
      padding: 8, // Increased from 4 to 8
      borderRadius: 8, // Increased from 4 to 8
      backgroundColor: 'rgba(0, 0, 0, 0.05)', // Added light background
    },
    navButtonDisabled: {
      opacity: 0.5,
    },
    routeNameContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeNameMinimized: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#121212',
      textAlign: 'center',
    },
    routeCounter: {
      fontSize: 12,
      color: '#666666',
      textAlign: 'center',
    },
    stageNameContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#121212',
      marginRight: 4, // Add right margin for spacing between title and counter
    },
    stageCounter: {
      fontSize: 14, // Increased from 12 to 14
      color: '#666666',
      alignSelf: 'center', // Center vertically with the stage name
    },
    statsRowMinimized: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 12, // Added vertical padding
      backgroundColor: 'rgba(0, 0, 0, 0.03)', // Very light background
      borderRadius: 8, // Rounded corners
      marginHorizontal: 4, // Small horizontal margin
    },
    routeName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#121212',
      flex: 1,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      marginBottom: 4,
    },
    statValue: {
      color: '#121212',
      fontSize: 15, // Increased from 14 to 15
      fontWeight: '500', // Added medium weight
      marginLeft: 4,
    },
    // Route stats styles
    statsContainer: {
      padding: 0,
      paddingTop: 3, // Increased from 2px to 3px padding at the top
      paddingBottom: 4,
      paddingLeft: 8, // Added left padding to move stats away from the edge
      backgroundColor: 'transparent',
    },
    // Chart styles
    chartContainer: {
      width: '100%',
      flex: 1, // Make it fill available space
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
      paddingBottom: 8, // Reduced from 16 to 8 to give more space to the chart
      paddingHorizontal: 8,
    },
    noDataText: {
      color: '#121212',
      fontSize: 14,
    },
    surfaceIndicator: {
      width: 20,
      height: 4,
      flexDirection: 'row',
      borderRadius: 2,
      overflow: 'hidden',
    },
    surfacePaved: {
      backgroundColor: '#ff4d4d',
    },
    surfaceUnpaved: {
      backgroundColor: '#ff4d4d', // Red background
      position: 'relative',
      height: 4,
      borderRadius: 2,
    },
    surfaceUnpavedDash: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      height: 4,
      borderWidth: 0,
      borderTopWidth: 3, // Thicker white dashes
      borderColor: 'white',
      borderStyle: 'dashed',
      borderRadius: 2,
      opacity: 1, // Full opacity for better visibility
    },
    // Elevation chart specific styles
    elevationFill: {
      opacity: 0.6,
    },
    elevationChart: {
      marginTop: 4, // Increased from 2px to 4px margin at the top
      marginBottom: 8, // Reduced from 16 to 8 to give more space to the chart
    },
    distanceMarker: {
      fontSize: 12,
      color: '#666666',
      textAlign: 'center',
    },
    elevationMarker: {
      fontSize: 12,
      color: '#666666',
      textAlign: 'right',
    },
    emptySpace: {
      height: 16, // Reduced from 20 to 16
      marginTop: 4, // Added margin top for spacing
    },
  });
};

// Export a hook to get the styles with the current theme
export const useStyles = () => {
  const { isDark } = useTheme();
  return createStyles(isDark);
};

// For backward compatibility, export a default styles object
// This will use the dark theme by default
export const styles = createStyles(true);
