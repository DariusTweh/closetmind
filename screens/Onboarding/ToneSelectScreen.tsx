import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import OnboardingChoiceCard from '../../components/Onboarding/OnboardingChoiceCard';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';

const TONE_OPTIONS = [
  { id: 'friendly', label: 'Friendly & supportive', description: 'Guidance that feels warm, steady, and constructive.' },
  { id: 'bold', label: 'Bold & confident', description: 'Direct verdicts, stronger opinions, less hedging.' },
  { id: 'minimal', label: 'Calm & minimalist', description: 'Quiet, precise, understated feedback.' },
  { id: 'trendy', label: 'Fashion-obsessed', description: 'Sharper fashion language and more directional energy.' },
  { id: 'chill', label: 'Relaxed & cool', description: 'Laid-back guidance without losing clarity.' },
];

export default function ToneSelectScreen() {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<string | null>(null);

  const handleNext = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error('User not found');

      const userId = userData.user.id;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          tone: selected,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      navigation.navigate('OnboardingPreferenceSignals' as never);
    } catch (err) {
      console.error('❌ Failed to save tone:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <OnboardingScaffold
      step="Step 4 of 6"
      title="How should ClosetMind talk to you?"
      subtitle="This changes the tone of guidance and verdict copy, not the intelligence underneath it."
      scroll
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
        {TONE_OPTIONS.map((tone) => (
          <OnboardingChoiceCard
            key={tone.id}
            label={tone.label}
            description={tone.description}
            selected={selected === tone.id}
            onPress={() => setSelected(tone.id)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
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
