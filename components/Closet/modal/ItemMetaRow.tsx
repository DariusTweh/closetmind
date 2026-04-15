import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../../../lib/theme';

export default function ItemMetaRow({ items = [] }: { items?: string[] }) {
  const filtered = items.filter(Boolean);
  if (!filtered.length) return null;

  return (
    <View style={styles.row}>
      {filtered.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 ? <View style={styles.dot} /> : null}
          <Text style={styles.text}>{item}</Text>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.65,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  dot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(28, 28, 28, 0.32)',
    marginHorizontal: 6,
  },
});
