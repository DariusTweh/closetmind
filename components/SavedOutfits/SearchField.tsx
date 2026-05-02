import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
  const hasQuery = String(value || '').trim().length > 0;
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
      {hasQuery ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          activeOpacity={0.8}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close" size={14} color="#6a625a" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
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
  clearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d3cbc2',
    backgroundColor: '#f2ece4',
  },
});
