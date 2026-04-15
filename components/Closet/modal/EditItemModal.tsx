
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Dimensions
} from 'react-native';
import WardrobeItemImage from '../WardrobeItemImage';
import { colors, spacing, radii, typography } from '../../../lib/theme'; // adjust path if needed

const { width } = Dimensions.get('window');

const CATEGORY_OPTIONS = ['top', 'bottom', 'shoes', 'outerwear', 'onepiece', 'accessory', 'layer'];

const TYPE_OPTIONS = {
  top: ['t-shirt', 'blouse', 'sweater'],
  bottom: ['jeans', 'shorts', 'skirt'],
  shoes: ['sneakers', 'boots', 'heels'],
  outerwear: ['jacket', 'coat', 'blazer'],
  onepiece: ['dress', 'jumpsuit'],
  accessory: ['hat', 'bag', 'scarf'],
  layer: ['hoodie', 'cardigan'],
};

const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const COLORS = ['black', 'white', 'blue', 'beige', 'brown'];


export default function EditItemModal({ visible, item, onClose, onSave }) {
  if (!visible || !item) return null;

  const [name, setName] = useState(item.name || '');
  const [mainCategory, setMainCategory] = useState(item.main_category || '');
  const [type, setType] = useState(item.type || '');
  const [color, setColor] = useState(item.primary_color || '');
  const [pattern, setPattern] = useState(item.pattern_description || '');
  const [season, setSeason] = useState(item.season || '');
  const [vibes, setVibes] = useState(item.vibe_tags?.join(', ') || '');


  const handleSave = () => {
    const updated = {
      name,
      main_category: mainCategory,
      type,
      primary_color: color,
      pattern_description: pattern,
      season,
      vibe_tags: vibes.split(',').map((v) => v.trim().toLowerCase()),
    };
    onSave(updated);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
  <ScrollView contentContainerStyle={styles.cardContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ fontSize: 18 }}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Edit Item</Text>

          <WardrobeItemImage item={item} style={styles.image} />

          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Main Category</Text>
          <View style={styles.pillWrap}>
            {CATEGORY_OPTIONS.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, mainCategory === cat && styles.pillActive]}
                onPress={() => {
                  setMainCategory(cat);
                  setType('');
                }}
              >
                <Text style={mainCategory === cat ? styles.pillTextActive : styles.pillText}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mainCategory ? (
            <>
              <Text style={styles.label}>Type</Text>
              <View style={styles.pillWrap}>
                {TYPE_OPTIONS[mainCategory]?.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pill, type === opt && styles.pillActive]}
                    onPress={() => setType(opt)}
                  >
                    <Text style={type === opt ? styles.pillTextActive : styles.pillText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  color === c && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>

          <Text style={styles.label}>Pattern</Text>
          <TextInput style={styles.input} value={pattern} onChangeText={setPattern} />

          <Text style={styles.label}>Season</Text>
          <View style={styles.pillWrap}>
            {SEASONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, season === s && styles.pillActive]}
                onPress={() => setSeason(s)}
              >
                <Text style={season === s ? styles.pillTextActive : styles.pillText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Vibe Tags</Text>
          <TextInput style={styles.input} value={vibes} onChangeText={setVibes} placeholder="casual, summer" />

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: width * 0.9,
    maxHeight: '90%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  cardContent: {
    paddingBottom: spacing.xl,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.sm + 2,
    right: spacing.sm + 2,
    zIndex: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md - 4,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: radii.md,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.md - 4,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: typography.fontFamily,
  },
  pillTextActive: {
    color: colors.textOnAccent,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginVertical: spacing.md - 2,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorDotSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  cancel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
  },
  saveText: {
    color: colors.textOnAccent,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: typography.fontFamily,
  },
});
