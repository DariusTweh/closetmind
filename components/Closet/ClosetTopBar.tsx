import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '../../lib/theme';

type ClosetTopBarProps = {
  subtitle?: string | null;
  avatarUri?: string | null;
  onPressProfile: () => void;
  onPressSettings?: () => void;
};

export default function ClosetTopBar({
  subtitle,
  avatarUri,
  onPressProfile,
  onPressSettings,
}: ClosetTopBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Closet</Text>
        <Text style={styles.subtitle}>
          {subtitle || 'Curated essentials, ready for today'}
        </Text>
      </View>

      <View style={styles.actions}>
        {onPressSettings ? (
          <TouchableOpacity style={styles.iconButton} onPress={onPressSettings}>
            <Ionicons name="settings-outline" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.avatarButton} onPress={onPressProfile}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person-outline" size={18} color={colors.textPrimary} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textWrap: {
    flex: 1,
    paddingRight: spacing.sm + 2,
  },
  title: {
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    maxWidth: 220,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: radii.pill,
    backgroundColor: '#eef0f2',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
    backgroundColor: '#fafaff',
  },
  avatarButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#daddd8',
    overflow: 'hidden',
    ...shadows.card,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
