import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTripDateRange } from '../../lib/travelCollections';
import { colors, spacing, typography } from '../../lib/theme';
import type { TravelCollection } from '../../types/travelCollections';

export default function TravelCollectionHeader({
  collection,
  outfitCount,
  onGenerate,
  onDelete,
}: {
  collection: TravelCollection;
  outfitCount: number;
  onGenerate: () => void;
  onDelete: () => void;
}) {
  const subtitle = [collection?.destination || null, formatTripDateRange(collection?.start_date, collection?.end_date)]
    .filter(Boolean)
    .join(' • ');

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Travel Collection</Text>
          <Text style={styles.title}>{collection?.name || 'Untitled Trip'}</Text>
          {subtitle ? (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
          {collection?.notes ? (
            <Text style={styles.notes}>
              {collection.notes}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity activeOpacity={0.86} onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{outfitCount} Looks</Text>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={onGenerate} style={styles.generateButton}>
          <Ionicons name="sparkles-outline" size={15} color={colors.textOnAccent} />
          <Text style={styles.generateButtonText}>Generate Outfit for This Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  notes: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  countPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  generateButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 1,
  },
  generateButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
});
