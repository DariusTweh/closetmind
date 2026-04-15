import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { typography } from '../../../lib/theme';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9d9388"
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

export default function EditItemAdvancedSection({
  draft,
  setDraft,
}: {
  draft: any;
  setDraft: React.Dispatch<React.SetStateAction<any>>;
}) {
  const updateField = (key: string, value: string) => {
    setDraft((current: any) => ({ ...current, [key]: value }));
  };

  return (
    <View>
      <Field label="Brand" value={draft.brand} onChangeText={(value) => updateField('brand', value)} placeholder="Add brand" />
      <Field label="Retail Price" value={draft.retail_price} onChangeText={(value) => updateField('retail_price', value)} placeholder="Add price" />
      <Field label="Material" value={draft.material} onChangeText={(value) => updateField('material', value)} placeholder="Cotton, wool, denim..." />
      <Field label="Fit Notes" value={draft.fit_notes} onChangeText={(value) => updateField('fit_notes', value)} placeholder="Relaxed, cropped, tailored..." />
      <Field label="Tags" value={draft.tags} onChangeText={(value) => updateField('tags', value)} placeholder="minimal, office, oversized" />
      <Field label="Listed Status" value={draft.listed_status} onChangeText={(value) => updateField('listed_status', value)} placeholder="listed / not listed" />
      <Field label="Marketplace Settings" value={draft.marketplace_settings} onChangeText={(value) => updateField('marketplace_settings', value)} placeholder="Future seller controls" />
      <Field label="Notes" value={draft.notes} onChangeText={(value) => updateField('notes', value)} placeholder="Internal notes" multiline />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    marginBottom: 8,
    fontFamily: typography.fontFamily,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 20,
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
