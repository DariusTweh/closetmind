import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import { decode } from 'base64-arraybuffer';
import OnboardingChip from '../../components/Onboarding/OnboardingChip';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { apiPost } from '../../lib/api';
import { ONBOARDING_STAGES, isMissingColumnError, updateOnboardingProgress } from '../../lib/onboarding';
import { resolvePrivateMediaUrl } from '../../lib/privateMedia';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';
import {
  buildProfileStyleTags,
  fetchStyleProfile,
  mergeStyleProfileSignals,
  normalizeArrayValues,
  normalizeStyleProfile,
  upsertStyleProfile,
  type StructuredStyleProfile,
} from '../../lib/styleProfile';

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 8;
const ONBOARDING_MEDIA_BUCKET = 'onboarding';
const PROFILE_SELECT_FIELDS = 'body_image_paths, body_image_urls';
const PROFILE_LEGACY_SELECT_FIELDS = 'body_image_urls';
const PROFILE_MINIMAL_SELECT_FIELDS = 'id';

function isRemoteAsset(value: string) {
  return /^https?:\/\//i.test(value) || /^data:image\//i.test(value);
}

function hasAiSummarySignals(profile: StructuredStyleProfile | null | undefined) {
  const normalized = normalizeStyleProfile(profile);
  return [
    normalized.core_colors,
    normalized.accent_colors,
    normalized.seasons,
    normalized.keywords,
    normalized.profile_confidence,
  ].some((entry) => (Array.isArray(entry) ? entry.length > 0 : entry != null));
}

function buildStoredAsset(uri: string, previewUri: string) {
  return {
    uri,
    previewUri,
    fileName: previewUri.split('/').pop() || 'stored.jpg',
    mimeType: 'image/jpeg',
  } as ImagePicker.ImagePickerAsset & { previewUri?: string };
}

function splitStoredMediaSources(values: string[] = []) {
  const imagePaths: string[] = [];
  const imageUrls: string[] = [];

  for (const entry of values) {
    const normalized = String(entry || '').trim();
    if (!normalized) continue;
    if (isRemoteAsset(normalized)) {
      imageUrls.push(normalized);
    } else {
      imagePaths.push(normalized.replace(/^\/+/, ''));
    }
  }

  return { imagePaths, imageUrls };
}

function buildAssetSignature(
  values: Array<ImagePicker.ImagePickerAsset & { previewUri?: string }> = [],
) {
  return values
    .map((asset) => String(asset?.uri || '').trim())
    .filter(Boolean)
    .sort()
    .join('|');
}

function buildSourceSignature(values: string[] = []) {
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .sort()
    .join('|');
}

type EditableFieldKey =
  | 'primary_vibes'
  | 'silhouettes'
  | 'fit_prefs'
  | 'core_colors'
  | 'accent_colors'
  | 'seasons'
  | 'preferred_occasions'
  | 'keywords';

const EDITABLE_SECTIONS: Array<{
  key: EditableFieldKey;
  title: string;
  description: string;
}> = [
  {
    key: 'primary_vibes',
    title: 'Vibes',
    description: 'The main energies the app sees in the outfits you actually wear.',
  },
  {
    key: 'silhouettes',
    title: 'Silhouettes',
    description: 'The shapes and proportions repeating through your looks.',
  },
  {
    key: 'fit_prefs',
    title: 'Fit Direction',
    description: 'The fit signals AI found across your photos.',
  },
  {
    key: 'core_colors',
    title: 'Core Colors',
    description: 'The tones your closet keeps returning to.',
  },
  {
    key: 'accent_colors',
    title: 'Accent Colors',
    description: 'Colors that show up as stronger supporting signals.',
  },
  {
    key: 'seasons',
    title: 'Seasons',
    description: 'The seasonal lanes these looks naturally fit into.',
  },
  {
    key: 'preferred_occasions',
    title: 'Occasions',
    description: 'Where these outfits look most believable in real life.',
  },
  {
    key: 'keywords',
    title: 'Keywords',
    description: 'Plain-language style descriptors inferred from the outfits.',
  },
];

