import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import OnboardingChip from '../../components/Onboarding/OnboardingChip';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { ONBOARDING_STAGES, updateOnboardingProgress } from '../../lib/onboarding';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';
import {
  buildProfileStyleTags,
  fetchStyleProfile,
  hasStyleProfileReviewData,
  normalizeArrayValues,
  normalizeStyleProfile,
  upsertStyleProfile,
  type StructuredStyleProfile,
} from '../../lib/styleProfile';

const PRIMARY_VIBE_OPTIONS = [
  'minimal',
  'clean',
  'elevated',
  'streetwear',
  'sporty',
  'relaxed',
  'classic',
  'confident',
  'soft',
  'layered',
];
const FIT_DIRECTION_OPTIONS = ['relaxed', 'oversized', 'boxy', 'fitted', 'slim', 'cropped', 'straight', 'wide_leg', 'structured'];
const OCCASION_OPTIONS = ['everyday', 'weekend', 'office', 'date_night', 'going_out', 'travel', 'vacation', 'coffee_run', 'errands'];
const FORMALITY_OPTIONS = ['casual', 'smart_casual', 'elevated', 'dressy', 'formal'];
const FAVORITE_CATEGORY_OPTIONS = ['top', 'bottom', 'shoes', 'outerwear', 'layer', 'onepiece', 'accessory'];
const COLOR_AVOIDANCE_OPTIONS = ['black', 'white', 'grey', 'beige', 'brown', 'blue', 'green', 'red', 'pink', 'olive', 'navy'];
const VIBE_AVOIDANCE_OPTIONS = ['minimal', 'streetwear', 'elevated', 'sporty', 'classic', 'romantic', 'edgy', 'relaxed', 'trendy'];
const PATTERN_OPTIONS = ['solid', 'stripe', 'plaid', 'check', 'floral', 'graphic', 'logo', 'animal', 'textured', 'colorblock'];

