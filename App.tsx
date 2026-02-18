import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Text } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

// Define your linking configuration
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
      // Auth Screens
      Login: 'login',
      Signup: 'signup',
      ForgotPassword: 'forgot-password', // YOU NEED THIS!
      
      // Main App Screens
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
    console.log("📱 getInitialURL:", url);
    return url;
  },
  subscribe(listener: (url: string) => void) {
    console.log("🔗 Subscribing to deep links");
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log("🔗 Deep link received:", url);
      listener(url);
    });
    return () => {
      console.log("🔗 Unsubscribing from deep links");
      subscription.remove();
    };
  },
};
export default function App() {
  console.log("📱 App starting with linking prefixes:", linking.prefixes);
  
  return (
    <NavigationContainer 
      linking={linking}
      fallback={<Text style={{ marginTop: 50, textAlign: 'center' }}>Loading...</Text>}
      onReady={() => {
        console.log("✅ Navigation container ready");
      }}
    >
      <AppNavigator />
    </NavigationContainer>
  );
}