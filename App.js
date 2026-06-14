import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

import { AppProvider, useAppContext } from './context/AppContext';
import { COLORS } from './constants/Theme';

import { AuthScreen } from './screens/AuthScreen';
import { RideFeedScreen } from './screens/RideFeedScreen';
import { RideDetailsScreen } from './screens/RideDetailsScreen';
import { PostRideScreen } from './screens/PostRideScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReviewModal } from './screens/ReviewModal';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 6 : (Platform.OS === 'ios' ? 28 : 12);
  const barHeight = 54 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Drive') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Requests') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: COLORS.outlineVariant,
          backgroundColor: COLORS.surface,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: barHeight,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Feed" component={RideFeedScreen} />
      <Tab.Screen name="Drive" component={PostRideScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function NavigationContent() {
  const { isAuthenticated } = useAppContext();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
          <Stack.Screen name="ReviewModal" component={ReviewModal} options={{ presentation: 'transparentModal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <NavigationContent />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
