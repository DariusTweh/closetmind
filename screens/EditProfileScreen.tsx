// screens/EditProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
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
import { supabase } from '../lib/supabase';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [styleTags, setStyleTags] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newTag, setNewTag] = useState('');

  const fetchProfile = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Error', 'You must be logged in to edit your profile.');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error(error.message);
    } else {
      setProfile(data);
      setFullName(data.full_name || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setStyleTags(data.style_tags || []);
      setAvatarUrl(data.avatar_url || '');
    }
  };

  useEffect(() => {
    if (isFocused) fetchProfile();
  }, [isFocused]);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Error', 'You are not logged in.');

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        username,
        bio,
        style_tags: styleTags,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id);

    if (error) {
      console.error(error.message);
      Alert.alert('Error', 'Could not update profile.');
    } else {
      navigation.goBack();
    }
  };

  const pickImageAndUpload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Error', 'You are not logged in.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      const fileExt = file.uri.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, {
          uri: file.uri,
          type: 'image/jpeg',
          name: fileName,
        }, { upsert: true });

      if (uploadError) {
        console.error('Upload failed:', uploadError);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (!updateError) {
        setAvatarUrl(publicUrl);
        Alert.alert('Success', 'Profile picture updated!');
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f3' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Edit Profile</Text>

          <TouchableOpacity onPress={pickImageAndUpload}>
            <Image
              source={{ uri: avatarUrl || 'https://i.pravatar.cc/150?img=3' }}
              style={styles.avatar}
            />
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
              placeholderTextColor="#999"
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
              <Ionicons name="add" size={20} color="#fff" />
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

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>Save Changes</Text>
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#111',
    alignSelf: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 24,
    backgroundColor: '#e0dcd5',
  },
  label: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 18,
  },
  input: {
    backgroundColor: '#e7e2db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  tagPill: {
    backgroundColor: '#e7e2db',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
tagPillSelected: {
  backgroundColor: '#b7d1b4',
  borderRadius: 24,
  paddingVertical: 6,
  paddingHorizontal: 14,
  marginBottom: 8,
},
  tagText: {
    fontSize: 14,
    color: '#333',
  },
 tagTextSelected: {
  color: '#111',
  fontWeight: '500',
  fontSize: 13,
},
  saveBtn: {
    marginTop: 36,
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
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
  backgroundColor: '#e7e2db',
  borderRadius: 20,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 14,
  color: '#111',
},
addTagBtn: {
  backgroundColor: '#111',
  borderRadius: 20,
  padding: 10,
},
});
