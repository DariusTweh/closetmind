import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';

const CATEGORY_OPTIONS = ['Top', 'Bottom', 'Shoes', 'Outerwear', 'Onepiece', 'Accessory'];
const COLOR_OPTIONS = ['black', 'white', 'blue', 'beige', 'brown'];
const SEASON_OPTIONS = ['Spring', 'Summer', 'Fall', 'Winter'];

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
  const toggleSelection = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter(item => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Filter Items</Text>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.rowWrap}>
            {CATEGORY_OPTIONS.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.pill,
                  selectedCategories.includes(option) && styles.activePill,
                ]}
                onPress={() =>
                  toggleSelection(option, selectedCategories, setSelectedCategories)
                }
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedCategories.includes(option) && styles.activePillText,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Color */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map(color => (
              <TouchableOpacity
                key={color}
                onPress={() => toggleSelection(color, selectedColors, setSelectedColors)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  selectedColors.includes(color) && styles.colorSelected,
                ]}
              />
            ))}
          </View>

          {/* Season */}
          <Text style={styles.label}>Season</Text>
          <View style={styles.rowWrap}>
            {SEASON_OPTIONS.map(season => (
              <TouchableOpacity
                key={season}
                style={[
                  styles.pill,
                  selectedSeasons.includes(season) && styles.activePill,
                ]}
                onPress={() =>
                  toggleSelection(season, selectedSeasons, setSelectedSeasons)
                }
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedSeasons.includes(season) && styles.activePillText,
                  ]}
                >
                  {season}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Listed toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Listed Only</Text>
            <Switch value={listedOnly} onValueChange={setListedOnly} />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fffaf4',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#111',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#eaeaea',
    borderRadius: 24,
  },
  activePill: {
    backgroundColor: '#111',
  },
  pillText: {
    color: '#444',
    fontSize: 14,
  },
  activePillText: {
    color: '#fff',
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  colorSelected: {
    borderColor: '#111',
    borderWidth: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  clearBtn: {
    backgroundColor: '#eaeaea',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  clearText: {
    fontWeight: '500',
    color: '#111',
  },
  applyBtn: {
    backgroundColor: '#111',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  applyText: {
    fontWeight: '500',
    color: '#fff',
  },
});
