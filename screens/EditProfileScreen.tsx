// screens/EditProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import { colors } from '../lib/theme';

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Edit Profile</Text>

          <TouchableOpacity onPress={pickImageAndUpload}>
            <Image
              source={{ uri: avatarPreviewUrl || avatarUrl || 'https://i.pravatar.cc/150?img=3' }}
              style={styles.avatar}
            />
            {uploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </TouchableOpacity>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            placeholder="Full name"
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            placeholder="Username"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            style={[styles.input, { height: 80 }]}
            placeholder="Tell us about your style..."
            multiline
          />

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
              <Ionicons name="add" size={20} color={colors.textOnAccent} />
            </TouchableOpacity>
          </View>

          <View style={styles.tagContainer}>
            {styleTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => setStyleTags(styleTags.filter((t) => t !== tag))}
                style={styles.tagPillSelected}
              >
                <Text style={styles.tagTextSelected}>{tag} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 80,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: colors.textPrimary,
    alignSelf: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 24,
    backgroundColor: colors.surfaceContainer,
  },
  avatarOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 18,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  tagPill: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
tagPillSelected: {
  backgroundColor: colors.accent,
  borderRadius: 14,
  paddingVertical: 6,
  paddingHorizontal: 14,
  marginBottom: 8,
},
  tagText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
 tagTextSelected: {
  color: colors.textOnAccent,
  fontWeight: '500',
  fontSize: 13,
},
  saveBtn: {
    marginTop: 36,
    backgroundColor: colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tagInputRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 12,
  marginBottom: 10,
  gap: 8,
},
tagInput: {
  flex: 1,
  backgroundColor: colors.surfaceContainer,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.textPrimary,
},
addTagBtn: {
  backgroundColor: colors.textPrimary,
  borderRadius: 14,
  padding: 10,
},
});
