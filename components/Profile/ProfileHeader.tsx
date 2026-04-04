// components/ProfileHeader.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, colors, radii, typography } from '../../lib/theme';

export default function ProfileHeader({ username, avatarUrl, onEditPress, onSettingsPress }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onSettingsPress} style={styles.settingsIcon}>
        <Ionicons name="settings-outline" size={20} color="#111" />
      </TouchableOpacity>

      <Image
        source={{ uri: avatarUrl || 'https://i.pravatar.cc/150?img=3' }}
        style={styles.avatar}
      />

      <View style={styles.nameRow}>
        <Text style={styles.username}>{username || 'Username'}</Text>
        <TouchableOpacity onPress={onEditPress}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  settingsIcon: {
    position: 'absolute',
    right: spacing.lg,
    top: 0,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.sm,
    backgroundColor: colors.border,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  username: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  editText: {
    fontSize: typography.label.fontSize,
    color: colors.accentSecondary,
  },
});

