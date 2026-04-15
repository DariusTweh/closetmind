import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../lib/api';
import { toStyleRequestWardrobeList } from '../lib/styleRequestWardrobe';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import FloatingGeneratorActions from '../components/OutfitGenerator/FloatingGeneratorActions';
import GeneratorSummaryCard from '../components/OutfitGenerator/GeneratorSummaryCard';
import QuickPickChips from '../components/OutfitGenerator/QuickPickChips';
import SeasonSelector from '../components/OutfitGenerator/SeasonSelector';
import StyledLookItemCard from '../components/OutfitGenerator/StyledLookItemCard';
import StylistBriefHeader from '../components/OutfitGenerator/StylistBriefHeader';
import TemperatureInputCard from '../components/OutfitGenerator/TemperatureInputCard';
import {
  buildFateContext,
  type FateContext,
} from '../utils/buildFateContext';
import { saveMixedOutfit } from '../services/savedOutfitService';
import { normalizeSavedOutfitLikeItem } from '../utils/styleCanvasAdapters';

const DISPLAY_ORDER = ['outerwear', 'layer', 'onepiece', 'top', 'bottom', 'shoes', 'accessory'];
const VALID_SEASONS = ['spring', 'summer', 'fall', 'winter', 'all'];
const VIBE_OPTIONS = ['Casual', 'Elevated', 'Clean', 'Streetwear', 'Confident', 'Date Night'];
const CONTEXT_OPTIONS = ['Everyday', 'Dinner', 'Going Out', 'Work', 'Travel', 'Weekend'];
const PROFILE_PREF_SELECT_FIELDS = 'style_tags, color_prefs, fit_prefs';
const PROFILE_PREF_FALLBACK_SELECT_FIELDS = 'style_tags';
const STYLE_PROFILE_SELECT_FIELDS =
  'primary_vibes, silhouettes, seasons, core_colors, accent_colors, fit_prefs, keywords, preferred_occasions, preferred_formality';
const FATE_WARDROBE_SELECT_FIELDS =
  'id, name, type, main_category, primary_color, secondary_colors, vibe_tags, season, pattern_description, fit_type, silhouette, formality, occasion_tags';
const FATE_WARDROBE_FALLBACK_SELECT_FIELDS =
  'id, name, type, main_category, primary_color, secondary_colors, vibe_tags, season, pattern_description';

function animateTransition() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function isMissingColumnError(error: any, field: string) {
  const normalized = String(error?.message || error?.details || '')
    .trim()
    .toLowerCase();
  const target = field.toLowerCase();
  return (
    normalized.includes(`profiles.${target}`) ||
    normalized.includes(`user_style_profiles.${target}`) ||
    normalized.includes(`wardrobe.${target}`) ||
    normalized.includes(`'${target}' column`) ||
    (normalized.includes('does not exist') && normalized.includes(target))
  );
}

function InputSection({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9f958a"
        style={styles.input}
      />
    </View>
  );
}

function LoadingCard({
  title,
  step,
}: {
  title: string;
  step: string;
}) {
  return (
    <View style={styles.loadingCard}>
      <Text style={styles.loadingEyebrow}>Stylist at work</Text>
      <Text style={styles.loadingTitle}>{title}</Text>
      <Text style={styles.loadingText}>{step}</Text>
    </View>
  );
}

