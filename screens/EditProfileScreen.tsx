// screens/EditProfileScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import { colors, shadows, spacing, typography } from '../lib/theme';

const PROFILE_SELECT_FIELDS = 'id, full_name, username, bio, style_tags, avatar_url, avatar_path';
const PROFILE_LEGACY_SELECT_FIELDS = 'id, full_name, username, bio, style_tags, avatar_url';
const PROFILE_MEDIA_BUCKET = 'onboarding';

function hasMissingProfileColumn(message: string, field: string) {
  const normalized = String(message || '').toLowerCase();
  const normalizedField = String(field || '').toLowerCase();
  return (
    normalized.includes(`profiles.${normalizedField}`) ||
    normalized.includes(`'${normalizedField}' column of 'profiles'`) ||
    (normalized.includes("column of 'profiles'") && normalized.includes(normalizedField))
  );
}

function normalizeUsername(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._]/g, '');
}

function base64ToUint8Array(b64: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = b64.length * 0.75;
  const len = b64.length;
  let p = 0;
  if (b64[b64.length - 1] === '=') bufferLength--;
  if (b64[b64.length - 2] === '=') bufferLength--;
  const bytes = new Uint8Array(bufferLength);

  for (let i = 0; i < len; i += 4) {
    const encoded1 = chars.indexOf(b64[i]);
    const encoded2 = chars.indexOf(b64[i + 1]);
    const encoded3 = chars.indexOf(b64[i + 2]);
    const encoded4 = chars.indexOf(b64[i + 3]);
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== 64) bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
  }

  return bytes;
}

