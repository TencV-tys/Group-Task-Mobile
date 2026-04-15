// src/screens/SignupScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignupForm } from '../authHook/useSignupForm';
import { AvatarPicker } from '../components/AvatarPicker';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useSocket } from '../context/SocketContext';

// ─── Color Palette ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#2b8a3e',
  primaryDark: '#1e6b2c',
  primaryLight: '#ebfbee',
  secondary: '#f8f9fa',
  tertiary: '#e9ecef',
  dark: '#212529',
  gray: '#868e96',
  lightGray: '#adb5bd',
  error: '#fa5252',
  errorBg: '#fff5f5',
  white: '#ffffff',
  black: '#1a1a2e',
};

// ─── Gender Options ─────────────────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'N/A' },
];

// ─── Validation ─────────────────────────────────────────────────────────────────
const validateFullName = (name: string): string => {
  if (!name) return 'Full name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (!/^[a-zA-Z\s'-]+$/.test(name)) return 'Name can only contain letters, spaces, hyphens, or apostrophes';
  return '';
};

const validateEmail = (email: string): string => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email (e.g. john@example.com)';
  return '';
};

const validatePassword = (password: string): string => {
  if (!password) return 'Password is required';
  if (password.length < 6) return `Too short — need ${6 - password.length} more character${6 - password.length !== 1 ? 's' : ''}`;
  return '';
};

const validateConfirmPassword = (password: string, confirm: string): string => {
  if (!confirm) return 'Please confirm your password';
  if (confirm !== password) return 'Passwords do not match';
  return '';
};

// ─── Password Strength ─────────────────────────────────────────────────────────
type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

const getPasswordStrength = (password: string) => {
  if (!password) return { level: 'weak' as StrengthLevel, score: 0, label: '', color: COLORS.tertiary, tip: '' };

  let score = 0;
  const tips: string[] = [];

  if (password.length >= 6) score++; else tips.push('At least 6 chars');
  if (password.length >= 10) score++; else tips.push('10+ chars helps');
  if (/[A-Z]/.test(password)) score++; else tips.push('Add uppercase');
  if (/[0-9]/.test(password)) score++; else tips.push('Add a number');
  if (/[^A-Za-z0-9]/.test(password)) score++; else tips.push('Add !@#$...');

  if (score <= 1) return { level: 'weak' as StrengthLevel, score: 1, label: 'Weak', color: COLORS.error, tip: tips[0] ?? '' };
  if (score === 2) return { level: 'fair' as StrengthLevel, score: 2, label: 'Fair', color: '#fd7e14', tip: tips[0] ?? '' };
  if (score === 3) return { level: 'good' as StrengthLevel, score: 3, label: 'Good', color: '#f59f00', tip: tips[0] ?? '' };
  return { level: 'strong' as StrengthLevel, score: 4, label: 'Strong', color: COLORS.primary, tip: '' };
};

// ─── Password Strength Bar ─────────────────────────────────────────────────────
const PasswordStrengthBar = ({ password }: { password: string }) => {
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
    <View style={strengthStyles.container}>
      <View style={strengthStyles.bars}>
        {widths.map((anim, i) => (
          <View key={i} style={strengthStyles.barTrack}>
            <Animated.View
              style={[strengthStyles.barFill, { backgroundColor: strength.color, transform: [{ scaleX: anim }] }]}
            />
          </View>
        ))}
      </View>
      <View style={strengthStyles.row}>
        <Text style={[strengthStyles.label, { color: strength.color }]}>{strength.label}</Text>
        {strength.tip ? <Text style={strengthStyles.tip}>{strength.tip}</Text> : null}
      </View>
    </View>
  );
};

const strengthStyles = StyleSheet.create({
  container: { marginTop: 7 },
  bars: { flexDirection: 'row', gap: 4, marginBottom: 5 },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: COLORS.tertiary, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '700' },
  tip: { fontSize: 11, color: COLORS.gray, flexShrink: 1, textAlign: 'right', marginLeft: 8 },
});

// ─── SVG Eye Icon ───────────────────────────────────────────────────────────────
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
const CheckIcon = () => (
  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 }}>✓</Text>
  </View>
);

// ─── Inline Banner ─────────────────────────────────────────────────────────────
const InlineBanner = ({ message, type }: { message: string; type: 'error' | 'success' | null }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (message && type) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [message, type]);

  if (!message || !type) return null;

  const isError = type === 'error';
  return (
    <Animated.View style={[styles.banner, isError ? styles.bannerError : styles.bannerSuccess, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.bannerDot, { backgroundColor: isError ? COLORS.error : COLORS.primary }]} />
      <Text style={[styles.bannerText, { color: isError ? COLORS.error : COLORS.primary }]}>{message}</Text>
    </Animated.View>
  );
};

