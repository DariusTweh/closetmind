// screens/OnboardingStyleUploadScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

import { File, Directory, Paths } from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { decode } from 'base64-arraybuffer';



const MIN_PHOTOS = 3;
const MAX_PHOTOS = 8;
export default function OnboardingStyleUploadScreen() {
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const navigation = useNavigation();
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
    console.log('🚀 Starting uploadAll with assets:', assets);

    const { data: userRes, error: uerr } = await supabase.auth.getUser();
    if (uerr || !userRes?.user) throw new Error('Not signed in');
    const userId = userRes.user.id;
    console.log('👤 User ID:', userId);

    const publicUrls: string[] = [];
    const base64Urls: string[] = [];

    for (let i = 0; i < assets.length; i++) {
      const a = assets[i];
      console.log(`🖼️ Processing image #${i + 1} - URI:`, a.uri);

      // Normalize image
      const normalized = await ImageManipulator.manipulateAsync(
        a.uri,
        [],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const path = `${userId}/${fileName}`;
        const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/onboarding/${path}`;

      console.log('📤 Uploading image to Supabase...');
      
      const fileData = await FileSystem.readAsStringAsync(normalized.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: uploadErr } = await supabase.storage
        .from('onboarding')
        .upload(
          path,
          decode(fileData), // pass binary
          { contentType: 'image/jpeg', upsert: false }
        );

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage.from('onboarding').getPublicUrl(path);
      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('No public URL returned');

      console.log('✅ Uploaded image URL:', publicUrl);
      publicUrls.push(publicUrl);

      // Update state so the grid shows the uploaded public URL
      // only update for UI display if needed
      setAssets((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], previewUri: publicUrl } as any; // non-destructive
        return updated;
      });
      // Convert to base64 for backend call
      const b64 = await FileSystem.readAsStringAsync(normalized.uri, {
        encoding: 'base64', // <-- FIXED: works cross-platform
      });
      
      base64Urls.push(`data:image/jpeg;base64,${b64}`);
    }

    console.log('🔗 All URLs ready:', publicUrls);

    // Save image URLs to profile
    const { error: upErr } = await supabase
      .from('profiles')
      .update({ body_image_urls: publicUrls })
      .eq('id', userId);
    if (upErr) throw upErr;

    console.log('📡 Calling backend with base64...');
    const resp = await fetch('http://192.168.0.187:5000/style/build-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        image_urls: base64Urls,
        brand_picks: [],
      }),
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




  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Show us your style</Text>
      <Text style={styles.p}>Upload {MIN_PHOTOS}-{MAX_PHOTOS} full‑body outfit photos you actually wore.</Text>

      <View style={styles.grid}>
  {assets.map((a, index) => {
    const uri = a.uri;
    return (
      <Image key={uri || index} source={{ uri }} style={styles.thumb} resizeMode="cover" />
    );
  })}

  <TouchableOpacity onPress={pickImages} style={[styles.thumb, styles.addBox]}>
    <Text style={{ fontWeight: '600' }}>+ Add</Text>
  </TouchableOpacity>
</View>

      <TouchableOpacity disabled={uploading || assets.length < MIN_PHOTOS} onPress={uploadAll} style={[styles.btn, (uploading || assets.length < MIN_PHOTOS) && { opacity: 0.5 }]}>
        <Text style={styles.btnText}>{uploading ? 'Analyzing…' : 'Create My Style Profile'}</Text>
      </TouchableOpacity>
{profile && (
  <>
    <View style={styles.card}>
      <Text style={styles.h2}>Your Style Summary</Text>
      <TagRow title="Vibes" items={profile.primary_vibes} />
      <TagRow title="Silhouettes" items={profile.silhouettes} />
      <TagRow title="Core Colors" items={profile.core_colors} />
      <TagRow title="Accents" items={profile.accent_colors} />
      <TagRow title="Seasons" items={profile.seasons} />
    </View>

    <TouchableOpacity
      onPress={() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'OnboardingModal' }],
        });
      }}
      style={[styles.btn, { marginTop: 20 }]}
    >
      <Text style={styles.btnText}>Continue to My Closet</Text>
    </TouchableOpacity>
  </>
)}
    </ScrollView>
  );
}

function TagRow({ title, items = [] as string[] }) {
  if (!items?.length) return null;
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {items.map((t) => (
          <View key={t} style={{ backgroundColor: '#eee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 6, marginBottom: 6 }}>
            <Text style={{ fontSize: 12 }}>#{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20 },
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 18, fontWeight: '700' },
  p: { color: '#555', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
  thumb: {
  width: 100,             // ✅ absolute width
  height: 100,            // ✅ absolute height (not just aspectRatio)
  borderRadius: 12,
  marginRight: 12,
  marginBottom: 12,
  backgroundColor: '#f1f5f9',
},
 
  addBox: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btn: { backgroundColor: '#000', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#f8f8f8', padding: 14, borderRadius: 12, marginTop: 16 },
});
