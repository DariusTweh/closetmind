import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EditItemChipGroup from '../Closet/edit/EditItemChipGroup';
import { colors, radii, spacing, typography } from '../../lib/theme';
import { CATEGORY_OPTIONS, getSubtypeOptionsForCategory } from '../../lib/wardrobeTaxonomy';

type AddItemDetailsSheetProps = {
  visible: boolean;
  manualOverride: boolean;
  name: string;
  mainCategory: string;
  subcategory: string;
  color: string;
  vibes: string;
  season: string;
  onClose: () => void;
  onSetManualOverride: (value: boolean) => void;
  onSetName: (value: string) => void;
  onSetMainCategory: (value: string) => void;
  onSetSubcategory: (value: string) => void;
  onSetColor: (value: string) => void;
  onSetVibes: (value: string) => void;
  onSetSeason: (value: string) => void;
};

function DetailInput({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      value={value}
      onChangeText={onChangeText}
      style={styles.input}
    />
  );
}

function formatChipLabel(value: string) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AddItemDetailsSheet({
  visible,
  manualOverride,
  name,
  mainCategory,
  subcategory,
  color,
  vibes,
  season,
  onClose,
  onSetManualOverride,
  onSetName,
  onSetMainCategory,
  onSetSubcategory,
  onSetColor,
  onSetVibes,
  onSetSeason,
}: AddItemDetailsSheetProps) {
  if (!visible) return null;

  const subtypeOptions = getSubtypeOptionsForCategory(mainCategory);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Item Details</Text>
            <Text style={styles.subtitle}>
              {manualOverride
                ? 'Manual mode overrides AI-filled item details on save.'
                : 'Auto mode keeps metadata light and uses AI tagging on save.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.82}>
            <Ionicons name="close-outline" size={19} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, !manualOverride && styles.modeButtonActive]}
              onPress={() => onSetManualOverride(false)}
            >
              <Text style={[styles.modeText, !manualOverride && styles.modeTextActive]}>Auto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, manualOverride && styles.modeButtonActive]}
              onPress={() => onSetManualOverride(true)}
            >
              <Text style={[styles.modeText, manualOverride && styles.modeTextActive]}>Manual</Text>
            </TouchableOpacity>
          </View>

          <DetailInput placeholder="Name" value={name} onChangeText={onSetName} />

          {manualOverride ? (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Main Category</Text>
                <EditItemChipGroup
                  options={CATEGORY_OPTIONS.map((value) => ({ value, label: formatChipLabel(value) }))}
                  value={mainCategory}
                  onChange={onSetMainCategory}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Subtype</Text>
                {subtypeOptions.length ? (
                  <EditItemChipGroup
                    options={subtypeOptions}
                    value={subcategory}
                    onChange={onSetSubcategory}
                  />
                ) : (
                  <Text style={styles.helperText}>
                    Choose a main category first to refine the subtype.
                  </Text>
                )}
              </View>

              <DetailInput placeholder="Color" value={color} onChangeText={onSetColor} />
              <DetailInput placeholder="Vibes" value={vibes} onChangeText={onSetVibes} />
              <DetailInput placeholder="Season" value={season} onChangeText={onSetSeason} />
            </>
          ) : (
            <Text style={styles.helperText}>
              Type, color, vibe, and season will be tagged automatically during save.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 21, 18, 0.36)',
  },
  container: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#fafaff',
    paddingBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 20,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#daddd8',
    marginTop: spacing.sm + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef0f2',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  fieldBlock: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#eef0f2',
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#1c1c1c',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  modeTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#eef0f2',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
