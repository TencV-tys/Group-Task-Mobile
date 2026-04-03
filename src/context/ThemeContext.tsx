// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Token Definitions ─────────────────────────────────────────────────────────
export const LIGHT = {
  // Backgrounds
  bg: '#ffffff',
  bgSecondary: '#f8f9fa',
  bgTertiary: '#e9ecef',
  // Text
  text: '#212529',
  textSecondary: '#495057',
  textMuted: '#868e96',
  textPlaceholder: '#adb5bd',
  // Borders
  border: '#dee2e6',
  borderLight: '#e9ecef',
  // Primary (green)
  primary: '#2b8a3e',
  primaryDark: '#1e6b2c',
  primaryLight: '#ebfbee',
  primaryBorder: '#8ce99a',
  // Danger
  error: '#fa5252',
  errorBg: '#fff5f5',
  errorBorder: '#ffa8a8',
  // Card / surface
  card: '#ffffff',
  cardBorder: '#e9ecef',
  // Misc
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.4)',
  white: '#ffffff',
  black: '#000000',
};

export const DARK = {
  // Backgrounds
  bg: '#0f1117',
  bgSecondary: '#1a1d27',
  bgTertiary: '#252836',
  // Text
  text: '#f1f3f5',
  textSecondary: '#ced4da',
  textMuted: '#868e96',
  textPlaceholder: '#495057',
  // Borders
  border: '#2d3142',
  borderLight: '#252836',
  // Primary (green — slightly brighter in dark mode)
  primary: '#40c057',
  primaryDark: '#2b8a3e',
  primaryLight: '#0d2b14',
  primaryBorder: '#2b8a3e',
  // Danger
  error: '#ff6b6b',
  errorBg: '#2d1515',
  errorBorder: '#c92a2a',
  // Card / surface
  card: '#1a1d27',
  cardBorder: '#2d3142',
  // Misc
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.65)',
  white: '#ffffff',
  black: '#000000',
};

export type Theme = typeof LIGHT;
export type ThemeMode = 'light' | 'dark';

// ─── Context ───────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: LIGHT,
  mode: 'light',
  isDark: false,
  setMode: () => {},
});

const STORAGE_KEY = '@app_theme_mode';

// ─── Provider ──────────────────────────────────────────────────────────────────
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  const isDark = mode === 'dark';
  const theme = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, mode, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────
export const useTheme = () => useContext(ThemeContext);