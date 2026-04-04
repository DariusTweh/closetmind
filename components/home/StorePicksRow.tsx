import React from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Linking
} from 'react-native';

type StoreItem = {
  id: string;
  name: string;
  image_url: string;
  link: string;
};

type Props = {
  picks: StoreItem[];
};

export default function StorePicksRow({ picks=[] }: Props) {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err =>
      console.error('❌ Failed to open store link:', err)
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top Picks from Your Favorite Stores</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {picks.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => handleOpenLink(item.link)}
          >
            <Image source={{ uri: item.image_url }} style={styles.image} />
            <Text style={styles.label} numberOfLines={2}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 10,
  },
  card: {
    width: 100,
    marginRight: 14,
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});
