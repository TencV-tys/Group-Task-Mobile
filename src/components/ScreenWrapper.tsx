// src/components/ScreenWrapper.tsx
import React from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: any;
  noBottom?: boolean; // For screens with custom bottom navigation
  noTop?: boolean;    // For screens that handle their own top padding
  backgroundColor?: string;
} 

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ 
  children, 
  style,
  noBottom = false,
  noTop = false,
  backgroundColor = '#f8f9fa'
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor,
        paddingTop: noTop ? 0 : insets.top,
        paddingBottom: noBottom ? 0 : insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      },
      style
    ]}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});