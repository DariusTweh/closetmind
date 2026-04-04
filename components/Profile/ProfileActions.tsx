// components/ProfileActions.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, colors, radii, typography } from '../../lib/theme';

export default function ProfileActions({
  onEditProfile,
  onPreferences,
  onLogout,
}) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onEditProfile}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onPreferences}>
        <Text style={styles.buttonText}>Style Preferences</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.logout]} onPress={onLogout}>
        <Text style={[styles.buttonText, styles.logoutText]}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md - 2,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.cardBackground,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  logout: {
    backgroundColor: '#fceeee',
  },
  logoutText: {
    color: colors.danger,
  },
});