import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { API_BASE_URL } from '../config/api';
import * as Linking from 'expo-linking';

export default function ResetPasswordScreen({ navigation, route }: any) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    handleDeepLink();
  }, []);

  const handleDeepLink = async () => {
    console.log("🔍 Checking for reset parameters...");
    
    try {
      // First check if we have params from navigation (route params)
      if (route.params?.token && route.params?.email) {
        console.log("📱 Got params from navigation:", route.params);
        const { token: navToken, email: navEmail } = route.params;
        setToken(navToken);
        setEmail(decodeURIComponent(navEmail));
        await verifyToken(navToken, decodeURIComponent(navEmail));
        return;
      }

      // If not, check for deep link
      const url = await Linking.getInitialURL();
      console.log("🔗 Deep link URL:", url);
      
      if (url) {
        // Parse the URL
        const parsedUrl = Linking.parse(url);
        console.log("Parsed URL:", parsedUrl);
        
        // Handle different URL formats
        let urlToken = '';
        let urlEmail = '';
        
        // Check if it's exp:// format
        if (url.startsWith('exp://')) {
          // Extract from exp://192.168.1.100:8081/--/reset-password?token=xxx&email=xxx
          const match = url.match(/[?&]token=([^&]+)/);
          const emailMatch = url.match(/[?&]email=([^&]+)/);
          
          if (match && match[1]) {
            urlToken = match[1];
          }
          if (emailMatch && emailMatch[1]) {
            urlEmail = decodeURIComponent(emailMatch[1]);
          }
        } 
        // Check if it's custom scheme format
        else if (url.startsWith('grouptask://')) {
          // Extract from grouptask://reset-password?token=xxx&email=xxx
          const { queryParams } = parsedUrl;
          if (queryParams) {
            urlToken = queryParams.token as string || '';
            urlEmail = decodeURIComponent(queryParams.email as string || '');
          }
        }

        if (urlToken && urlEmail) {
          console.log("✅ Found token and email in deep link");
          setToken(urlToken);
          setEmail(urlEmail);
          await verifyToken(urlToken, urlEmail);
          return;
        }
      }
      
      // No valid reset parameters found
      console.log("❌ No reset parameters found");
      setMessage('Invalid reset link. Please request a new one.');
      setVerifying(false);
      
    } catch (error) {
      console.error("Error parsing deep link:", error);
      setMessage('Error processing reset link');
      setVerifying(false);
    }
  };

  const verifyToken = async (verifyToken: string, verifyEmail: string) => {
    console.log("🔐 Verifying token...");
    console.log("📧 Email:", verifyEmail);
    console.log("🔑 Token:", verifyToken);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users/verify-reset-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: verifyToken, 
          email: verifyEmail 
        })
      });

      const result = await response.json();
      console.log("Verification result:", result);
      
      if (result.success) {
        setTokenValid(true);
        setMessage('✅ Token verified! Please enter your new password.');
      } else {
        setMessage(result.message || 'Invalid or expired reset link');
        setTokenValid(false);
      }
    } catch (error) {
      console.error("Verification error:", error);
      setMessage('Failed to verify reset link. Please check your connection.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Password strength check
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      Alert.alert(
        'Weak Password', 
        'Password should contain at least one uppercase letter, one lowercase letter, and one number'
      );
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      console.log("Resetting password for:", email);
      const response = await fetch(`${API_BASE_URL}/api/auth/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          newPassword,
          confirmPassword
        })
      });

      const result = await response.json();
      console.log("Reset result:", result);
      
      if (result.success) {
        Alert.alert(
          '✅ Success!',
          'Password reset successful! You can now login with your new password.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            }
          ]
        );
      } else {
        setMessage(result.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error("Reset error:", error);
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestNewLink = () => {
    navigation.navigate('ForgotPassword');
  };

  if (verifying) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.verifyingText}>Verifying your reset link...</Text>
        <Text style={styles.verifyingSubText}>Please wait a moment</Text>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>🔒</Text>
          <Text style={styles.errorTitle}>Invalid Reset Link</Text>
          <Text style={styles.errorMessage}>
            {message || 'This password reset link is invalid or has expired.'}
          </Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={requestNewLink}
          >
            <Text style={styles.buttonText}>Request New Link</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below for{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
        </View>

        {message ? (
          <View style={[
            styles.messageBox,
            message.includes('✅') ? styles.successBox : styles.infoBox
          ]}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.formContainer}>
          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password must contain:</Text>
            <Text style={[
              styles.requirementItem,
              newPassword.length >= 6 && styles.requirementMet
            ]}>
              ✓ At least 6 characters
            </Text>
            <Text style={[
              styles.requirementItem,
              /[A-Z]/.test(newPassword) && styles.requirementMet
            ]}>
              ✓ One uppercase letter
            </Text>
            <Text style={[
              styles.requirementItem,
              /[a-z]/.test(newPassword) && styles.requirementMet
            ]}>
              ✓ One lowercase letter
            </Text>
            <Text style={[
              styles.requirementItem,
              /\d/.test(newPassword) && styles.requirementMet
            ]}>
              ✓ One number
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.resetButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  emailText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: 50,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 20,
  },
  requirementsContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  requirementItem: {
    fontSize: 13,
    color: '#999',
    marginBottom: 5,
    paddingLeft: 5,
  },
  requirementMet: {
    color: '#28a745',
  },
  resetButton: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  button: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
  },
  messageBox: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
  },
  verifyingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  verifyingSubText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});