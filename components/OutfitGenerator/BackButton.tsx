// /components/OutfitGenerator/BackButton.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function BackButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backBtn}>
      <Icon name="chevron-back" size={20} color="#444" />
      <Text style={styles.backText}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { marginLeft: 4, fontSize: 15, color: '#444' },
});