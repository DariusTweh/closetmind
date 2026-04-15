import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';

type WardrobeItem = {
  id: string;
  name?: string;
  type?: string;
  image_url: string;
  image_path?: string;
};

type OutfitSuggestion = {
  items: WardrobeItem[];
  reason: string;
};

type Props = {
  item?: WardrobeItem | null;
  suggestions: OutfitSuggestion[];
  onPullNew: () => void;
  onOpenStyle?: () => void;
  loading: boolean;
};

export default function StyleThisItemCard({
  item,
  suggestions = [],
  onPullNew,
  onOpenStyle,
  loading,
}: Props) {
  const hasItem = !!item?.id;
  const validSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const noSuggestions = !loading && hasItem && validSuggestions.length === 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Style This Item</Text>
        <View style={styles.headerActions}>
          {hasItem && onOpenStyle ? (
            <TouchableOpacity onPress={onOpenStyle} style={styles.headerActionButton}>
              <Text style={styles.headerActionText}>Open Styler</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onPullNew} style={styles.headerActionButton}>
            <Text style={styles.headerActionText}>New Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty: no item selected */}
      {!hasItem ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyArt} />
          <Text style={styles.emptyTitle}>Pick something to style</Text>
          <Text style={styles.emptySub}>Choose an item and I’ll build a look around it.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={onPullNew}>
            <Text style={styles.emptyBtnText}>Pick an item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.itemRow}>
            <WardrobeItemImage item={item!} style={styles.mainImage} />
            <Text style={styles.itemLabel}>{item!.name || item!.type || 'Unnamed'}</Text>
          </View>

          <Text style={styles.subtitle}>Here’s what goes great with it:</Text>

          {/* Loading state */}
          {loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.reasonText}>Generating outfit…</Text>
            </View>
          ) : noSuggestions ? (
            // Empty: no suggestions for this item
            <View style={styles.emptyWrapSoft}>
              <Text style={styles.emptyTitle}>No suggestions yet</Text>
              <Text style={styles.emptySub}>
                Try a different piece or tweak the vibe/context.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={onPullNew}>
                <Text style={styles.emptyBtnText}>Try a different item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Suggestions
            validSuggestions.map((sug, index) => (
              <View key={index} style={styles.outfitBox}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestionRow}
                >
                  {sug.items.map((subItem) => (
                    <WardrobeItemImage
                      key={subItem.id}
                      item={subItem}
                      style={styles.outfitImage}
                    />
                  ))}
                </ScrollView>
                <Text style={styles.reasonText}>{sug.reason}</Text>
              </View>
            ))
          )}

          {hasItem && onOpenStyle ? (
            <TouchableOpacity style={styles.openStylerButton} onPress={onOpenStyle}>
              <Text style={styles.openStylerButtonText}>Compare More Looks</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  headerActionButton: {
    backgroundColor: '#f3f5f2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerActionText: { fontSize: 13, color: '#1c1c1c', fontWeight: '700' },

  // Item
  itemRow: { alignItems: 'center', marginBottom: 14 },
  mainImage: { width: 120, height: 150, borderRadius: 12, backgroundColor: '#eee' },
  itemLabel: { marginTop: 6, fontSize: 14, color: '#333' },
  subtitle: { fontSize: 14, fontWeight: '500', color: '#444', marginBottom: 10 },

  // Suggestions
  outfitBox: { marginBottom: 16 },
  suggestionRow: { flexDirection: 'row', marginBottom: 6 },
  outfitImage: {
    width: 80,
    height: 100,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  reasonText: { fontSize: 12, color: '#666' },

  // Loading
  loadingBox: { paddingVertical: 20, alignItems: 'center' },

  // Empty states
  emptyWrap: {
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafaff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyWrapSoft: {
    backgroundColor: '#fafaff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  emptyArt: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#eee',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#666', marginBottom: 10, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  openStylerButton: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
  },
  openStylerButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
