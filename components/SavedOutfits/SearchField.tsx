import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '../../lib/theme';

export default function SearchField({
  value,
  onChangeText,
  placeholder = 'Search saved looks',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={18} color="#8f857c" style={styles.icon} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9a9187"
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dad2c8',
    backgroundColor: '#fafaff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#231f1b',
    fontFamily: typography.fontFamily,
    paddingVertical: 0,
  },
});
