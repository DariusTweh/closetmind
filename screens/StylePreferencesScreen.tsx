import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

const STYLE_TAGS = ['Minimalist', 'Streetwear', 'Boho', 'Elegant', 'Sporty', 'Y2K', 'Preppy', 'Vintage'];
const COLOR_PREFERENCES = ['Neutrals', 'Earth Tones', 'Bold Colors', 'Pastels', 'Black & White'];
const FIT_PREFERENCES = ['Fitted', 'Oversized', 'Cropped', 'High-Waist', 'Relaxed'];
const FORMALITY_OPTIONS = ['casual', 'smart_casual', 'elevated', 'dressy', 'formal'];
const FAVORITE_CATEGORY_OPTIONS = ['top', 'bottom', 'shoes', 'outerwear', 'layer', 'onepiece', 'accessory'];
const COLOR_AVOIDANCE_OPTIONS = ['black', 'white', 'grey', 'beige', 'brown', 'blue', 'green', 'red', 'pink'];
const VIBE_AVOIDANCE_OPTIONS = ['minimal', 'streetwear', 'elevated', 'sporty', 'classic', 'romantic', 'edgy', 'relaxed'];
const PATTERN_OPTIONS = ['solid', 'stripe', 'plaid', 'check', 'floral', 'graphic', 'logo', 'animal', 'textured', 'colorblock'];
const STYLE_PROFILE_SELECT_FIELDS = [
  'user_id',
  'avoided_colors',
  'avoided_vibes',
  'favorite_categories',
  'avoided_categories',
  'preferred_patterns',
  'avoided_patterns',
  'preferred_formality',
].join(', ');

function formatChipLabel(value: string) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeStringArray(value: any) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean)
    : [];
}

