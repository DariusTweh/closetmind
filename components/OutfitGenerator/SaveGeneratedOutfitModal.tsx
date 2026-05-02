import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../lib/theme';

function TravelSelectorChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.tripChip, selected && styles.tripChipSelected]}
    >
      <Text style={[styles.tripChipText, selected && styles.tripChipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

type SaveGeneratedOutfitModalProps = {
  visible: boolean;
  name: string;
  nameLoading?: boolean;
  eyebrowText?: string;
  titleText?: string;
  subtitleText?: string;
  confirmLabel?: string;
  saveMode: 'regular' | 'travel';
  travelCollections: any[];
  travelCollectionsLoading?: boolean;
  selectedTravelCollectionId: string;
  activityLabel: string;
  dayLabel: string;
  generatedOutfit: any[];
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChangeName: (value: string) => void;
  onChangeSaveMode: (value: 'regular' | 'travel') => void;
  onChangeTravelCollectionId: (value: string) => void;
  onChangeActivityLabel: (value: string) => void;
  onChangeDayLabel: (value: string) => void;
  onPressCreateTrip: () => void;
};

export default function SaveGeneratedOutfitModal({
  visible,
  name,
  nameLoading = false,
  eyebrowText = 'Save generated outfit',
  titleText = 'Save Fit',
  subtitleText,
  confirmLabel = 'Save Fit',
  saveMode,
  travelCollections,
  travelCollectionsLoading = false,
  selectedTravelCollectionId,
  activityLabel,
  dayLabel,
  generatedOutfit,
  submitting = false,
  onClose,
  onConfirm,
  onChangeName,
  onChangeSaveMode,
  onChangeTravelCollectionId,
  onChangeActivityLabel,
  onChangeDayLabel,
  onPressCreateTrip,
}: SaveGeneratedOutfitModalProps) {
  const itemCount = Array.isArray(generatedOutfit) ? generatedOutfit.length : 0;
  const resolvedSubtitle =
    subtitleText ||
    (itemCount
      ? `${itemCount} styled ${itemCount === 1 ? 'piece' : 'pieces'} ready to save.`
      : 'Save this look to your archive or a trip.');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{eyebrowText}</Text>
              <Text style={styles.title}>{titleText}</Text>
              <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
            </View>

            <TouchableOpacity activeOpacity={0.86} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.fieldBlock}>
              <FieldLabel>Outfit Name</FieldLabel>
              <View style={styles.nameField}>
                <TextInput
                  value={name}
                  onChangeText={onChangeName}
                  placeholder="Untitled Fit"
                  placeholderTextColor="#9a9187"
                  style={styles.nameInput}
                />
                {nameLoading ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <FieldLabel>Save Mode</FieldLabel>
              <View style={styles.modeRow}>
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => onChangeSaveMode('regular')}
                  style={[styles.modeChip, saveMode === 'regular' && styles.modeChipSelected]}
                >
                  <Text style={[styles.modeChipText, saveMode === 'regular' && styles.modeChipTextSelected]}>
                    Regular
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => onChangeSaveMode('travel')}
                  style={[styles.modeChip, saveMode === 'travel' && styles.modeChipSelected]}
                >
                  <Text style={[styles.modeChipText, saveMode === 'travel' && styles.modeChipTextSelected]}>
                    Travel
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                {saveMode === 'travel'
                  ? 'Travel saves this look into a trip with activity details.'
                  : 'Regular saves this look into your main archive.'}
              </Text>
            </View>

            {saveMode === 'travel' ? (
              <View style={styles.travelCard}>
                <View style={styles.travelHeaderRow}>
                  <View style={styles.travelHeaderCopy}>
                    <Text style={styles.travelHeaderTitle}>Trip Selection</Text>
                    <Text style={styles.travelHeaderText}>Choose where this outfit belongs.</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={onPressCreateTrip}
                    style={styles.createTripButton}
                  >
                    <Ionicons name="add" size={15} color={colors.textPrimary} />
                    <Text style={styles.createTripButtonText}>Create Trip</Text>
                  </TouchableOpacity>
                </View>

                {travelCollectionsLoading ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} style={styles.tripLoader} />
                ) : travelCollections.length ? (
                  <View style={styles.tripChipRow}>
                    {travelCollections.map((collection) => (
                      <TravelSelectorChip
                        key={collection.id}
                        label={collection.name || 'Untitled Trip'}
                        selected={selectedTravelCollectionId === String(collection.id)}
                        onPress={() => onChangeTravelCollectionId(String(collection.id))}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.tripEmptyCard}>
                    <Text style={styles.tripEmptyTitle}>No travel collections yet</Text>
                    <Text style={styles.tripEmptyText}>
                      Create a trip first, then save this outfit into it.
                    </Text>
                  </View>
                )}

                <View style={styles.fieldBlock}>
                  <FieldLabel>Activity Label</FieldLabel>
                  <TextInput
                    value={activityLabel}
                    onChangeText={onChangeActivityLabel}
                    placeholder="Flight, brunch, dinner, beach..."
                    placeholderTextColor="#9a9187"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <FieldLabel>Day Label</FieldLabel>
                  <TextInput
                    value={dayLabel}
                    onChangeText={onChangeDayLabel}
                    placeholder="Day 1, arrival, Friday night..."
                    placeholderTextColor="#9a9187"
                    style={styles.input}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={submitting}
            onPress={onConfirm}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <Text style={styles.submitButtonText}>{confirmLabel}</Text>
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
    minHeight: '68%',
    maxHeight: '90%',
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
  fieldBlock: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: 10,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  nameField: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeChip: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modeChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modeChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  modeChipTextSelected: {
    color: colors.textOnAccent,
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  travelCard: {
    marginTop: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  travelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  travelHeaderCopy: {
    flex: 1,
  },
  travelHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  travelHeaderText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  createTripButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createTripButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  tripLoader: {
    marginBottom: spacing.md,
  },
  tripChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  tripChip: {
    minHeight: 38,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  tripChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tripChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  tripChipTextSelected: {
    color: colors.textOnAccent,
  },
  tripEmptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  tripEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  tripEmptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
});
