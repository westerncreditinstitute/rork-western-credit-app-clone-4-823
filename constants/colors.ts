export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  accentLight: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textLight: string;
  textInverse: string;
  border: string;
  borderLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  white: string;
  black: string;
  overlay: string;
  gradient: {
    primary: [string, string];
    secondary: [string, string];
    accent: [string, string];
    dark: [string, string];
  };
  shadow: {
    color: string;
    light: string;
  };
}

export const LightTheme: ThemeColors = {
  primary: "#002B5C",
  primaryLight: "#003D82",
  primaryDark: "#001F42",
  secondary: "#10B981",
  secondaryLight: "#34D399",
  accent: "#10B981",
  accentLight: "#6EE7B7",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  surfaceElevated: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#475569",
  textLight: "#94A3B8",
  textInverse: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#DBEAFE",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(15, 23, 42, 0.5)",
  gradient: {
    primary: ["#002B5C", "#004494"],
    secondary: ["#10B981", "#059669"],
    accent: ["#10B981", "#34D399"],
    dark: ["#0F172A", "#1E293B"],
  },
  shadow: {
    color: "#0F172A",
    light: "rgba(15, 23, 42, 0.08)",
  },
};

export const DarkTheme: ThemeColors = {
  primary: "#60A5FA",
  primaryLight: "#93C5FD",
  primaryDark: "#3B82F6",
  secondary: "#34D399",
  secondaryLight: "#6EE7B7",
  accent: "#34D399",
  accentLight: "#A7F3D0",
  background: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#334155",
  surfaceElevated: "#1E293B",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textLight: "#64748B",
  textInverse: "#0F172A",
  border: "#334155",
  borderLight: "#1E293B",
  success: "#34D399",
  successLight: "#064E3B",
  warning: "#FBBF24",
  warningLight: "#78350F",
  error: "#F87171",
  errorLight: "#7F1D1D",
  info: "#60A5FA",
  infoLight: "#1E3A8A",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.7)",
  gradient: {
    primary: ["#1E293B", "#334155"],
    secondary: ["#059669", "#10B981"],
    accent: ["#10B981", "#34D399"],
    dark: ["#0F172A", "#1E293B"],
  },
  shadow: {
    color: "#000000",
    light: "rgba(0, 0, 0, 0.3)",
  },
};

const Colors = LightTheme;

export default Colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40 },
  h2: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h3: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h4: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  bodySemibold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  captionMedium: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  small: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16 },
} as const;
