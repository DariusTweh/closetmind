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
      <Field label="Source Title" value={draft.source_title} onChangeText={(value) => updateField('source_title', value)} placeholder="Original product title" />
      <Field label="Brand" value={draft.brand} onChangeText={(value) => updateField('brand', value)} placeholder="Add brand" />
      <Field label="Retailer" value={draft.retailer} onChangeText={(value) => updateField('retailer', value)} placeholder="Store or marketplace" />
      <Field label="Price" value={draft.retail_price} onChangeText={(value) => updateField('retail_price', value)} placeholder="Add price" />
      <Field label="Currency" value={draft.currency} onChangeText={(value) => updateField('currency', value)} placeholder="USD" />
      <Field label="Product URL" value={draft.product_url} onChangeText={(value) => updateField('product_url', value)} placeholder="https://..." />
      <Field label="Material" value={draft.material} onChangeText={(value) => updateField('material', value)} placeholder="Cotton, wool, denim..." />
      <Field label="Occasion Tags" value={draft.occasion_tags} onChangeText={(value) => updateField('occasion_tags', value)} placeholder="casual, weekend, dinner..." />
      <Field label="Formality" value={draft.formality} onChangeText={(value) => updateField('formality', value)} placeholder="casual, smart-casual, elevated..." />
      <Field label="Fit Type" value={draft.fit_type} onChangeText={(value) => updateField('fit_type', value)} placeholder="relaxed, slim, oversized..." />
      <Field label="Silhouette" value={draft.silhouette} onChangeText={(value) => updateField('silhouette', value)} placeholder="boxy, straight, wide-leg..." />
      <Field label="Layering Role" value={draft.layering_role} onChangeText={(value) => updateField('layering_role', value)} placeholder="base, mid, outer..." />
      {draft.main_category === 'shoes' ? (
        <Field label="Footwear Style" value={draft.footwear_style} onChangeText={(value) => updateField('footwear_style', value)} placeholder="sneaker, loafer, boot..." />
      ) : null}
      <Field label="Try-On Fit Notes" value={draft.try_on_fit_notes} onChangeText={(value) => updateField('try_on_fit_notes', value)} placeholder="How it wears on-body" multiline />
      <Field label="Styling Notes" value={draft.styling_notes} onChangeText={(value) => updateField('styling_notes', value)} placeholder="How you'd style it" multiline />
      <Field label="Listed Status" value={draft.listed_status} onChangeText={(value) => updateField('listed_status', value)} placeholder="listed / not listed" />
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
