// App.tsx

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

// ✅ Show notifications even when the app is in the foreground
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

// ✅ FIXED: Removed invalid `enableVibrate` field (not a valid API property).
// This channel MUST be set up before requesting the push token so Android
// knows which channel to deliver notifications to.
async function configureAndroidNotifications() {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.HIGH, // Required for heads-up pop-ups
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      lightColor: '#2b8a3e',
      showBadge: true,
    });

    console.log('✅ Android notification channel configured');
  } catch (error) {
    console.error('❌ Failed to configure Android notification channel:', error);
  }
}

// ✅ Extracted token registration logic so it can be called from both
// auto-login AND after a manual login (see registerPendingPushToken below).
async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('📱 Push notifications require a physical device');
    return null;
  }

  // Always configure the Android channel first
  await configureAndroidNotifications();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ Push notification permission denied');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('❌ Missing EAS projectId in app.json extra.eas.projectId');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('📱 Expo Push Token:', token);
    return token;
  } catch (error) {
    console.error('❌ Failed to get Expo push token:', error);
    return null;
  }
}

// ✅ Sends the token to your backend. Call this whenever a user is confirmed
// logged in — both after auto-login and after manual login.
export async function sendPushTokenToBackend(token: string): Promise<void> {
  try {
    const user = await TokenUtils.getUser();
    if (!user) {
      // No user yet — save token and send it after login
      await AsyncStorage.setItem('pendingPushToken', token);
      console.log('⚠️ No user session yet, push token saved for after login');
      return;
    }

    const headers = await TokenUtils.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/register-push-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        expoPushToken: token,
        deviceType: Platform.OS,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ Push token registered with backend');
      await AsyncStorage.removeItem('pendingPushToken'); // Clean up if it was stored
    } else {
      console.log('❌ Backend rejected push token:', result.message);
    }
  } catch (error) {
    console.error('❌ Error sending push token to backend:', error);
  }
}

// ✅ Call this from your Login screen after a successful manual login.
// It picks up any token that was stored before the user session was ready.
export async function registerPendingPushToken(): Promise<void> {
  try {
    // Try using the already-stored pending token first
    const pending = await AsyncStorage.getItem('pendingPushToken');
    if (pending) {
      console.log('📱 Found pending push token, registering now...');
      await sendPushTokenToBackend(pending);
      return;
    }

    // Otherwise request a fresh token and register it
    const token = await registerForPushNotifications();
    if (token) {
      await sendPushTokenToBackend(token);
    }
  } catch (error) {
    console.error('❌ Error registering pending push token:', error);
  }
}

// Handle notification tap (foreground + background)
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const { data } = response.notification.request.content;
  console.log('🔘 Notification tapped, data:', data);
  // TODO: navigate to the relevant screen using data.type or data.notificationId
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Home'>('Login');

  // Clean up stale report keys on mount
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

  // Notification listeners
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Notification received in foreground:', notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  // Auto-login + push token registration
  useEffect(() => {
    const checkAutoLogin = async () => {
      console.log('🔍 Checking for existing session...');

      const result = await AuthService.autoLogin();

      if (result.success) {
        console.log('✅ Auto-login successful');
        setInitialRoute('Home');

        // ✅ Get token and send to backend now that user is logged in
        const token = await registerForPushNotifications();
        if (token) {
          await sendPushTokenToBackend(token);
        }
      } else {
        console.log('❌ No existing session:', result.message);
        setInitialRoute('Login');

        // ✅ Still get the token and store it — will be sent after manual login
        const token = await registerForPushNotifications();
        if (token) {
          await AsyncStorage.setItem('pendingPushToken', token);
        }
      }

      setIsLoading(false);
    };

    checkAutoLogin();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <SocketProvider>
            <SocketAuthBridge />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={{ marginTop: 20, color: '#6B7280', fontSize: 14 }}>Checking session...</Text>
            </View>
          </SocketProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SocketProvider>
          <SocketAuthBridge />
          <NavigationContainer
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