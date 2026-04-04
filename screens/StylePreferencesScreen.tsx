import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';

const STYLE_TAGS = ['Minimalist','Streetwear','Boho','Elegant','Sporty','Y2K','Preppy','Vintage'];
const COLOR_PREFERENCES = ['Neutrals','Earth Tones','Bold Colors','Pastels','Black & White'];
const FIT_PREFERENCES = ['Fitted','Oversized','Cropped','High-Waist','Relaxed'];

export default function StylePreferencesScreen({ navigation }) {
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [fits, setFits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    setUserId(data.user.id);
    return data.user.id as string;
  }, []);

  const loadPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await resolveUser();
      if (!uid) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('style_tags, color_prefs, fit_prefs')
        .eq('id', uid)
        .single();

      if (error) throw error;

      setStyleTags(Array.isArray(data?.style_tags) ? data.style_tags : []);
      setColors(Array.isArray(data?.color_prefs) ? data.color_prefs : []);
      setFits(Array.isArray(data?.fit_prefs) ? data.fit_prefs : []);
    } catch (e: any) {
      console.error('Load prefs failed:', e?.message || e);
      Alert.alert('Error', 'Could not load your preferences.');
    } finally {
      setLoading(false);
    }
  }, [navigation, resolveUser]);

  useEffect(() => {
    loadPrefs();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    });
    return () => sub?.subscription?.unsubscribe();
  }, [loadPrefs, navigation]);

  const toggleTag = (tag: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]);
  };

  const savePreferences = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          style_tags: styleTags,
          color_prefs: colors,
          fit_prefs: fits,
        })
        .eq('id', userId);
      if (error) throw error;
      Alert.alert('Saved', 'Your preferences have been updated.');
      navigation.goBack();
    } catch (e: any) {
      console.error('Save prefs failed:', e?.message || e);
      Alert.alert('Error', 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#888" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Style Preferences</Text>

        <Text style={styles.section}>Style Tags</Text>
        <View style={styles.tagGrid}>
          {STYLE_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, styleTags.includes(tag) && styles.selectedTag]}
              onPress={() => toggleTag(tag, styleTags, setStyleTags)}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Color Preferences</Text>
        <View style={styles.tagGrid}>
          {COLOR_PREFERENCES.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, colors.includes(tag) && styles.selectedTag]}
              onPress={() => toggleTag(tag, colors, setColors)}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Fit Preferences</Text>
        <View style={styles.tagGrid}>
          {FIT_PREFERENCES.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, fits.includes(tag) && styles.selectedTag]}
              onPress={() => toggleTag(tag, fits, setFits)}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
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
    backgroundColor: '#fdf8f3',
  },
  container: {
    padding: 20,
    paddingBottom: 80,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: '#111',
  },
  section: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#444',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  selectedTag: {
    backgroundColor: '#eee1d4',
    borderColor: '#8d6748',
  },
  tagText: {
    color: '#111',
    fontSize: 14,
  },
  saveButton: {
    marginTop: 40,
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
