import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, fontSizes } from '../lib/theme';

const DISPLAY_ORDER = ['onepiece', 'top', 'layer', 'bottom', 'shoes', 'outerwear', 'accessory'];

export default function OutfitDetailScreen({ route, navigation }) {
  const { outfit } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to view this outfit.');
        navigation.goBack();
        return;
      }
      setUserId(user.id);
      await loadItems(user.id);
    };
    init();
  }, []);

  const loadItems = async (uid) => {
    // ✅ Check favorite status securely
    const { data: favorite } = await supabase
      .from('saved_outfits')
      .select('is_favorite')
      .eq('id', outfit.id)
      .eq('user_id', uid)
      .single();

    setIsFavorited(!!favorite?.is_favorite);

    const ids = Array.isArray(outfit.items) ? outfit.items.map(i => i.id) : [];
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // ✅ Secure wardrobe query
    const { data: wardrobeItems, error } = await supabase
      .from('wardrobe')
      .select('*')
      .in('id', ids)
      .eq('user_id', uid);

    if (error) {
      console.error('❌ Failed to load wardrobe items:', error.message);
      Alert.alert('Error', 'Could not load outfit details.');
      setItems([]);
    } else {
      const withReasons = ids.map(id => {
        const wardrobeItem = wardrobeItems.find(w => w.id === id);
        const reason = outfit.items.find(i => i.id === id)?.reason || '';
        return wardrobeItem ? { ...wardrobeItem, reason } : null;
      }).filter(Boolean);

      const sorted = withReasons.sort(
        (a, b) =>
          (DISPLAY_ORDER.indexOf(a.main_category) !== -1 ? DISPLAY_ORDER.indexOf(a.main_category) : 99) -
          (DISPLAY_ORDER.indexOf(b.main_category) !== -1 ? DISPLAY_ORDER.indexOf(b.main_category) : 99)
      );

      setItems(sorted);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from('saved_outfits')
      .delete()
      .eq('id', outfit.id)
      .eq('user_id', userId);

    if (error) {
      Alert.alert('Error', 'Failed to delete outfit.');
    } else {
      Alert.alert('Outfit deleted.');
      navigation.goBack();
    }
  };

  const toggleFavorite = async () => {
    const { error } = await supabase
      .from('saved_outfits')
      .update({ is_favorite: !isFavorited })
      .eq('id', outfit.id)
      .eq('user_id', userId);

    if (!error) {
      setIsFavorited(!isFavorited);
    } else {
      Alert.alert('Error', 'Failed to update favorite.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Fixed Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.icon}>←</Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{outfit.name || 'Untitled Fit'}</Text>
          <Text style={styles.context}>
            {outfit.context || ''} {outfit.weather || ''}°F
          </Text>
        </View>

        <TouchableOpacity onPress={toggleFavorite}>
          <Text style={styles.icon}>{isFavorited ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#999" style={{ marginTop: 40 }} />
        ) : (
          items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.name || item.type}</Text>
                <Text style={styles.itemReason}>{item.reason || '(locked)'}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom Actions */}
<View style={styles.bottomBar}>
  <TouchableOpacity
    style={[styles.tryOnButton, (loading || items.length === 0) && { opacity: 0.6 }]}
    onPress={() => navigation.navigate('TryOn', { items })}
    disabled={loading || items.length === 0}
  >
    <Text style={styles.tryOnText}>Try On</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
    <Text style={styles.deleteText}>Delete Outfit</Text>
  </TouchableOpacity>
</View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl, // ~80
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 4,
    backgroundColor: colors.background,
  },
  icon: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    padding: spacing.xs,
    textAlign: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  context: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemReason: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  bottomBar: {
  position: 'absolute',
  bottom: spacing.xl,
  left: spacing.lg,
  right: spacing.lg,
  flexDirection: 'row',
  gap: spacing.sm,
},
tryOnButton: {
  flex: 1,
  backgroundColor: colors.accentSecondary,
  paddingVertical: spacing.lg,
  borderRadius: radii.md,
  alignItems: 'center',
},
tryOnText: {
  color: colors.textPrimary,
  fontWeight: '600',
  fontSize: fontSizes.base,
},
deleteButton: {
  flex: 1,
  backgroundColor: colors.danger,
  paddingVertical: spacing.lg,
  borderRadius: radii.md,
  alignItems: 'center',
},
});