// ─── Animated Field Error ──────────────────────────────────────────────────────
const FieldError = ({ message }: { message: string }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: message ? 1 : 0, duration: message ? 200 : 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: message ? 0 : -4, duration: message ? 200 : 150, useNativeDriver: true }),
    ]).start();
  }, [message]);

  if (!message) return null;
  return (
    <Animated.View style={[styles.fieldErrorRow, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.fieldErrorDot} />
      <Text style={styles.fieldError}>{message}</Text>
    </Animated.View>
  );
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ loading }: { loading: boolean }) => {
  const width = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(width, { toValue: 85, duration: 1800, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(width, { toValue: 100, duration: 300, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start(() => width.setValue(0));
    }
  }, [loading]);

  return (
    <Animated.View style={[styles.progressTrack, { opacity }]}>
      <Animated.View style={[styles.progressFill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
    </Animated.View>
  );
};

// ─── Password Input ────────────────────────────────────────────────────────────
const PasswordInput = ({
  placeholder, value, onChangeText, editable, showPassword, togglePasswordVisibility, hasError, isValid,
}: any) => (
  <View style={[
    styles.inputWrapper,
    hasError && styles.inputError,
    isValid && styles.inputValid,
  ]}>
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      placeholder={placeholder}
      placeholderTextColor={COLORS.lightGray}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!showPassword}
      editable={editable}
    />
    {isValid && <CheckIcon />}
    <TouchableOpacity
      style={styles.eyeButton}
      onPress={togglePasswordVisibility}
      disabled={!editable}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <EyeIcon visible={showPassword} color={hasError ? COLORS.error : COLORS.lightGray} />
    </TouchableOpacity>
  </View>
);

// ─── Gender Pill Tabs ──────────────────────────────────────────────────────────
const GenderPills = ({ selectedValue, onValueChange, disabled }: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>Gender</Text>
    <View style={styles.pillsContainer}>
      {GENDER_OPTIONS.map((option) => {
        const active = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.pill, active && styles.pillActive, disabled && styles.pillDisabled]}
            onPress={() => !disabled && onValueChange(option.value)}
            disabled={disabled}
            activeOpacity={0.75}
          >
            {active ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pillGradient}
              >
                <Text style={[styles.pillText, styles.pillTextActive]}>{option.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.pillInner}>
                <Text style={styles.pillText}>{option.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SignupScreen({ navigation }: any) {
  const {
    formData, loading, avatarImage, uploadingAvatar,
    handleChange, handleAvatarSelect, handleAvatarRemove, handleSubmit, resetForm,
  } = useSignupForm();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, confirmPassword: false });
  const [banner, setBanner] = useState<{ message: string; type: 'error' | 'success' | null }>({ message: '', type: null });
  const { notifyLogin } = useSocket();

  // ── Animations — run in parallel, faster
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const formSlide = useRef(new Animated.Value(28)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 380, delay: 80, useNativeDriver: true }),
      Animated.timing(formSlide, { toValue: 0, duration: 380, delay: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const touch = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 2, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  // Real-time errors
  const nameError = touched.fullName ? validateFullName(formData.fullName) : '';
  const emailError = touched.email ? validateEmail(formData.email) : '';
  const passwordError = touched.password ? validatePassword(formData.password) : '';
  const confirmError = touched.confirmPassword ? validateConfirmPassword(formData.password, formData.confirmPassword) : '';

  const nameValid = touched.fullName && !nameError && !!formData.fullName;
  const emailValid = touched.email && !emailError && !!formData.email;
  const passwordValid = touched.password && !passwordError && !!formData.password;
  const confirmValid = touched.confirmPassword && !confirmError && !!formData.confirmPassword;

  const onSignupPress = async () => {
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });

    const nameErr = validateFullName(formData.fullName);
    const emailErr = validateEmail(formData.email);
    const passErr = validatePassword(formData.password);
    const confirmErr = validateConfirmPassword(formData.password, formData.confirmPassword);

    const firstErr = nameErr || emailErr || passErr || confirmErr;
    if (firstErr) {
      setBanner({ message: firstErr, type: 'error' });
      shake();
      return;
    }

    setBanner({ message: '', type: null });
    Keyboard.dismiss();
    const result = await handleSubmit();

    if (result.success) {
      setBanner({ message: 'Account created! Welcome to GroupTask 🎉', type: 'success' });
        await notifyLogin();
      setTimeout(() => {
        resetForm();
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }, 800);
    } else {
      setBanner({
        message: result.message || 'Something went wrong. Please try again.',
        type: 'error',
      });
      shake();
    }
  };

  return (
    <ScreenWrapper noTop={true} noBottom={true} backgroundColor={COLORS.white}>
      <ProgressBar loading={loading || uploadingAvatar} />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.white }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[styles.container, keyboardVisible && styles.containerWithKeyboard]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ── Header */}
            <Animated.View style={[styles.headerContainer, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoWrapper}>
                <View style={styles.logoContainer}>
                  <Text style={styles.logoCheck}>✓</Text>
                  <Text style={styles.logoText}>GT</Text>
                </View>
              </View>
              <Text style={styles.title}>Create account</Text>
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
                size={100}
              />
              <Text style={styles.avatarHint}>Tap to add profile picture (optional)</Text>
            </Animated.View>

            {/* ── Form */}
            <Animated.View
              style={{
                opacity: formAnim,
                transform: [{ translateY: formSlide }, { translateX: shakeAnim }],
              }}
            >
              {/* Inline banner */}
              <InlineBanner message={banner.message} type={banner.type} />

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full name *</Text>
                <View style={[styles.inputWrapper, nameError ? styles.inputError : nameValid ? styles.inputValid : null]}>
                  <TextInput
                    style={[styles.input, !loading && styles.inputActive]}
                    placeholder="John Doe"
                    placeholderTextColor={COLORS.lightGray}
                    value={formData.fullName}
                    onChangeText={(t) => { handleChange('fullName', t); touch('fullName'); }}
                    editable={!loading}
                  />
                  {nameValid && <CheckIcon />}
                </View>
                <FieldError message={nameError} />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email address *</Text>
                <View style={[styles.inputWrapper, emailError ? styles.inputError : emailValid ? styles.inputValid : null]}>
                  <TextInput
                    style={[styles.input, !loading && styles.inputActive]}
                    placeholder="john@example.com"
                    placeholderTextColor={COLORS.lightGray}
                    value={formData.email}
                    onChangeText={(t) => { handleChange('email', t); touch('email'); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                  {emailValid && <CheckIcon />}
                </View>
                <FieldError message={emailError} />
              </View>

              {/* Gender — pill tabs */}
              <GenderPills
                selectedValue={formData.gender}
                onValueChange={(v: string) => handleChange('gender', v)}
                disabled={loading}
              />

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password *</Text>
                <PasswordInput
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChangeText={(t: string) => { handleChange('password', t); touch('password'); }}
                  editable={!loading}
                  showPassword={showPassword}
                  togglePasswordVisibility={() => setShowPassword(v => !v)}
                  hasError={!!passwordError}
                  isValid={passwordValid}
                />
                <FieldError message={passwordError} />
                <PasswordStrengthBar password={formData.password} />
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm password *</Text>
                <PasswordInput
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChangeText={(t: string) => { handleChange('confirmPassword', t); touch('confirmPassword'); }}
                  editable={!loading}
                  showPassword={showConfirmPassword}
                  togglePasswordVisibility={() => setShowConfirmPassword(v => !v)}
                  hasError={!!confirmError}
                  isValid={confirmValid}
                />
                <FieldError message={confirmError} />
              </View>

              {/* Create Account Button */}
              <TouchableOpacity
                style={[styles.button, (loading || uploadingAvatar) && styles.buttonDisabled]}
                onPress={onSignupPress}
                disabled={loading || uploadingAvatar}
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
                    <Text style={styles.buttonText}>Create account →</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Terms */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>By signing up, you agree to our </Text>
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
                  Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Pressable>
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
    paddingTop: 56,
  },
  containerWithKeyboard: { justifyContent: 'flex-start', paddingTop: 20 },

  // Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.tertiary,
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Header
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  logoWrapper: {
    marginBottom: 18,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoCheck: { fontSize: 12, color: 'rgba(255,255,255,0.7)', position: 'absolute', top: 10, left: 10 },
  logoText: { fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: 1.5, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.black, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 18 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarHint: { fontSize: 11, color: COLORS.lightGray, marginTop: 7, fontStyle: 'italic' },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 16,
  },
  bannerError: { backgroundColor: '#fff5f5', borderColor: '#ffa8a8' },
  bannerSuccess: { backgroundColor: COLORS.primaryLight, borderColor: '#8ce99a' },
  bannerDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  bannerText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Form
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray,
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.tertiary,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  inputError: { borderColor: COLORS.error, backgroundColor: '#fff9f9' },
  inputValid: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  input: { flex: 1, fontSize: 15, color: COLORS.dark, height: '100%' },
  inputActive: { opacity: 1 },
  inputDisabled: { opacity: 0.55 },

  eyeButton: { padding: 4 },

  fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginLeft: 2 },
  fieldErrorDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.error, flexShrink: 0 },
  fieldError: { fontSize: 11, color: COLORS.error, fontWeight: '500' },

  // Gender pills
  pillsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.tertiary,
    padding: 3,
    gap: 3,
  },
  pill: {
    flex: 1,
    borderRadius: 9,
    overflow: 'hidden',
  },
  pillActive: {},
  pillDisabled: { opacity: 0.5 },
  pillGradient: { paddingVertical: 10, alignItems: 'center' },
  pillInner: { paddingVertical: 10, alignItems: 'center' },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  pillTextActive: { color: COLORS.white },

  // Button
  button: {
    borderRadius: 12,
    marginTop: 22,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: { height: 52, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // Terms
  termsContainer: { alignItems: 'center', marginBottom: 16 },
  termsText: { fontSize: 12, color: COLORS.gray, textAlign: 'center', lineHeight: 18 },
  termsLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  // Login link
  loginLink: { alignItems: 'center', paddingVertical: 10, marginBottom: 16 },
  loginLinkText: { fontSize: 14, color: COLORS.gray },
  loginLinkBold: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },
});