// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider } from './src/context/ThemeContext';

const linking = {
  prefixes: [
    'exp://192.168.1.29:8081',
    'exp://localhost:8081',
    'grouptask://',
    'https://grouptask.com',
    Linking.createURL('/'),
  ],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      ForgotPassword: 'forgot-password',
      Home: 'home',
      MyGroups: 'my-groups',
      CreateGroup: 'create-group',
      JoinGroup: 'join-group',
      Profile: 'profile',
      GroupTasks: 'group-tasks',
      CreateTask: 'create-task',
      UpdateTask: 'update-task',
      GroupMembers: 'group-members',
      TaskDetails: 'task-details',
      TaskAssignment: 'task-assignment',
      RotationSchedule: 'rotation-schedule',
      CompleteAssignment: 'complete-assignment',
      AssignmentDetails: 'assignment-details',
      PendingVerifications: 'pending-verifications',
      PendingSwapRequests: 'pending-swap-requests',
      MySwapRequests: 'my-swap-requests',
      CreateSwapRequest: 'create-swap-request',
      SwapRequestDetails: 'swap-request-details',
      DetailedStatistics: 'detailed-statistics',
      FullLeaderboard: 'full-leaderboard',
      Feedback: 'feedback',
      FeedbackDetails: 'feedback-details',
      Notifications: 'notifications',
      FeedbackHistory: 'feedback-history',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return url;
  },
  subscribe(listener: (url: string) => void) {
    const subscription = Linking.addEventListener('url', ({ url }) => listener(url));
    return () => subscription.remove();
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      {/*
        ThemeProvider sits at the root so every screen can access useTheme().
        Login and Signup just never call useTheme() — they stay permanently light.
        If you ever want them themed too, it's already available.
      */}
      <ThemeProvider>
        <SocketProvider>
          <NavigationContainer
            linking={linking}
            fallback={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ marginTop: 50, textAlign: 'center' }}>Loading...</Text>
              </View>
            }
          >
            <AppNavigator />
          </NavigationContainer>
        </SocketProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}