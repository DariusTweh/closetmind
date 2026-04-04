// components/ProfileHeader.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function ProfileHeader({ avatarUrl, name, email, onEdit }) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{email}</Text>
      <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
        <Text style={styles.editText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  editBtn: {
    backgroundColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
});
