import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '../../lib/theme';

function getInitial(value?: string | null) {
  const raw = String(value || '').trim();
  return raw ? raw.charAt(0).toUpperCase() : 'C';
}

export default function ProfileHeroCard({
  displayName,
  username,
  bio,
  avatarUrl,
  onEditPress,
  onSettingsPress,
}: {
  displayName: string;
  username?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  onEditPress: () => void;
  onSettingsPress: () => void;
}) {
  const cleanBio = String(bio || '').trim();
  const handle = username ? `@${String(username).trim()}` : 'No username yet';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.identityRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{getInitial(displayName)}</Text>
            </View>
          )}

          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>Personal profile</Text>
            <Text style={styles.displayName}>{displayName || 'ClosetMind member'}</Text>
            <Text style={styles.handle}>{handle}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onSettingsPress}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={18} color="#1c1c1c" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.bio, !cleanBio && styles.bioPlaceholder]}>
        {cleanBio || 'No bio yet'}
      </Text>

      <TouchableOpacity
        activeOpacity={0.86}
        onPress={onEditPress}
        style={styles.editButton}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  identityRow: {
    flexDirection: 'row',
    flex: 1,
    paddingRight: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#eef0f2',
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#eef0f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '700',
    color: '#2f2822',
    fontFamily: typography.fontFamily,
  },
  identityCopy: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontFamily: typography.fontFamily,
  },
  displayName: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: 'Georgia',
  },
  handle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9d1c7',
    backgroundColor: '#eef0f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bio: {
    marginTop: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  bioPlaceholder: {
    color: '#95897d',
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#211d1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#fafaff',
    fontFamily: typography.fontFamily,
  },
});
