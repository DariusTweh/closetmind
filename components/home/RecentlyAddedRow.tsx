import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';

type WardrobeItem = {
  id: string;
  name?: string;
  type?: string;
  image_url: string;
  image_path?: string;
  created_at?: string;
};

type Props = {
  items: WardrobeItem[];
  onPressItem?: (item: WardrobeItem) => void;
  onAddPress?: () => void; // optional CTA
};

export default function RecentlyAddedRow({ items=[], onPressItem, onAddPress }: Props) {
  const isEmpty = !items || items.length === 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recently Added</Text>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySub}>Add a few pieces to see them show up here.</Text>
          {onAddPress && (
            <TouchableOpacity style={styles.emptyBtn} onPress={onAddPress}>
              <Text style={styles.emptyBtnText}>Add clothing</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => onPressItem?.(item)}
              activeOpacity={0.8}
            >
              <WardrobeItemImage item={item} style={styles.image} />
              <Text style={styles.label}>{item.name || item.type || 'Unnamed'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 10,
  },
  card: {
    width: 90,
    marginRight: 12,
    alignItems: 'center',
  },
  image: {
    width: 90,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  emptyWrap: {
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafaff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
});
