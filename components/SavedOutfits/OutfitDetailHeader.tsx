import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '../../lib/theme';

function formatLabel(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function OutfitDetailHeader({
  title,
  subtitle,
  itemCount,
  season,
  isFavorited,
  onBack,
  onToggleFavorite,
}: {
  title: string;
  subtitle: string;
  itemCount: number;
  season?: string | null;
  isFavorited: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity activeOpacity={0.82} onPress={onBack} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color="#1c1c1c" />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.82} onPress={onToggleFavorite} style={styles.iconButton}>
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={18}
            color="#1c1c1c"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.eyebrow}>Saved look</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{itemCount} {itemCount === 1 ? 'piece' : 'pieces'}</Text>
        {season ? <View style={styles.dot} /> : null}
        {season ? <Text style={styles.metaText}>{formatLabel(season)}</Text> : null}
        {isFavorited ? <View style={styles.dot} /> : null}
        {isFavorited ? <Text style={styles.metaText}>Favorite</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#daddd8',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 14,
  },
  metaText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 8,
    backgroundColor: 'rgba(28, 28, 28, 0.32)',
  },
});
