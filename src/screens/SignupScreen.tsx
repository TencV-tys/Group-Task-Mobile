// src/screens/SignupScreen.tsx - Animated + Real-time Validation + Password Strength
import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignupForm } from '../authHook/useSignupForm';
import { AvatarPicker } from '../components/AvatarPicker';
import { ScreenWrapper } from '../components/ScreenWrapper';

// ─── Color Palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#2b8a3e',
  primaryDark: '#1e6b2c',
  primaryLight: '#d3f9d8',
  secondary: '#f8f9fa',
  tertiary: '#e9ecef',
  dark: '#212529',
  gray: '#868e96',
  lightGray: '#adb5bd',
  error: '#fa5252',
  white: '#ffffff',
  black: '#1a1a2e',
};

// ─── Gender Options ───────────────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

// ─── Validation Helpers ───────────────────────────────────────────────────────
const validateFullName = (name: string): string => {
  if (!name) return '';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (!/^[a-zA-Z\s'-]+$/.test(name)) return 'Name can only contain letters, spaces, hyphens, or apostrophes';
  return '';
};

const validateEmail = (email: string): string => {
  if (!email) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address (e.g. john@example.com)';
  return '';
};

const validatePassword = (password: string): string => {
  if (!password) return '';
  if (password.length < 6) return `Too short — need ${6 - password.length} more character${6 - password.length !== 1 ? 's' : ''}`;
  return '';
};

const validateConfirmPassword = (password: string, confirm: string): string => {
  if (!confirm) return '';
  if (confirm !== password) return 'Passwords do not match';
  return '';
};

// ─── Password Strength Calculator ────────────────────────────────────────────
type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

const getPasswordStrength = (password: string): { level: StrengthLevel; score: number; label: string; color: string; tips: string[] } => {
  if (!password) return { level: 'weak', score: 0, label: '', color: COLORS.tertiary, tips: [] };
  
  let score = 0;
  const tips: string[] = [];

  if (password.length >= 6) score++;
  else tips.push('At least 6 characters');

  if (password.length >= 10) score++;
  else if (password.length >= 6) tips.push('10+ characters for stronger password');

  if (/[A-Z]/.test(password)) score++;
  else tips.push('Add an uppercase letter');

  if (/[0-9]/.test(password)) score++;
  else tips.push('Add a number');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else tips.push('Add a special character (!@#$...)');

  if (score <= 1) return { level: 'weak', score: 1, label: 'Weak', color: COLORS.error, tips };
  if (score === 2) return { level: 'fair', score: 2, label: 'Fair', color: '#fd7e14', tips };
  if (score === 3) return { level: 'good', score: 3, label: 'Good', color: '#f59f00', tips };
  return { level: 'strong', score: 4, label: 'Strong', color: COLORS.primary, tips };
};

// ─── Password Strength Bar ────────────────────────────────────────────────────
const PasswordStrengthBar = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);
  const widths = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (!password) {
      widths.forEach(w => Animated.timing(w, { toValue: 0, duration: 200, useNativeDriver: false }).start());
      return;
    }
    widths.forEach((w, i) => {
      Animated.timing(w, {
        toValue: i < strength.score ? 1 : 0,
        duration: 300,
        delay: i * 60,
        useNativeDriver: false,
      }).start();
    });
  }, [password, strength.score]);

  if (!password) return null;

  return (
    <View style={strengthStyles.container}>
      <View style={strengthStyles.bars}>
        {widths.map((anim, i) => (
          <View key={i} style={strengthStyles.barTrack}>
            <Animated.View
              style={[
                strengthStyles.barFill,
                {
                  backgroundColor: strength.color,
                  transform: [{ scaleX: anim }],
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={strengthStyles.labelRow}>
        <Text style={[strengthStyles.label, { color: strength.color }]}>
          {strength.label}
        </Text>
        {strength.tips.length > 0 && (
          <Text style={strengthStyles.tip}>{strength.tips[0]}</Text>
        )}
      </View>
    </View>
  );
};

const strengthStyles = StyleSheet.create({
  container: { marginTop: 8 },
  bars: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.tertiary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    transformOrigin: 'left',
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700' },
  tip: { fontSize: 11, color: COLORS.gray, flexShrink: 1, textAlign: 'right', marginLeft: 8 },
});

// ─── Animated Field Error ─────────────────────────────────────────────────────
const FieldError = ({ message }: { message: string }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-4)).current;

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -4, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [message]);

  if (!message) return null;
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Text style={styles.fieldError}>⚠ {message}</Text>
    </Animated.View>
  );
};

// ─── Password Input ───────────────────────────────────────────────────────────
const PasswordInput = ({
  placeholder, value, onChangeText, editable, showPassword, togglePasswordVisibility, hasError,
}: any) => (
  <View style={[
    styles.passwordContainer,
    hasError && styles.inputError
  ]}>
    <TextInput
      style={[styles.passwordInput, !editable && styles.inputDisabled]}
      placeholder={placeholder}
      placeholderTextColor={COLORS.lightGray}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!showPassword}
      editable={editable}
    />
    <TouchableOpacity style={styles.eyeButton} onPress={togglePasswordVisibility} disabled={!editable}>
      <Text style={[styles.eyeIcon, !editable && styles.eyeIconDisabled]}>
        {showPassword ? '👁️' : '👁️‍🗨️'}
      </Text>
    </TouchableOpacity>
  </View>
);

