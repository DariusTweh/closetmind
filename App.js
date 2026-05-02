import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from './lib/theme';
import ClosetScreen from './screens/ClosetScreen';
import AddItemScreen from './screens/AddItemScreen';
import OutfitGeneratorScreen from './screens/OutfitGeneratorScreen';
import ProfileScreen from './screens/ProfileScreen';
import PublicProfileScreen from './screens/PublicProfileScreen';
import ActivityScreen from './screens/ActivityScreen';
import FitPostDetailScreen from './screens/FitPostDetailScreen';
import SavedOutfitsScreen from './screens/SavedOutfitsScreen';
import FitCheckScreen from './screens/FitCheckScreen';
import TravelCollectionDetailScreen from './screens/TravelCollectionDetailScreen';
import OutfitDetailScreen from './screens/OutfitDetailScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import StyleItemScreen from './screens/StyleItemScreen';
import EditItemScreen from './screens/EditItemScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import BlockedUsersScreen from './screens/BlockedUsersScreen';
import ManageFollowersScreen from './screens/ManageFollowersScreen';
import TryOnScreen from './screens/TryOnScreen';
import StyleCanvasScreen from './screens/StyleCanvasScreen';
import FeaturedFitsScreen from './screens/FeaturedFitsScreen';
import StatsScreen from './screens/StatsScreen';

import StylePreferencesScreen from './screens/StylePreferencesScreen';
import StyleVibeScreen from './screens/Onboarding/StyleVibeScreen';
import UseIntentScreen from './screens/Onboarding/UseIntentScreen';
import ToneSelectScreen from './screens/Onboarding/ToneSelectScreen';
import OnboardingStyleUploadScreen from './screens/Onboarding/OnboardingStyleUploadScreen';
import OnboardingGenerateModelScreen from './screens/Onboarding/OnboardingGenerateModelScreen';
import OnboardingProfileBasicsScreen from './screens/Onboarding/OnboardingProfileBasicsScreen';
import OnboardingPreferenceSignalsScreen from './screens/Onboarding/OnboardingPreferenceSignalsScreen';
import OnboardingFavoriteStoresScreen from './screens/Onboarding/OnboardingFavoriteStoresScreen';
import ImportBrowserScreen from './screens/ImportBrowserScreen';
import ItemVerdictScreen from './screens/ItemVerdictScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import PostFitCheckScreen from './screens/PostFitCheckScreen';
import { RevenueCatProvider } from './providers/RevenueCatProvider';
import { resolveAppEntry } from './lib/onboarding';
import {
  configureFitCheckNotificationHandling,
  handleFitCheckNotificationNavigation,
  syncFitCheckPushRegistration,
} from './lib/fitCheckNotifications';
import { syncScannedCandidateCleanup } from './lib/scannedCandidateCleanup';
import { supabase } from './lib/supabase';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();
SplashScreen.preventAutoHideAsync().catch(() => {});
const TAB_LABELS = {
  Closet: 'Closet',
  FitCheck: 'Fit Check',
  Browser: 'Browser',
  Add: 'Add',
  Generate: 'Generate',
};

function AddTabPlaceholder() {
  return null;
}

function BrowserTabPlaceholder() {
  return null;
}

function renderTabIcon(routeName, focused) {
  const iconColor =
    routeName === 'Add'
      ? colors.textOnAccent
      : focused
        ? colors.textOnAccent
        : colors.textMuted;
  const iconName =
    routeName === 'Closet'
      ? 'grid-outline'
      : routeName === 'FitCheck'
        ? 'people-outline'
        : routeName === 'Browser'
          ? 'compass-outline'
      : routeName === 'Add'
          ? 'add'
        : routeName === 'Generate'
          ? 'sparkles-outline'
          : 'ellipse-outline';

  return (
    <View
      style={[
        styles.tabIconWrap,
        routeName === 'Add' && styles.addIconWrap,
        focused && routeName !== 'Add' && styles.tabIconWrapActive,
        focused && routeName === 'Add' && styles.addIconWrapActive,
      ]}
    >
      <Ionicons
        name={iconName}
        size={routeName === 'Add' ? 20 : routeName === 'Generate' ? 19 : 18}
        color={iconColor}
      />
    </View>
  );
}

function Tabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Closet"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 44 + insets.bottom,
          paddingTop: 1,
          paddingBottom: Math.max(insets.bottom - 18, 2),
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          backgroundColor: 'rgba(250, 250, 255, 0.96)',
          elevation: 0,
          shadowColor: '#1c1c1c',
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -6 },
          shadowRadius: 20,
        },
        tabBarItemStyle: {
          paddingTop: 0,
          paddingBottom: 2,
          justifyContent: 'flex-end',
        },
        tabBarIcon: ({ focused }) => renderTabIcon(route.name, focused),
        tabBarLabel: ({ focused }) => (
          <Text
            style={[
              styles.tabLabel,
              focused ? styles.tabLabelActive : styles.tabLabelInactive,
              route.name === 'Add' && styles.addTabLabel,
            ]}
          >
            {TAB_LABELS[route.name]}
          </Text>
        ),
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
      })}
    >
      <Tab.Screen name="Closet" component={ClosetScreen} />
      <Tab.Screen name="FitCheck" component={FitCheckScreen} />
      <Tab.Screen
        name="Add"
        component={AddTabPlaceholder}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent()?.navigate('AddItem');
          },
        })}
      />
      <Tab.Screen
        name="Browser"
        component={BrowserTabPlaceholder}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent()?.navigate('ImportBrowser');
          },
        })}
      />
      <Tab.Screen name="Generate" component={OutfitGeneratorScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const pendingRouteRef = useRef(null);
  const pendingNotificationResponseRef = useRef(null);
  const syncingRef = useRef(false);
  const lastHandledNotificationIdRef = useRef(null);
  const [appReady, setAppReady] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState('Login');

  const applyResolvedRoute = useCallback((routeName) => {
    if (!routeName) return;

    if (!navigationRef.isReady()) {
      pendingRouteRef.current = routeName;
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (currentRoute === routeName) {
      pendingRouteRef.current = null;
      return;
    }

    pendingRouteRef.current = null;
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: routeName }],
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const entry = await resolveAppEntry();
        if (!mounted) return;

        setInitialRouteName(String(entry?.routeName || 'Login'));

        if (entry?.userId) {
          void syncFitCheckPushRegistration();
          void syncScannedCandidateCleanup().catch((error) => {
            console.warn('Scanned candidate cleanup failed:', error?.message || error);
          });
        }
      } catch (error) {
        console.error('App entry resolution failed:', error);
        if (mounted) {
          setInitialRouteName('Login');
        }
      } finally {
        if (mounted) {
          setAppReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const syncAppEntry = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const entry = await resolveAppEntry();
      applyResolvedRoute(entry.routeName);
    } catch (error) {
      console.error('App entry resolution failed:', error);
      applyResolvedRoute('Login');
    } finally {
      syncingRef.current = false;
    }
  }, [applyResolvedRoute]);

  useEffect(() => {
    configureFitCheckNotificationHandling();

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const responseId = response?.notification?.request?.identifier || null;
      if (responseId && lastHandledNotificationIdRef.current === responseId) {
        return;
      }
      lastHandledNotificationIdRef.current = responseId;
      if (!navigationRef.isReady()) {
        pendingNotificationResponseRef.current = response;
        return;
      }
      void handleFitCheckNotificationNavigation(navigationRef, response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const responseId = response?.notification?.request?.identifier || null;
      if (!responseId || lastHandledNotificationIdRef.current === responseId) {
        return;
      }
      lastHandledNotificationIdRef.current = responseId;
      if (!navigationRef.isReady()) {
        pendingNotificationResponseRef.current = response;
        return;
      }
      void handleFitCheckNotificationNavigation(navigationRef, response);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        applyResolvedRoute('Login');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void syncFitCheckPushRegistration();
        void syncScannedCandidateCleanup().catch((error) => {
          console.warn('Scanned candidate cleanup failed:', error?.message || error);
        });
        void syncAppEntry();
      }
    });

    return () => {
      responseSubscription.remove();
      sub?.subscription?.unsubscribe();
    };
  }, [applyResolvedRoute, syncAppEntry]);

  if (!appReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RevenueCatProvider>
          <NavigationContainer
            ref={navigationRef}
            onReady={async () => {
              if (pendingRouteRef.current) {
                applyResolvedRoute(pendingRouteRef.current);
              }
              if (pendingNotificationResponseRef.current) {
                const response = pendingNotificationResponseRef.current;
                pendingNotificationResponseRef.current = null;
                void handleFitCheckNotificationNavigation(navigationRef, response);
              }
              await SplashScreen.hideAsync().catch(() => {});
            }}
          >
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="OnboardingProfileBasics" component={OnboardingProfileBasicsScreen} />
              <Stack.Screen name="StyleVibe" component={StyleVibeScreen} />
              <Stack.Screen name="UseIntent" component={UseIntentScreen} />
              <Stack.Screen name="ToneSelect" component={ToneSelectScreen} />
              <Stack.Screen name="OnboardingPreferenceSignals" component={OnboardingPreferenceSignalsScreen} />
              <Stack.Screen name="OnboardingFavoriteStores" component={OnboardingFavoriteStoresScreen} />
              <Stack.Screen name="MainTabs" component={Tabs} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
              <Stack.Screen name="Activity" component={ActivityScreen} />
              <Stack.Screen name="FitPostDetail" component={FitPostDetailScreen} />
              <Stack.Screen
                name="AddItem"
                component={AddItemScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen name="SavedOutfits" component={SavedOutfitsScreen} />
              <Stack.Screen
                name="PostFitCheck"
                component={PostFitCheckScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen name="TravelCollectionDetail" component={TravelCollectionDetailScreen} />
              <Stack.Screen name="StyleItemScreen" component={StyleItemScreen} />
              <Stack.Screen name="EditItem" component={EditItemScreen} />
              <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
              <Stack.Screen name="ManageFollowers" component={ManageFollowersScreen} />
              <Stack.Screen
                name="Subscription"
                component={SubscriptionScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen name="StylePreferences" component={StylePreferencesScreen} />
              <Stack.Screen name="TryOn" component={TryOnScreen} />
              <Stack.Screen name="FeaturedFits" component={FeaturedFitsScreen} />
              <Stack.Screen name="Stats" component={StatsScreen} />
              <Stack.Screen
                name="StyleCanvas"
                component={StyleCanvasScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="ImportBrowser"
                component={ImportBrowserScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen name="ItemVerdict" component={ItemVerdictScreen} />
              <Stack.Screen name="OnboardingStyle" component={OnboardingStyleUploadScreen} />
              <Stack.Screen name="OnboardingModal" component={OnboardingGenerateModelScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </RevenueCatProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    shadowColor: '#1c1c1c',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 20,
    elevation: 1,
  },
  addIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginTop: -6,
    backgroundColor: colors.accentSecondary,
    shadowColor: '#1c1c1c',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 2,
  },
  addIconWrapActive: {
    backgroundColor: colors.accent,
  },
  tabLabel: {
    fontSize: 9.5,
    marginTop: 1,
    textAlign: 'center',
  },
  addTabLabel: {
    marginTop: 0,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: colors.textMuted,
    fontWeight: '500',
  },
});
