export const COLORS = {
  primary: '#004532',           // Deep Emerald Green (Primary Accent)
  primaryContainer: '#065f46',  // Emerald Container Green
  primaryFixed: '#a6f2d1',      // Light Green Accent
  primaryFixedDim: '#8bd6b6',   // Muted Light Green
  
  background: '#f9f9ff',        // Light Blue/Gray Background
  surface: '#ffffff',           // Pure White Card Background
  surfaceVariant: '#dce2f7',    // Surface details
  surfaceContainer: '#e9edff',  // Secondary background layers
  surfaceContainerLow: '#f1f3ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e1e8fd',
  surfaceContainerHighest: '#dce2f7',
  
  text: '#111827',              // Charcoal Black
  textSecondary: '#5d5f5f',     // Muted Gray Text
  outline: '#6f7973',           // Dark Gray Borders/Lines
  outlineVariant: '#bec9c2',    // Light Gray Borders/Lines
  
  error: '#ba1a1a',             // Error Red
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  
  success: '#1b6b51',           // Success Green
  
  white: '#ffffff',
  transparent: 'transparent',
};

export const SPACING = {
  unit: 4,
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
  gutter: 16,
  margin: 24,
  padding: 20,
};

export const ROUNDED = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
};
