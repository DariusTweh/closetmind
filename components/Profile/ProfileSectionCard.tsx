import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '../../lib/theme';

export default function ProfileSectionCard({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  onActionPress,
  children,
  compact = false,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children?: React.ReactNode;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {actionLabel && onActionPress ? (
          <TouchableOpacity activeOpacity={0.84} onPress={onActionPress} style={styles.actionButton}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(28, 28, 28, 0.72)" />
          </TouchableOpacity>
        ) : null}
      </View>

      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    padding: spacing.lg,
  },
  cardCompact: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: 'Georgia',
  },
  titleCompact: {
    fontSize: 20,
    lineHeight: 24,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  actionLabel: {
    marginRight: 4,
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  content: {
    marginTop: spacing.md,
  },
});
