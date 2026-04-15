import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../../lib/theme';

type MenuItem = {
  key: string;
  label: string;
  description?: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  rightLabel?: string;
  busy?: boolean;
};

export default function ProfileMenuList({ items }: { items: MenuItem[] }) {
  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const showChevron = !!item.onPress && !item.disabled && !item.busy;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.84}
            onPress={item.onPress}
            disabled={!item.onPress || item.disabled || item.busy}
            style={[styles.row, index < items.length - 1 && styles.rowDivider, (item.disabled || item.busy) && styles.rowDisabled]}
          >
            <View style={styles.copy}>
              <Text style={[styles.label, item.danger && styles.labelDanger]}>
                {item.busy ? 'Logging Out…' : item.label}
              </Text>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
            </View>

            <View style={styles.trailing}>
              {item.rightLabel ? <Text style={styles.rightLabel}>{item.rightLabel}</Text> : null}
              {showChevron ? <Ionicons name="chevron-forward" size={16} color="rgba(28, 28, 28, 0.52)" /> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 2,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e7dfd5',
  },
  rowDisabled: {
    opacity: 0.7,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  labelDanger: {
    color: '#9e4a3e',
  },
  description: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#6f645a',
    fontFamily: typography.fontFamily,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightLabel: {
    marginRight: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontFamily: typography.fontFamily,
  },
});
