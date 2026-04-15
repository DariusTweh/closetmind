import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';

type WardrobeItem = {
  id: string;
  name?: string;
  type?: string;
  image_url: string;
  image_path?: string;
};

type Props = {
  outfit: WardrobeItem[];
  weather: string;
  location: string;
  onRegenerate: () => void;
  loading: boolean; // ✅ added
};

export default function TodayFitCard({
  outfit=[],
  weather,
  location,
  onRegenerate,
  loading,
}: Props) {
  return (
  <View style={styles.card}>
    <View style={styles.headerRow}>
      <Text style={styles.title}>Today’s Fit</Text>
      <TouchableOpacity onPress={onRegenerate}>
        <Text style={styles.regenerate}>↻ Regenerate</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.subtitle}>
      Optimized for {weather} in {location}
    </Text>

    {loading ? (
  <View style={styles.loadingBox}>
    <Text style={styles.loadingText}>Generating your look...</Text>
  </View>
) : outfit.length === 0 ? (
  <View style={styles.loadingBox}>
    <Text style={styles.loadingText}>please add more clothes and we can have you sharp.</Text>
  </View>
) : (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
    {outfit.map((item) => (
      <View key={item.id} style={styles.imageCard}>
        <WardrobeItemImage item={item} style={styles.image} />
        <Text style={styles.label}>{item.name || item.type || 'Unnamed'}</Text>
      </View>
    ))}
  </ScrollView>
)}
  </View>
);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
 loadingBox: {
  paddingVertical: 24,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 120,
},
loadingText: {
  fontSize: 14,
  color: '#666',
},

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  regenerate: {
    fontSize: 14,
    color: '#007aff',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  imageRow: {
    flexDirection: 'row',
  },
  imageCard: {
    marginRight: 12,
    alignItems: 'center',
  },
  image: {
    width: 90,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    maxWidth: 90,
  },
});
