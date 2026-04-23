// src/screens/PrivacyPolicyScreen.tsx - Dark Mode Added
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
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyPolicyScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);

  // ===== CHECK AUTH STATUS USING TOKENUTILS =====
  const checkAuth = useCallback(async () => {
    try {
      const user = await TokenUtils.getUser();
      console.log('🔐 PrivacyPolicy: Auth status:', user ? 'Logged in' : 'Guest');
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
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
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
        
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
          <Text style={[styles.lastUpdatedText, { color: theme.textSecondary }]}>Last Updated: March 15, 2024</Text>
        </LinearGradient>

        {/* Introduction */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Introduction</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            At GroupTask, we respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, and safeguard your information when you use our application.
          </Text>
        </LinearGradient>

        {/* Information We Collect */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Information We Collect</Text>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Account information (name, email, profile picture)</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Group and task data you create</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Assignment completion history and points earned</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>Device information and app usage data</Text>
          </View>
        </LinearGradient>

        {/* How We Use Your Information */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>How We Use Your Information</Text>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>To provide and maintain our services</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>To notify you about task assignments and updates</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>To calculate points and track group contributions</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color={theme.primary} />
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>To improve and personalize your experience</Text>
          </View>
        </LinearGradient>

        {/* Data Sharing */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Data Sharing</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            We do not sell your personal information. Your data is shared only within your groups 
            as necessary for task management and collaboration.
          </Text>
        </LinearGradient>

        {/* Data Security */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Data Security</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            We implement appropriate security measures to protect your personal information. 
            However, no method of transmission over the Internet is 100% secure.
          </Text>
        </LinearGradient>

        {/* Your Rights */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Your Rights</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            You have the right to access, update, or delete your personal information. 
            You can do this through your profile settings or by contacting support.
          </Text>
        </LinearGradient>

        {/* Changes to Policy */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Changes to This Policy</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            We may update this privacy policy from time to time. We will notify you of any changes 
            by posting the new policy on this page.
          </Text>
        </LinearGradient>

        {/* Contact Information */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, styles.lastCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Contact Us</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            If you have questions about this privacy policy, please contact us at:{'\n'}
            support@grouptask.com
          </Text>
        </LinearGradient>

        {/* Back to Sign Up / Login Button - Only show if accessed directly */}
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