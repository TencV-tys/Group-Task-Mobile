// src/screens/TermsOfServiceScreen.tsx - Dark Mode Added
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export default function TermsOfServiceScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // ===== CHECK AUTH STATUS USING TOKENUTILS =====
  const checkAuth = useCallback(async () => {
    try {
      const user = await TokenUtils.getUser();
      console.log('🔐 TermsOfService: Auth status:', user ? 'Logged in' : 'Guest');
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }, []);

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Terms of Service</Text>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Last Updated */}
        <LinearGradient
          colors={[theme.bgSecondary, theme.bgTertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.lastUpdatedCard, { borderColor: theme.border }]}
        >
          <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.primary} />
          <Text style={[styles.lastUpdatedText, { color: theme.textSecondary }]}>Last Updated: March 15, 2026</Text>
        </LinearGradient>

        {/* Acceptance of Terms */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Acceptance of Terms</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            By accessing or using GroupTask, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our application.
          </Text>
        </LinearGradient>

        {/* Description of Service */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Description of Service</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            GroupTask is a task management platform that allows users to create groups, 
            assign tasks, track completion, and collaborate with team members. We provide 
            these services to help groups organize and manage their responsibilities effectively.
          </Text>
        </LinearGradient>

        {/* User Accounts */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>User Accounts</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            To use GroupTask, you must create an account. You are responsible for:
          </Text>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Maintaining the confidentiality of your account</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>All activities that occur under your account</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Providing accurate and complete information</Text>
          </View>
        </LinearGradient>

        {/* User Conduct */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.error }]}>User Conduct</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>You agree not to:</Text>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.error} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Use the service for any illegal purposes</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.error} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Harass, abuse, or harm other users</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.error} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Impersonate any person or entity</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.error} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Interfere with the proper functioning of the service</Text>
          </View>
        </LinearGradient>

        {/* Group Responsibilities */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Group Responsibilities</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            Group creators and administrators are responsible for managing their groups, 
            including member invitations, task assignments, and maintaining a respectful environment. 
            GroupTask is not responsible for disputes between group members.
          </Text>
        </LinearGradient>

        {/* Points and Rewards */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Points and Rewards</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            Points earned through task completion are for tracking purposes within the application 
            and have no monetary value. GroupTask reserves the right to adjust point systems as needed.
          </Text>
        </LinearGradient>

        {/* Intellectual Property */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Intellectual Property</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            GroupTask and its original content, features, and functionality are owned by us and 
            are protected by international copyright, trademark, and other intellectual property laws.
          </Text>
        </LinearGradient>

        {/* Termination */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.error }]}>Termination</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            We may terminate or suspend your account immediately, without prior notice, for conduct 
            that we believe violates these Terms or is harmful to other users or the service.
          </Text>
        </LinearGradient>

        {/* Limitation of Liability */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Limitation of Liability</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            GroupTask shall not be liable for any indirect, incidental, special, consequential, 
            or punitive damages resulting from your use or inability to use the service.
          </Text>
        </LinearGradient>

        {/* Changes to Terms */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, styles.lastCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Changes to Terms</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            We reserve the right to modify these terms at any time. We will notify users of any 
            material changes via the application or email.
          </Text>
        </LinearGradient>

        {/* Back to Sign Up / Login Button - Only show if accessed from Signup */}
        {!navigation.canGoBack() && (
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
        )}
      </ScrollView>
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
  lastUpdatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  lastUpdatedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  lastCard: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  signupButton: {
    marginTop: 24,
    marginBottom: 16,
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