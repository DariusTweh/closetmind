import React from 'react';
import OutfitItemCard from './OutfitItemCard';
import { Text, ActivityIndicator } from 'react-native';

export default function GeneratedOutfit({ outfit, lockedItems, toggleLockItem, loading }) {
  if (loading) {
    return <ActivityIndicator size="large" color="#000" style={{ marginTop: 40 }} />;
  }

  if (outfit.length === 0) {
    return <Text style={{ color: '#777', textAlign: 'center', marginTop: 40 }}>No outfit generated yet.</Text>;
  }

  return (
    <>
      {outfit.map(item => (
        <OutfitItemCard
          key={item.id}
          item={item}
          lockedItems={lockedItems}
          onToggleLock={toggleLockItem}
        />
      ))}
    </>
  );
}
