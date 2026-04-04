import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

import OutfitForm from '../components/OutfitGenerator/OutfitForm';
import GeneratedOutfit from '../components/OutfitGenerator/GeneratedOutfit';
import OutfitItemCard from '../components/OutfitGenerator/OutfitItemCard';

export default function StyleItemScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const baseItem = params?.item;

  const [mode, setMode] = useState<'form' | 'generated'>('form');
  const [vibe, setVibe] = useState('');
  const [context, setContext] = useState('');
  const [season, setSeason] = useState('');
  const [temperature, setTemperature] = useState('');
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState<any[]>([]);
  const [wardrobe, setWardrobe] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const isExternalItem = baseItem?.id?.startsWith('ext_');

  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    setUserId(data.user.id);
    return data.user.id as string;
  }, []);

  const fetchWardrobe = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('wardrobe')
      .select('*')
      .eq('user_id', uid);

    if (error) {
      console.error('❌ Failed to fetch wardrobe:', error.message);
      Alert.alert('Error', 'Could not load your wardrobe.');
      return [];
    }
    setWardrobe(data || []);
    return data || [];
  }, []);

  const hydrate = useCallback(async () => {
    const uid = await resolveUser();
    if (!uid) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
      return;
    }
    await fetchWardrobe(uid);
  }, [fetchWardrobe, navigation, resolveUser]);

 useEffect(() => {
  const run = async () => {
    const uid = await resolveUser();
    if (!uid) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
      return;
    }

    const items = await fetchWardrobe(uid);

    // 🔥 If lockedItem is external, inject it into the wardrobe array
    if (isExternalItem && baseItem?.id && !items.find(i => i.id === baseItem.id)) {
      setWardrobe([baseItem, ...items]);
    } else {
      setWardrobe(items);
    }
  };
  run();
}, [resolveUser, fetchWardrobe]);

  const generateOutfit = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch('http://192.168.0.187:5000/style-single-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          context,
          vibe,
          season,
          temperature,
          wardrobe,
          locked_item: baseItem,
        }),
      });

      const result = await resp.json();
      if (!resp.ok) {
        console.error('❌ Backend error:', result?.error || result);
        Alert.alert('Error', result?.error || 'Failed to generate outfit.');
        return;
      }

      setOutfit(result.outfit || []);
      setMode('generated');
    } catch (err: any) {
      console.error('❌ Fetch failed:', err?.message || err);
      Alert.alert('Error', 'Could not generate outfit.');
    } finally {
      setLoading(false);
    }
  };

const saveExternalItemToWardrobe = async (item: any) => {
  if (!userId) return null;

  // Strip any non-schema fields like `id`, `meta`
  const { id, meta, ...cleaned } = item;

  const { data, error } = await supabase
    .from('wardrobe')
    .insert([{ ...cleaned, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};


const saveOutfit = async () => {
  if (!userId || outfit.length === 0) return;

  try {
    let finalBaseItem = baseItem;

    // If it's an external item, save to wardrobe first
    if (isExternalItem) {
      const saved = await saveExternalItemToWardrobe(baseItem);
      finalBaseItem = saved; // ✅ Now has real UUID
      Alert.alert('Item Saved', 'The styled item has been saved to your wardrobe.');
    }

    const name =
      finalBaseItem?.name
        ? `Styled: ${finalBaseItem.name}`
        : `Styled ${finalBaseItem?.type || 'Item'}`;

    const payload = {
      user_id: userId,
      name,
      context,
      season: season?.toLowerCase() || null,
      is_favorite: false,
      items: outfit.map(i => ({ id: i.id })),
      locked_item_id: finalBaseItem?.id ?? null, // ✅ now real UUID
    };

    const { error } = await supabase.from('saved_outfits').insert([payload]);
    if (error) throw error;

    Alert.alert('Saved', 'Outfit saved to your favorites.');
  } catch (e: any) {
    console.error('❌ Save failed:', e?.message || e);
    Alert.alert('Error', 'Could not save outfit.');
  }
};


  const toggleLockItem = () => { };

  if (mode === 'form') {
    return (
      <SafeAreaView style={styles.screenWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <OutfitItemCard item={baseItem} lockedItems={[baseItem]} />
          <OutfitForm
            vibe={vibe}
            setVibe={setVibe}
            context={context}
            setContext={setContext}
            season={season}
            setSeason={setSeason}
            temperature={temperature}
            setTemperature={setTemperature}
            onGenerate={generateOutfit}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setMode('form')} style={styles.backIcon}>
          <Text style={styles.icon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Here’s your styled fit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <GeneratedOutfit
          outfit={outfit}
          wardrobe={wardrobe}
          lockedItems={[baseItem]}
          toggleLockItem={toggleLockItem}
          loading={loading}
        />
        <View style={{ height: 120 }} />
      </ScrollView>

      {!loading && outfit.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomBtn} onPress={saveOutfit}>
            <Text style={styles.bottomBtnText}>Save Fit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomBtn} onPress={generateOutfit}>
            <Text style={styles.bottomBtnText}>Generate Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={{ paddingTop: 12 }}>
          <ActivityIndicator size="small" color="#888" />
        </View>
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#f5f3f0',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backIcon: {
    padding: 4,
  },
  icon: {
    fontSize: 24,
    color: '#3f4d3c',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3f4d3c',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomBtn: {
    flex: 1,
    backgroundColor: '#8abfa3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  bottomBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
