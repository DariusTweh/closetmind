import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { spacing } from '../../lib/theme';
import { editorialPalette, editorialShadow } from '../../lib/editorialTheme';

type Props = {
  canStyle: boolean;
  canTryOn: boolean;
  canSave: boolean;
  saving?: boolean;
  onStyle: () => void;
  onTryOn: () => void;
  onSave: () => void;
};

export default function VerdictActionsBar({
  canStyle,
  canTryOn,
  canSave,
  saving = false,
  onStyle,
  onTryOn,
  onSave,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.actionCard}>
        <TouchableOpacity
          style={[styles.primaryButton, !canStyle && styles.buttonDisabled]}
          disabled={!canStyle}
          onPress={onStyle}
        >
          <Text style={styles.primaryButtonText}>Style This Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, !canTryOn && styles.secondaryButtonDisabled]}
          disabled={!canTryOn}
          onPress={onTryOn}
        >
          <Text style={[styles.secondaryButtonText, !canTryOn && styles.secondaryButtonTextDisabled]}>
            Try It On
          </Text>
        </TouchableOpacity>

        <View style={styles.saveRow}>
          <Text style={styles.saveStateText}>
            {canSave ? 'Keep it in your closet for later.' : 'Saved to Closet'}
          </Text>
          {canSave || saving ? (
            <TouchableOpacity
              style={[styles.saveInlineButton, saving && styles.buttonDisabled]}
              disabled={saving}
              onPress={onSave}
            >
              <Text style={styles.saveInlineButtonText}>
                {saving ? 'Saving…' : 'Save to Closet'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.savedStatePill}>
              <Text style={styles.savedStatePillText}>Saved</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  actionCard: {
    backgroundColor: editorialPalette.surfaceContainer,
    borderRadius: 14,
    padding: spacing.md + 2,
    gap: 10,
    ...editorialShadow,
  },
  primaryButton: {
    backgroundColor: editorialPalette.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fafaff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: editorialPalette.surfaceContainerLowest,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonDisabled: {
    backgroundColor: editorialPalette.surfaceContainerLow,
  },
  secondaryButtonText: {
    color: editorialPalette.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonTextDisabled: {
    color: editorialPalette.onSurfaceVariant,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  saveStateText: {
    flex: 1,
    color: editorialPalette.onSurfaceVariant,
    fontSize: 12.5,
    lineHeight: 17,
  },
  saveInlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainerLowest,
  },
  saveInlineButtonText: {
    color: editorialPalette.onSurface,
    fontSize: 12.5,
    fontWeight: '700',
  },
  savedStatePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainerLow,
  },
  savedStatePillText: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
