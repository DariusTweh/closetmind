import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../../lib/theme';

export default function OutfitMetaRow({
  itemCount,
  season,
  isFavorite,
}: {
  itemCount: number;
  season?: string | null;
  isFavorite?: boolean;
}) {
  const parts = [
    `${itemCount} ${itemCount === 1 ? 'piece' : 'pieces'}`,
    season ? String(season).charAt(0).toUpperCase() + String(season).slice(1) : 'All season',
    isFavorite ? 'Favorite' : 'Saved',
  ].filter(Boolean);

  return (
    <View style={styles.row}>
      {parts.map((part, index) => (
        <React.Fragment key={part}>
          {index > 0 ? <View style={styles.dot} /> : null}
          <Text style={styles.text}>{part}</Text>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#7b7066',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#b2a79c',
    marginHorizontal: 8,
  },
});
