/**
 * Ported from client/src/index.css's `:root` / `.dark` custom properties —
 * these are TREK's actual semantic color tokens, not a native-app-specific
 * palette. Keep this in sync by hand when the web tokens change; there's no
 * way to share the CSS file itself across a totally different rendering
 * stack (RN StyleSheet has no custom-property equivalent).
 *
 * The web app's *default* accent is monochrome (near-black in light, near-
 * white in dark) — colored "schemes" are a user preference layered on top.
 * Phase 1 of the theme port ships only the default scheme; per-user scheme
 * choice is a Phase 3 settings feature, matching client/src/theme/.
 */
export interface ColorTokens {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCard: string;
  bgInput: string;
  bgHover: string;
  bgSelected: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  borderPrimary: string;
  borderSecondary: string;
  accent: string;
  accentText: string;
  accentHover: string;
  accentSubtle: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
}

export const lightColors: ColorTokens = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  bgCard: '#ffffff',
  bgInput: '#ffffff',
  bgHover: 'rgba(0,0,0,0.03)',
  bgSelected: '#e2e8f0',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  borderPrimary: '#e5e7eb',
  borderSecondary: '#f3f4f6',
  accent: '#111827',
  accentText: '#ffffff',
  accentHover: '#1f2937',
  accentSubtle: '#f1f5f9',
  success: '#16a34a',
  successSoft: '#dcfce7',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  info: '#2563eb',
  infoSoft: '#eff6ff',
  overlay: 'rgba(0,0,0,0.5)',
};

export const darkColors: ColorTokens = {
  bgPrimary: '#121215',
  bgSecondary: '#1a1a1e',
  bgTertiary: '#1c1c21',
  bgCard: '#131316',
  bgInput: '#1c1c21',
  bgHover: 'rgba(255,255,255,0.06)',
  bgSelected: 'rgba(255,255,255,0.1)',
  textPrimary: '#f4f4f5',
  textSecondary: '#d4d4d8',
  textMuted: '#a1a1aa',
  textFaint: '#71717a',
  borderPrimary: '#27272a',
  borderSecondary: '#1c1c21',
  accent: '#e4e4e7',
  accentText: '#09090b',
  accentHover: '#d4d4d8',
  accentSubtle: 'rgba(255,255,255,0.08)',
  success: '#22c55e',
  successSoft: 'rgba(34,197,94,0.15)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239,68,68,0.15)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.15)',
  info: '#3b82f6',
  infoSoft: 'rgba(59,130,246,0.15)',
  overlay: 'rgba(0,0,0,0.6)',
};

/** client/src/index.css's --sp-* / --radius-* scale. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };

export const fontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

/**
 * Phone-shell tokens from client/src/mobile/mobile.css (`.m-root` / `.dark .m-root`).
 * The native app follows that shell — glass dock, paper background, monochrome
 * active pill — rather than the desktop Tailwind surface scale above.
 */
export interface MobileTokens {
  ink: string;
  muted: string;
  faint: string;
  bg: string;
  scrTop: string;
  scrMid: string;
  scrBot: string;
  glass: string;
  glassBorder: string;
  card: string;
  cardBorder: string;
  act: string;
  actFg: string;
  ic: string;
  sheet: string;
  danger: string;
  rowBorder: string;
  mapBg: string;
}

export const mobileLight: MobileTokens = {
  ink: '#101013',
  muted: '#68686F',
  faint: '#9A9AA1',
  bg: '#F3F2EF',
  scrTop: '#FBFAF7',
  scrMid: '#F1EFEA',
  scrBot: '#E9E7E1',
  glass: 'rgba(255,255,255,0.6)',
  glassBorder: 'rgba(255,255,255,0.75)',
  card: 'rgba(255,255,255,0.55)',
  cardBorder: 'rgba(255,255,255,0.75)',
  act: '#101013',
  actFg: '#ffffff',
  ic: 'rgba(16,16,19,0.04)',
  sheet: 'rgba(250,250,248,0.96)',
  danger: '#D6273B',
  rowBorder: 'rgba(16,16,19,0.045)',
  mapBg: '#E8E6E1',
};

export const mobileDark: MobileTokens = {
  ink: '#F5F5F7',
  muted: '#9C9CA3',
  faint: '#6E6E76',
  bg: '#0A0A0C',
  scrTop: '#17171C',
  scrMid: '#0C0C0F',
  scrBot: '#08080A',
  glass: 'rgba(26,26,31,0.6)',
  glassBorder: 'rgba(255,255,255,0.12)',
  card: 'rgba(24,24,29,0.55)',
  cardBorder: 'rgba(255,255,255,0.1)',
  act: '#F5F5F7',
  actFg: '#101013',
  ic: 'rgba(255,255,255,0.09)',
  sheet: 'rgba(22,22,27,0.96)',
  danger: '#D6273B',
  rowBorder: 'rgba(255,255,255,0.07)',
  mapBg: '#121215',
};
