import '@/global.css';

import { Platform } from 'react-native';

// ── App-level design tokens ───────────────────────────────────────────────────
// Single source of truth for colors, radii, and shadows used across mobile screens.
export const T = {
  brand:       "#208AEF",
  brandLight:  "#EAF4FF",
  bg:          "#f8f9fa",
  surface:     "#fff",
  border:      "#f0f0f0",
  borderMed:   "#e0e0e0",
  text:        "#1a1a1a",
  textMid:     "#555",
  textSub:     "#888",
  textFaint:   "#aaa",
  danger:      "#dc2626",
  success:     "#10b981",

  radius: { sm: 8, md: 12, lg: 16, xl: 24 } as const,

  shadow: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
  } as const,

  // Interest-request status badge colors
  requestStatus: {
    pending:   { bg: "#fef3c7", text: "#b45309" },
    accepted:  { bg: "#d1fae5", text: "#065f46" },
    declined:  { bg: "#f3f4f6", text: "#6b7280" },
    cancelled: { bg: "#f3f4f6", text: "#6b7280" },
    completed: { bg: "#dbeafe", text: "#1d4ed8" },
  } as const,

  // Listing status badge colors
  listingStatus: {
    draft:     { bg: "#f3f4f6", text: "#374151" },
    published: { bg: "#d1fae5", text: "#065f46" },
    paused:    { bg: "#fef3c7", text: "#92400e" },
    filled:    { bg: "#dbeafe", text: "#1e40af" },
    expired:   { bg: "#fee2e2", text: "#991b1b" },
    removed:   { bg: "#f3f4f6", text: "#6b7280" },
  } as const,
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
