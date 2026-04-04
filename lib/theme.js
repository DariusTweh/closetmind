// theme.js

export const colors = {
  // Backgrounds
  background: '#f5f3f0', // sand
  backgroundAlt: '#eaf1eb', // mint wash
  cardBackground: '#eaf1eb',
  modalBackground: '#f5f3f0',

  // Text
  textPrimary: '#3f4d3c',     // dark olive
  textSecondary: '#755c52',   // soft clay
  textMuted: '#999999',       // stone
  textOnAccent: '#ffffff',

  // Accent colors
  accent: '#e2725b',     // terracotta
  accentSecondary: '#9dbf9e', // sage green

  // Borders & outlines
  border: '#d6d1cc',
  inputBorder: '#d6d1cc',
  divider: '#e0ddd9',

  // Others
  danger: '#d66b5f',
  success: '#8dbd94',
  shadow: 'rgba(0,0,0,0.05)',
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
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
};
export const radii = {
  sm: 8,
  md: 16,
  lg: 22,
  pill: 999,
};

export const typography = {
  fontFamily: 'Inter',
  header: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subheader: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
  },
  button: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textOnAccent,
  },
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
};

export const buttons = {
  primary: {
    backgroundColor: colors.accent,
    color: colors.textOnAccent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.accentSecondary,
    borderWidth: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
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
    borderRadius: radii.pill,
  },
  active: {
    backgroundColor: colors.accent,
    color: colors.textOnAccent,
  },
  inactive: {
    backgroundColor: colors.accentSecondary,
    color: colors.textPrimary,
  },
};

export const card = {
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
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




