import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { formatTripDateValue, parseDateOnly, toIsoDateString } from '../../lib/travelCollections';
import { colors, spacing, typography } from '../../lib/theme';
import type { TravelCollectionDraft } from '../../types/travelCollections';

type DateFieldKey = 'start_date' | 'end_date';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function TextField({
  label,
  value,
  placeholder,
  multiline,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9a9187"
        multiline={multiline}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onPress,
  onClear,
}: {
  label: string;
  value?: string | null;
  onPress: () => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <FieldLabel>{label}</FieldLabel>
      <Pressable onPress={onPress} style={styles.dateField}>
        <Text style={[styles.dateValue, !value && styles.datePlaceholder]}>
          {value ? formatTripDateValue(value) : 'Select date'}
        </Text>
        {value ? (
          <TouchableOpacity onPress={onClear} hitSlop={10} style={styles.dateClearButton}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        )}
      </Pressable>
    </View>
  );
}

export default function CreateTravelCollectionModal({
  visible,
  submitting,
  initialValues,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  submitting?: boolean;
  initialValues?: TravelCollectionDraft | null;
  onClose: () => void;
  onSubmit: (draft: TravelCollectionDraft) => void;
}) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [pickerField, setPickerField] = useState<DateFieldKey | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(String(initialValues?.name || ''));
    setDestination(String(initialValues?.destination || ''));
    setStartDate(initialValues?.start_date || null);
    setEndDate(initialValues?.end_date || null);
    setNotes(String(initialValues?.notes || ''));
    setPickerField(null);
  }, [initialValues, visible]);

  const activePickerDate = useMemo(() => {
    if (!pickerField) return new Date();
    const currentValue = pickerField === 'start_date' ? startDate : endDate;
    return parseDateOnly(currentValue) || new Date();
  }, [endDate, pickerField, startDate]);

  const applyPickedDate = (field: DateFieldKey, nextDate: Date | undefined) => {
    if (!nextDate) return;
    const normalized = toIsoDateString(nextDate);
    if (field === 'start_date') {
      setStartDate(normalized);
      if (endDate && normalized > endDate) {
        setEndDate(normalized);
      }
    } else {
      setEndDate(normalized);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!pickerField) return;

    if (Platform.OS === 'android') {
      if (event.type === 'set') {
        applyPickedDate(pickerField, selectedDate);
      }
      setPickerField(null);
      return;
    }

    applyPickedDate(pickerField, selectedDate);
  };

  const handleSubmit = () => {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return;

    if (startDate && endDate && startDate > endDate) {
      return;
    }

    onSubmit({
      name: trimmedName,
      destination: String(destination || '').trim() || null,
      start_date: startDate,
      end_date: endDate,
      notes: String(notes || '').trim() || null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Travel planning</Text>
              <Text style={styles.title}>Create Travel Collection</Text>
              <Text style={styles.subtitle}>Save outfits into a trip so they stay grouped by activity and day.</Text>
            </View>

            <TouchableOpacity activeOpacity={0.86} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <TextField
              label="Trip Name"
              value={name}
              placeholder="Summer in Lisbon"
              onChangeText={setName}
            />

            <TextField
              label="Destination"
              value={destination}
              placeholder="Lisbon, Portugal"
              onChangeText={setDestination}
            />

            <View style={styles.row}>
              <View style={styles.rowField}>
                <DateField
                  label="Start Date"
                  value={startDate}
                  onPress={() => setPickerField('start_date')}
                  onClear={() => setStartDate(null)}
                />
              </View>
              <View style={styles.rowField}>
                <DateField
                  label="End Date"
                  value={endDate}
                  onPress={() => setPickerField('end_date')}
                  onClear={() => setEndDate(null)}
                />
              </View>
            </View>

            <TextField
              label="Notes"
              value={notes}
              placeholder="Dinner reservations, shoe planning, beach day ideas..."
              multiline
              onChangeText={setNotes}
            />

            {startDate && endDate && startDate > endDate ? (
              <Text style={styles.validationText}>End date must be on or after the start date.</Text>
            ) : null}

            {Platform.OS === 'ios' && pickerField ? (
              <View style={styles.iosPickerCard}>
                <View style={styles.iosPickerHeader}>
                  <Text style={styles.iosPickerTitle}>
                    {pickerField === 'start_date' ? 'Select start date' : 'Select end date'}
                  </Text>
                  <View style={styles.iosPickerActions}>
                    <TouchableOpacity
                      activeOpacity={0.86}
                      onPress={() => {
                        if (pickerField === 'start_date') setStartDate(null);
                        if (pickerField === 'end_date') setEndDate(null);
                      }}
                    >
                      <Text style={styles.iosPickerActionText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.86} onPress={() => setPickerField(null)}>
                      <Text style={styles.iosPickerActionText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <DateTimePicker
                  value={activePickerDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                />
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={submitting || !String(name || '').trim() || Boolean(startDate && endDate && startDate > endDate)}
            onPress={handleSubmit}
            style={[
              styles.submitButton,
              (submitting || !String(name || '').trim() || Boolean(startDate && endDate && startDate > endDate)) &&
                styles.submitButtonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <Text style={styles.submitButtonText}>Create Trip</Text>
            )}
          </TouchableOpacity>
        </View>

        {Platform.OS === 'android' && pickerField ? (
          <DateTimePicker
            value={activePickerDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        ) : null}
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
    maxHeight: '92%',
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
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowField: {
    flex: 1,
  },
  dateField: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateValue: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  datePlaceholder: {
    color: '#9a9187',
  },
  dateClearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationText: {
    marginTop: -2,
    marginBottom: spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    color: '#8a4b34',
    fontFamily: typography.fontFamily,
  },
  iosPickerCard: {
    marginTop: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  iosPickerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  iosPickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iosPickerActionText: {
    fontSize: 12.5,
    fontWeight: '700',
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
    opacity: 0.55,
  },
  submitButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
});
