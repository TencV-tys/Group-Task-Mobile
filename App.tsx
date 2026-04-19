// App.tsx - FINAL CLEAN VERSION

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Text, View, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AppNavigator from './src/navigation/AppNavigator';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { TokenUtils } from './src/utils/tokenUtils';
import { AuthService } from './src/services/AuthService';
import { API_BASE_URL } from './src/config/api';
import { SocketAuthBridge } from './src/components/SocketAuthBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create navigation ref for handling notification taps
export const navigationRef = React.createRef<any>();

// Configure notification handler for when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const linking = {
  prefixes: [
    'exp://192.168.1.18:8081',
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
      MySubmissions: 'my-submissions',
      NeglectedTasks: 'neglected-tasks',
      TodayAssignments: 'today-assignments',
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

// Register for push notifications
async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('📱 Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }  
  
  if (finalStatus !== 'granted') {
    console.log('❌ Failed to get push token for push notification!');
    return;
  }
  
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    
    console.log('📱 Expo Push Token:', token.data);
    
    const user = await TokenUtils.getUser();
    if (user) {
      const headers = await TokenUtils.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/notifications/register-push-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          expoPushToken: token.data,
          deviceType: Platform.OS
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Push token registered with backend');
      } else {
        console.log('❌ Failed to register push token:', result.message);
      }
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
}

// Handle navigation when user taps on notification
async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const { data } = response.notification.request.content;
  console.log('🔘 Notification tapped:', data);
  
  if (!navigationRef.current) {
    console.log('⏳ Navigation not ready, waiting...');
    setTimeout(() => handleNotificationResponse(response), 500);
    return;
  }
  
  switch (data.type) {
    case 'SUBMISSION_VERIFIED':
    case 'SUBMISSION_REJECTED':
    case 'SUBMISSION_PENDING':
      if (data.assignmentId) {
        navigationRef.current?.navigate('AssignmentDetails', {
          assignmentId: data.assignmentId,
          isAdmin: data.isAdmin === 'true' || data.isAdmin === true
        });
      } else if (data.taskId) {
        navigationRef.current?.navigate('TaskDetails', {
          taskId: data.taskId,
          groupId: data.groupId
        });
      }
      break;
      
    case 'TASK_ASSIGNED':
    case 'TASK_CREATED':
      if (data.taskId) {
        navigationRef.current?.navigate('TaskDetails', {
          taskId: data.taskId,
          groupId: data.groupId
        });
      } else if (data.groupId) {
        navigationRef.current?.navigate('GroupTasks', {
          groupId: data.groupId,
          groupName: data.groupName || 'Group',
          userRole: 'MEMBER',
          tab: 'my'
        });
      }
      break;
      
    case 'SWAP_ACCEPTED':
    case 'SWAP_REQUEST':
    case 'SWAP_COMPLETED':
      if (data.swapRequestId) {
        navigationRef.current?.navigate('SwapRequestDetails', {
          requestId: data.swapRequestId
        });
      } else {
        navigationRef.current?.navigate('MySwapRequests', {
          groupId: data.groupId,
          groupName: data.groupName
        });
      }
      break;
      
    case 'NEGLECT_DETECTED':
    case 'TASK_MISSED':
    case 'SLOT_MISSED':
      navigationRef.current?.navigate('NeglectedTasks', {
        groupId: data.groupId,
        groupName: data.groupName,
        userRole: 'MEMBER'
      });
      break;
      
    case 'TASK_REMINDER':
    case 'TASK_ACTIVE':
      if (data.assignmentId) {
        navigationRef.current?.navigate('CompleteAssignment', {
          assignmentId: data.assignmentId,
          taskTitle: data.taskTitle,
          dueDate: data.dueDate
        });
      } else {
        navigationRef.current?.navigate('TodayAssignments', {
          groupId: data.groupId,
          groupName: data.groupName
        });
      }
      break;
      
    case 'POINTS_EARNED':
      navigationRef.current?.navigate('FullLeaderboard', {
        groupId: data.groupId,
        groupName: data.groupName
      });
      break;
      
    default:
      if (data.groupId) {
        navigationRef.current?.navigate('GroupTasks', {
          groupId: data.groupId,
          groupName: data.groupName || 'Group'
        });
      } else {
        navigationRef.current?.navigate('Home');
      }
      break;
  }
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Home'>('Login');

  // Clean up report keys on mount
  useEffect(() => {
    const cleanup = async () => {
      const allKeys = await AsyncStorage.getAllKeys();
      const reportKeys = allKeys.filter(key => key.includes('last_report_'));
      for (const key of reportKeys) {
        await AsyncStorage.removeItem(key);
        console.log(`🧹 Cleared report key: ${key}`);
      }
    };
    cleanup();
  }, []);

  // Main app initialization
  useEffect(() => { 
    const checkAutoLogin = async () => {
      console.log('🔍 Checking for existing session...');
      
      // Give time for SocketAuthBridge to register callbacks
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = await AuthService.autoLogin();
      
      if (result.success) {
        console.log('✅ Auto-login successful!');
        setInitialRoute('Home');
        registerForPushNotifications();
      } else {
        console.log('❌ No existing session or auto-login failed:', result.message);
        setInitialRoute('Login');
      }
      
      setIsLoading(false);
    };
    
    checkAutoLogin();
    
    // Set up notification listeners
    const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Notification received in foreground:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );
    
    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
    }; 
  }, []);

  // Show loading screen while checking auto-login
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={{ marginTop: 20, color: '#6B7280', fontSize: 14 }}>Checking session...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SocketProvider>
          <SocketAuthBridge /> 
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            fallback={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
              </View> 
            }
          >
            <AppNavigator initialRoute={initialRoute} />
          </NavigationContainer>
        </SocketProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}