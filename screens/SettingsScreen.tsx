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
import { useNavigation } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import { apiPost } from '../lib/api';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import SettingsInfoFooter from '../components/Settings/SettingsInfoFooter';
import SettingsRow from '../components/Settings/SettingsRow';
import SettingsSection from '../components/Settings/SettingsSection';
import SettingsToggleRow from '../components/Settings/SettingsToggleRow';

function fallbackComingSoon(label: string, detail?: string) {
  Alert.alert(label, detail || 'This setting will be wired in a later pass.');
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [darkMode, setDarkMode] = React.useState(false);
  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [outfitSuggestions, setOutfitSuggestions] = React.useState(true);
  const [listingActivity, setListingActivity] = React.useState(true);
  const [socialActivity, setSocialActivity] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [profileUsername, setProfileUsername] = React.useState('');

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
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
        return;
      }
      setUser(data.user);
      await loadProfileHandle(data.user.id);
      if (mounted) setLoading(false);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
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
            description="Sign out of ClosetMind on this device."
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
          <SettingsRow
            label="Profile Visibility"
            description="Control who can discover your profile."
            value="Private"
            onPress={() => fallbackComingSoon('Profile Visibility')}
          />
          <SettingsRow
            label="Public Closet"
            description="Decide whether others can browse your public wardrobe."
            value="Off"
            onPress={() => fallbackComingSoon('Public Closet')}
          />
          <SettingsRow
            label="Username / Handle"
            description="Edit the handle attached to your profile identity."
            value={profileUsername ? `@${profileUsername}` : undefined}
            onPress={() => navigation.navigate('EditProfile' as never)}
          />
          <SettingsRow
            label="Blocked Users"
            description="Manage future social account restrictions."
            onPress={() => fallbackComingSoon('Blocked Users')}
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
            description="Master switch for app alerts."
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
          <SettingsToggleRow
            label="Outfit Suggestions"
            description="Receive styling nudges and closet prompts."
            value={outfitSuggestions}
            onValueChange={setOutfitSuggestions}
          />
          <SettingsToggleRow
            label="Listing Activity"
            description="Alerts for marketplace events and item movement."
            value={listingActivity}
            onValueChange={setListingActivity}
          />
          <SettingsToggleRow
            label="Social Activity"
            description="Future alerts for follows, likes, and profile actions."
            value={socialActivity}
            onValueChange={setSocialActivity}
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
          subtitle="Prepare the account for monetization and usage tracking."
        >
          <SettingsRow
            label="Current Plan"
            description="Your current ClosetMind tier."
            value="Free"
            disabled
          />
          <SettingsRow
            label="Manage Subscription"
            description="Upgrade, downgrade, or manage billing."
            onPress={() => fallbackComingSoon('Manage Subscription')}
          />
          <SettingsRow
            label="Try-On Credits"
            description="Future usage tracking for AI-powered experiences."
            value="Included"
            onPress={() => fallbackComingSoon('Try-On Credits')}
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
            description="Reach the ClosetMind support team."
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

        <SettingsInfoFooter text="ClosetMind settings are structured for account controls today and public-profile, commerce, and notification systems later." />
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
