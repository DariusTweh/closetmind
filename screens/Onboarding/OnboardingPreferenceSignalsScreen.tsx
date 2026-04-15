import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import OnboardingChip from '../../components/Onboarding/OnboardingChip';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';

const FORMALITY_OPTIONS = ['casual', 'smart_casual', 'elevated', 'dressy', 'formal'];
const FAVORITE_CATEGORY_OPTIONS = ['top', 'bottom', 'shoes', 'outerwear', 'layer', 'onepiece', 'accessory'];
const COLOR_AVOIDANCE_OPTIONS = ['black', 'white', 'grey', 'beige', 'brown', 'blue', 'green', 'red', 'pink'];
const PATTERN_OPTIONS = ['solid', 'stripe', 'plaid', 'check', 'floral', 'graphic', 'logo', 'animal', 'textured', 'colorblock'];

function normalizeStringArray(value: any) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean)
    : [];
}

function formatChipLabel(value: string) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toggleEntry(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
}

export default function OnboardingPreferenceSignalsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const [avoidedCategories, setAvoidedCategories] = useState<string[]>([]);
  const [preferredPatterns, setPreferredPatterns] = useState<string[]>([]);
  const [avoidedColors, setAvoidedColors] = useState<string[]>([]);
  const [preferredFormality, setPreferredFormality] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        const uid = data.user.id;
        if (cancelled) return;
        setUserId(uid);

        const { data: styleProfile, error: styleProfileError } = await supabase
          .from('user_style_profiles')
          .select('favorite_categories, avoided_categories, preferred_patterns, avoided_colors, preferred_formality')
          .eq('user_id', uid)
          .maybeSingle();

        if (styleProfileError) throw styleProfileError;
        if (cancelled) return;

        setFavoriteCategories(normalizeStringArray(styleProfile?.favorite_categories));
        setAvoidedCategories(normalizeStringArray(styleProfile?.avoided_categories));
        setPreferredPatterns(normalizeStringArray(styleProfile?.preferred_patterns));
        setAvoidedColors(normalizeStringArray(styleProfile?.avoided_colors));
        setPreferredFormality(String(styleProfile?.preferred_formality || '').trim().toLowerCase() || null);
      } catch (error: any) {
        console.error('Load onboarding preference signals failed:', error?.message || error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const saveAndContinue = async () => {
    if (!userId) return;

    try {
      setSaving(true);

      const payload = {
        user_id: userId,
        favorite_categories: favoriteCategories,
        avoided_categories: avoidedCategories,
        preferred_patterns: preferredPatterns,
        avoided_colors: avoidedColors,
        preferred_formality: preferredFormality,
      };

      const { data: existing, error: existingError } = await supabase
        .from('user_style_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError) throw existingError;

      const response = existing?.user_id
        ? await supabase.from('user_style_profiles').update(payload).eq('user_id', userId)
        : await supabase.from('user_style_profiles').insert([payload]);

      if (response.error) throw response.error;

      navigation.navigate('OnboardingStyle');
    } catch (error: any) {
      console.error('Save onboarding preference signals failed:', error?.message || error);
      Alert.alert(
        'Could not save these signals',
        'Your core onboarding can still continue, but your advanced verdict preferences were not saved.',
      );
      navigation.navigate('OnboardingStyle');
    } finally {
      setSaving(false);
    }
  };

  const renderChipGroup = (
    options: string[],
    selected: string[],
    setSelected: (next: string[]) => void,
  ) => (
    <View style={styles.chipGrid}>
      {options.map((option) => (
        <OnboardingChip
          key={option}
          label={formatChipLabel(option)}
          selected={selected.includes(option)}
          onPress={() => setSelected(toggleEntry(selected, option))}
        />
      ))}
    </View>
  );

  const renderSingleSelect = (
    options: string[],
    value: string | null,
    setValue: (next: string | null) => void,
  ) => (
    <View style={styles.chipGrid}>
      {options.map((option) => (
        <OnboardingChip
          key={option}
          label={formatChipLabel(option)}
          selected={value === option}
          onPress={() => setValue(value === option ? null : option)}
        />
      ))}
    </View>
  );

  if (loading) {
    return (
      <OnboardingScaffold
        step="Step 5 of 6"
        title="Make the verdict smarter."
        subtitle="These optional preference signals help the app understand your strongest yes and no patterns."
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      step="Step 5 of 6"
      title="Make the verdict smarter."
      subtitle="These are optional, but they sharpen your scan-before-you-buy logic right away."
      scroll
      footer={
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={saveAndContinue}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      }
    >
      <PreferenceSection
        title="Favorite Categories"
        description="What kinds of pieces are actually worth adding for you?"
      >
        {renderChipGroup(FAVORITE_CATEGORY_OPTIONS, favoriteCategories, setFavoriteCategories)}
      </PreferenceSection>

      <PreferenceSection
        title="Avoided Categories"
        description="What rarely works on you or simply does not deserve more closet space?"
      >
        {renderChipGroup(FAVORITE_CATEGORY_OPTIONS, avoidedCategories, setAvoidedCategories)}
      </PreferenceSection>

      <PreferenceSection
        title="Preferred Formality"
        description="Where should ClosetMind naturally anchor your styling logic?"
      >
        {renderSingleSelect(FORMALITY_OPTIONS, preferredFormality, setPreferredFormality)}
      </PreferenceSection>

      <PreferenceSection
        title="Avoided Colors"
        description="Colors that almost always feel wrong on you or in your wardrobe."
      >
        {renderChipGroup(COLOR_AVOIDANCE_OPTIONS, avoidedColors, setAvoidedColors)}
      </PreferenceSection>

      <PreferenceSection
        title="Preferred Patterns"
        description="Patterns you repeat when an item really works."
      >
        {renderChipGroup(PATTERN_OPTIONS, preferredPatterns, setPreferredPatterns)}
      </PreferenceSection>
    </OnboardingScaffold>
  );
}

function PreferenceSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg - 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
    fontFamily: typography.fontFamily,
  },
  sectionDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.md - 2,
    fontFamily: typography.fontFamily,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
