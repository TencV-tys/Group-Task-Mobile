// src/screens/AccountSettingsScreen.tsx - Dark Mode Added
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthService } from '../services/AuthService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useTheme } from '../context/ThemeContext';
import { makeAccountSettingsStyles } from '../styles/accountSettings.styles';

export default function AccountSettingsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const styles = makeAccountSettingsStyles(theme);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isMounted = useRef(true);

  // ===== REAL-TIME NOTIFICATIONS =====
  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if (notification.type === 'PROFILE_UPDATED') {
        loadUserData();
      }
    },
    showAlerts: true
  });

  // ===== TOKEN CHECK USING TOKENUTILS =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadUserData = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    try {
      const userData = await AuthService.getCurrentUser();
      if (isMounted.current) {
        setUser(userData);
        setFullName(userData?.fullName || '');
        setEmail(userData?.email || '');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load user data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleUpdateProfile = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;

    if (!fullName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const result = await AuthService.updateProfile({ fullName });
      
      if (result.success && isMounted.current) {
        Alert.alert('Success', 'Profile updated successfully');
        await loadUserData();
      } else if (isMounted.current) {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error: any) {
      if (isMounted.current) {
        Alert.alert('Error', error.message || 'Failed to update profile');
      }
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  const handleChangePassword = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;

    if (!currentPassword) {
      Alert.alert('Error', 'Current password is required');
      return;
    }
    if (!newPassword) {
      Alert.alert('Error', 'New password is required');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const result = await AuthService.changePassword({
        currentPassword,
        newPassword
      });
      
      if (result.success && isMounted.current) {
        Alert.alert('Success', 'Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (isMounted.current) {
        Alert.alert('Error', result.message || 'Failed to change password');
      }
    } catch (error: any) {
      if (isMounted.current) {
        Alert.alert('Error', error.message || 'Failed to change password');
      }
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  const PasswordInput = ({ 
    placeholder, 
    value, 
    onChangeText, 
    showPassword, 
    toggleVisibility 
  }: any) => (
    <LinearGradient
      colors={[theme.bgSecondary, theme.bgTertiary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.passwordContainer, { borderColor: theme.border }]}
    >
      <TextInput
        style={[styles.passwordInput, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textPlaceholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        editable={!saving}
        selectionColor={theme.primary}
      />
      <TouchableOpacity 
        style={styles.eyeButton}
        onPress={toggleVisibility}
        disabled={saving}
      >
        <Text style={styles.eyeIcon}>
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Account Settings</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading settings...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Account Settings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile Information</Text>
            
            <LinearGradient
              colors={[theme.card, theme.bgSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, { borderColor: theme.border }]}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Full Name</Text>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.inputGradient, { borderColor: theme.border }]}
                >
                  <TextInput
                    style={[styles.input, saving && styles.inputDisabled, { color: theme.text }]}
                    placeholder="Your full name"
                    placeholderTextColor={theme.textPlaceholder}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!saving}
                    selectionColor={theme.primary}
                  />
                </LinearGradient>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Email Address</Text>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.inputGradient, { borderColor: theme.border }]}
                >
                  <TextInput
                    style={[styles.input, styles.disabledInput, { color: theme.textMuted, backgroundColor: theme.bgSecondary }]}
                    placeholder="Email address"
                    placeholderTextColor={theme.textPlaceholder}
                    value={email}
                    editable={false}
                  />
                </LinearGradient>
                <Text style={[styles.hintText, { color: theme.textMuted }]}>Email cannot be changed</Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleUpdateProfile}
                disabled={saving}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Change Password */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Password</Text>
            
            <LinearGradient
              colors={[theme.card, theme.bgSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, { borderColor: theme.border }]}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Current Password</Text>
                <PasswordInput
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  showPassword={showCurrentPassword}
                  toggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>New Password</Text>
                <PasswordInput
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  showPassword={showNewPassword}
                  toggleVisibility={() => setShowNewPassword(!showNewPassword)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Confirm New Password</Text>
                <PasswordInput
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  showPassword={showConfirmPassword}
                  toggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </View>

              <TouchableOpacity
                style={[styles.changePasswordButton, saving && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={saving}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.changePasswordGradient}
                >
                  <MaterialCommunityIcons name="lock-reset" size={18} color="#fff" />
                  <Text style={styles.changePasswordText}>Update Password</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Add some bottom padding for better scrolling */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}