export default function OnboardingStyleUploadScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Array<ImagePicker.ImagePickerAsset & { previewUri?: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [baseProfile, setBaseProfile] = useState<StructuredStyleProfile | null>(null);
  const [reviewProfile, setReviewProfile] = useState<StructuredStyleProfile | null>(null);
  const [editingField, setEditingField] = useState<EditableFieldKey | null>(null);
  const [newValueInput, setNewValueInput] = useState('');
  const [hydrating, setHydrating] = useState(true);
  const [reviewSourceSignature, setReviewSourceSignature] = useState('');
  const [modelSourcePayload, setModelSourcePayload] = useState<{ imagePaths: string[]; imageUrls: string[] }>({
    imagePaths: [],
    imageUrls: [],
  });

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const { data: userRes, error: userError } = await supabase.auth.getUser();
        if (userError || !userRes?.user) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        const uid = userRes.user.id;
        setUserId(uid);

        let profileResponse: any = await supabase
          .from('profiles')
          .select(PROFILE_SELECT_FIELDS)
          .eq('id', uid)
          .maybeSingle();

        if (profileResponse.error && isMissingColumnError(profileResponse.error, 'body_image_paths')) {
          profileResponse = await supabase
            .from('profiles')
            .select(PROFILE_LEGACY_SELECT_FIELDS)
            .eq('id', uid)
            .maybeSingle();
        }

        if (profileResponse.error && isMissingColumnError(profileResponse.error, 'body_image_urls')) {
          profileResponse = await supabase
            .from('profiles')
            .select(PROFILE_MINIMAL_SELECT_FIELDS)
            .eq('id', uid)
            .maybeSingle();
        }

        if (profileResponse.error) {
          throw profileResponse.error;
        }

        const existingStyleProfile = await fetchStyleProfile(uid).catch(() => normalizeStyleProfile({}));
        if (cancelled) return;

        setBaseProfile(existingStyleProfile);

        const storedSources = Array.isArray(profileResponse.data?.body_image_paths) && profileResponse.data.body_image_paths.length
          ? profileResponse.data.body_image_paths
          : Array.isArray(profileResponse.data?.body_image_urls)
            ? profileResponse.data.body_image_urls
            : [];
        const storedSourceSignature = buildSourceSignature(storedSources);

        if (!cancelled) {
          setModelSourcePayload(splitStoredMediaSources(storedSources));
          setReviewSourceSignature(hasAiSummarySignals(existingStyleProfile) ? storedSourceSignature : '');
        }

        if (storedSources.length) {
          const storedAssets = (
            await Promise.all(
              storedSources.slice(0, MAX_PHOTOS).map(async (entry) => {
                const normalized = String(entry || '').trim();
                if (!normalized) return null;
                const previewUri = isRemoteAsset(normalized)
                  ? normalized
                  : await resolvePrivateMediaUrl({
                      path: normalized,
                      bucket: ONBOARDING_MEDIA_BUCKET,
                    }).catch(() => normalized);
                return buildStoredAsset(normalized, previewUri || normalized);
              }),
            )
          ).filter(Boolean) as Array<ImagePicker.ImagePickerAsset & { previewUri?: string }>;

          if (!cancelled) {
            setAssets(storedAssets);
          }
        }

        if (!cancelled && hasAiSummarySignals(existingStyleProfile)) {
          setReviewProfile(existingStyleProfile);
        }
      } catch (error: any) {
        console.error('Load onboarding upload state failed:', error?.message || error);
        Alert.alert('Error', 'Could not restore your onboarding upload progress.');
      } finally {
        if (!cancelled) setHydrating(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const reviewFieldValues = useMemo(
    () =>
      ({
        primary_vibes: reviewProfile?.primary_vibes || [],
        silhouettes: reviewProfile?.silhouettes || [],
        fit_prefs: Array.isArray(reviewProfile?.fit_prefs) ? reviewProfile.fit_prefs : [],
        core_colors: reviewProfile?.core_colors || [],
        accent_colors: reviewProfile?.accent_colors || [],
        seasons: reviewProfile?.seasons || [],
        preferred_occasions: reviewProfile?.preferred_occasions || [],
        keywords: reviewProfile?.keywords || [],
      }) as Record<EditableFieldKey, string[]>,
    [reviewProfile],
  );

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!result.canceled) {
      const selected = result.assets.slice(0, MAX_PHOTOS);
      setAssets(selected);
    }
  };

  const updateReviewField = (field: EditableFieldKey, nextValues: string[]) => {
    setReviewProfile((current) =>
      normalizeStyleProfile({
        ...(current || {}),
        [field]: nextValues,
      }),
    );
  };

  const addValueToReviewField = (field: EditableFieldKey) => {
    if (!newValueInput.trim()) return;
    const nextValues = normalizeArrayValues(
      [...(reviewFieldValues[field] || []), newValueInput],
      field === 'keywords' ? 10 : 8,
    );
    updateReviewField(field, nextValues);
    setEditingField(field);
    setNewValueInput('');
  };

  const uploadAll = async () => {
    if (!userId) return;
    if (assets.length < MIN_PHOTOS) {
      Alert.alert('Add more photos', `Please upload at least ${MIN_PHOTOS} outfits.`);
      return;
    }

    setUploading(true);
    try {
      const uploadedSources: string[] = [];

      for (let i = 0; i < assets.length; i += 1) {
        const asset = assets[i];
        const existingUri = String(asset.uri || '').trim();

        if (existingUri && !existingUri.startsWith('file://')) {
          uploadedSources.push(existingUri);
          continue;
        }

        const normalized = await ImageManipulator.manipulateAsync(
          asset.uri,
          [],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
        );

        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const path = `body/${userId}/${fileName}`;

        const fileData = await FileSystem.readAsStringAsync(normalized.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { error: uploadErr } = await supabase.storage
          .from(ONBOARDING_MEDIA_BUCKET)
          .upload(
            path,
            decode(fileData),
            { contentType: 'image/jpeg', upsert: false },
          );

        if (uploadErr) throw uploadErr;

        uploadedSources.push(path);
        const previewUri = await resolvePrivateMediaUrl({
          path,
          bucket: ONBOARDING_MEDIA_BUCKET,
        }).catch(() => normalized.uri);

        setAssets((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uri: path, previewUri: previewUri || normalized.uri } as any;
          return updated;
        });
      }

      const imagePaths = uploadedSources
        .filter((entry) => !isRemoteAsset(entry))
        .map((entry) => String(entry || '').replace(/^\/+/, ''));
      const imageUrls = uploadedSources.filter((entry) => isRemoteAsset(entry));
      setModelSourcePayload({ imagePaths, imageUrls });

      let profileUpdate = await supabase
        .from('profiles')
        .update({
          body_image_paths: imagePaths.length ? imagePaths : null,
          body_image_urls: imageUrls.length ? imageUrls : null,
        })
        .eq('id', userId);

      if (profileUpdate.error && isMissingColumnError(profileUpdate.error, 'body_image_paths')) {
        profileUpdate = await supabase
          .from('profiles')
          .update({ body_image_urls: uploadedSources })
          .eq('id', userId);
      }

      if (profileUpdate.error && isMissingColumnError(profileUpdate.error, 'body_image_urls')) {
        console.warn('Profile image-source columns are missing; continuing with in-memory onboarding image sources.');
        profileUpdate = { error: null } as any;
      }

      if (profileUpdate.error) throw profileUpdate.error;

      const resp = await apiPost('/style/build-profile', {
        user_id: userId,
        image_paths: imagePaths,
        image_urls: imageUrls,
        brand_picks: [],
      });

      const json = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(json?.error || 'Profile build failed');

      const mergedProfile = mergeStyleProfileSignals({
        manualProfile: baseProfile,
        existingProfile: baseProfile,
        aiProfile: json?.profile || json || {},
      });

      setReviewProfile(mergedProfile);
      setReviewSourceSignature(buildSourceSignature(uploadedSources));
      Alert.alert('Style profile ready', 'Review the summary, edit anything that feels off, then continue.');
    } catch (e: any) {
      console.error('❌ Onboarding upload error:', e);
      Alert.alert('Error', e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!userId || !reviewProfile) return;

    setSavingReview(true);
    try {
      const normalizedReview = normalizeStyleProfile(reviewProfile);
      const mirroredStyleTags = buildProfileStyleTags(normalizedReview);
      const nextImagePaths = modelSourcePayload.imagePaths;
      const nextImageUrls = modelSourcePayload.imageUrls;

      let saveError: any = null;
      try {
        await upsertStyleProfile(userId, normalizedReview);
      } catch (error: any) {
        saveError = error;
        console.error('Save reviewed style profile failed:', error?.message || error);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ style_tags: mirroredStyleTags })
        .eq('id', userId);

      if (profileError) throw profileError;

      await updateOnboardingProgress(userId, { stage: ONBOARDING_STAGES.PREFERENCE_SIGNALS }).catch((error) => {
        console.warn('Onboarding stage update failed:', error?.message || error);
      });

      if (saveError) {
        Alert.alert(
          'Continuing with partial save',
          'Your visible style tags were saved, but the full AI profile could not be written yet. You can keep going and retry later.',
        );
      }

      navigation.navigate('OnboardingPreferenceSignals', {
        onboardingImagePaths: nextImagePaths,
        onboardingImageUrls: nextImageUrls,
        prefilledStyleProfile: normalizedReview,
      });
    } catch (error: any) {
      console.error('Continue after profile review failed:', error?.message || error);
      Alert.alert('Error', error?.message || 'Could not save your reviewed style profile.');
    } finally {
      setSavingReview(false);
    }
  };

  const currentAssetSignature = useMemo(() => buildAssetSignature(assets), [assets]);

  if (hydrating) {
    return (
      <OnboardingScaffold
        step="Step 5 of 6"
        title="Upload the looks that actually represent you."
        subtitle={`Upload ${MIN_PHOTOS} to ${MAX_PHOTOS} full-body outfit photos you actually wore. Klozu will build your first style profile from these and reuse them to build your try-on model.`}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      </OnboardingScaffold>
    );
  }

  const showReview = Boolean(reviewProfile);
  const summaryNeedsRefresh =
    assets.length >= MIN_PHOTOS &&
    (!showReview || !reviewSourceSignature || reviewSourceSignature !== currentAssetSignature);
  const primaryActionLabel = !showReview
    ? 'Create My Style Profile'
    : summaryNeedsRefresh
      ? 'Rebuild Style Summary'
      : 'Save Profile & Add Extras';
  const primaryActionBusy = summaryNeedsRefresh ? uploading : savingReview;
  const primaryActionDisabled =
    primaryActionBusy || (summaryNeedsRefresh && assets.length < MIN_PHOTOS);
  const handlePrimaryAction = summaryNeedsRefresh ? uploadAll : handleContinue;

  return (
    <OnboardingScaffold
      step="Step 5 of 6"
      title="Upload the looks that actually represent you."
      subtitle={`Upload ${MIN_PHOTOS} to ${MAX_PHOTOS} full-body outfit photos you actually wore. Klozu will read your style from these first, then use the same images to build your try-on model.`}
      scroll
      footer={
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.primaryButton, primaryActionDisabled && styles.buttonDisabled]}
          onPress={handlePrimaryAction}
          disabled={primaryActionDisabled}
        >
          {primaryActionBusy ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What to upload</Text>
        <Text style={styles.infoText}>Full-body outfits. Natural lighting. The looks you actually reach for, not aspirational filler. These same uploads also seed your virtual try-on model.</Text>
      </View>

      <View style={styles.toolbar}>
        <View>
          <Text style={styles.countTitle}>{assets.length} selected</Text>
          <Text style={styles.countText}>Minimum {MIN_PHOTOS}. Maximum {MAX_PHOTOS}.</Text>
        </View>
        <TouchableOpacity activeOpacity={0.84} style={styles.secondaryButton} onPress={pickImages}>
          <Text style={styles.secondaryButtonText}>{assets.length ? 'Change Photos' : 'Select Photos'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {assets.map((asset, index) => {
          const uri = (asset as any).previewUri || asset.uri;
          return (
            <View key={uri || String(index)} style={styles.thumbCell}>
              <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
            </View>
          );
        })}

        {assets.length < MAX_PHOTOS ? (
          <View style={styles.thumbCell}>
            <TouchableOpacity activeOpacity={0.84} onPress={pickImages} style={[styles.thumb, styles.addTile]}>
              <Text style={styles.addTilePlus}>+</Text>
              <Text style={styles.addTileText}>Add Look</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {showReview ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>Review Your Profile</Text>
          <Text style={styles.summaryTitle}>Edit anything the AI over- or under-read.</Text>
          <Text style={styles.summaryText}>
            Manual corrections win. This is the version Klozu will carry into generation, suggestions, and future verdicts.
          </Text>

          {reviewProfile?.profile_confidence != null ? (
            <Text style={styles.confidenceText}>
              AI confidence: {Math.round(Number(reviewProfile.profile_confidence) * 100) / 100}
            </Text>
          ) : null}

          {EDITABLE_SECTIONS.map((section) => (
            <View key={section.key} style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>{section.title}</Text>
              <Text style={styles.reviewDescription}>{section.description}</Text>
              <View style={styles.chipWrap}>
                {(reviewFieldValues[section.key] || []).map((value) => (
                  <OnboardingChip
                    key={`${section.key}_${value}`}
                    label={formatChipLabel(value)}
                    selected
                    onPress={() =>
                      updateReviewField(
                        section.key,
                        (reviewFieldValues[section.key] || []).filter((entry) => entry !== value),
                      )
                    }
                  />
                ))}
              </View>

              <View style={styles.addRow}>
                <TextInput
                  value={editingField === section.key ? newValueInput : ''}
                  onChangeText={(value) => {
                    setEditingField(section.key);
                    setNewValueInput(value);
                  }}
                  placeholder={`Add ${section.title.toLowerCase()}...`}
                  placeholderTextColor={colors.textMuted}
                  style={styles.addInput}
                />
                <TouchableOpacity
                  activeOpacity={0.84}
                  style={styles.inlineAddButton}
                  onPress={() => {
                    setEditingField(section.key);
                    addValueToReviewField(section.key);
                  }}
                >
                  <Text style={styles.inlineAddButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </OnboardingScaffold>
  );
}

function formatChipLabel(value: string) {
  return String(value || '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerStack: {
    gap: spacing.sm,
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
    fontFamily: typography.fontFamily,
  },
  infoText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  countTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  countText: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
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
    opacity: 0.45,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: spacing.lg,
  },
  thumbCell: {
    width: '33.333%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  thumb: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: 18,
  },
  addTile: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTilePlus: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  addTileText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  summaryEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  summaryTitle: {
    marginTop: spacing.xs,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  summaryText: {
    marginTop: spacing.xs,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  confidenceText: {
    marginTop: spacing.sm,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  reviewSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  reviewTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  reviewDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  inlineAddButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddButtonText: {
    color: colors.textOnAccent,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
