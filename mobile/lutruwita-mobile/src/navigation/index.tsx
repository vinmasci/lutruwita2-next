import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import SavedRoutesScreen from '../screens/SavedRoutesScreen';
import MapScreen from '../screens/MapScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Define navigation types
export type RootStackParamList = {
  Main: undefined;
  Map: { mapId: string };
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
      <Tab.Screen name="Downloads" component={DownloadsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Root stack navigator
const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Map" component={MapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
