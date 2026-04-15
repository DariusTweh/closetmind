import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import WardrobeItemImage from '../Closet/WardrobeItemImage';

export default function OutfitItemCard({ item, lockedItems = [], onToggleLock }) {
  const isLocked = Array.isArray(lockedItems) && lockedItems.some(l => l.id === item.id);

  return (
    <View style={styles.itemRow}>
      <WardrobeItemImage item={item} style={styles.itemImage} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.itemTitle}>{item.name || item.type}</Text>
        <Text style={styles.itemSubtitle}>{item.reason}</Text>
      </View>

      {/* Lock icon behavior: toggle if function exists, static if not */}
      {typeof onToggleLock === 'function' ? (
        <TouchableOpacity onPress={() => onToggleLock(item)}>
          <Icon
            name={isLocked ? 'lock-closed-outline' : 'lock-open-outline'}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      ) : (
        isLocked && <Icon name="lock-closed-outline" size={20} color="#bbb" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#888',
  },
});
