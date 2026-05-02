import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../lib/theme';
import OutfitPreviewStrip from '../SavedOutfits/OutfitPreviewStrip';

export default function AddFeaturedFitModal({
  visible,
  outfits,
  loading,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  outfits: any[];
  loading?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (outfitIds: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const selectedCount = useMemo(
    () => Object.keys(selectedIds).filter((key) => selectedIds[key]).length,
    [selectedIds],
  );

  const toggle = (id: string) => {
    setSelectedIds((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const handleClose = () => {
    setSelectedIds({});
    onClose();
  };

  const handleSubmit = () => {
    const ids = Object.keys(selectedIds).filter((key) => selectedIds[key]);
    if (!ids.length) return;
    onSubmit(ids);
    setSelectedIds({});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Feature saved looks</Text>
              <Text style={styles.title}>Add Featured Fits</Text>
              <Text style={styles.subtitle}>Choose the outfits that define your profile identity.</Text>
            </View>
            <TouchableOpacity activeOpacity={0.86} onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.textPrimary} />
            </View>
          ) : outfits.length ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {outfits.map((outfit) => {
                const selected = Boolean(selectedIds[String(outfit?.id || '')]);
                const previewItems = Array.isArray(outfit?.resolvedItems) ? outfit.resolvedItems : [];
                return (
                  <TouchableOpacity
                    key={outfit.id}
                    activeOpacity={0.9}
                    onPress={() => toggle(String(outfit.id))}
                    style={[styles.outfitCard, selected && styles.outfitCardSelected]}
                  >
                    <View style={styles.outfitHeader}>
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected ? <Ionicons name="checkmark" size={14} color={colors.textOnAccent} /> : null}
                      </View>
                      <View style={styles.outfitCopy}>
                        <Text style={styles.outfitTitle} numberOfLines={2}>
                          {outfit?.name || 'Untitled Fit'}
                        </Text>
                        <Text style={styles.outfitMeta} numberOfLines={1}>
                          {[outfit?.context, outfit?.season].filter(Boolean).join(' • ') || 'Saved look'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.previewWrap}>
                      <OutfitPreviewStrip items={previewItems} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No saved looks available</Text>
              <Text style={styles.emptySubtitle}>Save a few outfits first, then feature the ones that best represent you.</Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!selectedCount || submitting}
            onPress={handleSubmit}
            style={[styles.submitButton, (!selectedCount || submitting) && styles.submitButtonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <Text style={styles.submitButtonText}>
                {selectedCount ? `Add ${selectedCount} ${selectedCount === 1 ? 'Fit' : 'Fits'}` : 'Select Looks'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 18, 22, 0.24)',
  },
  sheet: {
    minHeight: '72%',
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.3,
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  outfitCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  outfitCardSelected: {
    borderColor: colors.textPrimary,
  },
  outfitHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
  },
  outfitCopy: {
    flex: 1,
  },
  outfitTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  outfitMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  previewWrap: {
    marginTop: spacing.md,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.48,
  },
  submitButtonText: {
    color: colors.textOnAccent,
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