function formatChipLabel(value: string) {
  return String(value || '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toggleEntry(current: string[], value: string, limit = 12) {
  if (current.includes(value)) {
    return current.filter((entry) => entry !== value);
  }
  if (current.length >= limit) {
    return current;
  }
  return [...current, value];
}

function hasPersistedStyleProfile(profile: Partial<StructuredStyleProfile> | null | undefined) {
  if (!profile) return false;
  if (hasStyleProfileReviewData(profile)) return true;
  return [
    profile.preferred_formality,
    profile.favorite_categories,
    profile.avoided_categories,
    profile.preferred_patterns,
    profile.avoided_patterns,
    profile.avoided_colors,
    profile.avoided_vibes,
  ].some((entry) => (Array.isArray(entry) ? entry.length > 0 : Boolean(String(entry || '').trim())));
}

export default function OnboardingPreferenceSignalsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingProfile, setExistingProfile] = useState<StructuredStyleProfile | null>(null);
  const [primaryVibes, setPrimaryVibes] = useState<string[]>([]);
  const [fitDirections, setFitDirections] = useState<string[]>([]);
  const [preferredOccasions, setPreferredOccasions] = useState<string[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const [avoidedCategories, setAvoidedCategories] = useState<string[]>([]);
  const [preferredPatterns, setPreferredPatterns] = useState<string[]>([]);
  const [avoidedPatterns, setAvoidedPatterns] = useState<string[]>([]);
  const [avoidedColors, setAvoidedColors] = useState<string[]>([]);
  const [avoidedVibes, setAvoidedVibes] = useState<string[]>([]);
  const [preferredFormality, setPreferredFormality] = useState<string | null>(null);

  const onboardingImagePaths = useMemo(
    () =>
      Array.isArray(route.params?.onboardingImagePaths)
        ? route.params.onboardingImagePaths.map((entry: any) => String(entry || '').trim()).filter(Boolean)
        : [],
    [route.params?.onboardingImagePaths],
  );
  const onboardingImageUrls = useMemo(
    () =>
      Array.isArray(route.params?.onboardingImageUrls)
        ? route.params.onboardingImageUrls.map((entry: any) => String(entry || '').trim()).filter(Boolean)
        : [],
    [route.params?.onboardingImageUrls],
  );
  const prefilledStyleProfile = useMemo(
    () => (route.params?.prefilledStyleProfile ? normalizeStyleProfile(route.params.prefilledStyleProfile) : null),
    [route.params?.prefilledStyleProfile],
  );

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
        setUserId(uid);

        const [profileResponse, styleProfile] = await Promise.all([
          supabase.from('profiles').select('style_tags').eq('id', uid).maybeSingle(),
          fetchStyleProfile(uid),
        ]);

        if (profileResponse.error) {
          throw profileResponse.error;
        }

        if (cancelled) return;

        const hydratedProfile = hasPersistedStyleProfile(styleProfile)
          ? styleProfile
          : hasPersistedStyleProfile(prefilledStyleProfile)
            ? prefilledStyleProfile
            : styleProfile;

        setExistingProfile(hydratedProfile);
        setPrimaryVibes(
          normalizeArrayValues(
            hydratedProfile?.primary_vibes?.length ? hydratedProfile.primary_vibes : profileResponse.data?.style_tags,
            6,
          ),
        );
        setFitDirections(
          normalizeArrayValues(
            Array.isArray(hydratedProfile?.fit_prefs) && hydratedProfile.fit_prefs.length
              ? hydratedProfile.fit_prefs
              : hydratedProfile?.silhouettes,
            8,
          ),
        );
        setPreferredOccasions(normalizeArrayValues(hydratedProfile?.preferred_occasions, 6));
        setFavoriteCategories(normalizeArrayValues(hydratedProfile?.favorite_categories, 7));
        setAvoidedCategories(normalizeArrayValues(hydratedProfile?.avoided_categories, 7));
        setPreferredPatterns(normalizeArrayValues(hydratedProfile?.preferred_patterns, 8));
        setAvoidedPatterns(normalizeArrayValues(hydratedProfile?.avoided_patterns, 8));
        setAvoidedColors(normalizeArrayValues(hydratedProfile?.avoided_colors, 10));
        setAvoidedVibes(normalizeArrayValues(hydratedProfile?.avoided_vibes, 8));
        setPreferredFormality(String(hydratedProfile?.preferred_formality || '').trim().toLowerCase() || null);
      } catch (error: any) {
        console.error('Load onboarding style DNA failed:', error?.message || error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigation, prefilledStyleProfile]);

  const saveAndContinue = async () => {
    if (!userId) return;

    const manualProfile: Partial<StructuredStyleProfile> = {
      ...existingProfile,
      primary_vibes: primaryVibes,
      silhouettes: fitDirections,
      fit_prefs: fitDirections,
      preferred_occasions: preferredOccasions,
      preferred_formality: preferredFormality,
      favorite_categories: favoriteCategories,
      avoided_categories: avoidedCategories,
      preferred_patterns: preferredPatterns,
      avoided_patterns: avoidedPatterns,
      avoided_colors: avoidedColors,
      avoided_vibes: avoidedVibes,
    };

    const mirroredStyleTags = buildProfileStyleTags({
      ...manualProfile,
      keywords: existingProfile?.keywords || [],
    });

    try {
      setSaving(true);

      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ style_tags: mirroredStyleTags })
        .eq('id', userId);

      if (updateProfileError) {
        throw updateProfileError;
      }

      let styleProfileSaveError: any = null;
      try {
        await upsertStyleProfile(userId, manualProfile);
      } catch (error: any) {
        styleProfileSaveError = error;
        console.error('Save onboarding style DNA failed:', error?.message || error);
      }

      await updateOnboardingProgress(userId, { stage: ONBOARDING_STAGES.MODEL }).catch((error) => {
        console.warn('Onboarding stage update failed:', error?.message || error);
      });

      if (styleProfileSaveError) {
        Alert.alert(
          'Saved most of your setup',
          'Your visible style tags were saved, but some deeper style-DNA fields were not. You can still continue onboarding.',
        );
      }

      navigation.navigate('OnboardingModal', {
        onboardingImagePaths,
        onboardingImageUrls,
      });
    } catch (error: any) {
      console.error('Save onboarding style DNA failed:', error?.message || error);
      Alert.alert('Error', error?.message || 'Could not save your style DNA.');
    } finally {
      setSaving(false);
    }
  };

  const renderChipGroup = (
    options: string[],
    selected: string[],
    setSelected: (next: string[]) => void,
    limit = 12,
  ) => (
    <View style={styles.chipGrid}>
      {options.map((option) => (
        <OnboardingChip
          key={option}
          label={formatChipLabel(option)}
          selected={selected.includes(option)}
          onPress={() => setSelected(toggleEntry(selected, option, limit))}
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
        step="Step 6 of 6"
        title="Refine what Klozu picked up."
        subtitle="Your uploaded looks built the first draft. Add the extra yes-no rules you want the app to respect before try-on goes live."
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      step="Step 6 of 6"
      title="Refine what Klozu picked up."
      subtitle="AI read your uploaded looks first. This is where you add the preferences, avoidances, and category bias it should carry forward."
      scroll
      footer={
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={saveAndContinue}
          disabled={saving}
        >
        <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Build My Try-On Model'}</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Your edits should sharpen the AI, not replace it.</Text>
        <Text style={styles.introText}>
          Your uploaded looks already created the first pass. Use this step to lock in the patterns, avoid lists, and wardrobe lanes Klozu should respect before it builds your try-on model.
        </Text>
      </View>

      <PreferenceSection
        title="Anchor Vibes"
        description="The style energies Klozu should treat as your default lanes."
      >
        {renderChipGroup(PRIMARY_VIBE_OPTIONS, primaryVibes, setPrimaryVibes, 4)}
      </PreferenceSection>

      <PreferenceSection
        title="Silhouettes & Fit Direction"
        description="How you like clothes to sit and read on the body."
      >
        {renderChipGroup(FIT_DIRECTION_OPTIONS, fitDirections, setFitDirections, 5)}
      </PreferenceSection>

      <PreferenceSection
        title="Preferred Occasions"
        description="The real contexts your closet needs to work for."
      >
        {renderChipGroup(OCCASION_OPTIONS, preferredOccasions, setPreferredOccasions, 5)}
      </PreferenceSection>

      <PreferenceSection
        title="Favorite Categories"
        description="The zones of your wardrobe that actually deserve investment."
      >
        {renderChipGroup(FAVORITE_CATEGORY_OPTIONS, favoriteCategories, setFavoriteCategories, 5)}
      </PreferenceSection>

      <PreferenceSection
        title="Preferred Formality"
        description="Where the app should naturally anchor your styling decisions."
      >
        {renderSingleSelect(FORMALITY_OPTIONS, preferredFormality, setPreferredFormality)}
      </PreferenceSection>

      <PreferenceSection
        title="Avoided Vibes"
        description="Directions that may exist in fashion, but should not dominate your profile."
      >
        {renderChipGroup(VIBE_AVOIDANCE_OPTIONS, avoidedVibes, setAvoidedVibes, 4)}
      </PreferenceSection>

      <PreferenceSection
        title="Avoided Colors"
        description="Colors that repeatedly miss on you or in your closet."
      >
        {renderChipGroup(COLOR_AVOIDANCE_OPTIONS, avoidedColors, setAvoidedColors, 6)}
      </PreferenceSection>

      <PreferenceSection
        title="Preferred Patterns"
        description="Patterns that feel intentional when they show up in a piece."
      >
        {renderChipGroup(PATTERN_OPTIONS, preferredPatterns, setPreferredPatterns, 5)}
      </PreferenceSection>

      <PreferenceSection
        title="Avoided Patterns"
        description="Patterns the app should treat as a risk instead of a plus."
      >
        {renderChipGroup(PATTERN_OPTIONS, avoidedPatterns, setAvoidedPatterns, 5)}
      </PreferenceSection>

      <PreferenceSection
        title="Avoided Categories"
        description="Categories you rarely wear well or simply do not want more of."
      >
        {renderChipGroup(FAVORITE_CATEGORY_OPTIONS, avoidedCategories, setAvoidedCategories, 5)}
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
  introCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  introTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  introText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
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
