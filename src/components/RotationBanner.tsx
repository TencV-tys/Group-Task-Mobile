// src/components/RotationBanner.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface RotationBannerProps {
  groupName: string;
  newWeek: number;
  taskCount: number;
  onPress: () => void;
  onClose: () => void;
}

export const RotationBanner = ({
  groupName,
  newWeek,
  taskCount,
  onPress,
  onClose
}: RotationBannerProps) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    // Auto hide after 8 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onClose());
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim
        }
      ]}
    >
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.9}>
        <LinearGradient
          colors={['#2b8a3e', '#1e6b2c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="calendar-sync" size={24} color="white" />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>🔄 New Week Started!</Text>
            <Text style={styles.subtitle}>
              {groupName} • Week {newWeek}
            </Text>
            <Text style={styles.taskCount}>
              {taskCount} new task{taskCount !== 1 ? 's' : ''} assigned to you
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={20} color="white" />
          </TouchableOpacity>

          <View style={styles.chevronContainer}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="white" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    width: '100%',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50, // For status bar
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 2,
  },
  taskCount: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  closeButton: {
    padding: 8,
    marginRight: 4,
  },
  chevronContainer: {
    padding: 8,
  },
});