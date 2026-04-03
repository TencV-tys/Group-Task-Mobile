// src/components/ThemeToggle.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, ThemeMode } from '../context/ThemeContext';

const OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark',  label: 'Dark',  icon: '☾' },
];

export const ThemeToggle = () => {
  const { theme, mode, setMode } = useTheme();

  return (
    <View>
  
      <View style={[styles.track, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
        {OPTIONS.map((opt) => {
          const active = mode === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.option,
                active && { backgroundColor: theme.primary },
              ]}
              onPress={() => setMode(opt.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.icon, { color: active ? '#fff' : theme.textMuted }]}>
                {opt.icon}
              </Text>
              <Text style={[styles.optionText, { color: active ? '#fff' : theme.textMuted }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 2,
  },
  track: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  icon: { fontSize: 14 },
  optionText: { fontSize: 13, fontWeight: '600' },
});