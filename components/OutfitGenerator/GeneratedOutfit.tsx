// /components/OutfitGenerator/GeneratedOutfit.tsx
import React from 'react';
import OutfitItemCard from './OutfitItemCard';
import { Text, ActivityIndicator } from 'react-native';

export default function GeneratedOutfit({ outfit, lockedItems, toggleLockItem, loading, wardrobe }) {
  if (loading) {
    return <ActivityIndicator size="large" color="#000" style={{ marginTop: 40 }} />;
  }

  if (outfit.length === 0) {
    return <Text style={{ color: '#777', textAlign: 'center', marginTop: 40 }}>No outfit generated yet.</Text>;
  }

  return (
    <>
      {outfit.map(({ id, reason }) => {
        const fullItem = wardrobe.find(item => item.id === id);

        if (!fullItem) {
          return (
            <OutfitItemCard
              key={id}
              item={{ id, name: 'Unknown item', reason }}
              lockedItems={lockedItems}
              onToggleLock={toggleLockItem}
            />
          );
        }

        return (
          <OutfitItemCard
            key={id}
            item={{ ...fullItem, reason }} // ⬅️ inject GPT’s reason
            lockedItems={lockedItems}
            onToggleLock={toggleLockItem}
          />
        );
      })}
    </>
  );
}