export default function StylePreferencesScreen({ navigation }: any) {
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [fits, setFits] = useState<string[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const [preferredPatterns, setPreferredPatterns] = useState<string[]>([]);
  const [avoidedColors, setAvoidedColors] = useState<string[]>([]);
  const [avoidedVibes, setAvoidedVibes] = useState<string[]>([]);
  const [avoidedCategories, setAvoidedCategories] = useState<string[]>([]);
  const [avoidedPatterns, setAvoidedPatterns] = useState<string[]>([]);
  const [preferredFormality, setPreferredFormality] = useState<string | null>(null);
  const [supportsManualPrefs, setSupportsManualPrefs] = useState(true);
  const [supportsAdvancedStyleProfile, setSupportsAdvancedStyleProfile] = useState(true);
  const [styleProfileExists, setStyleProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const isMissingColumnError = useCallback((error: any, columnName: string) => {
    const message = String(error?.message || error?.details || '').toLowerCase();
    return message.includes('does not exist') && message.includes(columnName.toLowerCase());
  }, []);

  const toggleTag = useCallback((tag: string, list: string[], setList: (value: string[]) => void) => {
    setList(list.includes(tag) ? list.filter((entry) => entry !== tag) : [...list, tag]);
  }, []);

  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    setUserId(data.user.id);
    return data.user.id as string;
  }, []);

  const renderChipGroup = useCallback(
    (
      options: string[],
      selected: string[],
      onToggle: (value: string, list: string[], setList: (value: string[]) => void) => void,
      setList: (value: string[]) => void
    ) => (
      <View style={styles.tagGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.tag, selected.includes(option) && styles.selectedTag]}
            onPress={() => onToggle(option, selected, setList)}
          >
            <Text style={[styles.tagText, selected.includes(option) && styles.selectedTagText]}>
              {formatChipLabel(option)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    []
  );

  const renderSingleSelectGroup = useCallback(
    (options: string[], selected: string | null, onSelect: (value: string | null) => void) => (
      <View style={styles.tagGrid}>
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.tag, isSelected && styles.selectedTag]}
              onPress={() => onSelect(isSelected ? null : option)}
            >
              <Text style={[styles.tagText, isSelected && styles.selectedTagText]}>
                {formatChipLabel(option)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    []
  );

  const advancedSections = useMemo(
    () => [
      {
        title: 'Favorite Categories',
        description: 'Tell the verdict engine which wardrobe zones you actually like investing in.',
        content: renderChipGroup(FAVORITE_CATEGORY_OPTIONS, favoriteCategories, toggleTag, setFavoriteCategories),
      },
      {
        title: 'Preferred Patterns',
        description: 'Patterns you naturally repeat when something really works for you.',
        content: renderChipGroup(PATTERN_OPTIONS, preferredPatterns, toggleTag, setPreferredPatterns),
      },
      {
        title: 'Preferred Formality',
        description: 'Your default lane when an item needs to feel right without extra explanation.',
        content: renderSingleSelectGroup(FORMALITY_OPTIONS, preferredFormality, setPreferredFormality),
      },
      {
        title: 'Avoided Colors',
        description: 'Colors that almost always feel wrong on you or in your closet.',
        content: renderChipGroup(COLOR_AVOIDANCE_OPTIONS, avoidedColors, toggleTag, setAvoidedColors),
      },
      {
        title: 'Avoided Vibes',
        description: 'Aesthetic directions you want the app to actively steer away from.',
        content: renderChipGroup(VIBE_AVOIDANCE_OPTIONS, avoidedVibes, toggleTag, setAvoidedVibes),
      },
      {
        title: 'Avoided Categories',
        description: 'Categories you rarely wear well or do not want more of.',
        content: renderChipGroup(FAVORITE_CATEGORY_OPTIONS, avoidedCategories, toggleTag, setAvoidedCategories),
      },
      {
        title: 'Avoided Patterns',
        description: 'Patterns the verdict engine should treat as a risk, not a plus.',
        content: renderChipGroup(PATTERN_OPTIONS, avoidedPatterns, toggleTag, setAvoidedPatterns),
      },
    ],
    [
      avoidedCategories,
      avoidedColors,
      avoidedPatterns,
      avoidedVibes,
      favoriteCategories,
      preferredFormality,
      preferredPatterns,
      renderChipGroup,
      renderSingleSelectGroup,
      toggleTag,
    ]
  );

  const loadPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await resolveUser();
      if (!uid) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      let profileResponse = await supabase
        .from('profiles')
        .select('style_tags, color_prefs, fit_prefs')
        .eq('id', uid)
        .single();

      if (
        profileResponse.error &&
        (isMissingColumnError(profileResponse.error, 'color_prefs') || isMissingColumnError(profileResponse.error, 'fit_prefs'))
      ) {
        setSupportsManualPrefs(false);
        profileResponse = await supabase
          .from('profiles')
          .select('style_tags')
          .eq('id', uid)
          .single();
      } else {
        setSupportsManualPrefs(true);
      }

      if (profileResponse.error) throw profileResponse.error;

      const styleProfileResponse = await supabase
        .from('user_style_profiles')
        .select(STYLE_PROFILE_SELECT_FIELDS)
        .eq('user_id', uid)
        .maybeSingle();

      if (
        styleProfileResponse.error &&
        [
          'avoided_colors',
          'avoided_vibes',
          'favorite_categories',
          'avoided_categories',
          'preferred_patterns',
          'avoided_patterns',
          'preferred_formality',
        ].some((field) => isMissingColumnError(styleProfileResponse.error, field))
      ) {
        setSupportsAdvancedStyleProfile(false);
        setStyleProfileExists(false);
      } else if (styleProfileResponse.error) {
        throw styleProfileResponse.error;
      } else {
        const styleProfileData = styleProfileResponse.data as any;
        setSupportsAdvancedStyleProfile(true);
        setStyleProfileExists(Boolean(styleProfileData?.user_id));
        setFavoriteCategories(normalizeStringArray(styleProfileData?.favorite_categories));
        setPreferredPatterns(normalizeStringArray(styleProfileData?.preferred_patterns));
        setAvoidedColors(normalizeStringArray(styleProfileData?.avoided_colors));
        setAvoidedVibes(normalizeStringArray(styleProfileData?.avoided_vibes));
        setAvoidedCategories(normalizeStringArray(styleProfileData?.avoided_categories));
        setAvoidedPatterns(normalizeStringArray(styleProfileData?.avoided_patterns));
        setPreferredFormality(
          String(styleProfileData?.preferred_formality || '').trim().toLowerCase() || null
        );
      }

      setStyleTags(Array.isArray(profileResponse.data?.style_tags) ? profileResponse.data.style_tags : []);
      setColors(Array.isArray((profileResponse.data as any)?.color_prefs) ? (profileResponse.data as any).color_prefs : []);
      setFits(Array.isArray((profileResponse.data as any)?.fit_prefs) ? (profileResponse.data as any).fit_prefs : []);
    } catch (error: any) {
      console.error('Load prefs failed:', error?.message || error);
      Alert.alert('Error', 'Could not load your preferences.');
    } finally {
      setLoading(false);
    }
  }, [isMissingColumnError, navigation, resolveUser]);

  useEffect(() => {
    loadPrefs();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    });
    return () => sub?.subscription?.unsubscribe();
  }, [loadPrefs, navigation]);

  const savePreferences = async () => {
    if (!userId) return;

    try {
      setSaving(true);

      const profilePayload = supportsManualPrefs
        ? {
            style_tags: styleTags,
            color_prefs: colors,
            fit_prefs: fits,
          }
        : {
            style_tags: styleTags,
          };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', userId);

      if (profileError) throw profileError;

      if (supportsAdvancedStyleProfile) {
        const styleProfilePayload = {
          user_id: userId,
          favorite_categories: favoriteCategories,
          preferred_patterns: preferredPatterns,
          preferred_formality: preferredFormality,
          avoided_colors: avoidedColors,
          avoided_vibes: avoidedVibes,
          avoided_categories: avoidedCategories,
          avoided_patterns: avoidedPatterns,
        };

        const response = styleProfileExists
          ? await supabase.from('user_style_profiles').update(styleProfilePayload).eq('user_id', userId)
          : await supabase.from('user_style_profiles').insert([styleProfilePayload]);

        if (response.error) throw response.error;
        if (!styleProfileExists) setStyleProfileExists(true);
      }

      Alert.alert(
        'Saved',
        supportsAdvancedStyleProfile
          ? 'Your style preferences and avoid signals have been updated.'
          : 'Your basic style preferences were updated. Advanced verdict preference fields are not enabled in your database yet.'
      );
      navigation.goBack();
    } catch (error: any) {
      console.error('Save prefs failed:', error?.message || error);
      Alert.alert('Error', 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7c6450" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Style Preferences</Text>
        <Text style={styles.subhead}>
          Tune the verdict engine so it knows what to lean into and what to avoid.
        </Text>

        <Text style={styles.section}>Style Tags</Text>
        {renderChipGroup(STYLE_TAGS, styleTags, toggleTag, setStyleTags)}

        {supportsManualPrefs ? (
          <>
            <Text style={styles.section}>Color Preferences</Text>
            {renderChipGroup(COLOR_PREFERENCES, colors, toggleTag, setColors)}

            <Text style={styles.section}>Fit Preferences</Text>
            {renderChipGroup(FIT_PREFERENCES, fits, toggleTag, setFits)}
          </>
        ) : (
          <Text style={styles.note}>
            Color and fit preferences are not enabled in your current `profiles` table yet.
          </Text>
        )}

        {supportsAdvancedStyleProfile ? (
          advancedSections.map((section) => (
            <View key={section.title} style={styles.advancedSection}>
              <Text style={styles.section}>{section.title}</Text>
              <Text style={styles.sectionDescription}>{section.description}</Text>
              {section.content}
            </View>
          ))
        ) : (
          <Text style={styles.note}>
            Advanced verdict preference fields are not enabled in your current `user_style_profiles` table yet.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={savePreferences}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Preferences'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 84,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  subhead: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 10,
    color: colors.textPrimary,
  },
  sectionDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  advancedSection: {
    marginTop: 2,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderColor: colors.border,
    borderWidth: 1,
  },
  selectedTag: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTagText: {
    color: '#fafaff',
  },
  note: {
    marginTop: 18,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  saveButton: {
    marginTop: 40,
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
