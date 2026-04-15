import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { spacing, typography } from '../../lib/theme';

type TemperatureInputCardProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function TemperatureInputCard({
  value,
  onChange,
}: TemperatureInputCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.label}>Temperature</Text>
        <Text style={styles.helper}>Optional, but helpful when the weather matters.</Text>
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="72"
          placeholderTextColor="#a09990"
          style={styles.input}
        />
        <View style={styles.unitBadge}>
          <Text style={styles.unitText}>deg F</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
    borderRadius: 16,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  copy: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8a7d71',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontFamily: typography.fontFamily,
  },
  helper: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
    marginRight: 8,
  },
  unitBadge: {
    height: 46,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4e4640',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: typography.fontFamily,
  },
});
