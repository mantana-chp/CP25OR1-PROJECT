/**
 * Design System - Global Style Configuration
 * Similar to Tailwind's theme configuration
 * Use these tokens throughout the app for consistency
 */

import { TextStyle, ViewStyle } from 'react-native'

// ==================== COLORS ====================
export const colors = {
  // Primary/Brand Colors
  primary: {
    DEFAULT: '#225877',
    light: '#5FA7D1',
    dark: '#1a4359'
  },

  // Semantic Status Colors
  success: {
    DEFAULT: '#15AD90',
    light: '#E6FFFA',
    dark: '#0f8b72'
  },
  warning: {
    DEFAULT: '#FF9531',
    light: '#FFF4E6',
    dark: '#cc7727'
  },
  danger: {
    DEFAULT: '#DC2626',
    light: '#FEE2E2',
    dark: '#b91c1c'
  },
  info: {
    DEFAULT: '#3B82F6',
    light: '#EFF6FF',
    dark: '#2563eb'
  },

  // Neutral/Gray Scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  },

  // Background Colors
  background: {
    primary: '#FFF9F1',
    secondary: '#fff',
    tertiary: '#f9fafb'
  },

  // Border Colors
  border: {
    light: '#e5e7eb',
    DEFAULT: '#d1d5db',
    dark: '#9ca3af'
  },

  // Special UI Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.3)',

  // Alert Colors
  alert: {
    warning: '#FEF3C7',
    warningBorder: '#FDE68A',
    warningText: '#92400E',
    warningIcon: '#F59E0B'
  }
}

// ==================== TYPOGRAPHY ====================
export const typography = {
  // Font Families (Prompt)
  fontFamily: {
    regular: 'Prompt_400Regular',
    medium: 'Prompt_500Medium',
    semibold: 'Prompt_600SemiBold',
    bold: 'Prompt_700Bold'
  },

  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 12,
    base: 13,
    md: 14,
    lg: 16,
    xl: 17,
    '2xl': 18,
    '3xl': 22,
    '4xl': 24
  },

  // Line Heights
  lineHeight: {
    tight: 16,
    normal: 20,
    relaxed: 24,
    loose: 28
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1
  }
}

// ==================== SPACING ====================
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80
}

// ==================== BORDER RADIUS ====================
export const borderRadius = {
  none: 0,
  sm: 4,
  DEFAULT: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999
}

// ==================== SHADOWS ====================
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  DEFAULT: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8
  }
}

// ==================== ICON SIZES ====================
export const iconSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 64
}

// ==================== COMMON STYLE UTILITIES ====================

// Text Styles
export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
    lineHeight: typography.lineHeight.loose
  } as TextStyle,
  h2: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary.DEFAULT,
    lineHeight: typography.lineHeight.relaxed
  } as TextStyle,
  h3: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary.DEFAULT,
    lineHeight: typography.lineHeight.relaxed
  } as TextStyle,
  h4: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary.DEFAULT
  } as TextStyle,

  // Body Text
  body: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    lineHeight: typography.lineHeight.normal
  } as TextStyle,
  bodyMedium: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[600]
  } as TextStyle,

  // Small Text
  caption: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500]
  } as TextStyle,
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[400],
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide
  } as TextStyle,

  // Status Text
  danger: {
    color: colors.danger.DEFAULT,
    fontFamily: typography.fontFamily.semibold
  } as TextStyle,
  success: {
    color: colors.success.DEFAULT,
    fontFamily: typography.fontFamily.medium
  } as TextStyle
}

// Container Styles
export const containerStyles = {
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.DEFAULT
  } as ViewStyle,
  cardCompact: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing[3]
  } as ViewStyle,
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius['2xl'],
    ...shadows.lg
  } as ViewStyle,
  section: {
    gap: spacing[3]
  } as ViewStyle
}

// Button/Badge Styles
export const badgeStyles = {
  success: {
    backgroundColor: colors.success.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2]
  } as ViewStyle,
  warning: {
    backgroundColor: colors.warning.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2]
  } as ViewStyle,
  danger: {
    backgroundColor: colors.danger.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2]
  } as ViewStyle
}

// Divider Styles
export const dividerStyles = {
  horizontal: {
    height: 1,
    backgroundColor: colors.border.light
  } as ViewStyle,
  vertical: {
    width: 1,
    backgroundColor: colors.border.light
  } as ViewStyle
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get color by status
 */
export const getStatusColor = (
  status: 'done' | 'overdue' | 'pending' | 'upcoming'
) => {
  switch (status) {
    case 'done':
      return colors.success.DEFAULT
    case 'overdue':
      return colors.danger.DEFAULT
    case 'pending':
      return colors.warning.DEFAULT
    default:
      return colors.gray[500]
  }
}

/**
 * Get background color by status
 */
export const getStatusBgColor = (
  status: 'done' | 'overdue' | 'pending' | 'upcoming'
) => {
  switch (status) {
    case 'done':
      return colors.success.light
    case 'overdue':
      return colors.danger.light
    case 'pending':
      return colors.warning.light
    default:
      return colors.gray[100]
  }
}

// ==================== EXPORT ALL ====================
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  iconSizes,
  textStyles,
  containerStyles,
  badgeStyles,
  dividerStyles,
  getStatusColor,
  getStatusBgColor
}

export default theme
