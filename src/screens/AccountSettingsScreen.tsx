// src/screens/AccountSettingsScreen.tsx - SIMPLIFIED FIXED VERSION

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthService } from '../services/AuthService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useTheme } from '../context/ThemeContext';
import { makeAccountSettingsStyles } from '../styles/accountSettings.styles';

// ─── Password Strength Indicator ────────────────────────────────────────────────
type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

const getPasswordStrength = (password: string) => {
  if (!password) return { level: 'weak' as StrengthLevel, score: 0, label: '', color: '#e9ecef', tip: '' };

  let score = 0;
  const tips: string[] = [];

  if (password.length >= 6) score++; else tips.push('At least 6 chars');
  if (password.length >= 10) score++; else tips.push('10+ chars helps');
  if (/[A-Z]/.test(password)) score++; else tips.push('Add uppercase');
  if (/[0-9]/.test(password)) score++; else tips.push('Add a number');
  if (/[^A-Za-z0-9]/.test(password)) score++; else tips.push('Add !@#$...');

  if (score <= 1) return { level: 'weak' as StrengthLevel, score: 1, label: 'Weak', color: '#fa5252', tip: tips[0] ?? '' };
  if (score === 2) return { level: 'fair' as StrengthLevel, score: 2, label: 'Fair', color: '#fd7e14', tip: tips[0] ?? '' };
  if (score === 3) return { level: 'good' as StrengthLevel, score: 3, label: 'Good', color: '#f59f00', tip: tips[0] ?? '' };
  return { level: 'strong' as StrengthLevel, score: 4, label: 'Strong', color: '#2b8a3e', tip: '' };
};

const PasswordStrengthBar = ({ password, theme }: { password: string; theme: any }) => {
  const strength = getPasswordStrength(password);
  const widths = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    widths.forEach((w, i) =>
      Animated.timing(w, {
        toValue: i < strength.score ? 1 : 0,
        duration: 280,
        delay: i * 50,
        useNativeDriver: false,
      }).start()
    );
  }, [password, strength.score]);

  if (!password) return null;

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 5 }}>
        {widths.map((anim, i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: theme.bgTertiary, overflow: 'hidden' }}>
            <Animated.View
              style={{ height: '100%', borderRadius: 2, backgroundColor: strength.color, transform: [{ scaleX: anim }] }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: strength.color }}>{strength.label}</Text>
        {strength.tip ? <Text style={{ fontSize: 11, color: theme.textMuted }}>{strength.tip}</Text> : null}
      </View>
    </View>
  );
};

