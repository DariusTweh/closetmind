import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import { decode } from 'base64-arraybuffer';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { apiPost } from '../../lib/api';
import { resolvePrivateMediaUrl } from '../../lib/privateMedia';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 8;
const ONBOARDING_MEDIA_BUCKET = 'onboarding';

const hasMissingProfileColumn = (message: string, field: string) => {
  const normalized = String(message || '').toLowerCase();
  const normalizedField = String(field || '').toLowerCase();
  return (
    normalized.includes(`profiles.${normalizedField}`) ||
    normalized.includes(`'${normalizedField}' column of 'profiles'`) ||
    (normalized.includes("column of 'profiles'") && normalized.includes(normalizedField))
  );
};

export default function OnboardingStyleUploadScreen() {
  const navigation = useNavigation<any>();
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

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

  const uploadAll = async () => {
    if (assets.length < MIN_PHOTOS) {
      Alert.alert('Add more photos', `Please upload at least ${MIN_PHOTOS} outfits.`);
      return;
    }

    setUploading(true);
    try {
      const { data: userRes, error: uerr } = await supabase.auth.getUser();
      if (uerr || !userRes?.user) throw new Error('Not signed in');
      const userId = userRes.user.id;

      const uploadedPaths: string[] = [];

      for (let i = 0; i < assets.length; i += 1) {
        const asset = assets[i];

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
          .from('onboarding')
          .upload(
            path,
            decode(fileData),
            { contentType: 'image/jpeg', upsert: false },
          );

        if (uploadErr) throw uploadErr;

        uploadedPaths.push(path);
        const previewUri = await resolvePrivateMediaUrl({
          path,
          bucket: ONBOARDING_MEDIA_BUCKET,
        }).catch(() => normalized.uri);

        setAssets((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], previewUri: previewUri || normalized.uri } as any;
          return updated;
        });
      }

      let profileUpdate = await supabase
        .from('profiles')
        .update({ body_image_paths: uploadedPaths, body_image_urls: null })
        .eq('id', userId);

      if (profileUpdate.error && hasMissingProfileColumn(profileUpdate.error.message, 'body_image_paths')) {
        profileUpdate = await supabase
          .from('profiles')
          .update({ body_image_urls: uploadedPaths })
          .eq('id', userId);
      }

      if (profileUpdate.error) throw profileUpdate.error;

      const resp = await apiPost('/style/build-profile', {
        user_id: userId,
        image_paths: uploadedPaths,
        brand_picks: [],
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Profile build failed');

      setProfile(json.profile);
      Alert.alert('Style profile ready', 'We created your style summary.');
    } catch (e: any) {
      console.error('❌ Onboarding upload error:', e);
      Alert.alert('Error', e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const footerAction = profile
    ? {
        label: 'Continue to Model',
        onPress: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'OnboardingModal' }],
          });
        },
        disabled: false,
      }
    : {
        label: uploading ? 'Analyzing…' : 'Create My Style Profile',
        onPress: uploadAll,
        disabled: uploading || assets.length < MIN_PHOTOS,
      };

  return (
    <OnboardingScaffold
      step="Step 6 of 6"
      title="Show us your real style."
      subtitle={`Upload ${MIN_PHOTOS} to ${MAX_PHOTOS} full-body outfit photos you actually wore so ClosetMind can build a profile around your real wardrobe decisions.`}
      scroll
      footer={
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.primaryButton, footerAction.disabled && styles.buttonDisabled]}
          onPress={footerAction.onPress}
          disabled={footerAction.disabled}
        >
          {uploading && !profile ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>{footerAction.label}</Text>
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What to upload</Text>
        <Text style={styles.infoText}>Full-body outfits. Natural lighting. The looks you actually reach for, not aspirational filler.</Text>
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

      {profile ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>Style Summary</Text>
          <Text style={styles.summaryTitle}>Your profile is ready.</Text>
          <TagRow title="Vibes" items={profile.primary_vibes} />
          <TagRow title="Silhouettes" items={profile.silhouettes} />
          <TagRow title="Core Colors" items={profile.core_colors} />
          <TagRow title="Accents" items={profile.accent_colors} />
          <TagRow title="Seasons" items={profile.seasons} />
        </View>
      ) : null}
    </OnboardingScaffold>
  );
}

function TagRow({ title, items = [] as string[] }) {
  if (!items?.length) return null;
  return (
    <View style={styles.tagRow}>
      <Text style={styles.tagRowTitle}>{title}</Text>
      <View style={styles.tagWrap}>
        {items.map((tag) => (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginTop: spacing.xs,
    fontSize: 12.5,
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
    marginTop: spacing.sm,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  tagRow: {
    marginTop: spacing.md,
  },
  tagRowTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
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
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
