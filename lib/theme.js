// theme.js

export const colors = {
  // Backgrounds
  background: '#fafaff',
  backgroundAlt: '#eef0f2',
  cardBackground: '#fafaff',
  modalBackground: '#fafaff',
  surface: '#fafaff',
  surfaceContainer: '#eef0f2',
  surfaceContainerLow: '#daddd8',
  surfaceContainerLowest: '#fafaff',

  // Text
  textPrimary: '#1c1c1c',
  textSecondary: 'rgba(28, 28, 28, 0.72)',
  textMuted: 'rgba(28, 28, 28, 0.52)',
  textOnAccent: '#fafaff',

  // Accent colors
  accent: '#1c1c1c',
  accentSecondary: '#1c1c1c',
  accentSoft: '#f1f3f6',

  // Borders & outlines
  border: '#daddd8',
  inputBorder: '#daddd8',
  divider: '#daddd8',

  // Others
  danger: '#1c1c1c',
  success: '#1c1c1c',
  shadow: 'rgba(28, 28, 28, 0.06)',
};
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 80, // ✅ add this if you want spacing.xxl
};
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 14,
  md: 18,
  lg: 22,
  xl: 32,
};
export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
};

export const typography = {
  fontFamily: 'Inter',
  header: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subheader: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  button: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textOnAccent,
  },
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 1,
  },
};

export const buttons = {
  primary: {
    backgroundColor: colors.accent,
    color: colors.textOnAccent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
  },
  secondary: {
    backgroundColor: colors.surfaceContainer,
    borderColor: 'transparent',
    borderWidth: 0,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.textSecondary,
  },
};

export const pills = {
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  active: {
    backgroundColor: colors.accent,
    color: colors.textOnAccent,
  },
  inactive: {
    backgroundColor: colors.surfaceContainer,
    color: colors.textPrimary,
  },
};

export const card = {
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: spacing.md,
    ...shadows.card,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
};
