import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';
import OutfitCanvas from './OutfitCanvas';
import type { OutfitCanvasItem } from './types';

type OutfitPreviewModalProps = {
  visible: boolean;
  title: string;
  summary?: string | null;
  items: OutfitCanvasItem[];
  saving?: boolean;
  onClose: () => void;
  onOpenFullView: () => void;
  onSave: () => void;
};

export default function OutfitPreviewModal({
  visible,
  title,
  summary,
  items,
  saving = false,
  onClose,
  onOpenFullView,
  onSave,
}: OutfitPreviewModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Quick view</Text>
          <Text style={styles.title}>{title}</Text>
          {summary ? <Text style={styles.summary}>{summary}</Text> : null}

          <OutfitCanvas items={items} compact style={styles.canvasWrap} />

          <View style={styles.actionsRow}>
            <TouchableOpacity activeOpacity={0.88} onPress={onOpenFullView} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open Full View</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.88} onPress={onSave} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Fit'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.82} onPress={onClose} style={styles.closeAction}>
            <Text style={styles.closeActionText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 15, 14, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: colors.modalBackground,
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    paddingBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  summary: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  canvasWrap: {
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  primaryButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
  closeAction: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  closeActionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
});
