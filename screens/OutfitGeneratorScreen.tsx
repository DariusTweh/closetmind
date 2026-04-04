// screens/OutfitGeneratorScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography } from '../lib/theme';
import OutfitForm from '../components/OutfitGenerator/OutfitForm';
import RegularGeneratedOutfit from '../components/OutfitGenerator/RegularGeneratedOutfit';

export default function OutfitGeneratorScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [vibe, setVibe] = useState('');
  const [context, setContext] = useState('');
  const [season, setSeason] = useState('');
  const [temperature, setTemperature] = useState('');
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState<any[]>([]);
  const [lockedItems, setLockedItems] = useState<any[]>([]);
  const [mode, setMode] = useState<'form' | 'generated'>('form');
  const [currentStep, setCurrentStep] = useState('');

  const DISPLAY_ORDER = ['outerwear', 'layer', 'onepiece', 'top', 'bottom', 'shoes', 'accessory'];
  const validSeasons = ['spring', 'summer', 'fall', 'winter', 'all'];
  const finalSeason = validSeasons.includes(season.toLowerCase())
    ? season.toLowerCase()
    : 'all';

  // ✅ Get authenticated user ID
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        Alert.alert('Authentication Required', 'Please log in to generate outfits.');
        return;
      }
      setUserId(data.user.id);
    };
    getUser();
  }, []);

const fetchWardrobe = async () => {
  if (!userId) return [];

  const { data, error, count } = await supabase
    .from('wardrobe')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .range(0, 999); // force full fetch

  if (error) {
    console.error('Error fetching wardrobe:', error.message);
    return [];
  }

  console.log('🧮 wardrobe rows fetched:', data?.length, 'total:', count);

  return data ?? [];
};


  const toggleLockItem = (item) => {
    setLockedItems((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };
const generateMultistepOutfit = async () => {
  console.log('🟦 Generate pressed', { userId, context, vibe, season, temperature });

  if (!userId) {
    alert('No userId. You are not logged in or session is not loaded yet.');
    return;
  }

  setLoading(true);
  setCurrentStep('Fetching wardrobe...');

  try {
    const wardrobe = await fetchWardrobe();
    console.log('👤 app userId:', userId);
 console.log('👤 unique user_ids in wardrobe:', Array.from(new Set(wardrobe.map((i:any) => i.user_id))).slice(0, 10));
    console.log('🧪 first 15 categories:', wardrobe.slice(0, 15).map((i:any) => ({
      name: i.name,
      main_category: i.main_category,
      type: i.type,
      user_id: i.user_id,
    })));

    console.log('🟩 wardrobe length:', wardrobe?.length);
    console.log(
        '🧾 categories:',
        wardrobe.reduce((a: any, i: any) => {
          const k = i.main_category ?? 'NULL';
          a[k] = (a[k] || 0) + 1;
          return a;
        }, {})
      );

      console.log(
        '🧾 seasons:',
        wardrobe.reduce((a: any, i: any) => {
          const k = i.season ?? 'NULL';
          a[k] = (a[k] || 0) + 1;
          return a;
        }, {})
      );


    if (!wardrobe || wardrobe.length === 0) {
      alert('No wardrobe items found. Add items first.');
      return;
    }

    // Optional: if you want to see the steps animation, keep this.
    const steps = [
      'Finding top...',
      'Finding bottom...',
      'Finding shoes...',
      'Checking accessories...',
      'Finalizing outfit...',
    ];
    for (const step of steps) {
      setCurrentStep(step);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const url = 'http://192.168.0.187:5000/generate-multistep-outfit';
    console.log('🟨 POST', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, vibe, season, temperature, wardrobe,avoidIds: outfit?.map((i:any) => i.id) || []  }),
    });

    // If backend is down or route is wrong, you'll see it here.
    const raw = await response.text();
    console.log('🟨 status:', response.status, 'raw:', raw);

    if (!response.ok) {
      alert(`Backend error ${response.status}: ${raw.slice(0, 200)}`);
      return;
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      alert('Backend returned non-JSON response. Check logs.');
      return;
    }

    if (!data.steps) {
      alert('Failed to generate outfit. Missing data.steps');
      return;
    }

    const matched = Object.values(data.steps)
  .filter((step: any) => step && step.id) // ✅ skip null steps
  .map((step: any) => {
    const match = wardrobe.find((item) => item.id === step.id);
    return match ? { ...match, reason: step.reason } : null;
  })
  .filter(Boolean);


    const sorted = matched.sort(
      (a, b) => DISPLAY_ORDER.indexOf(a.main_category) - DISPLAY_ORDER.indexOf(b.main_category)
    );

    setOutfit(sorted);
    setMode('generated');
  } catch (err: any) {
    console.log('🟥 generate outfit failed:', err);
    alert(`Request failed: ${err?.message || String(err)}`);
  } finally {
    setLoading(false);
    setCurrentStep('');
  }
};


  const generateOutfitName = async () => {
    const response = await fetch('http://192.168.0.187:5000/generate-outfit-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vibe,
        context,
        season,
        temperature,
        items: outfit.map((item) => item.name || item.type),
      }),
    });
    const json = await response.json();
    return json.name || 'Untitled Fit';
  };

  const saveOutfit = async () => {
    if (!userId || outfit.length === 0) return;
    const name = await generateOutfitName();

    const { error } = await supabase.from('saved_outfits').insert([
      {
        user_id: userId,
        name,
        context: `${vibe} + ${context} in ${temperature}°F ${season} weather`,
        season: finalSeason,
        items: outfit.map((item) => ({ id: item.id, reason: item.reason })),
      },
    ]);

    if (error) {
      alert('Save failed.');
      console.error(error.message);
    } else {
      alert(`Outfit saved as: "${name}"`);
    }
  };

  if (mode === 'form') {
    return (
      <SafeAreaView style={styles.screenWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <OutfitForm
            vibe={vibe}
            setVibe={setVibe}
            context={context}
            setContext={setContext}
            season={season}
            setSeason={setSeason}
            temperature={temperature}
            setTemperature={setTemperature}
            onGenerate={generateMultistepOutfit}
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
        {loading && currentStep !== '' && (
          <Text style={styles.stepText}>{currentStep}</Text>
        )}

        <RegularGeneratedOutfit
          outfit={outfit}
          lockedItems={lockedItems}
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
          <TouchableOpacity style={styles.bottomBtn} onPress={generateMultistepOutfit}>
            <Text style={styles.bottomBtnText}>Generate Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  backIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
    width: 30,
  },
  icon: {
    fontSize: 22,
    color: colors.textSecondary,
    lineHeight: 26,
    marginTop: -20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
    fontFamily: typography.fontFamily,
  },
  stepText: {
  textAlign: 'center',
  fontSize: 15,
  fontWeight: '500',
  color: '#888',
  marginBottom: 12,
  marginTop: 12,
},

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.xl * 2.5, // ~140
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bottomBtn: {
    flex: 1,
    backgroundColor: colors.accentSecondary,
    paddingVertical: spacing.md - 2,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  bottomBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});
