// components/ProfileActions.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, colors, radii, typography } from '../../lib/theme';

export default function ProfileActions({
  onEditProfile,
  onPreferences,
  onLogout,
  logoutBusy = false,
}) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onEditProfile}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onPreferences}>
        <Text style={styles.buttonText}>Style Preferences</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logout, logoutBusy && styles.disabledButton]}
        onPress={onLogout}
        disabled={logoutBusy}
      >
        <Text style={[styles.buttonText, styles.logoutText]}>{logoutBusy ? 'Logging Out…' : 'Log Out'}</Text>
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
  disabledButton: {
    opacity: 0.6,
  },
  logoutText: {
    color: colors.danger,
  },
});
