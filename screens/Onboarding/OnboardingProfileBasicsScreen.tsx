import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthTextField from '../../components/Auth/AuthTextField';
import { ONBOARDING_STAGES, updateOnboardingProgress } from '../../lib/onboarding';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';

function normalizeUsername(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._]/g, '');
}

function buildUsernameSuggestion(email: string | null | undefined) {
  const localPart = String(email || '').split('@')[0] || 'closetuser';
  return normalizeUsername(localPart).slice(0, 20);
}

export default function OnboardingProfileBasicsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  const normalizedUsername = useMemo(() => normalizeUsername(usernameInput), [usernameInput]);
  const usernameIsValid = /^[a-z0-9._]{3,20}$/.test(normalizedUsername);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        const user = data.user;
        if (cancelled) return;
        setUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (cancelled) return;

        setFullName(String(profile?.full_name || '').trim());
        setUsernameInput(
          String(profile?.username || '').trim() || buildUsernameSuggestion(user.email)
        );
      } catch (error: any) {
        console.error('Load onboarding profile basics failed:', error?.message || error);
        Alert.alert('Error', 'Could not load your profile setup.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const handleContinue = async () => {
    if (!userId) return;

    if (!usernameIsValid) {
      Alert.alert(
        'Choose a valid username',
        'Use 3 to 20 lowercase letters, numbers, periods, or underscores.',
      );
      return;
    }

    try {
      setSaving(true);

      const { data: existingUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', normalizedUsername)
        .neq('id', userId)
        .maybeSingle();

      if (usernameError) throw usernameError;
      if (existingUsername?.id) {
        Alert.alert('Username unavailable', 'That username is already taken.');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: String(fullName || '').trim() || null,
          username: normalizedUsername,
        })
        .eq('id', userId);

      if (updateError) throw updateError;
      await updateOnboardingProgress(userId, { stage: ONBOARDING_STAGES.USE_INTENT });

      navigation.navigate('UseIntent');
    } catch (error: any) {
      console.error('Save onboarding profile basics failed:', error?.message || error);
      Alert.alert('Error', error?.message || 'Could not save your profile basics.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <OnboardingScaffold
        step="Step 1 of 6"
        title="Set up your identity."
        subtitle="Your profile becomes the anchor for verdicts, saved looks, and anything social later."
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      step="Step 1 of 6"
      title="Set up your identity."
      subtitle="Choose the name and handle that will follow your closet, styling history, and future public profile."
      footer={
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.primaryButton, (!usernameIsValid || saving) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!usernameIsValid || saving}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Profile Basics</Text>

        <AuthTextField
          label="Full Name"
          placeholder="Optional"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />

        <AuthTextField
          label="Username"
          placeholder="Required"
          autoCapitalize="none"
          autoCorrect={false}
          value={usernameInput}
          onChangeText={setUsernameInput}
        />

        <Text style={[styles.helper, normalizedUsername && !usernameIsValid && styles.helperError]}>
          {normalizedUsername
            ? `Will save as @${normalizedUsername}`
            : 'Use 3 to 20 lowercase letters, numbers, periods, or underscores.'}
        </Text>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg - 2,
  },
  panelEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
  },
  helper: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  helperError: {
    color: colors.textPrimary,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.textOnAccent,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