// ─── Eye Icon ─────────────────────────────────────────────────────────────────
const EyeIcon = ({ visible, color }: { visible: boolean; color: string }) => (
  <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
    {visible ? (
      <View style={{ width: 18, height: 10, borderRadius: 9, borderWidth: 1.5, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      </View>
    ) : (
      <View style={{ position: 'relative' }}>
        <View style={{ width: 18, height: 10, borderRadius: 9, borderWidth: 1.5, borderColor: color, justifyContent: 'center', alignItems: 'center', opacity: 0.4 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: 0.4 }} />
        </View>
        <View style={{ position: 'absolute', width: 20, height: 1.5, backgroundColor: color, top: 4, left: -1, transform: [{ rotate: '-30deg' }] }} />
      </View>
    )}
  </View>
);

// ─── Check Icon ────────────────────────────────────────────────────────────────
const CheckIcon = ({ color }: { color: string }) => (
  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 }}>✓</Text>
  </View>
);

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
  
  // Touched states for validation
  const [touched, setTouched] = useState({
    fullName: false,
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const isMounted = useRef(true);

  // Validation
  const nameError = touched.fullName && !fullName.trim() ? 'Name cannot be empty' : '';
  const nameValid = touched.fullName && !nameError && fullName.trim().length > 0;
  
  const currentPasswordError = touched.currentPassword && !currentPassword ? 'Current password is required' : '';
  const newPasswordError = touched.newPassword && newPassword && newPassword.length < 6 ? 'Password must be at least 6 characters' : '';
  const confirmPasswordError = touched.confirmPassword && confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : '';

  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if (notification.type === 'PROFILE_UPDATED') {
        loadUserData();
      }
    },
    showAlerts: true
  });

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

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

    setTouched(prev => ({ ...prev, fullName: true }));

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
        setTouched(prev => ({ ...prev, fullName: false }));
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

    setTouched(prev => ({ 
      ...prev, 
      currentPassword: true, 
      newPassword: true, 
      confirmPassword: true 
    }));

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
        setTouched({
          fullName: false,
          currentPassword: false,
          newPassword: false,
          confirmPassword: false
        });
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
    toggleVisibility,
    hasError,
    isValid,
    onBlur
  }: any) => (
    <View style={[
      styles.inputWrapper,
      hasError && styles.inputError,
      isValid && styles.inputValid,
    ]}>
      <TextInput
        style={[styles.input, saving && styles.inputDisabled]}
        placeholder={placeholder}
        placeholderTextColor={theme.textPlaceholder}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={!showPassword}
        editable={!saving}
        selectionColor={theme.primary}
        blurOnSubmit={false}
      />
      {isValid && !hasError && <CheckIcon color={theme.primary} />}
      <TouchableOpacity 
        style={styles.eyeButton}
        onPress={toggleVisibility}
        disabled={saving}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <EyeIcon visible={showPassword} color={hasError ? theme.error : theme.textMuted} />
      </TouchableOpacity>
    </View>
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
      <View style={{ flex: 1 }}>
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
          keyboardShouldPersistTaps="handled"
          key={Platform.OS === 'android' ? 'android-scroll' : 'ios-scroll'}
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
                <View style={[
                  styles.inputWrapper,
                  nameError ? styles.inputError : nameValid ? styles.inputValid : null
                ]}>
                  <TextInput
                    style={[styles.input, saving && styles.inputDisabled]}
                    placeholder="Your full name"
                    placeholderTextColor={theme.textPlaceholder}
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      setTouched(prev => ({ ...prev, fullName: true }));
                    }}
                    editable={!saving}
                    selectionColor={theme.primary}
                    blurOnSubmit={false}
                  />
                  {nameValid && <CheckIcon color={theme.primary} />}
                </View>
                {nameError ? (
                  <Text style={[styles.errorText, { color: theme.error }]}>{nameError}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Email Address</Text>
                <View style={[styles.inputWrapper, styles.disabledInputWrapper]}>
                  <TextInput
                    style={[styles.input, styles.disabledInput, { color: theme.textMuted }]}
                    placeholder="Email address"
                    placeholderTextColor={theme.textPlaceholder}
                    value={email}
                    editable={false}
                  />
                </View>
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
                  onChangeText={(text: string) => {
                    setCurrentPassword(text);
                    setTouched(prev => ({ ...prev, currentPassword: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, currentPassword: true }))}
                  showPassword={showCurrentPassword}
                  toggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
                  hasError={!!currentPasswordError}
                  isValid={!currentPasswordError && currentPassword.length > 0}
                />
                {currentPasswordError ? (
                  <Text style={[styles.errorText, { color: theme.error }]}>{currentPasswordError}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>New Password</Text>
                <PasswordInput
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChangeText={(text: string) => {
                    setNewPassword(text);
                    setTouched(prev => ({ ...prev, newPassword: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, newPassword: true }))}
                  showPassword={showNewPassword}
                  toggleVisibility={() => setShowNewPassword(!showNewPassword)}
                  hasError={!!newPasswordError}
                  isValid={!newPasswordError && newPassword.length >= 6}
                />
                {newPasswordError ? (
                  <Text style={[styles.errorText, { color: theme.error }]}>{newPasswordError}</Text>
                ) : null}
                <PasswordStrengthBar password={newPassword} theme={theme} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Confirm New Password</Text>
                <PasswordInput
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={(text: string) => {
                    setConfirmPassword(text);
                    setTouched(prev => ({ ...prev, confirmPassword: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
                  showPassword={showConfirmPassword}
                  toggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
                  hasError={!!confirmPasswordError}
                  isValid={!confirmPasswordError && confirmPassword.length > 0 && newPassword === confirmPassword}
                />
                {confirmPasswordError ? (
                  <Text style={[styles.errorText, { color: theme.error }]}>{confirmPasswordError}</Text>
                ) : null}
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

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
} 