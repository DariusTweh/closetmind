import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '../../../lib/theme';

const CATEGORY_OPTIONS = [
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Shoes', value: 'shoes' },
  { label: 'Outerwear', value: 'outerwear' },
  { label: 'Onepiece', value: 'onepiece' },
  { label: 'Accessory', value: 'accessory' },
];
const COLOR_OPTIONS = ['black', 'white', 'blue', 'beige', 'brown'];
const SEASON_OPTIONS = [
  { label: 'Spring', value: 'spring' },
  { label: 'Summer', value: 'summer' },
  { label: 'Fall', value: 'fall' },
  { label: 'Winter', value: 'winter' },
];

export default function FilterModal({
  visible,
  onClose,
  selectedCategories,
  setSelectedCategories,
  selectedColors,
  setSelectedColors,
  selectedSeasons,
  setSelectedSeasons,
  listedOnly,
  setListedOnly,
  onApply,
  onClear,
}) {
  const insets = useSafeAreaInsets();

  const toggleSelection = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter(item => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Filters</Text>
              <Text style={styles.subtitle}>Refine your closet view.</Text>
            </View>

            <TouchableOpacity activeOpacity={0.84} onPress={onClear}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category</Text>
              <View style={styles.chipWrap}>
                {CATEGORY_OPTIONS.map((option) => {
                  const active = selectedCategories.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.84}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() =>
                        toggleSelection(option.value, selectedCategories, setSelectedCategories)
                      }
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Color</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((color) => {
                  const active = selectedColors.includes(color);
                  return (
                    <TouchableOpacity
                      key={color}
                      activeOpacity={0.84}
                      onPress={() => toggleSelection(color, selectedColors, setSelectedColors)}
                      style={[styles.colorButton, active && styles.colorButtonActive]}
                    >
                      <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Season</Text>
              <View style={styles.chipWrap}>
                {SEASON_OPTIONS.map((season) => {
                  const active = selectedSeasons.includes(season.value);
                  return (
                    <TouchableOpacity
                      key={season.value}
                      activeOpacity={0.84}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() =>
                        toggleSelection(season.value, selectedSeasons, setSelectedSeasons)
                      }
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {season.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.sectionLabel}>Listed Only</Text>
                  <Text style={styles.toggleHint}>Show only items that are already listed.</Text>
                </View>
                <Switch
                  value={listedOnly}
                  onValueChange={setListedOnly}
                  trackColor={{ false: '#daddd8', true: '#1c1c1c' }}
                  thumbColor={listedOnly ? '#f9f5ef' : '#fafaff'}
                  ios_backgroundColor="#daddd8"
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
            <TouchableOpacity activeOpacity={0.84} style={styles.secondaryButton} onPress={onClear}>
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.84} style={styles.primaryButton} onPress={onApply}>
              <Text style={styles.primaryButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 17, 13, 0.34)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fafaff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: '#e5ddd3',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#daddd8',
    marginTop: 10,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f2',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1713',
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#766a5f',
    fontFamily: typography.fontFamily,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5a5149',
    fontFamily: typography.fontFamily,
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: spacing.md,
  },
  section: {
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 1.05,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontFamily: typography.fontFamily,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fafaff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#1c1c1c',
    borderColor: '#1c1c1c',
  },
  chipText: {
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  chipTextActive: {
    color: '#f8f4ee',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonActive: {
    borderColor: '#1c1c1c',
    borderWidth: 2,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  toggleHint: {
    maxWidth: 230,
    fontSize: 13,
    lineHeight: 18,
    color: '#766a5f',
    fontFamily: typography.fontFamily,
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 14,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#eef0f2',
    backgroundColor: '#fafaff',
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#211d1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  primaryButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#eef0f2',
    fontFamily: typography.fontFamily,
  },
});
