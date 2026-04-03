// src/screens/HelpSupportScreen.tsx - Dark Mode Added
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
import { TokenUtils } from '../utils/tokenUtils';
import { useTheme } from '../context/ThemeContext';

export default function HelpSupportScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);

  // ===== CHECK AUTH STATUS USING TOKENUTILS =====
  const checkAuth = useCallback(async () => {
    try {
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
      navigation.navigate('Login');
    }
  };

  if (loading) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading help content...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support</Text>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Card */}
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <MaterialCommunityIcons name="help-circle" size={40} color="#fff" />
          <Text style={styles.welcomeTitle}>How can we help you?</Text>
          <Text style={styles.welcomeText}>
            Find answers to common questions and learn how to make the most of GroupTask
          </Text>
        </LinearGradient>

        {/* Getting Started Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Getting Started</Text>
        
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How do I create an account?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Tap "Sign Up" on the login screen and fill in your details. You'll need a valid email 
            address and a password with at least 6 characters.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How do I join a group?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            You can join a group by tapping "Join Group" on the home screen and entering an invite code, 
            or by accepting an invitation from a group admin.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How do I create a group?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Tap "Create Group" on the home screen, enter a group name, and optionally add a description 
            and avatar. You'll become the group admin automatically.
          </Text>
        </LinearGradient>

        {/* Tasks Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Managing Tasks</Text>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How do I create a task?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Go to a group, tap the "Create Task" button, fill in the task details, set points (1-10), 
            choose frequency (daily/weekly), and add time slots if needed.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 What are time slots?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Time slots define when a task can be completed. Each slot has a start time, end time, 
            and optional points. Daily tasks require at least one time slot.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How do I complete a task?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            On the due date, go to your assignment, tap "Complete", optionally add a photo and notes, 
            then submit. Your submission will wait for admin verification.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 What happens if I submit late?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            You have a 30-minute grace period after the end time. Late submissions receive a 50% 
            point penalty. After the grace period, the task is marked as neglected.
          </Text>
        </LinearGradient>

        {/* Points Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Points & Verification</Text>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How do points work?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Each task has a point value (1-10). When you complete a task and an admin verifies it, 
            you earn those points. Points accumulate and are displayed on your profile and leaderboards.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How does verification work?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            After you submit a completed task, group admins review it. They can verify (approve) or 
            reject it with feedback. You'll be notified of their decision.
          </Text>
        </LinearGradient>

        {/* Swaps Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Swap Requests</Text>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How do I swap a task?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Go to the task details and tap "Request Swap". Other members can accept your request. 
            Once accepted, the swap will be processed.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How long do swap requests last?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Swap requests expire after 7 days if not accepted. You'll be notified when a request expires.
          </Text>
        </LinearGradient>

        {/* Groups Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Group Management</Text>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 What's the difference between Admin and Member?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Admins can create/edit tasks, verify submissions, manage members, and adjust group settings. 
            Members can view tasks, complete assignments, and request swaps.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 How does task rotation work?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Recurring tasks rotate among group members each week. The rotation order is determined 
            when members join. You can see the full schedule in the Rotation Schedule screen.
          </Text>
        </LinearGradient>

        {/* Notifications Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Notifications</Text>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 What notifications will I receive?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            You'll receive notifications for task reminders, submission verifications, swap requests, 
            group invites, point deductions, and important updates.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 When will I get task reminders?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            You'll get a reminder 60 minutes before a task starts, and another when it's ready to submit 
            (30 minutes before the end time).
          </Text>
        </LinearGradient>

        {/* Troubleshooting Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Troubleshooting</Text>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 I can't log in. What should I do?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            First, check your internet connection. Then verify your email and password are correct. 
            Use "Forgot Password" if you need to reset your password.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faqCard, styles.lastCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.question, { color: theme.primary }]}>🔹 Why can't I submit my task?</Text>
          <Text style={[styles.answer, { color: theme.textSecondary }]}>
            Tasks can only be submitted on their due date during the submission window (30 minutes before 
            end time through 30 minutes after). Check the time validation on the assignment details page.
          </Text>
        </LinearGradient>
      </ScrollView>

      {/* Back to Sign Up / Login Button - Only show if accessed directly */}
      {!navigation.canGoBack() && (
        <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signupButtonGradient}
            >
              <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
    marginBottom: 12,
    marginTop: 8,
    paddingLeft: 4,
  },
  faqCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
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
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  signupButton: {
    borderRadius: 12,
    overflow: 'hidden',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});