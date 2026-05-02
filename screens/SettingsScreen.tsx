import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import { apiPost } from '../lib/api';
import {
  DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES,
  describePushRegistrationFailure,
  loadFitCheckNotificationPreferences,
  syncFitCheckPushRegistration,
  updateFitCheckNotificationPreferences,
} from '../lib/fitCheckNotifications';
import {
  loadCurrentProfilePrivacySettings,
  updateCurrentProfilePrivacySettings,
} from '../lib/profilePrivacy';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import SettingsInfoFooter from '../components/Settings/SettingsInfoFooter';
import SettingsRow from '../components/Settings/SettingsRow';
import SettingsSection from '../components/Settings/SettingsSection';
import SettingsToggleRow from '../components/Settings/SettingsToggleRow';
import { getBlockedFitCheckUserCount } from '../lib/fitCheckSafetyService';
import { getFollowerCount } from '../services/followService';
import { useRevenueCat } from '../providers/RevenueCatProvider';

function fallbackComingSoon(label: string, detail?: string) {
  Alert.alert(label, detail || 'This setting will be wired in a later pass.');
}

let SETTINGS_SCREEN_CACHE: {
  user: any | null;
  profileUsername: string;
} | null = null;

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    currentPlanLabel,
    restorePurchases,
    presentCustomerCenter,
    entitlementId,
    isPro,
  } = useRevenueCat();

  const [darkMode, setDarkMode] = React.useState(false);
  const [notificationPrefs, setNotificationPrefs] = React.useState(DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES);
  const [notificationSaving, setNotificationSaving] = React.useState(false);
  const [privacySaving, setPrivacySaving] = React.useState(false);
  const [privateProfileEnabled, setPrivateProfileEnabled] = React.useState(false);
  const [publicClosetEnabled, setPublicClosetEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(!SETTINGS_SCREEN_CACHE);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [user, setUser] = React.useState<any>(SETTINGS_SCREEN_CACHE?.user ?? null);
  const [profileUsername, setProfileUsername] = React.useState(SETTINGS_SCREEN_CACHE?.profileUsername ?? '');
  const [blockedUsersCount, setBlockedUsersCount] = React.useState(0);
  const [followersCount, setFollowersCount] = React.useState(0);
  const pushNotificationsEnabled = React.useMemo(
    () =>
      notificationPrefs.daily_fit_check_reminder ||
      notificationPrefs.reactions ||
      notificationPrefs.style_notes ||
      notificationPrefs.follows ||
      notificationPrefs.saves_recreates,
    [notificationPrefs],
  );

  const refreshNotificationPrefs = React.useCallback(async () => {
    try {
      const nextPrefs = await loadFitCheckNotificationPreferences();
      setNotificationPrefs(nextPrefs);
    } catch (error) {
      console.warn('Notification preferences load failed:', error);
      setNotificationPrefs(DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES);
    }
  }, []);

  const applyNotificationPrefs = React.useCallback(
    async (patch: Partial<typeof DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES>) => {
      setNotificationSaving(true);
      try {
        const nextPrefs = await updateFitCheckNotificationPreferences(patch);
        setNotificationPrefs(nextPrefs);
      } catch (error: any) {
        Alert.alert('Could not update notifications', String(error?.message || 'Try again in a moment.'));
      } finally {
        setNotificationSaving(false);
      }
    },
    [],
  );

  const handleTogglePrivateProfile = React.useCallback(
    async (nextValue: boolean) => {
      const previousValue = privateProfileEnabled;
      setPrivateProfileEnabled(nextValue);
      setPrivacySaving(true);
      try {
        const updated = await updateCurrentProfilePrivacySettings({
          profileVisibility: nextValue ? 'private' : 'public',
        });
        setPrivateProfileEnabled(updated.profileVisibility === 'private');
      } catch (error: any) {
        setPrivateProfileEnabled(previousValue);
        Alert.alert('Could not update profile privacy', String(error?.message || 'Try again in a moment.'));
      } finally {
        setPrivacySaving(false);
      }
    },
    [privateProfileEnabled],
  );

  const handleTogglePublicCloset = React.useCallback(
    async (nextValue: boolean) => {
      const previousValue = publicClosetEnabled;
      setPublicClosetEnabled(nextValue);
      setPrivacySaving(true);
      try {
        const updated = await updateCurrentProfilePrivacySettings({
          publicClosetEnabled: nextValue,
        });
        setPublicClosetEnabled(Boolean(updated.publicClosetEnabled));
      } catch (error: any) {
        setPublicClosetEnabled(previousValue);
        Alert.alert('Could not update public closet', String(error?.message || 'Try again in a moment.'));
      } finally {
        setPrivacySaving(false);
      }
    },
    [publicClosetEnabled],
  );

  React.useEffect(() => {
    let mounted = true;

    const loadProfileHandle = async (uid: string) => {
      const response = await supabase
        .from('profiles')
        .select('username')
        .eq('id', uid)
        .maybeSingle();

      if (!mounted || response.error) return;
      setProfileUsername(String(response.data?.username || '').trim());
    };

    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data?.user) {
        SETTINGS_SCREEN_CACHE = null;
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
        return;
      }
      setUser(data.user);
      const [_, blockedCount, followerCount, nextNotificationPrefs, nextPrivacySettings] = await Promise.all([
        loadProfileHandle(data.user.id),
        getBlockedFitCheckUserCount(),
        getFollowerCount(),
        loadFitCheckNotificationPreferences().catch(() => DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES),
        loadCurrentProfilePrivacySettings().catch(() => ({
          profileVisibility: 'public' as const,
          publicClosetEnabled: false,
        })),
      ]);
      if (mounted) {
        setBlockedUsersCount(blockedCount);
        setFollowersCount(followerCount);
        setNotificationPrefs(nextNotificationPrefs);
        setPrivateProfileEnabled(nextPrivacySettings.profileVisibility === 'private');
        setPublicClosetEnabled(Boolean(nextPrivacySettings.publicClosetEnabled));
      }
      if (mounted) setLoading(false);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        SETTINGS_SCREEN_CACHE = null;
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
      } else {
        setUser(session.user);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [navigation]);

  React.useEffect(() => {
    if (loading && !user && !profileUsername) return;
    SETTINGS_SCREEN_CACHE = {
      user: user ?? null,
      profileUsername: String(profileUsername || '').trim(),
    };
  }, [loading, profileUsername, user]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const refreshCounts = async () => {
        const [blockedCount, followerCount, nextNotificationPrefs, nextPrivacySettings] = await Promise.all([
          getBlockedFitCheckUserCount(),
          getFollowerCount(),
          loadFitCheckNotificationPreferences().catch(() => DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES),
          loadCurrentProfilePrivacySettings().catch(() => ({
            profileVisibility: 'public' as const,
            publicClosetEnabled: false,
          })),
        ]);
        if (!active) return;
        setBlockedUsersCount(blockedCount);
        setFollowersCount(followerCount);
        setNotificationPrefs(nextNotificationPrefs);
        setPrivateProfileEnabled(nextPrivacySettings.profileVisibility === 'private');
        setPublicClosetEnabled(Boolean(nextPrivacySettings.publicClosetEnabled));
      };

      if (user?.id) {
        void refreshCounts();
      }

      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLoggingOut(false);
      console.error('Logout error:', error.message);
      Alert.alert('Error', 'Unable to log out.');
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const response = await apiPost('/account/delete', {
              reason: 'user_requested',
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(payload?.error || 'Could not delete account.');
            }
            await supabase.auth.signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
          } catch (e: any) {
            const message = String(e?.message || 'Could not delete account.');
            console.error('Delete account failed:', message);
            Alert.alert('Error', message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleOpenSubscriptionHub = React.useCallback(() => {
    navigation.navigate('Subscription' as never);
  }, [navigation]);

  const handleManageSubscription = React.useCallback(async () => {
    try {
      await presentCustomerCenter();
    } catch (error: any) {
      Alert.alert(
        'Customer Center unavailable',
        error?.message || 'We could not open Customer Center right now.'
      );
    }
  }, [presentCustomerCenter]);

  const handleRestorePurchases = React.useCallback(async () => {
    try {
      const info = await restorePurchases();
      const unlocked = Boolean(info?.entitlements.active?.[entitlementId]?.isActive);
      Alert.alert(
        unlocked ? 'Purchases restored' : 'Nothing to restore',
        unlocked
          ? `Your ${entitlementId} entitlement is active on this account.`
          : `No active ${entitlementId} entitlement was restored.`
      );
    } catch (error: any) {
      Alert.alert('Restore failed', error?.message || 'Please try again.');
    }
  }, [entitlementId, restorePurchases]);

  const handleChangePassword = async () => {
    if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
      Alert.prompt('Change Password', 'Enter a new password', async (pwd) => {
        if (!pwd) return;
        const { error } = await supabase.auth.updateUser({ password: pwd });
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Success', 'Password updated.');
        }
      });
      return;
    }

    fallbackComingSoon(
      'Change Password',
      'A dedicated password management flow will be added for non-iOS devices.'
    );
  };

  const handleTogglePushNotifications = React.useCallback(
    async (nextValue: boolean) => {
      if (!nextValue) {
        await applyNotificationPrefs({
          daily_fit_check_reminder: false,
          reactions: false,
          style_notes: false,
          follows: false,
          saves_recreates: false,
        });
        return;
      }

      const registration = await syncFitCheckPushRegistration({ requestPermission: true });
      if (!registration.enabled) {
        const failure = describePushRegistrationFailure(registration);
        Alert.alert(
          failure?.title || 'Push setup failed',
          failure?.message || 'Push notifications could not be enabled right now.',
        );
        return;
      }

      await refreshNotificationPrefs();
      await applyNotificationPrefs({
        reactions: true,
        style_notes: true,
        follows: true,
        saves_recreates: true,
      });
    },
    [applyNotificationPrefs, refreshNotificationPrefs],
  );

  const handleNotificationPreferenceToggle = React.useCallback(
    async (key: keyof typeof DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES, nextValue: boolean) => {
      if (nextValue && !pushNotificationsEnabled) {
        const registration = await syncFitCheckPushRegistration({ requestPermission: true });
        if (!registration.enabled) {
          const failure = describePushRegistrationFailure(registration);
          Alert.alert(
            failure?.title || 'Push setup failed',
            failure?.message || 'Push notifications could not be enabled right now.',
          );
          return;
        }
      }

      await applyNotificationPrefs({ [key]: nextValue });
    },
    [applyNotificationPrefs, pushNotificationsEnabled],
  );

  const versionLabel = React.useMemo(
    () => String(Updates.runtimeVersion || (Updates.updateId ? 'OTA build' : 'Local build')),
    []
  );
  const headerSubtitle = React.useMemo(
    () => String(user?.email || 'Manage your account, profile visibility, closet defaults, and support.'),
    [user?.email]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1c1c1c" />
          <Text style={styles.loadingText}>Loading settings</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) + spacing.xl }]}>
        <Text style={styles.eyebrow}>Control center</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>{headerSubtitle}</Text>

        <SettingsSection
          title="Account"
          subtitle="Core account controls and irreversible actions."
        >
          <SettingsRow
            label="Edit Profile"
            description="Update your identity, avatar, and bio."
            onPress={() => navigation.navigate('EditProfile' as never)}
          />
          <SettingsRow
            label="Change Password"
            description="Reset your sign-in credentials."
            onPress={handleChangePassword}
          />
          <SettingsRow
            label="Log Out"
            description="Sign out of Klozu on this device."
            onPress={handleLogout}
            isLast={false}
            disabled={loggingOut}
            value={loggingOut ? 'Busy' : undefined}
          />
          <SettingsRow
            label="Delete My Account"
            description="Permanently remove your account and data."
            danger
            onPress={handleDeleteAccount}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Profile & Social"
          subtitle="Structure your account for public profile features as they roll out."
        >
          <SettingsToggleRow
            label="Private Profile"
            description="Hide your profile from public discovery and public profile views."
            value={privateProfileEnabled}
            onValueChange={(nextValue) => {
              void handleTogglePrivateProfile(nextValue);
            }}
            disabled={privacySaving}
          />
          <SettingsToggleRow
            label="Public Closet"
            description="Store the preference for whether your wardrobe can be browsed publicly."
            value={publicClosetEnabled}
            onValueChange={(nextValue) => {
              void handleTogglePublicCloset(nextValue);
            }}
            disabled={privacySaving}
          />
          <SettingsRow
            label="Username / Handle"
            description="Edit the handle attached to your profile identity."
            value={profileUsername ? `@${profileUsername}` : undefined}
            onPress={() => navigation.navigate('EditProfile' as never)}
          />
          <SettingsRow
            label="Blocked Users"
            description="Review and unblock people you’ve removed from Fit Check."
            value={blockedUsersCount > 0 ? String(blockedUsersCount) : undefined}
            onPress={() => navigation.navigate('BlockedUsers' as never)}
          />
          <SettingsRow
            label="Remove Followers"
            description="Manage who is allowed to keep following your fits."
            value={followersCount > 0 ? String(followersCount) : undefined}
            onPress={() => navigation.navigate('ManageFollowers' as never)}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Preferences"
          subtitle="Default app behavior and styling preferences."
        >
          <SettingsToggleRow
            label="Dark Mode"
            description="Theme setting placeholder until global theming is wired."
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <SettingsRow
            label="Font Size"
            description="Adjust reading density across the app."
            value="Medium"
            onPress={() => fallbackComingSoon('Font Size')}
          />
          <SettingsRow
            label="Default Outfit Vibe"
            description="Preload a preferred vibe in styling flows."
            value="Casual"
            onPress={() => fallbackComingSoon('Default Outfit Vibe')}
          />
          <SettingsRow
            label="Style Preferences"
            description="Fine-tune style signals and closet taste."
            onPress={() => navigation.navigate('StylePreferences' as never)}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Closet & Listings"
          subtitle="Controls for wardrobe organization, resale, and marketplace behavior."
        >
          <SettingsRow
            label="Listing Defaults"
            description="Preset visibility, pricing, and selling preferences."
            value="Manual"
            onPress={() => fallbackComingSoon('Listing Defaults')}
          />
          <SettingsRow
            label="Seller Preferences"
            description="Configure seller-facing account rules."
            onPress={() => fallbackComingSoon('Seller Preferences')}
          />
          <SettingsRow
            label="Marketplace Settings"
            description="Manage storefront and buyer-facing presentation."
            onPress={() => fallbackComingSoon('Marketplace Settings')}
          />
          <SettingsRow
            label="Closet Organization"
            description="Choose how wardrobe sections and sorting behave."
            onPress={() => fallbackComingSoon('Closet Organization')}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          subtitle="Decide which signals should reach you."
        >
          <SettingsToggleRow
            label="Push Notifications"
            description="Enable Fit Check push delivery on this device."
            value={pushNotificationsEnabled}
            onValueChange={(nextValue) => {
              void handleTogglePushNotifications(nextValue);
            }}
          />
          <SettingsToggleRow
            label="Daily Fit Check"
            description="Optional daily reminder. Off by default until you opt in."
            value={notificationPrefs.daily_fit_check_reminder}
            onValueChange={(nextValue) => {
              void handleNotificationPreferenceToggle('daily_fit_check_reminder', nextValue);
            }}
          />
          <SettingsToggleRow
            label="Reactions"
            description="Someone reacted to your fit."
            value={notificationPrefs.reactions}
            onValueChange={(nextValue) => {
              void handleNotificationPreferenceToggle('reactions', nextValue);
            }}
          />
          <SettingsToggleRow
            label="Style Notes"
            description="Someone left a style note on your fit."
            value={notificationPrefs.style_notes}
            onValueChange={(nextValue) => {
              void handleNotificationPreferenceToggle('style_notes', nextValue);
            }}
          />
          <SettingsToggleRow
            label="New Followers"
            description="Get notified when someone follows you."
            value={notificationPrefs.follows}
            onValueChange={(nextValue) => {
              void handleNotificationPreferenceToggle('follows', nextValue);
            }}
          />
          <SettingsToggleRow
            label="Saves & Recreates"
            description="Your public fit inspired someone."
            value={notificationPrefs.saves_recreates}
            onValueChange={(nextValue) => {
              void handleNotificationPreferenceToggle('saves_recreates', nextValue);
            }}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Privacy & Security"
          subtitle="Protection, access, and account security tools."
        >
          <SettingsRow
            label="Data Export"
            description="Request a portable copy of your data."
            onPress={() => fallbackComingSoon('Data Export')}
          />
          <SettingsRow
            label="Login & Security"
            description="Review sign-in protections and recovery options."
            onPress={() => fallbackComingSoon('Login & Security')}
          />
          <SettingsRow
            label="Session Management"
            description="Inspect and revoke future active sessions."
            onPress={() => fallbackComingSoon('Session Management')}
          />
          <SettingsRow
            label="Account Privacy"
            description="Control profile exposure and data-sharing defaults."
            onPress={() => fallbackComingSoon('Account Privacy')}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Subscription / Billing"
          subtitle="RevenueCat billing, paywalls, entitlement state, and Customer Center."
        >
          <SettingsRow
            label="Current Plan"
            description="Your current Klozu tier."
            value={currentPlanLabel}
            onPress={handleOpenSubscriptionHub}
          />
          <SettingsRow
            label="Open Subscription Hub"
            description={
              isPro
                ? 'Review Klozu Premium details and subscription status.'
                : 'Open the custom Klozu Premium paywall.'
            }
            onPress={handleOpenSubscriptionHub}
          />
          <SettingsRow
            label="Restore Purchases"
            description="Restore purchases tied to the current store account."
            onPress={handleRestorePurchases}
          />
          <SettingsRow
            label="Open Customer Center"
            description="Manage billing and subscription settings with RevenueCat."
            onPress={handleManageSubscription}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Support"
          subtitle="Get help, report issues, and suggest product improvements."
        >
          <SettingsRow
            label="Help Center"
            description="Browse support articles and onboarding guidance."
            onPress={() => fallbackComingSoon('Help Center')}
          />
          <SettingsRow
            label="Contact Support"
            description="Reach the Klozu support team."
            onPress={() => fallbackComingSoon('Contact Support')}
          />
          <SettingsRow
            label="Report a Problem"
            description="Share bugs and broken flows."
            onPress={() => fallbackComingSoon('Report a Problem')}
          />
          <SettingsRow
            label="Feature Requests"
            description="Tell us what the app should do next."
            onPress={() => fallbackComingSoon('Feature Requests')}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Legal"
          subtitle="Platform terms and compliance references."
        >
          <SettingsRow
            label="Privacy Policy"
            onPress={() => fallbackComingSoon('Privacy Policy')}
          />
          <SettingsRow
            label="Terms of Service"
            onPress={() => fallbackComingSoon('Terms of Service')}
          />
          <SettingsRow
            label="Licenses"
            onPress={() => fallbackComingSoon('Licenses')}
            isLast
          />
        </SettingsSection>

        <SettingsSection
          title="Developer / Internal"
          subtitle="Operational details and maintenance controls."
        >
          <SettingsRow
            label="App Version"
            value={versionLabel}
            disabled
          />
          <SettingsRow
            label="Diagnostics"
            description="Inspect future app health and internal instrumentation."
            value={__DEV__ ? 'Debug' : 'Prod'}
            onPress={() => fallbackComingSoon('Diagnostics')}
          />
          <SettingsRow
            label="Clear Cache"
            description="Clear future local caches and derived data."
            onPress={() => fallbackComingSoon('Clear Cache')}
            isLast
          />
        </SettingsSection>

        <SettingsInfoFooter text="Klozu settings are structured for account controls today and public-profile, commerce, and notification systems later." />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    maxWidth: 340,
    fontFamily: typography.fontFamily,
  },
});
