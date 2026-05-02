import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { typography } from '../../lib/theme';

type StatItem = {
  key: string;
  label: string;
  value: number | string;
  onPress?: () => void;
};

function formatStatValue(value: number | string) {
  if (typeof value !== 'number') return value;
  if (value >= 1000) {
    const compact = value / 1000;
    const rounded = compact >= 10 ? Math.round(compact) : Math.round(compact * 10) / 10;
    return `${rounded}K`;
  }
  return String(value);
}

export default function ProfileStatGrid({ items }: { items: StatItem[] }) {
  const isCompact = items.length >= 4;
  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const Cell = item.onPress ? TouchableOpacity : View;
        return (
          <Cell
            key={item.key}
            style={[
              styles.cell,
              isCompact && styles.cellCompact,
              index < items.length - 1 && styles.cellBorder,
            ]}
            onPress={item.onPress}
            activeOpacity={0.84}
          >
            <Text
              style={[styles.value, isCompact && styles.valueCompact]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {formatStatValue(item.value)}
            </Text>
            <Text
              style={[styles.label, isCompact && styles.labelCompact]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {item.label}
            </Text>
          </Cell>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  cellCompact: {
    paddingHorizontal: 8,
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: '#e5ddd3',
  },
  value: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: 'Georgia',
    textAlign: 'center',
    width: '100%',
  },
  valueCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#7e7267',
    fontFamily: typography.fontFamily,
    textAlign: 'center',
    width: '100%',
  },
  labelCompact: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
  },
});
