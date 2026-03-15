// src/screens/PrivacyPolicyScreen.tsx - UPDATED with TokenUtils
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
import { TokenUtils } from '../utils/tokenUtils'; // 👈 ADD THIS IMPORT
import { ScreenWrapper } from '../components/ScreenWrapper';

export default function PrivacyPolicyScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);

  // ===== CHECK AUTH STATUS USING TOKENUTILS =====
  const checkAuth = useCallback(async () => {
    try {
      // Get user to check if logged in (non-blocking)
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
      // If can't go back (opened from deep link), go to Login
      navigation.navigate('Login');
    }
  };

  if (loading) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Last Updated */}
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.lastUpdatedCard}
        >
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#2b8a3e" />
          <Text style={styles.lastUpdatedText}>Last Updated: March 15, 2024</Text>
        </LinearGradient>

        {/* Introduction */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.sectionText}>
            At GroupTask, we respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, and safeguard your information when you use our application.
          </Text>
        </LinearGradient>

        {/* Information We Collect */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>Account information (name, email, profile picture)</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>Group and task data you create</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>Assignment completion history and points earned</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>Device information and app usage data</Text>
          </View>
        </LinearGradient>

        {/* How We Use Your Information */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>To provide and maintain our services</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>To notify you about task assignments and updates</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>To calculate points and track group contributions</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>To improve and personalize your experience</Text>
          </View>
        </LinearGradient>

        {/* Data Sharing */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell your personal information. Your data is shared only within your groups 
            as necessary for task management and collaboration.
          </Text>
        </LinearGradient>

        {/* Data Security */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.sectionText}>
            We implement appropriate security measures to protect your personal information. 
            However, no method of transmission over the Internet is 100% secure.
          </Text>
        </LinearGradient>

        {/* Your Rights */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to access, update, or delete your personal information. 
            You can do this through your profile settings or by contacting support.
          </Text>
        </LinearGradient>

        {/* Changes to Policy */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.sectionText}>
            We may update this privacy policy from time to time. We will notify you of any changes 
            by posting the new policy on this page.
          </Text>
        </LinearGradient>

        {/* Contact Information */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, styles.lastCard]}
        >
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionText}>
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
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signupButtonGradient}
            >
              <MaterialCommunityIcons name="account-plus" size={20} color="white" />
              <Text style={styles.signupButtonText}>Create an Account</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// Add these to your styles
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
    fontSize: 14,
    color: '#868e96',
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
    borderColor: '#e9ecef',
  },
  lastUpdatedText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#495057',
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
    color: '#495057',
    lineHeight: 20,
  },
  signupButton: {
    marginTop: 24,
    marginBottom: 16,
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