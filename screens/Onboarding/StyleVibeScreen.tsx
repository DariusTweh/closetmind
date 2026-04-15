import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import OnboardingChoiceCard from '../../components/Onboarding/OnboardingChoiceCard';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';

const STYLE_OPTIONS = [
  { id: 'minimalist', label: 'Minimalist', description: 'Clean lines, restraint, strong basics.' },
  { id: 'streetwear', label: 'Streetwear', description: 'Relaxed, directional, graphic, current.' },
  { id: 'classy', label: 'Classy', description: 'Elevated, polished, put together.' },
  { id: 'athleisure', label: 'Athleisure', description: 'Performance comfort with a sharp casual edge.' },
  { id: 'trendy', label: 'Trendy', description: 'Fashion-forward, quick to evolve, high novelty.' },
  { id: 'y2k', label: 'Y2K', description: 'Playful, nostalgic, silhouette-driven.' },
  { id: 'unsure', label: 'Still figuring it out', description: 'Let the app learn and refine from your closet.' },
];

export default function StyleVibeScreen() {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  const handleNext = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error('User not found');

      const userId = userData.user.id;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ style_tags: selected })
        .eq('id', userId);

      if (updateError) throw updateError;

      navigation.navigate('ToneSelect' as never);
    } catch (error) {
      console.error('❌ Failed to save style tags:', error);
      Alert.alert('Error', 'Could not save your style direction.');
    }
  };

  return (
    <OnboardingScaffold
      step="Step 3 of 6"
      title="What style energy already feels like you?"
      subtitle="Pick up to three directions. This becomes the first layer of your style identity."
      scroll
      footer={
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.primaryButton, selected.length === 0 && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={selected.length === 0}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.grid}>
        {STYLE_OPTIONS.map((item) => (
          <View key={item.id} style={styles.gridItem}>
            <OnboardingChoiceCard
              label={item.label}
              description={item.description}
              selected={selected.includes(item.id)}
              onPress={() => toggleSelection(item.id)}
              compact
            />
          </View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: spacing.sm + 2,
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
