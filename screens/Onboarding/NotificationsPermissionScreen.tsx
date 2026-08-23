import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { syncFitCheckPushRegistration, updateFitCheckNotificationPreferences } from '../../lib/fitCheckNotifications';
import { getOnboardingStepLabel, ONBOARDING_STAGES, updateOnboardingProgress } from '../../lib/onboarding';
import { getAuthenticatedOnboardingUser, resetToLogin, updateProfileFields } from '../../lib/onboardingProfile';
import { colors, spacing, typography, themedStyleSheet } from '../../lib/theme';

export default function NotificationsPermissionScreen() {
  const navigation = useNavigation<any>();
  const [saving, setSaving] = useState(false);

  const completeOnboarding = async (payload: Record<string, any>) => {
    const user = await getAuthenticatedOnboardingUser();
    if (!user) {
      resetToLogin(navigation);
      return;
    }

    await updateProfileFields(user.id, payload);
    await updateOnboardingProgress(user.id, {
      stage: ONBOARDING_STAGES.COMPLETE,
      completed: true,
    });

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'AddOnStore',
          params: {
            highlightedAddOn: 'closet',
            entryReason: 'closet_item',
            completeOnClose: true,
          },
        },
      ],
    });
  };

  const requestPermission = async () => {
    try {
      setSaving(true);
      const settings = await Notifications.requestPermissionsAsync();
      if (settings.granted) {
        const registration = await syncFitCheckPushRegistration({ requestPermission: false });
        if (registration.enabled) {
          await updateFitCheckNotificationPreferences({ daily_fit_check_reminder: true });
        }
      }
      await completeOnboarding({
        notifications_prompted_at: new Date().toISOString(),
        notifications_permission_status: settings.status || 'undetermined',
        notifications_enabled: settings.granted === true,
      });
    } catch {
      Alert.alert('Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScaffold
      step={getOnboardingStepLabel(ONBOARDING_STAGES.NOTIFICATIONS_PERMISSION)}
      title="Get your daily fit"
      subtitle="Klozu can remind you when your outfit is ready, when the weather changes, or when your try-on preview finishes."
      scroll
      footer={
        <View style={styles.footerStack}>
          <TouchableOpacity
            activeOpacity={0.84}
            style={[styles.secondaryButton, saving && styles.buttonDisabled]}
            onPress={() => {
              void completeOnboarding({
                notifications_permission_status: 'skipped',
                notifications_enabled: false,
              });
            }}
            disabled={saving}
          >
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={() => {
              void requestPermission();
            }}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Turn on notifications'}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.card}>
        <Text style={styles.body}>No spam. Just style prompts when they’re useful.</Text>
      </View>
    </OnboardingScaffold>
  );
}

const styles = themedStyleSheet(() => StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: typography.fontFamilies.regular,
  },
  footerStack: {
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
}));
