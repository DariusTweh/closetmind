import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { typography } from '../../../lib/theme';

export default function ItemPreviewModalActions({
  onEdit,
  onStyle,
}: {
  onEdit: () => void;
  onStyle: () => void;
}) {
  return (
    <View style={styles.row}>
      <TouchableOpacity activeOpacity={0.86} onPress={onEdit} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.86} onPress={onStyle} style={styles.primaryButton}>
        <Text style={styles.primaryText}>Style Item</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#daddd8',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fafaff',
    fontFamily: typography.fontFamily,
  },
});
