// src/screens/TermsOfServiceScreen.tsx - UPDATED with token check
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
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';

export default function TermsOfServiceScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user is authenticated (but don't block access)
  const checkAuth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // Just for info, don't block access
      console.log('🔐 TermsOfService: Auth status:', token ? 'Logged in' : 'Guest');
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
        
        <Text style={styles.headerTitle}>Terms of Service</Text>
        
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

        {/* Acceptance of Terms */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing or using GroupTask, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our application.
          </Text>
        </LinearGradient>

        {/* Description of Service */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Description of Service</Text>
          <Text style={styles.sectionText}>
            GroupTask is a task management platform that allows users to create groups, 
            assign tasks, track completion, and collaborate with team members. We provide 
            these services to help groups organize and manage their responsibilities effectively.
          </Text>
        </LinearGradient>

        {/* User Accounts */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>User Accounts</Text>
          <Text style={styles.sectionText}>
            To use GroupTask, you must create an account. You are responsible for:
          </Text>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>Maintaining the confidentiality of your account</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>All activities that occur under your account</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#2b8a3e" />
            <Text style={styles.bulletText}>Providing accurate and complete information</Text>
          </View>
        </LinearGradient>

        {/* User Conduct */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>User Conduct</Text>
          <Text style={styles.sectionText}>You agree not to:</Text>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#fa5252" />
            <Text style={styles.bulletText}>Use the service for any illegal purposes</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#fa5252" />
            <Text style={styles.bulletText}>Harass, abuse, or harm other users</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#fa5252" />
            <Text style={styles.bulletText}>Impersonate any person or entity</Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <MaterialCommunityIcons name="circle-small" size={20} color="#fa5252" />
            <Text style={styles.bulletText}>Interfere with the proper functioning of the service</Text>
          </View>
        </LinearGradient>

        {/* Group Responsibilities */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Group Responsibilities</Text>
          <Text style={styles.sectionText}>
            Group creators and administrators are responsible for managing their groups, 
            including member invitations, task assignments, and maintaining a respectful environment. 
            GroupTask is not responsible for disputes between group members.
          </Text>
        </LinearGradient>

        {/* Points and Rewards */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Points and Rewards</Text>
          <Text style={styles.sectionText}>
            Points earned through task completion are for tracking purposes within the application 
            and have no monetary value. GroupTask reserves the right to adjust point systems as needed.
          </Text>
        </LinearGradient>

        {/* Intellectual Property */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Intellectual Property</Text>
          <Text style={styles.sectionText}>
            GroupTask and its original content, features, and functionality are owned by us and 
            are protected by international copyright, trademark, and other intellectual property laws.
          </Text>
        </LinearGradient>

        {/* Termination */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Termination</Text>
          <Text style={styles.sectionText}>
            We may terminate or suspend your account immediately, without prior notice, for conduct 
            that we believe violates these Terms or is harmful to other users or the service.
          </Text>
        </LinearGradient>

        {/* Limitation of Liability */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            GroupTask shall not be liable for any indirect, incidental, special, consequential, 
            or punitive damages resulting from your use or inability to use the service.
          </Text>
        </LinearGradient>

        {/* Changes to Terms */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, styles.lastCard]}
        >
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.sectionText}>
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