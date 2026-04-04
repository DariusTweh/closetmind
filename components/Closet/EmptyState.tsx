import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import HangerHeartIcon from '../icons/HangerHeartIcon'; 

export default function EmptyState({ message = "No items found." }) {
  return (
    <View style={styles.container}>
     <HangerHeartIcon size={100} color="#8abfa3" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 16,
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
