import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import { colors, typography } from '../../lib/theme';

function formatLabel(item: any) {
  return String(item?.main_category || item?.type || 'piece')
    .replace(/_/g, ' ')
    .toUpperCase();
}

export default function TryOnSelectedTray({
  items,
  onRemove,
}: {
  items: any[];
  onRemove: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No pieces selected</Text>
        <Text style={styles.emptySub}>Open Try On from styling, saved looks, or verdict flows to bring pieces in here.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => onRemove(item.id)}
            style={styles.removeButton}
          >
            <Ionicons name="close" size={14} color="#1c1c1c" />
          </TouchableOpacity>

          <WardrobeItemImage item={item} style={styles.thumb} resizeMode="cover" />
          <Text style={styles.category}>{formatLabel(item)}</Text>
          <Text numberOfLines={1} style={styles.name}>
            {item.name || item.type || 'Selected Item'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: 0,
    paddingBottom: 10,
    paddingRight: 8,
  },
  card: {
    width: 132,
    marginRight: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(250, 250, 255, 0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  thumb: {
    width: '100%',
    height: 168,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  category: {
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  name: {
    marginTop: 4,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});
