// screens/AddItemScreen.tsx
import React, { useRef, useState,useEffect } from 'react';
import {
  View, Text, TextInput, Image, TouchableOpacity, Alert, ScrollView,
  ActivityIndicator, StyleSheet, SafeAreaView, Modal, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { File, Directory, Paths } from 'expo-file-system';


import { WebView } from 'react-native-webview';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, fontSizes } from '../lib/theme';
import { useNavigation ,useRoute } from '@react-navigation/native';



// ---------- Types ----------
type ImportMeta = {
  method: 'photos' | 'pick' | 'autoscan' | 'manual';
  source_url?: string | null;
  source_domain?: string | null;
  retailer_name?: string | null;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  source_image_url?: string | null;
};

type RouteParams = {
  // when you build ImportBrowserScreen, navigate here with these params
  importedImages?: { uri: string }[];
  importMeta?: ImportMeta;
};

// Minimal fallback colors to avoid undefined errors if theme isn't wired yet
const F = {
  primary: '#0a84ff',
  text: '#111',
  textMuted: '#666',
  bg: '#fff',
  border: '#ddd',
  accent: '#7c3aed',
};

export default function AddItemScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // Core state
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const selectedImage = selectedImageIndex != null ? images[selectedImageIndex] : null;

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [color, setColor] = useState('');
  const [vibes, setVibes] = useState('');
  const [season, setSeason] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const [importMeta, setImportMeta] = useState<ImportMeta | null>(null);

  // Accept images/meta from ImportBrowser later
  useEffect(() => {
    const params = (route.params || {}) as RouteParams;
    if (params.importedImages?.length) {
      setImages(prev => [...prev, ...params.importedImages!]);
      if (selectedImageIndex == null) setSelectedImageIndex(0);
    }
    if (params.importMeta) setImportMeta(params.importMeta);
  }, [route.params]);

  // ---------- File helpers (fixes iOS nested path error) ----------
  const CACHE_DIR = FileSystem.cacheDirectory + 'imports';
  const ensureCacheDir = async () => {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  };
  const guessExtFromUrl = (url: string) => (url.split('?')[0].match(/\.([a-z0-9]{3,4})$/i)?.[1] || 'jpg').toLowerCase();
  const safeNameFromUrl = (url: string) => `${Date.now()}_${Math.floor(Math.random()*1e6)}_${url.replace(/^https?:\/\//,'').replace(/[^\w.-]+/g,'_')}.${guessExtFromUrl(url)}`;
  const ensureLocalUri = async (uri: string) => {
    if (!/^https?:\/\//i.test(uri)) return uri; // already file://
    await ensureCacheDir();
    const dest = `${CACHE_DIR}/${safeNameFromUrl(uri)}`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;
    const { uri: localUri } = await FileSystem.downloadAsync(uri, dest);
    return localUri;
  };
  const getMimeType = (uri: string) => {
    const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
    return ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  };
const uploadImage = async (uri: string): Promise<string> => {
  // 1. Make sure this local URI is valid; e.g. file://... or content://...
  const localUri = await ensureLocalUri(uri);  // you already have this helper

  // 2. Derive file metadata
  const fileExt = localUri.split('.').pop()?.split('?')[0] || 'jpg';
  const mimeType = getMimeType(localUri);  // your helper to guess mime
  const fileName = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${fileExt}`;

  // 3. Create a File object with the localUri
  //    If localUri is already a file path (file://), then:
  const file = new File(localUri);  

  // Optionally, confirm existence
  const info = await file.info();  
  if (!info.exists) {
    throw new Error(`File does not exist at ${file.uri}`);
  }

  // 4. Prepare FormData
  const form = new FormData();
  // Append the file. Key must match what Supabase expects.
  // Based on Supabase Storage API docs, you send the binary file itself as the body of POST
  // For example, using `/storage/v1/object/clothes/:fileName`
  form.append('file', {
    uri: file.uri,
    name: fileName,
    type: mimeType,
  } as any);  
  // Note: we use `file.uri` here as a `file://` uri

  // 5. Do fetch POST to Supabase Storage API endpoint
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const bucket = 'clothes';

  const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;

  const response = await fetch(uploadEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      // Note: the content-type for FormData is set automatically (multipart/form-data)
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upload failed: ${response.status} ${text}`);
  }

  // 6. Return the public URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
  return publicUrl;
};
  // ---------- Photos picker ----------
  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return Alert.alert('Permission to access media library is required!');
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri }))]);
      if (selectedImageIndex == null && (result.assets.length || images.length)) setSelectedImageIndex(0);
      setImportMeta({ method: 'photos' });
    }
  };

  // ---------- Single Import (selected image) ----------
const handleImportSelected = async () => {
  if (!selectedImage) return Alert.alert('Select an image first.');

  // @ts-ignore
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Alert.alert('Error', 'You must be logged in to add clothing.');

  setIsLoading(true);
  setUploadProgress({ current: 0, total: 1 });

  try {
    console.log('🔁 Uploading selected image...');
    const uploadedUrl = await uploadImage(selectedImage.uri);
    const imageUrl = `${uploadedUrl}?t=${Date.now()}`; // cache buster
    console.log('🖼️ Uploaded image URL:', imageUrl);

    // Optional HEAD check
    try {
      const headCheck = await fetch(imageUrl, { method: 'HEAD' });
      const contentType = headCheck.headers.get('content-type');
      console.log('🔍 HEAD content-type:', contentType);
      if (!contentType?.startsWith('image/')) {
        throw new Error('Uploaded file is not a valid image');
      }
    } catch (headErr) {
      console.warn('⚠️ HEAD check failed:', headErr.message);
      throw new Error('Unable to verify image file after upload.');
    }

    // Tag unless manual
    let tags: any = undefined;
    if (!manualOverride) {
      console.log('🧠 Sending to AI tagger...');
      const tagResponse = await fetch('http://192.168.0.187:5000/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      });

      const raw = (await tagResponse.text()).trim();
      const cleaned = raw.replace(/^```(?:json)?\n?|```$/g, '').trim();

      try {
        tags = JSON.parse(cleaned);
        console.log('✅ AI Tags:', tags);
      } catch {
        throw new Error('AI Tagging parse failed');
      }

      if (tags?.error) throw new Error(tags.error);
    }

    const finalName = (name?.trim() || tags?.name || tags?.type || '').toString();
    const validSeasons = ['spring', 'summer', 'fall', 'winter', 'all'];
    let finalSeason = manualOverride ? season?.trim().toLowerCase() : tags?.season?.toLowerCase();
    if (!validSeasons.includes(finalSeason)) finalSeason = 'all';

    const manualCategory = manualOverride ? (type || '').split(' ')[0]?.toLowerCase() : undefined;
    const importMethod = importMeta?.method || (manualOverride ? 'manual' : 'photos');
    const sourceImageForThis = /^https?:\/\//i.test(selectedImage.uri)
      ? selectedImage.uri
      : (importMeta?.source_image_url ?? null);

    const insertPayload: any = {
      user_id: user.id,
      name: finalName,
      type: manualOverride ? type : tags?.type,
      main_category: manualOverride ? manualCategory : tags?.main_category,
      color: manualOverride ? color : tags?.color,
      primary_color: manualOverride ? color : tags?.primary_color,
      secondary_colors: manualOverride ? [] : tags?.secondary_colors,
      pattern_description: manualOverride ? '' : tags?.pattern_description,
      vibe_tags: manualOverride ? (
        vibes ? vibes.split(',').map(v => v.trim().toLowerCase()) : []
      ) : tags?.vibe_tags,
      season: finalSeason,
      image_url: imageUrl,
      source_url: importMeta?.source_url ?? null,
      source_domain: importMeta?.source_domain ?? null,
      retailer_name: importMeta?.retailer_name ?? null,
      brand: importMeta?.brand ?? (tags?.brand ?? null),
      retail_price: importMeta?.price ?? null,
      currency: importMeta?.currency ?? null,
      source_image_url: sourceImageForThis ?? null,
      import_method: importMethod,
    };

    console.log('📦 Insert Payload:', insertPayload);

    // @ts-ignore
    const { error: insertError } = await supabase.from('wardrobe').insert([insertPayload]);
    if (insertError) throw new Error(insertError.message);

    Alert.alert('Imported', 'Item added to your closet.');
  } catch (err: any) {
    console.error('❌ Import Failed:', err);
    Alert.alert('Error importing item', err?.message || 'Unknown error');
  } finally {
    setIsLoading(false);
    setUploadProgress({ current: 0, total: 0 });
  }
};

  // ---------- Style Selected (Try‑On only; no insert) ----------
  const handleStyleSelected = async () => {
    if (!selectedImage) return Alert.alert('Select an image first.');
    try {
      setIsLoading(true);
      // Ensure public URL for tagging
      const anchorPublicUrl = /^https?:\/\//i.test(selectedImage.uri)
        ? selectedImage.uri
        : await uploadImage(selectedImage.uri); // upload to get public URL, but DO NOT insert wardrobe

      // Tag
      const tagResponse = await fetch('http://192.168.0.187:5000/tag', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: anchorPublicUrl }),
      });
      const raw = (await tagResponse.text()).trim();
      const cleaned = raw.replace(new RegExp('^```(?:json)?\\n?|```$', 'g'), '').trim();
      const tags = JSON.parse(cleaned);
      if (tags?.error) throw new Error(tags.error);

      const lockedItem = {
        id: `ext_${Date.now()}`,
        name: name?.trim() || tags?.name || importMeta?.brand || 'Imported Item',
        type: tags?.type,
        main_category: tags?.main_category,
        primary_color: tags?.primary_color,
        secondary_colors: tags?.secondary_colors || [],
        pattern_description: tags?.pattern_description || null,
        vibe_tags: tags?.vibe_tags || [],
        season: tags?.season || 'all',
        image_url: anchorPublicUrl,
        meta: {
          source_url: importMeta?.source_url ?? null,
          source_domain: importMeta?.source_domain ?? null,
          retailer_name: importMeta?.retailer_name ?? null,
          brand: importMeta?.brand ?? null,
          retail_price: importMeta?.price ?? null,
          currency: importMeta?.currency ?? null,
          source_image_url: importMeta?.source_image_url ?? null,
        },
      } as const;

      // @ts-ignore – swap for your actual route name and params
      navigation.navigate('StyleItem', { lockedItem, externalTryOn: true });
    } catch (err: any) {
      Alert.alert('Try‑On error', err?.message || 'Failed to start styling.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Batch Save (existing flow) ----------
// ---------- Batch Save (existing flow) ----------
const handleSaveAll = async () => {
  if (!images.length) return Alert.alert('Select or import image(s) first.');

  // @ts-ignore
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Alert.alert('Error', 'You must be logged in to add clothing.');

  setIsLoading(true);
  setUploadProgress({ current: 0, total: images.length });

  try {
    for (const image of images) {
      setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
      console.log(`🔁 Processing image: ${image.uri}`);

      // Step 1: Upload image FIRST to get a public URL
      let imageUrl: string;
      try {
        imageUrl = await uploadImage(image.uri);
        console.log(`🖼️ Uploaded image to: ${imageUrl}`);
      } catch (uploadErr) {
        console.error('❌ Upload error:', uploadErr);
        Alert.alert('Upload Failed', uploadErr.message || 'Image upload failed.');
        continue;
      }

      // Step 2: AI Tagging (only if not manual)
      let tags: any = undefined;
      if (!manualOverride) {
        try {
          const tagResponse = await fetch('http://192.168.0.187:5000/tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl }),
          });

          const raw = (await tagResponse.text()).trim();
          const cleaned = raw.replace(/^```(?:json)?\n?|```$/g, '').trim();
          tags = JSON.parse(cleaned);

          if (tags?.error) throw new Error(tags.error);
          console.log('✅ AI Tags:', tags);
        } catch (taggingErr: any) {
          console.error('❌ AI Tagging Failed:', taggingErr);
          Alert.alert('AI Tagging Failed', taggingErr.message || 'Could not tag image.');
          continue;
        }
      }

      // Step 3: Prepare metadata
      const finalName = (name?.trim() || tags?.name || tags?.type || '').toString();
      const validSeasons = ['spring','summer','fall','winter','all'];
      let finalSeason = manualOverride ? season?.trim().toLowerCase() : tags?.season?.toLowerCase();
      if (!validSeasons.includes(finalSeason)) finalSeason = 'all';

      const manualCategory = manualOverride ? (type || '').split(' ')[0]?.toLowerCase() : undefined;
      const importMethod = importMeta?.method || (manualOverride ? 'manual' : 'photos');
      const sourceImageForThis = /^https?:\/\//i.test(image.uri) ? image.uri : (importMeta?.source_image_url ?? null);

      const insertPayload: any = {
        user_id: user.id,
        name: finalName,
        type: manualOverride ? type : tags?.type,
        main_category: manualOverride ? manualCategory : tags?.main_category,
        color: manualOverride ? color : tags?.color,
        primary_color: manualOverride ? color : tags?.primary_color,
        secondary_colors: manualOverride ? [] : tags?.secondary_colors,
        pattern_description: manualOverride ? '' : tags?.pattern_description,
        vibe_tags: manualOverride ? (
          vibes ? vibes.split(',').map(v => v.trim().toLowerCase()) : []
        ) : tags?.vibe_tags,
        season: finalSeason,
        image_url: imageUrl,
        // Meta
        source_url: importMeta?.source_url ?? null,
        source_domain: importMeta?.source_domain ?? null,
        retailer_name: importMeta?.retailer_name ?? null,
        brand: importMeta?.brand ?? (tags?.brand ?? null),
        retail_price: importMeta?.price ?? null,
        currency: importMeta?.currency ?? null,
        source_image_url: sourceImageForThis ?? null,
        import_method: importMethod,
      };

      console.log('📦 Insert Payload:', insertPayload);

      // Step 4: Insert to Supabase
      const { error: insertError } = await supabase.from('wardrobe').insert([insertPayload]);
      if (insertError) {
        console.error('❌ Insert Error:', insertError.message);
        Alert.alert('Insert Error', insertError.message);
      } else {
        console.log('✅ Inserted into wardrobe table.');
      }
    }

    Alert.alert('Upload complete!');
    setImages([]);
    setSelectedImageIndex(null);
    setName('');
    setType('');
    setColor('');
    setVibes('');
    setSeason('');
    setImportMeta(null);
  } catch (err: any) {
    console.error('❌ Fatal Error:', err);
    Alert.alert('Error saving item', err?.message || 'Unknown error');
  } finally {
    setIsLoading(false);
    setUploadProgress({ current: 0, total: 0 });
  }
};
  

  // ---------- UI ----------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: F.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: F.text, marginBottom: 12 }}>Add Clothing</Text>

        {/* Preview strip */}
        <View style={{ minHeight: 112, marginBottom: 12 }}>
          {images.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map((img, idx) => (
                <TouchableOpacity
                  key={`${img.uri}-${idx}`}
                  onPress={() => setSelectedImageIndex(idx)}
                  style={{
                    marginRight: 10,
                    borderRadius: 12,
                    padding: 2,
                    borderWidth: selectedImageIndex === idx ? 2 : 0,
                    borderColor: selectedImageIndex === idx ? F.accent : 'transparent',
                  }}
                >
                  <Image source={{ uri: img.uri }} style={{ width: 100, height: 100, borderRadius: 10 }} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              onPress={pickImages}
              style={{ height: 112, borderWidth: 1, borderStyle: 'dashed', borderColor: F.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: F.textMuted }}>Tap to add photos</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action bar for selected image */}
        {selectedImage && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <TouchableOpacity onPress={handleImportSelected} style={{ flex: 1, padding: 12, backgroundColor: F.primary, borderRadius: 10, alignItems: 'center' }} disabled={isLoading}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Import item from selected</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStyleSelected} style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: F.border, borderRadius: 10, alignItems: 'center' }} disabled={isLoading}>
              <Text style={{ color: F.text }}>Style item (Try‑On)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Auto/Manual toggle */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setManualOverride(false)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: manualOverride ? F.border : F.primary, borderRadius: 8, marginRight: 8, backgroundColor: manualOverride ? 'transparent' : '#eef5ff' }}>
            <Text style={{ color: manualOverride ? F.text : F.primary }}>Auto</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setManualOverride(true)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: manualOverride ? F.primary : F.border, borderRadius: 8 }}>
            <Text style={{ color: manualOverride ? F.primary : F.text }}>Manual</Text>
          </TouchableOpacity>
          
        </View>

        <TextInput placeholder="Name (optional)" value={name} onChangeText={setName} placeholderTextColor={F.textMuted} style={{ borderWidth: 1, borderColor: F.border, borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 10, color: F.text }} />

        {manualOverride && (
          <>
            <TextInput placeholder="Type" value={type} onChangeText={setType} placeholderTextColor={F.textMuted} style={{ borderWidth: 1, borderColor: F.border, borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 10, color: F.text }} />
            <TextInput placeholder="Color" value={color} onChangeText={setColor} placeholderTextColor={F.textMuted} style={{ borderWidth: 1, borderColor: F.border, borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 10, color: F.text }} />
            <TextInput placeholder="Vibes (comma separated)" value={vibes} onChangeText={setVibes} placeholderTextColor={F.textMuted} style={{ borderWidth: 1, borderColor: F.border, borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 10, color: F.text }} />
            <TextInput placeholder="Season" value={season} onChangeText={setSeason} placeholderTextColor={F.textMuted} style={{ borderWidth: 1, borderColor: F.border, borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 10, color: F.text }} />
          </>
        )}

        {isLoading && (
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 6, color: F.text }}>Uploading {uploadProgress.current} of {uploadProgress.total}</Text>
          </View>
        )}

        {/* Batch Save */}
        <TouchableOpacity onPress={handleSaveAll} style={{ backgroundColor: F.primary, padding: 14, borderRadius: 12, alignItems: 'center' }} disabled={isLoading}>
          <Text style={{ color: 'white', fontWeight: '600' }}>{isLoading ? 'Uploading…' : 'Save Clothing'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}


// ---- Styles ----
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.header, marginBottom: spacing.lg, textAlign: 'center' },

  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  modeBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  modeActive: { backgroundColor: colors.textPrimary },
  modeText: { color: colors.textMuted, fontWeight: '500', fontSize: fontSizes.sm },
  modeTextActive: { color: colors.textOnAccent, fontWeight: '600', fontSize: fontSizes.sm },

  imageBox: {
    height: 260,
    borderRadius: radii.lg,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderColor: colors.inputBorder,
    borderWidth: 1,
  },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: colors.textMuted, fontSize: fontSizes.sm },

  importPanel: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center' },

  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  toggleButton: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.textPrimary },
  toggleText: { color: colors.textMuted, fontWeight: '500', fontSize: fontSizes.sm },
  toggleTextActive: { color: colors.textOnAccent, fontWeight: '600', fontSize: fontSizes.sm },

  input: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  smallBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallBtnText: { color: colors.textOnAccent, fontWeight: '600' },

  sectionTitle: { ...typography.subheader, marginBottom: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  storeCard: {
    width: '48%',
    marginHorizontal: '1%',
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: spacing.sm,
  },
  storeName: { color: colors.textPrimary, fontWeight: '600' },

  thumbWrap: {
    width: 100, height: 100, marginRight: spacing.sm,
    borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.inputBorder,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbSelected: {
    position: 'absolute', right: 6, top: 6,
    backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
  },
  thumbCheck: { color: colors.textOnAccent, fontWeight: '700', fontSize: 12 },

  addBtn: {
    marginTop: spacing.sm, alignSelf: 'flex-start',
    backgroundColor: colors.accent, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  addBtnText: { ...typography.button },

  saveButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  saveText: { ...typography.button },

  browserBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  browserBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  browserBtnText: { color: colors.textPrimary, fontWeight: '600' },
  webLoading: {
    position: 'absolute',
    right: spacing.lg,
    top: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  browserActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    backgroundColor: colors.background,
  },
  pickBtn: {
    flex: 1,
    marginRight: spacing.sm,
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  pickBtnText: { color: colors.textOnAccent, fontWeight: '700' },
});
