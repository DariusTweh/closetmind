import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

type OnboardingScaffoldProps = {
  step?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function OnboardingScaffold({
  step,
  eyebrow = 'ClosetMind Setup',
  title,
  subtitle,
  children,
  footer,
  scroll = false,
  bodyStyle,
  contentContainerStyle,
}: OnboardingScaffoldProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.body}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle, bodyStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, bodyStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          {step ? <Text style={styles.step}>{step}</Text> : null}
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {body}

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  step: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    maxWidth: 340,
    fontFamily: typography.fontFamily,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
