import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../lib/theme';
import MultiSelectOverlay from './MultiSelectOverlay';
import WardrobeItemImage from './WardrobeItemImage';

type ClosetDailyFitHeroProps = {
  items?: any[];
  weather?: string | null;
  location?: string | null;
  loading?: boolean;
  editMode?: boolean;
  selectedItemIds?: string[];
  onRegenerate: () => void;
  onPressItem?: (item: any, index: number) => void;
};

export default function ClosetDailyFitHero({
  items = [],
  weather,
  location,
  loading = false,
  editMode = false,
  selectedItemIds = [],
  onRegenerate,
  onPressItem,
}: ClosetDailyFitHeroProps) {
  const previewItems = useMemo(() => items.slice(0, 3), [items]);
  const subtitle = useMemo(() => {
    if (weather && location) return `Built for ${weather} in ${location}.`;
    if (weather) return `Built around ${weather}.`;
    if (location) return `Built for ${location}.`;
    return 'A concise daily outfit composed directly from your closet.';
  }, [location, weather]);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Daily Curated</Text>
      <Text style={styles.title}>Today&apos;s Fit</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <TouchableOpacity style={styles.regenerateButton} onPress={onRegenerate}>
        <Ionicons name="sparkles-outline" size={14} color="#fff" style={styles.regenerateIcon} />
        <Text style={styles.regenerateText}>
          {previewItems.length ? 'Regenerate' : "Generate today's fit"}
        </Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={colors.textPrimary} />
          <Text style={styles.stateText}>Curating today's look...</Text>
        </View>
      ) : previewItems.length === 0 ? (
        <View style={styles.stateWrap}>
          <Text style={styles.emptyTitle}>No daily fit yet</Text>
          <Text style={styles.stateText}>
            Generate a look once you have enough pieces in your wardrobe.
          </Text>
        </View>
      ) : (
        <View style={styles.previewRow}>
          {previewItems.map((item, index) => {
            const isSelected = selectedItemIds.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.previewCard,
                  index === 1 && styles.previewCardCenter,
                  isSelected && styles.previewCardSelected,
                ]}
                activeOpacity={0.86}
                onPress={() => onPressItem?.(item, index)}
              >
                {isSelected ? <MultiSelectOverlay /> : null}
                <WardrobeItemImage item={item} style={styles.previewImage} resizeMode="cover" />
                {!editMode ? (
                  <Text style={styles.previewLabel} numberOfLines={1}>
                    {item.name || item.type || 'Unnamed'}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: 2,
    marginBottom: spacing.sm + 1,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm + 6,
    paddingBottom: spacing.sm + 1,
    borderRadius: 20,
    backgroundColor: '#fafaff',
    shadowColor: '#000',
    shadowOpacity: 0.045,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 14,
    elevation: 2,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 0.45,
    textTransform: 'uppercase',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '500',
    color: '#1c1c1c',
    textAlign: 'center',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
    textAlign: 'center',
    marginBottom: spacing.sm - 1,
    paddingHorizontal: spacing.md,
  },
  regenerateButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#1c1c1c',
    marginBottom: spacing.sm - 1,
  },
  regenerateIcon: {
    marginRight: 5,
  },
  regenerateText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.18,
    textTransform: 'uppercase',
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  previewCard: {
    width: '30%',
    backgroundColor: '#eef0f2',
    borderRadius: 13,
    padding: 5,
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 7,
    elevation: 1,
  },
  previewCardCenter: {
    width: '31%',
    marginHorizontal: 3,
  },
  previewCardSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: 10,
    backgroundColor: '#daddd8',
  },
  previewLabel: {
    marginTop: 5,
    fontSize: 10.5,
    lineHeight: 12,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
});