// ─── Gender Picker ────────────────────────────────────────────────────────────
const GenderPicker = ({ selectedValue, onValueChange, disabled }: any) => (
  <View style={styles.pickerContainer}>
    <Text style={styles.inputLabel}>Gender *</Text>
    <View style={styles.pickerRow}>
      {GENDER_OPTIONS.map((gender) => (
        <TouchableOpacity
          key={gender.value}
          style={[
            styles.genderButton,
            selectedValue === gender.value && styles.genderButtonActive,
            disabled && styles.genderButtonDisabled
          ]}
          onPress={() => !disabled && onValueChange(gender.value)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={selectedValue === gender.value ? [COLORS.primary, COLORS.primaryDark] : [COLORS.secondary, COLORS.tertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.genderButtonGradient}
          >
            <Text style={[styles.genderText, selectedValue === gender.value && styles.genderTextActive]}>
              {gender.label}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SignupScreen({ navigation }: any) {
  const {
    formData, loading, message, avatarImage, uploadingAvatar,
    handleChange, handleAvatarSelect, handleAvatarRemove, handleSubmit, resetForm,
  } = useSignupForm();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [touched, setTouched] = useState({
    fullName: false, email: false, password: false, confirmPassword: false,
  });

  // ── Entrance Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const formSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(formSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Keyboard
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const touch = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  // Real-time errors
  const nameError = touched.fullName ? validateFullName(formData.fullName) : '';
  const emailError = touched.email ? validateEmail(formData.email) : '';
  const passwordError = touched.password ? validatePassword(formData.password) : '';
  const confirmError = touched.confirmPassword ? validateConfirmPassword(formData.password, formData.confirmPassword) : '';

  const onSignupPress = async () => {
    // Mark all fields as touched
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    
    // Validate all fields
    const nameValidationError = validateFullName(formData.fullName);
    const emailValidationError = validateEmail(formData.email);
    const passwordValidationError = validatePassword(formData.password);
    const confirmValidationError = validateConfirmPassword(formData.password, formData.confirmPassword);
    
    // Check for validation errors
    if (nameValidationError || emailValidationError || passwordValidationError || confirmValidationError) {
      // Show specific validation error alert
      const firstError = nameValidationError || emailValidationError || passwordValidationError || confirmValidationError;
      Alert.alert(
        'Validation Error',
        firstError,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    // Check if all required fields are filled
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
      Alert.alert(
        'Missing Information',
        'Please fill in all required fields marked with *',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    Keyboard.dismiss();
    const result = await handleSubmit();
    
    if (result.success) {
      Alert.alert(
        '🎉 Account Created!',
        'Welcome to GroupTask! You can update your profile picture anytime from your profile settings.',
        [{
          text: 'Let\'s Go!',
          onPress: () => { 
            resetForm(); 
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        }],
      );
    } else {
      // Show error alert if submission failed
      Alert.alert(
        'Sign Up Failed',
        result.message || 'Something went wrong. Please check your information and try again.',
        [{ text: 'Try Again', style: 'default' }]
      );
    }
  };

  return (
    <ScreenWrapper noTop={true} noBottom={true} backgroundColor={COLORS.white}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.white }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.container, keyboardVisible && styles.containerWithKeyboard]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header - Fixed Logo Alignment */}
          <Animated.View
            style={[
              styles.headerContainer, 
              { 
                opacity: logoAnim, 
                transform: [{ scale: logoScale }] 
              }
            ]}
          >
            <View style={styles.logoWrapper}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoEmoji}>✓</Text>
                <Text style={styles.logoText}>GT</Text>
              </View>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join GroupTask to manage tasks with your team</Text>
          </Animated.View>

          {/* ── Avatar */}
          <Animated.View style={[styles.avatarSection, { opacity: logoAnim }]}>
            <AvatarPicker
              avatarImage={avatarImage}
              onAvatarSelect={handleAvatarSelect}
              onAvatarRemove={handleAvatarRemove}
              uploading={uploadingAvatar}
              editable={!loading}
              size={110}
            />
            <Text style={styles.avatarHint}>Tap to add profile picture (optional)</Text>
          </Animated.View>

          {/* ── Global Message (only for non-error messages) */}
          {message && !message.includes('❌') && (
            <Animated.View style={{ opacity: formAnim }}>
              <View style={[
                styles.messageBox,
                (message.includes('✅') || message.includes('📤')) ? styles.successBox : styles.errorBox
              ]}>
                <Text style={[
                  styles.messageText,
                  (message.includes('✅') || message.includes('📤')) ? styles.successText : styles.errorText
                ]}>
                  {message}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* ── Form */}
          <Animated.View style={{ opacity: formAnim, transform: [{ translateY: formSlide }] }}>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View style={[
                styles.inputWrapper,
                nameError && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.fullName}
                  onChangeText={(t) => { handleChange('fullName', t); touch('fullName'); }}
                  editable={!loading}
                />
              </View>
              <FieldError message={nameError} />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View style={[
                styles.inputWrapper,
                emailError && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="john@example.com"
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.email}
                  onChangeText={(t) => { handleChange('email', t); touch('email'); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>
              <FieldError message={emailError} />
            </View>

            {/* Gender */}
            <GenderPicker
              selectedValue={formData.gender}
              onValueChange={(v: string) => handleChange('gender', v)}
              disabled={loading}
            />

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
              <PasswordInput
                placeholder="Enter at least 6 characters"
                value={formData.password}
                onChangeText={(t: string) => { handleChange('password', t); touch('password'); }}
                editable={!loading}
                showPassword={showPassword}
                togglePasswordVisibility={() => setShowPassword(v => !v)}
                hasError={!!passwordError}
              />
              <FieldError message={passwordError} />
              <PasswordStrengthBar password={formData.password} />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <PasswordInput
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChangeText={(t: string) => { handleChange('confirmPassword', t); touch('confirmPassword'); }}
                editable={!loading}
                showPassword={showConfirmPassword}
                togglePasswordVisibility={() => setShowConfirmPassword(v => !v)}
                hasError={!!confirmError}
              />
              <FieldError message={confirmError} />
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onSignupPress}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading || uploadingAvatar ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Create Account</Text>
                    <Text style={styles.buttonIcon}> →</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>By signing up, you agree to our{' '}</Text>
              <View style={styles.termsLinks}>
                <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                  <Text style={styles.link}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.termsText}> and </Text>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={styles.link}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Link */}
            <TouchableOpacity
              onPress={() => { Keyboard.dismiss(); navigation.goBack(); }}
              disabled={loading}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>
                Already have an account?{' '}
                <Text style={styles.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 24, 
    justifyContent: 'center', 
    minHeight: '100%',
    paddingTop: 60,
  },
  containerWithKeyboard: { justifyContent: 'flex-start', paddingTop: 20 },
  
  headerContainer: { 
    alignItems: 'center', 
    marginBottom: 24,
    marginTop: 0,
  },
  logoWrapper: {
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  logoContainer: {
    width: 85,
    height: 85,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoEmoji: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.8)', 
    position: 'absolute', 
    top: 12,
    left: 12,
  },
  logoText: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: COLORS.white, 
    letterSpacing: 1.5,
    marginTop: 4,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: COLORS.black, 
    marginBottom: 8, 
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 14, 
    color: COLORS.gray, 
    textAlign: 'center',
    lineHeight: 20,
  },
  avatarSection: { 
    alignItems: 'center', 
    marginBottom: 24,
    marginTop: 8,
  },
  avatarHint: { 
    fontSize: 12, 
    color: COLORS.lightGray, 
    marginTop: 8, 
    fontStyle: 'italic',
  },
  messageBox: { 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 24, 
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderColor: COLORS.error,
  },
  messageText: { 
    textAlign: 'center', 
    fontSize: 14, 
    lineHeight: 20,
    fontWeight: '500',
  },
  successText: { color: COLORS.primary },
  errorText: { color: COLORS.error },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 13, 
    fontWeight: '700', 
    marginBottom: 8,
    color: COLORS.gray, 
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  inputWrapper: { 
    backgroundColor: COLORS.secondary,
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: COLORS.tertiary,
  },
  inputError: { borderColor: COLORS.error, backgroundColor: '#fff5f5' },
  input: { 
    height: 52, 
    paddingHorizontal: 16, 
    fontSize: 16, 
    color: COLORS.dark,
    fontWeight: '500',
  },
  inputDisabled: { opacity: 0.6 },
  fieldError: { 
    fontSize: 12, 
    color: COLORS.error, 
    marginTop: 6, 
    marginLeft: 6, 
    fontWeight: '500',
  },
  passwordContainer: { 
    backgroundColor: COLORS.secondary,
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: COLORS.tertiary, 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  passwordInput: { 
    flex: 1, 
    height: 52, 
    paddingHorizontal: 16, 
    fontSize: 16, 
    color: COLORS.dark,
    fontWeight: '500',
  },
  eyeButton: { 
    width: 52, 
    height: 52, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  eyeIcon: { fontSize: 20 },
  eyeIconDisabled: { opacity: 0.4 },
  pickerContainer: { marginBottom: 20 },
  pickerRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    marginBottom: 0,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.tertiary,
    minWidth: '48%',
  },
  genderButtonGradient: { 
    paddingVertical: 13, 
    alignItems: 'center',
  },
  genderButtonActive: { borderColor: COLORS.primary },
  genderButtonDisabled: { opacity: 0.5 },
  genderText: { 
    color: COLORS.gray, 
    fontWeight: '600', 
    fontSize: 14,
  },
  genderTextActive: { 
    color: COLORS.white, 
    fontWeight: '700',
  },
  button: {
    borderRadius: 14,
    marginTop: 28,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: { 
    height: 56, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { 
    color: COLORS.white, 
    fontSize: 17, 
    fontWeight: '700', 
    letterSpacing: 0.5,
  },
  buttonIcon: { 
    color: COLORS.white, 
    fontSize: 18, 
    fontWeight: '700',
    marginLeft: 4,
  },
  termsContainer: { 
    alignItems: 'center', 
    marginBottom: 20,
  },
  termsText: { 
    fontSize: 13, 
    color: COLORS.gray, 
    textAlign: 'center', 
    lineHeight: 20,
  },
  termsLinks: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 4,
  },
  link: { 
    color: COLORS.primary, 
    fontWeight: '700', 
    fontSize: 13,
  },
  loginLink: { 
    alignItems: 'center', 
    paddingVertical: 12, 
    marginBottom: 20, 
  },
  loginLinkText: { 
    fontSize: 15, 
    color: COLORS.gray,
  },
  loginLinkBold: { 
    color: COLORS.primary, 
    fontWeight: '800', 
    fontSize: 15,
  },
});