export default function OutfitGeneratorScreen() {
  const tabBarHeight = useBottomTabBarHeight();

  const [userId, setUserId] = useState<string | null>(null);
  const [vibe, setVibe] = useState('');
  const [context, setContext] = useState('');
  const [season, setSeason] = useState('');
  const [temperature, setTemperature] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outfit, setOutfit] = useState<any[]>([]);
  const [lockedItems, setLockedItems] = useState<any[]>([]);
  const [mode, setMode] = useState<'form' | 'generated'>('form');
  const [currentStep, setCurrentStep] = useState('');
  const [recentGenerationHistory, setRecentGenerationHistory] = useState<string[][]>([]);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [fatePreview, setFatePreview] = useState<FateContext | null>(null);
  const [cachedFateContext, setCachedFateContext] = useState<FateContext | null>(null);
  const [fateVariantIndex, setFateVariantIndex] = useState(0);
  const [recentFateKeys, setRecentFateKeys] = useState<string[]>([]);

  const finalSeason = VALID_SEASONS.includes(season.toLowerCase())
    ? season.toLowerCase()
    : 'all';

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        Alert.alert('Authentication Required', 'Please log in to generate outfits.');
        return;
      }
      setUserId(data.user.id);
    };
    void getUser();
  }, []);

  useEffect(() => {
    setRecentGenerationHistory([]);
  }, [context, vibe, season, temperature]);

  const getRecentGeneratedIds = () =>
    Array.from(new Set(recentGenerationHistory.flat().filter(Boolean)));

  const resolveCurrentUserId = useCallback(async () => {
    if (userId) return userId;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error('Please log in to use surprise modes.');
    }
    setUserId(data.user.id);
    return data.user.id;
  }, [userId]);

  const fetchFateSignals = useCallback(async (uid: string) => {
    let profileResponse: any = await supabase
      .from('profiles')
      .select(PROFILE_PREF_SELECT_FIELDS)
      .eq('id', uid)
      .maybeSingle();

    if (
      profileResponse.error &&
      (isMissingColumnError(profileResponse.error, 'color_prefs') ||
        isMissingColumnError(profileResponse.error, 'fit_prefs'))
    ) {
      profileResponse = await supabase
        .from('profiles')
        .select(PROFILE_PREF_FALLBACK_SELECT_FIELDS)
        .eq('id', uid)
        .maybeSingle();
    }

    if (profileResponse.error && profileResponse.error.code !== 'PGRST116') {
      throw profileResponse.error;
    }

    let styleProfileResponse: any = await supabase
      .from('user_style_profiles')
      .select(STYLE_PROFILE_SELECT_FIELDS)
      .eq('user_id', uid)
      .maybeSingle();

    if (
      styleProfileResponse.error &&
      [
        'preferred_occasions',
        'preferred_formality',
        'core_colors',
        'accent_colors',
        'silhouettes',
        'fit_prefs',
      ].some((field) => isMissingColumnError(styleProfileResponse.error, field))
    ) {
      styleProfileResponse = { data: null, error: null };
    }

    if (styleProfileResponse.error && styleProfileResponse.error.code !== 'PGRST116') {
      throw styleProfileResponse.error;
    }

    return {
      profile: profileResponse.data || null,
      preferences: styleProfileResponse.data || null,
    };
  }, []);

  const fetchWardrobeForFate = useCallback(async (uid: string) => {
    let wardrobeResponse: any = await supabase
      .from('wardrobe')
      .select(FATE_WARDROBE_SELECT_FIELDS)
      .eq('user_id', uid)
      .eq('wardrobe_status', 'owned');

    if (
      wardrobeResponse.error &&
      ['fit_type', 'silhouette', 'occasion_tags', 'formality'].some((field) =>
        isMissingColumnError(wardrobeResponse.error, field)
      )
    ) {
      wardrobeResponse = await supabase
        .from('wardrobe')
        .select(FATE_WARDROBE_FALLBACK_SELECT_FIELDS)
        .eq('user_id', uid)
        .eq('wardrobe_status', 'owned');
    }

    if (wardrobeResponse.error) {
      throw wardrobeResponse.error;
    }

    return Array.isArray(wardrobeResponse.data) ? wardrobeResponse.data : [];
  }, []);

  const fetchWardrobeItemsByIds = async (ids: string[]) => {
    if (!userId) return [];
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return [];

    const { data, error } = await supabase
      .from('wardrobe')
      .select('id, user_id, name, type, main_category, image_url, image_path, primary_color, secondary_colors, pattern_description, vibe_tags, season, meta')
      .eq('user_id', userId)
      .in('id', uniqueIds);

    if (error) {
      console.error('Error fetching wardrobe items:', error.message);
      return [];
    }

    return data ?? [];
  };

  const toggleLockItem = (item: any) => {
    setLockedItems((prev) =>
      prev.some((entry) => entry.id === item.id)
        ? prev.filter((entry) => entry.id !== item.id)
        : [...prev, item]
    );
  };

  const generateMultistepOutfit = async () => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please log in to generate outfits.');
      return;
    }

    setLoading(true);
    setCurrentStep('Generating outfit...');

    try {
      const steps = [
        'Ranking your closet...',
        'Balancing color and shape...',
        'Finalizing outfit...',
        'Preparing your fit...',
        'Finalizing outfit...',
      ];

      for (const step of steps) {
        setCurrentStep(step);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const response = await apiPost('/generate-multistep-outfit', {
        context,
        vibe,
        season,
        temperature: String(temperature || '').trim() ? Number(temperature) : null,
        recent_item_ids: getRecentGeneratedIds(),
        avoidIds: outfit?.map((item: any) => item.id) || [],
        locked_items: toStyleRequestWardrobeList(lockedItems),
      });

      const raw = await response.text();

      if (!response.ok) {
        Alert.alert('Generation Failed', raw.slice(0, 200));
        return;
      }

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        Alert.alert('Generation Failed', 'Backend returned a non-JSON response.');
        return;
      }

      if (!data.steps) {
        Alert.alert('Generation Failed', 'Missing outfit step data.');
        return;
      }

      const requestedIds = Object.values(data.steps)
        .filter((step: any) => step && step.id)
        .map((step: any) => step.id);
      const wardrobe = await fetchWardrobeItemsByIds(requestedIds);
      const wardrobeById = new Map(wardrobe.map((item: any) => [item.id, item]));
      const matched = Object.values(data.steps)
        .filter((step: any) => step && step.id)
        .map((step: any) => {
          const match = wardrobeById.get(step.id);
          return match ? { ...match, reason: step.reason } : null;
        })
        .filter(Boolean);

      const sorted = matched.sort(
        (a, b) => DISPLAY_ORDER.indexOf(a.main_category) - DISPLAY_ORDER.indexOf(b.main_category)
      );

      animateTransition();
      setOutfit(sorted);
      setRecentGenerationHistory((prev) => [...prev.slice(-2), sorted.map((item: any) => item.id)]);
      setMode('generated');
    } catch (err: any) {
      console.error('Generate outfit failed:', err?.message || err);
      Alert.alert('Generation Failed', err?.message || String(err));
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const generateOutfitName = async () => {
    const response = await apiPost('/generate-outfit-name', {
      vibe,
      context,
      season,
      temperature,
      items: outfit.map((item) => item.name || item.type),
    });
    const json = await response.json();
    return json.name || 'Untitled Fit';
  };

  const saveOutfit = async () => {
    if (!userId || outfit.length === 0) return;
    const name = await generateOutfitName();

    try {
      await saveMixedOutfit({
        userId,
        name,
        context: `${vibe} + ${context} in ${temperature}°F ${season} weather`,
        season: finalSeason,
        items: outfit.map((item) =>
          normalizeSavedOutfitLikeItem({
            ...item,
            source_type: 'wardrobe',
            source_item_id: item.id || null,
            reason: item.reason,
          }),
        ),
        sourceKind: 'generated',
      });
    } catch (error: any) {
      console.error(error?.message || error);
      Alert.alert('Save Failed', 'Your outfit could not be saved.');
      return;
    }

    Alert.alert('Saved', `Outfit saved as "${name}".`);
  };

  const handleSaveOutfit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveOutfit();
    } finally {
      setSaving(false);
    }
  };

  const handleFateSurpriseMe = useCallback(async () => {
    const nextVariantIndex = fateVariantIndex + 1;
    try {
      setSurpriseLoading(true);
      const uid = await resolveCurrentUserId();
      const [{ profile, preferences }, wardrobeItems] = await Promise.all([
        fetchFateSignals(uid),
        fetchWardrobeForFate(uid),
      ]);

      // Fate stays deterministic here: it builds richer generator inputs from stored signals.
      const nextFateContext = buildFateContext({
        profile,
        preferences,
        wardrobe: wardrobeItems,
        weather: {
          season,
          temperature,
        },
        modeOverrides: {
          variantIndex: nextVariantIndex,
          previous: cachedFateContext,
          avoidKeys: recentFateKeys.slice(-4),
        },
      });

      setVibe(nextFateContext.vibe);
      setContext(nextFateContext.context);
      setSeason(nextFateContext.season);
      setTemperature(nextFateContext.temperature);
      setFatePreview(nextFateContext);
      setCachedFateContext(nextFateContext);
      setFateVariantIndex(nextVariantIndex);
      if (nextFateContext.debug?.selectedKey) {
        setRecentFateKeys((prev) => [...prev.slice(-3), nextFateContext.debug?.selectedKey!]);
      }
    } catch (error: any) {
      console.error('Fate Surprise failed:', error?.message || error);
      const fallbackContext = cachedFateContext || buildFateContext({
        profile: null,
        preferences: null,
        wardrobe: [],
        weather: { season, temperature },
        modeOverrides: {
          variantIndex: nextVariantIndex,
          previous: cachedFateContext,
          avoidKeys: recentFateKeys.slice(-4),
        },
      });
      setVibe(fallbackContext.vibe);
      setContext(fallbackContext.context);
      setSeason(fallbackContext.season);
      setTemperature(fallbackContext.temperature);
      setFatePreview(fallbackContext);
      setCachedFateContext(fallbackContext);
      setFateVariantIndex(nextVariantIndex);
      if (fallbackContext.debug?.selectedKey) {
        setRecentFateKeys((prev) => [...prev.slice(-3), fallbackContext.debug?.selectedKey!]);
      }
    } finally {
      setSurpriseLoading(false);
    }
  }, [
    cachedFateContext,
    fateVariantIndex,
    fetchFateSignals,
    fetchWardrobeForFate,
    recentFateKeys,
    resolveCurrentUserId,
    season,
    temperature,
  ]);

  const formDockBottom = Math.max(tabBarHeight - 1, 0);
  const formContentBottomPadding = formDockBottom + 118;
  const generatedContentBottomPadding = formDockBottom + 138;
  const isSurpriseBusy = surpriseLoading;
  const fateSummaryLine = fatePreview
    ? `Fate picked: ${fatePreview.vibe} for ${fatePreview.context}`
    : null;

  if (mode === 'form') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.flex}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.formScrollContent, { paddingBottom: formContentBottomPadding }]}
          >
            <StylistBriefHeader
              title="Build Your Fit"
              subtitle="Tell us the vibe and we’ll pull a look from your closet."
            />

            <View style={styles.formSection}>
              <InputSection
                label="Vibe"
                placeholder="Confident, clean, relaxed, sharp..."
                value={vibe}
                onChangeText={setVibe}
              />

              <QuickPickChips
                label="Quick picks"
                options={VIBE_OPTIONS}
                selectedValue={vibe}
                onSelect={(value) => setVibe(String(value))}
              />
            </View>

            <View style={styles.formSection}>
              <InputSection
                label="Context"
                placeholder="Dinner downtown, weekday office, weekend city walk..."
                value={context}
                onChangeText={setContext}
              />

              <QuickPickChips
                label="Suggested contexts"
                options={CONTEXT_OPTIONS}
                selectedValue={context}
                onSelect={(value) => setContext(String(value))}
              />
            </View>

            <View style={styles.formSectionCompact}>
              <SeasonSelector value={season} onChange={setSeason} />
            </View>

            <View style={styles.formSectionCompact}>
              <TemperatureInputCard value={temperature} onChange={setTemperature} />
            </View>

            <View style={styles.formSectionCompact}>
              <View style={styles.surpriseSection}>
                <View style={styles.surpriseSectionHeader}>
                  <Text style={styles.surpriseSectionLabel}>Surprise Me</Text>
                  <Text style={styles.surpriseSectionHelper}>
                    Fate builds from your style profile, closet patterns, and season context.
                  </Text>
                </View>

                <View style={styles.surpriseButtonsRow}>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => {
                      void handleFateSurpriseMe();
                    }}
                    disabled={loading || isSurpriseBusy}
                    style={[
                      styles.surpriseButton,
                      styles.fateSurpriseButton,
                      fatePreview && styles.fateSurpriseButtonActive,
                      (loading || isSurpriseBusy) && styles.disabledAction,
                    ]}
                  >
                    <Text
                      style={[
                        styles.fateSurpriseButtonEyebrow,
                      ]}
                    >
                      Curated
                    </Text>
                    <Text style={styles.fateSurpriseButtonText}>
                      {surpriseLoading ? 'Reading your closet...' : 'Fate Surprise Me'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {fatePreview ? (
                  <View style={styles.fateSummaryCard}>
                    <Text style={styles.fateSummaryEyebrow}>Fate Direction</Text>
                    <Text style={styles.fateSummaryTitle}>{fatePreview.vibe}</Text>
                    <Text style={styles.fateSummaryText}>{fatePreview.context}</Text>
                    <Text style={styles.fateSummaryMeta}>
                      {[
                        fatePreview.season ? `Season: ${fatePreview.season}` : null,
                        fatePreview.temperature ? `${fatePreview.temperature}°F` : null,
                        fatePreview.colorDirection?.length
                          ? `Colors: ${fatePreview.colorDirection.join(', ')}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </Text>
                    <Text style={styles.fateSummaryFootnote}>
                      Built from your style profile, closet patterns, and season context.
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {loading && currentStep ? (
              <LoadingCard
                title="Building your look"
                step={currentStep}
              />
            ) : null}
          </ScrollView>

          <View pointerEvents="box-none" style={[styles.formActionsWrap, { bottom: formDockBottom }]}>
            <View style={styles.formActionsCard}>
              <Text style={styles.formActionsEyebrow}>Ready when you are</Text>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  void generateMultistepOutfit();
                }}
                disabled={loading || isSurpriseBusy}
                style={[styles.primaryCta, (loading || isSurpriseBusy) && styles.disabledAction]}
              >
                <Text style={styles.primaryCtaText}>
                  {loading ? 'Generating...' : 'Generate Fit'}
                </Text>
              </TouchableOpacity>
              {fateSummaryLine ? <Text style={styles.formActionsSummary}>{fateSummaryLine}</Text> : null}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.flex}>
        <View style={styles.generatedHeaderRow}>
          <TouchableOpacity
            onPress={() => {
              animateTransition();
              setMode('form');
            }}
            style={styles.generatedBackButton}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={22} color="rgba(28, 28, 28, 0.72)" />
          </TouchableOpacity>
          <Text style={styles.generatedHeaderTitle}>Here’s your styled fit</Text>
          <View style={styles.generatedHeaderSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.generatedScrollContent, { paddingBottom: generatedContentBottomPadding }]}
        >
          <GeneratorSummaryCard
            vibe={vibe}
            context={context}
            season={season || finalSeason}
            temperature={temperature}
          />

          {loading && currentStep ? (
            <LoadingCard
              title="Refreshing your look"
              step={currentStep}
            />
          ) : null}

          <View style={styles.resultsSectionHeader}>
            <Text style={styles.resultsSectionTitle}>Styled look</Text>
            <Text style={styles.resultsSectionText}>
              Lock any piece you want to keep before generating again.
            </Text>
          </View>

          {outfit.length ? (
            outfit.map((item) => (
              <StyledLookItemCard
                key={item.id}
                item={item}
                locked={lockedItems.some((entry) => entry.id === item.id)}
                onToggleLock={() => toggleLockItem(item)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No look yet</Text>
              <Text style={styles.emptyStateText}>
                Edit the brief and generate a look to see styled outfit recommendations here.
              </Text>
            </View>
          )}
        </ScrollView>

        {(outfit.length > 0 || loading) ? (
          <FloatingGeneratorActions
            onSave={() => {
              void handleSaveOutfit();
            }}
            onGenerateAgain={() => {
              void generateMultistepOutfit();
            }}
            onEditInputs={() => {
              animateTransition();
              setMode('form');
            }}
            loading={loading || saving}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  formScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 2,
  },
  formSection: {
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  formSectionCompact: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  inputSection: {
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontFamily: typography.fontFamily,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  loadingCard: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  loadingEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  loadingTitle: {
    marginTop: spacing.xs,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  loadingText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  formActionsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  formActionsCard: {
    paddingTop: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: 'rgba(250, 250, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  formActionsEyebrow: {
    alignSelf: 'center',
    marginBottom: 10,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.05,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  primaryCta: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: typography.fontFamily,
  },
  formActionsSummary: {
    marginTop: 9,
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  disabledAction: {
    opacity: 0.65,
  },
  surpriseSection: {
    gap: 12,
  },
  surpriseSectionHeader: {
    gap: 6,
  },
  surpriseSectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  surpriseSectionHelper: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  surpriseButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  surpriseButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fateSurpriseButton: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.border,
  },
  fateSurpriseButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceContainerLowest,
  },
  fateSurpriseButtonEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 4,
    fontFamily: typography.fontFamily,
  },
  fateSurpriseButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  fateSummaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fateSummaryEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  fateSummaryTitle: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  fateSummaryText: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  fateSummaryMeta: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  fateSummaryFootnote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  generatedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  generatedBackButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
  },
  generatedHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    paddingHorizontal: spacing.sm,
  },
  generatedHeaderSpacer: {
    width: 42,
  },
  generatedScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: spacing.xxl,
  },
  resultsSectionHeader: {
    marginTop: 16,
    marginBottom: 10,
  },
  resultsSectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  resultsSectionText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  emptyState: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  emptyStateText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});
