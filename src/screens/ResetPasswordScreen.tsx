import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { API_BASE_URL } from '../config/api';

export default function ResetPasswordScreen({ navigation, route }: any) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState('');

  const { token, email } = route.params || {};

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    if (!token || !email) {
      setMessage('Invalid reset link');
      setVerifying(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users/verify-reset-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email })
      });

      const result = await response.json();
      
      if (result.success) {
        setTokenValid(true);
      } else {
        setMessage(result.message || 'Invalid or expired reset link');
      }
    } catch (error) {
      setMessage('Failed to verify reset link');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
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

    setLoading(true);
    setMessage('');

    try {
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
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Password reset successful! You can now login with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        setMessage(result.message || 'Failed to reset password');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.verifyingText}>Verifying reset link...</Text>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Invalid Reset Link</Text>
        <Text style={styles.errorMessage}>{message || 'This password reset link is invalid or has expired.'}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ForgotPassword')}
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
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your new password below
      </Text>

      {message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
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
    marginBottom: 30,
    lineHeight: 22,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: 'white',
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
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 15,
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
  },
  messageBox: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#495057',
  },
  verifyingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
});