async function readImageBytes(uri: string) {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error('Selected image could not be read.');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToUint8Array(base64);
  if (!bytes.length) {
    throw new Error('Selected image was empty.');
  }
  return bytes;
}

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [styleTags, setStyleTags] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPath, setAvatarPath] = useState('');
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [newTag, setNewTag] = useState('');

  const normalizedUsernamePreview = useMemo(() => normalizeUsername(username), [username]);
  const heroSubtitle = normalizedUsernamePreview
    ? `Editing @${normalizedUsernamePreview}`
    : 'Update the identity, photo, and style signature attached to your closet.';
  const avatarInitials = useMemo(() => {
    const source = String(fullName || username || 'CM').trim();
    if (!source) return 'CM';
    const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join('') || source.slice(0, 2).toUpperCase();
  }, [fullName, username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to edit your profile.');
        return;
      }

      let response = await supabase
        .from('profiles')
        .select(PROFILE_SELECT_FIELDS)
        .eq('id', user.id)
        .single();

      if (response.error && hasMissingProfileColumn(response.error.message, 'avatar_path')) {
        response = await supabase
          .from('profiles')
          .select(PROFILE_LEGACY_SELECT_FIELDS)
          .eq('id', user.id)
          .single();
      }

      if (response.error) throw response.error;

      setProfile(response.data);
      setFullName(response.data.full_name || '');
      setUsername(response.data.username || '');
      setBio(response.data.bio || '');
      setStyleTags(response.data.style_tags || []);
      setAvatarUrl(response.data.avatar_url || '');
      setAvatarPath(response.data.avatar_path || '');
    } catch (error: any) {
      console.error('EditProfile fetch failed:', error?.message || error);
      Alert.alert('Error', 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchProfile();
  }, [isFocused]);

  useEffect(() => {
    let cancelled = false;
    const nextAvatarUrl = String(avatarUrl || '').trim();
    const nextAvatarPath = String(avatarPath || '').trim();
    if (!nextAvatarUrl && !nextAvatarPath) {
      setAvatarPreviewUrl('');
      return;
    }

    setAvatarPreviewUrl(nextAvatarUrl);
    resolvePrivateMediaUrl({
      path: nextAvatarPath || null,
      legacyUrl: nextAvatarUrl,
      bucket: PROFILE_MEDIA_BUCKET,
    })
      .then((resolvedUrl) => {
        if (!cancelled) {
          setAvatarPreviewUrl(resolvedUrl || nextAvatarUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvatarPreviewUrl(nextAvatarUrl);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [avatarPath, avatarUrl]);

  const handleSave = async () => {
    if (saving) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Error', 'You are not logged in.');

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername && !/^[a-z0-9._]{3,20}$/.test(normalizedUsername)) {
      Alert.alert('Invalid username', 'Use 3 to 20 lowercase letters, numbers, periods, or underscores.');
      return;
    }

    setSaving(true);
    const profilePayload = {
      full_name: fullName,
      username: normalizedUsername || null,
      bio,
      style_tags: styleTags,
      avatar_url: avatarPath ? null : avatarUrl || null,
      avatar_path: avatarPath || null,
    };

    let response = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', user.id);

    if (response.error && hasMissingProfileColumn(response.error.message, 'avatar_path')) {
      response = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: normalizedUsername || null,
          bio,
          style_tags: styleTags,
          avatar_url: avatarPath ? null : avatarUrl || null,
        })
        .eq('id', user.id);
    }

    if (response.error) {
      setSaving(false);
      console.error(response.error.message);
      if (response.error.code === '23505') {
        Alert.alert('Username unavailable', 'That username is already taken.');
      } else {
        Alert.alert('Error', 'Could not update profile.');
      }
    } else {
      navigation.goBack();
    }
  };

  const pickImageAndUpload = async () => {
    if (uploadingAvatar) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Error', 'You are not logged in.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setUploadingAvatar(true);
      try {
        const file = result.assets[0];
        const fileExt = (file.uri.split('.').pop() || 'jpg').toLowerCase();
        const fileName = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${fileExt}`;
        const filePath = `avatars/${user.id}/${fileName}`;
        const fileBytes = await readImageBytes(file.uri);

        setAvatarPreviewUrl(file.uri);

        const { error: uploadError } = await supabase.storage
          .from(PROFILE_MEDIA_BUCKET)
          .upload(filePath, fileBytes, {
            contentType: file.mimeType || 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        let updateResponse = await supabase
          .from('profiles')
          .update({ avatar_url: null, avatar_path: filePath })
          .eq('id', user.id);

        if (updateResponse.error && hasMissingProfileColumn(updateResponse.error.message, 'avatar_path')) {
          updateResponse = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', user.id);
        }

        if (updateResponse.error) {
          throw updateResponse.error;
        }

        const resolvedAvatarUrl = await resolvePrivateMediaUrl({
          path: filePath,
          legacyUrl: null,
          bucket: PROFILE_MEDIA_BUCKET,
        }).catch(() => null);

        setAvatarPath(filePath);
        setAvatarUrl('');
        setAvatarPreviewUrl(resolvedAvatarUrl || file.uri);
        Alert.alert('Success', 'Profile picture updated!');
      } catch (error: any) {
        console.error('Avatar upload failed:', error?.message || error);
        Alert.alert('Error', error?.message || 'Could not upload your profile picture.');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 142 + Math.max(insets.bottom, spacing.sm) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={21} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.eyebrow}>Profile Studio</Text>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>{heroSubtitle}</Text>

          <View style={styles.heroCard}>
            <TouchableOpacity activeOpacity={0.9} onPress={pickImageAndUpload} style={styles.avatarButton}>
              {avatarPreviewUrl || avatarUrl ? (
                <Image
                  source={{ uri: avatarPreviewUrl || avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{avatarInitials}</Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera-outline" size={15} color={colors.textOnAccent} />
              </View>
              {uploadingAvatar ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={colors.textOnAccent} />
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={styles.heroCopy}>
              <Text style={styles.heroName}>{fullName || 'Shape your profile identity.'}</Text>
              <Text style={styles.heroHandle}>
                {normalizedUsernamePreview ? `@${normalizedUsernamePreview}` : 'Add the name and handle that will anchor your closet.'}
              </Text>
              <TouchableOpacity activeOpacity={0.86} onPress={pickImageAndUpload} style={styles.heroAction}>
                <Ionicons name="images-outline" size={15} color={colors.textPrimary} />
                <Text style={styles.heroActionText}>{uploadingAvatar ? 'Uploading Photo' : 'Change Photo'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>Identity</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                {normalizedUsernamePreview
                  ? `Will appear as @${normalizedUsernamePreview}`
                  : 'Use 3 to 20 lowercase letters, numbers, periods, or underscores.'}
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>Style Notes</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                style={[styles.input, styles.multilineInput]}
                placeholder="Describe your personal style, favorite silhouettes, or what you shop for."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Style Tags</Text>

              <View style={styles.tagInputRow}>
                <TextInput
                  placeholder="Add a tag..."
                  value={newTag}
                  onChangeText={setNewTag}
                  style={styles.tagInput}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (newTag.trim() && !styleTags.includes(newTag.trim())) {
                      setStyleTags([...styleTags, newTag.trim()]);
                      setNewTag('');
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (newTag.trim() && !styleTags.includes(newTag.trim())) {
                      setStyleTags([...styleTags, newTag.trim()]);
                      setNewTag('');
                    }
                  }}
                  style={styles.addTagBtn}
                >
                  <Ionicons name="add" size={18} color={colors.textOnAccent} />
                </TouchableOpacity>
              </View>

              {styleTags.length ? (
                <View style={styles.tagContainer}>
                  {styleTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => setStyleTags(styleTags.filter((t) => t !== tag))}
                      style={styles.tagPillSelected}
                      activeOpacity={0.86}
                    >
                      <Text style={styles.tagTextSelected}>{tag}</Text>
                      <Ionicons name="close" size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.helperText}>Add a few tags that define the energy of your closet.</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View
          pointerEvents="box-none"
          style={[styles.footerDockWrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs }]}
        >
          <View style={styles.footerDock}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textOnAccent} />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  heroCard: {
    marginTop: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...shadows.card,
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.surfaceContainer,
  },
  avatarFallback: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: 'Georgia',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: 54,
    backgroundColor: 'rgba(28, 28, 28, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  heroHandle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  heroAction: {
    alignSelf: 'flex-start',
    marginTop: 14,
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroActionText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  sectionCard: {
    marginTop: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg - 2,
    ...shadows.card,
  },
  sectionEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
  },
  fieldGroup: {
    marginTop: spacing.sm,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: typography.fontFamily,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  multilineInput: {
    minHeight: 120,
    paddingTop: 15,
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  addTagBtn: {
    width: 50,
    height: 50,
    backgroundColor: colors.accent,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPillSelected: {
    minHeight: 38,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagTextSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: typography.fontFamily,
  },
  footerDockWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
  footerDock: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(250, 250, 255, 0.98)',
    padding: 10,
    ...shadows.card,
  },
  saveBtn: {
    minHeight: 54,
    backgroundColor: colors.accent,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
