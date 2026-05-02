import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import OnboardingChoiceCard from '../../components/Onboarding/OnboardingChoiceCard';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { ONBOARDING_STAGES, updateOnboardingProgress } from '../../lib/onboarding';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';

const OPTIONS = [
  {
    id: 'closet',
    label: 'Just my digital closet',
    description: 'Track what you own, style around it, and make sharper buying decisions.',
  },
  {
    id: 'sell',
    label: 'Selling clothes too',
    description: 'Use Klozu to manage what you own and what you may want to resell.',
  },
  {
    id: 'both',
    label: 'Both',
    description: 'Blend wardrobe intelligence with resale awareness from the start.',
  },
];

export default function UseIntentScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('use_intent')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!cancelled) {
          setSelected(String(profile?.use_intent || '').trim() || null);
        }
      } catch (error) {
        console.error('Load onboarding use intent failed:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const handleNext = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error('User not found');

      const userId = userData.user.id;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ use_intent: selected })
        .eq('id', userId);

      if (updateError) throw updateError;
      await updateOnboardingProgress(userId, { stage: ONBOARDING_STAGES.STYLE_VIBE });

      navigation.navigate('StyleVibe' as never);
    } catch (err) {
      console.error('❌ Failed to save use intent:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  if (loading) {
    return (
      <OnboardingScaffold
        step="Step 2 of 6"
        title="What should Klozu optimize for first?"
        subtitle="This shapes how the app prioritizes verdicts, styling, and marketplace context from day one."
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      step="Step 2 of 6"
      title="What should Klozu optimize for first?"
      subtitle="This shapes how the app prioritizes verdicts, styling, and marketplace context from day one."
      footer={
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.primaryButton, !selected && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.stack}>
        {OPTIONS.map((option) => (
          <OnboardingChoiceCard
            key={option.id}
            label={option.label}
            description={option.description}
            selected={selected === option.id}
            onPress={() => setSelected(option.id)}
          />
        ))}
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
  stack: {
    gap: spacing.md - 2,
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
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
