// screens/Onboarding/StyleVibeScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const STYLE_OPTIONS = [
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'classy', label: 'Classy' },
  { id: 'athleisure', label: 'Athleisure' },
  { id: 'trendy', label: 'Trendy' },
  { id: 'y2k', label: 'Y2K' },
  { id: 'unsure', label: 'Still figuring it out' },
];

export default function StyleVibeScreen() {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  const handleNext = () => {
    navigation.navigate('UseIntent');
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, selected.includes(item.id) && styles.selectedCard]}
      onPress={() => toggleSelection(item.id)}
    >
      <View style={styles.placeholderBox} />
      <Text style={styles.label}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>How would you describe your overall style?</Text>
      <Text style={styles.subtitle}>Select 1–3 options</Text>
      <FlatList
        data={STYLE_OPTIONS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={selected.length === 0}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 120,
  },
  card: {
    width: '47%',
    aspectRatio: 1,
    margin: '1.5%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  selectedCard: {
    borderColor: '#f4a261',
    borderWidth: 2,
  },
  placeholderBox: {
    width: '80%',
    height: '60%',
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
  },
  label: {
    fontSize: 14,
    color: '#111',
    marginTop: 8,
    textAlign: 'center',
  },
  nextButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#f4a261',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});