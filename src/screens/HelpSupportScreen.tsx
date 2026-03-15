// src/screens/HelpSupportScreen.tsx - UPDATED with TokenUtils
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 ADD THIS IMPORT

export default function HelpSupportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);

  // ===== CHECK AUTH STATUS USING TOKENUTILS =====
  const checkAuth = useCallback(async () => {
    try {
      // Get user to check if logged in (non-blocking)
      const user = await TokenUtils.getUser();
      console.log('🔐 HelpSupport: Auth status:', user ? 'Logged in' : 'Guest');
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== REAL-TIME NOTIFICATIONS =====
  useRealtimeNotifications({
    onNewNotification: (notification) => {
      // Just log for now, no UI updates needed for help screen
      console.log('📢 HelpSupport notification:', notification.type);
    },
    showAlerts: false
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If can't go back (opened from deep link), go to Login
      navigation.navigate('Login');
    }
  };

  if (loading) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading help content...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Help & Support</Text>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Card */}
        <LinearGradient
          colors={['#2b8a3e', '#1e6b2c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <MaterialCommunityIcons name="help-circle" size={40} color="white" />
          <Text style={styles.welcomeTitle}>How can we help you?</Text>
          <Text style={styles.welcomeText}>
            Find answers to common questions and learn how to make the most of GroupTask
          </Text>
        </LinearGradient>

        {/* Getting Started Section */}
        <Text style={styles.sectionHeader}>Getting Started</Text>
        
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How do I create an account?</Text>
          <Text style={styles.answer}>
            Tap "Sign Up" on the login screen and fill in your details. You'll need a valid email 
            address and a password with at least 6 characters.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How do I join a group?</Text>
          <Text style={styles.answer}>
            You can join a group by tapping "Join Group" on the home screen and entering an invite code, 
            or by accepting an invitation from a group admin.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How do I create a group?</Text>
          <Text style={styles.answer}>
            Tap "Create Group" on the home screen, enter a group name, and optionally add a description 
            and avatar. You'll become the group admin automatically.
          </Text>
        </LinearGradient>

        {/* Tasks Section */}
        <Text style={styles.sectionHeader}>Managing Tasks</Text>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How do I create a task?</Text>
          <Text style={styles.answer}>
            Go to a group, tap the "Create Task" button, fill in the task details, set points (1-10), 
            choose frequency (daily/weekly), and add time slots if needed.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 What are time slots?</Text>
          <Text style={styles.answer}>
            Time slots define when a task can be completed. Each slot has a start time, end time, 
            and optional points. Daily tasks require at least one time slot.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How do I complete a task?</Text>
          <Text style={styles.answer}>
            On the due date, go to your assignment, tap "Complete", optionally add a photo and notes, 
            then submit. Your submission will wait for admin verification.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 What happens if I submit late?</Text>
          <Text style={styles.answer}>
            You have a 30-minute grace period after the end time. Late submissions receive a 50% 
            point penalty. After the grace period, the task is marked as neglected.
          </Text>
        </LinearGradient>

        {/* Points Section */}
        <Text style={styles.sectionHeader}>Points & Verification</Text>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How do points work?</Text>
          <Text style={styles.answer}>
            Each task has a point value (1-10). When you complete a task and an admin verifies it, 
            you earn those points. Points accumulate and are displayed on your profile and leaderboards.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How does verification work?</Text>
          <Text style={styles.answer}>
            After you submit a completed task, group admins review it. They can verify (approve) or 
            reject it with feedback. You'll be notified of their decision.
          </Text>
        </LinearGradient>

        {/* Swaps Section */}
        <Text style={styles.sectionHeader}>Swap Requests</Text>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How do I swap a task?</Text>
          <Text style={styles.answer}>
            Go to the task details and tap "Request Swap". Other members can accept your request. 
            Once accepted, the swap will be processed.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How long do swap requests last?</Text>
          <Text style={styles.answer}>
            Swap requests expire after 7 days if not accepted. You'll be notified when a request expires.
          </Text>
        </LinearGradient>

        {/* Groups Section */}
        <Text style={styles.sectionHeader}>Group Management</Text>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 What's the difference between Admin and Member?</Text>
          <Text style={styles.answer}>
            Admins can create/edit tasks, verify submissions, manage members, and adjust group settings. 
            Members can view tasks, complete assignments, and request swaps.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 How does task rotation work?</Text>
          <Text style={styles.answer}>
            Recurring tasks rotate among group members each week. The rotation order is determined 
            when members join. You can see the full schedule in the Rotation Schedule screen.
          </Text>
        </LinearGradient>

        {/* Notifications Section */}
        <Text style={styles.sectionHeader}>Notifications</Text>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 What notifications will I receive?</Text>
          <Text style={styles.answer}>
            You'll receive notifications for task reminders, submission verifications, swap requests, 
            group invites, point deductions, and important updates.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 When will I get task reminders?</Text>
          <Text style={styles.answer}>
            You'll get a reminder 60 minutes before a task starts, and another when it's ready to submit 
            (30 minutes before the end time).
          </Text>
        </LinearGradient>

        {/* Troubleshooting Section */}
        <Text style={styles.sectionHeader}>Troubleshooting</Text>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faqCard}
        >
          <Text style={styles.question}>🔹 I can't log in. What should I do?</Text>
          <Text style={styles.answer}>
            First, check your internet connection. Then verify your email and password are correct. 
            Use "Forgot Password" if you need to reset your password.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, styles.lastCard]}
        >
          <Text style={styles.question}>🔹 Why can't I submit my task?</Text>
          <Text style={styles.answer}>
            Tasks can only be submitted on their due date during the submission window (30 minutes before 
            end time through 30 minutes after). Check the time validation on the assignment details page.
          </Text>
        </LinearGradient>
      </ScrollView>

      {/* Back to Sign Up / Login Button - Only show if accessed directly */}
      {!navigation.canGoBack() && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signupButtonGradient}
            >
              <MaterialCommunityIcons name="account-plus" size={20} color="white" />
              <Text style={styles.signupButtonText}>Create an Account</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  headerRight: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#868e96',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    marginTop: 8,
    paddingLeft: 4,
  },
  faqCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  lastCard: {
    marginBottom: 0,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  signupButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});