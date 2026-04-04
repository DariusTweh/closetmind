import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // ✅ add this
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import {  colors ,spacing, radii } from './lib/theme';
console.log('loaded theme colors?', !!colors, colors && Object.keys(colors));
if (!colors) throw new Error('Theme colors is undefined in App.js');


import ClosetScreen from './screens/ClosetScreen';
import AddItemScreen from './screens/AddItemScreen';
import OutfitGeneratorScreen from './screens/OutfitGeneratorScreen';
import ProfileScreen from './screens/ProfileScreen';
import SavedOutfitsScreen from './screens/SavedOutfitsScreen';
import OutfitDetailScreen from './screens/OutfitDetailScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import StyleItemScreen from './screens/StyleItemScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import HomeScreen from './screens/HomeScreen';
import TryOnScreen from './screens/TryOnScreen';

import StylePreferencesScreen from './screens/StylePreferencesScreen';
import StyleVibeScreen from './screens/Onboarding/StyleVibeScreen';
import UseIntentScreen from './screens/Onboarding/UseIntentScreen';
import BirthdayInputScreen from './screens/Onboarding/BirthdayInputScreen';
import ToneSelectScreen from './screens/Onboarding/ToneSelectScreen';
import OnboardingStyleUploadScreen from './screens/Onboarding/OnboardingStyleUploadScreen';
import OnboardingGenerateModelScreen from './screens/Onboarding/OnboardingGenerateModelScreen';
ImportBrowserScreen
import ImportBrowserScreen from './screens/ImportBrowserScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MoreScreen() {
  return <View style={styles.center}><Text>More Screen</Text></View>;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          height: 75,
          borderTopWidth: 0,
          backgroundColor: colors.background,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 6,
        },
        tabBarIcon: ({ color, focused }) => {
          const iconColor = focused ? '#111' : '#555';

          if (route.name === 'Closet') return <Ionicons name="person-outline" size={20} color={iconColor} />;
          if (route.name === 'Profile') return <Ionicons name="person-circle-outline" size={20} color={iconColor} />;
          if (route.name === 'Generator') return <MaterialCommunityIcons name="magic-staff" size={20} color={iconColor} />;
          if (route.name === 'Saved') return <Ionicons name="heart-outline" size={20} color={iconColor} />;
          return null;
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: '#888',
      })}
    >
      <Tab.Screen name="Closet" component={ClosetScreen} />
      <Tab.Screen name="home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
       <Tab.Screen name="Browser" component={ImportBrowserScreen} />
      <Tab.Screen
        name="Add"
        component={AddItemScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={styles.addButton}>
              <Ionicons name="add" size={28} color="#00695c" />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Generator" component={OutfitGeneratorScreen} />
      <Tab.Screen name="Saved" component={SavedOutfitsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}> {/* ✅ wrap the whole app here */}
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="StyleVibe" component={StyleVibeScreen} />
<Stack.Screen name="UseIntent" component={UseIntentScreen} />
<Stack.Screen name="BirthdayInput" component={BirthdayInputScreen} />
<Stack.Screen name="ToneSelect" component={ToneSelectScreen} />
          <Stack.Screen name="MainTabs" component={Tabs} />
          <Stack.Screen name="SavedOutfits" component={SavedOutfitsScreen} />
          <Stack.Screen name="StyleItemScreen" component={StyleItemScreen} />
          <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="StylePreferences" component={StylePreferencesScreen} />
          <Stack.Screen name="home" component={HomeScreen} />
          <Stack.Screen name="TryOn" component={TryOnScreen} />
          <Stack.Screen name="ImportBrowser" component={ImportBrowserScreen} />
          

         
<Stack.Screen name="OnboardingStyle" component={OnboardingStyleUploadScreen} />
<Stack.Screen name="OnboardingModal" component={OnboardingGenerateModelScreen} />

        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    top: -20,
    backgroundColor: colors.backgroundAlt,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
});