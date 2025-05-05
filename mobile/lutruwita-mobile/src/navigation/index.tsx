import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import SavedRoutesScreen from '../screens/SavedRoutesScreen';
import MapScreen from '../screens/MapScreen';
import OfflineMapsScreen from '../screens/OfflineMapsScreen';
import OfflineRoutesScreen from '../screens/OfflineRoutesScreen';
import OfflineMapScreen from '../screens/OfflineMapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/auth/AuthScreen';

// Define navigation types
export type RootStackParamList = {
  Main: undefined;
  Map: { mapId: string };
  MapScreen: { routeId: string };
  OfflineMap: { mapId: string };
  Auth: undefined;
  ProfileScreen: undefined;
  HomeScreen: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  SavedRoutes: undefined;
  Downloads: undefined;
  Profile: undefined;
};

// Create navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Loading screen
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

// Main tab navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'SavedRoutes') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Downloads') {
            iconName = focused ? 'download' : 'download-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="SavedRoutes" component={SavedRoutesScreen} />
      <Tab.Screen name="Downloads" component={OfflineRoutesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Root stack navigator
const Navigation = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth screens
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // Main app screens
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="MapScreen" component={MapScreen} />
            <Stack.Screen name="OfflineMap" component={OfflineMapScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
