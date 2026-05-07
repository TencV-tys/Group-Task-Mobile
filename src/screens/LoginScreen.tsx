// src/screens/LoginScreen.tsx - UPDATED to match SignupScreen styling

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
  Keyboard,
  Animated,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLoginForm } from '../authHook/useLoginForm';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { API_BASE_URL } from '../config/api';
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
  errorBorder: '#ffa8a8',
  white: '#ffffff',
  black: '#1a1a2e',
};

// ─── Validation - MATCHING BACKEND ─────────────────────────────────────────────
const validateEmail = (email: string): string => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  if (email.length > 254) return 'Email is too long';
  return '';
};

const validatePassword = (password: string): string => {
  if (!password) return 'Password is required';
  if (password.length < 8) return `Password must be at least 8 characters (need ${8 - password.length} more)`;
  if (password.length > 128) return 'Password is too long (max 128 characters)';
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  
  if (!hasUpperCase) return 'Password must contain at least one uppercase letter (A-Z)';
  if (!hasLowerCase) return 'Password must contain at least one lowercase letter (a-z)';
  if (!hasNumber) return 'Password must contain at least one number (0-9)';
  if (!hasSpecial) return 'Password must contain at least one special character (!@#$%^&* etc.)';
  
  return '';
};

// ─── SVG Eye Icon ───────────────────────────────────────────────────────────────
const EyeIcon = ({ visible, color }: { visible: boolean; color: string }) => (
  <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
    {visible ? (
      <View>
        <View style={{ width: 18, height: 10, borderRadius: 9, borderWidth: 1.5, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
        </View>
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
    {isValid && !hasError && <CheckIcon />}
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

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }: any) {
  const { 
    formData, 
    loading, 
    handleChange, 
    handleSubmit, 
    resetForm,
    remainingAttempts,
    isLocked
  } = useLoginForm();

  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [banner, setBanner] = useState<{ message: string; type: 'error' | 'success' | null }>({ message: '', type: null });
  const { notifyLogin } = useSocket();
  
  // ── Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const formSlide = useRef(new Animated.Value(28)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Get remaining attempts message
  const getRemainingAttemptsMessage = () => {
    if (isLocked) {
      return { message: '⚠️ Account temporarily locked due to too many failed attempts', type: 'error' };
    }
    if (remainingAttempts !== null && remainingAttempts > 0) {
      return { message: `⚠️ ${remainingAttempts} attempt(s) remaining before account lockout`, type: 'warning' };
    }
    return null;
  };

  const attemptsInfo = getRemainingAttemptsMessage();

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

  const emailError = touched.email ? validateEmail(formData.email) : '';
  const passwordError = touched.password ? validatePassword(formData.password) : '';
  const emailValid = touched.email && !emailError && !!formData.email;
  const passwordValid = touched.password && !passwordError && !!formData.password;

  const handleLogin = async () => {
    setTouched({ email: true, password: true });

    const emailErr = validateEmail(formData.email);
    const passErr = validatePassword(formData.password);

    if (emailErr) {
      Alert.alert('Invalid Email', emailErr);
      shake();
      return;
    }
    if (passErr) {
      Alert.alert('Invalid Password', passErr);
      shake();
      return;
    }

    setBanner({ message: '', type: null });
    Keyboard.dismiss();
    const result = await handleSubmit();

    if (result?.success) { 
      setBanner({ message: 'Logged in successfully!', type: 'success' });
      await notifyLogin();
      console.log('🔐 Socket notified of login');
      setTimeout(() => {
        resetForm();
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }, 600);
    } else {
      if (result?.field === 'email') {
        Alert.alert(
          'Email Not Found',
          'No account found with this email address.\n\nPlease check your email or sign up for a new account.',
          [
            { text: 'Try Again', style: 'cancel' },
            { text: 'Sign Up', onPress: () => navigation.navigate('Signup') }
          ]
        );
        setTouched(prev => ({ ...prev, email: true }));
      } else if (result?.field === 'password') {
        Alert.alert(
          'Incorrect Password',
          'The password you entered is incorrect.\n\nPlease try again.',
          [{ text: 'OK' }]
        );
        setTouched(prev => ({ ...prev, password: true }));
      } else if (result?.isLocked) {
        Alert.alert(
          'Account Temporarily Locked',
          `Too many failed login attempts. Please try again in ${result.lockoutMinutes} minutes.`,
          [{ text: 'OK' }]
        );
      } else if (result?.remainingAttempts !== undefined && result.remainingAttempts > 0) {
        Alert.alert(
          'Login Failed',
          `${result.message || 'Invalid email or password'}\n\n${result.remainingAttempts} attempt(s) remaining before account lockout.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Login Failed',
          result?.message || 'Invalid email or password. Please try again.'
        );
      }
      shake();
    }
  };

  return (
    <ScreenWrapper noTop={true} noBottom={true} backgroundColor={COLORS.white}>
      <ProgressBar loading={loading} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[styles.content, keyboardVisible && styles.contentWithKeyboard]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ── Header with GT Logo Image (matching SignupScreen) ── */}
            <Animated.View style={[styles.headerContainer, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoWrapper}>
                <View style={styles.logoContainer}>
                  <Image 
                    source={require('../../assets/GTRLOGO.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Login to continue to GroupTask</Text>
            </Animated.View>

            {/* ── Form */}
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: formAnim,
                  transform: [
                    { translateY: formSlide },
                    { translateX: shakeAnim },
                  ],
                },
              ]}
            >
              <InlineBanner message={banner.message} type={banner.type} />

              {/* Remaining attempts banner */}
              {attemptsInfo && (
                <LinearGradient
                  colors={[COLORS.errorBg, COLORS.errorBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.warningBanner}
                >
                  <MaterialCommunityIcons name="alert-circle" size={18} color={COLORS.error} />
                  <Text style={[styles.warningBannerText, { color: COLORS.error }]}>{attemptsInfo.message}</Text>
                </LinearGradient>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[
                  styles.inputWrapper,
                  emailError ? styles.inputError : emailValid ? styles.inputValid : null,
                ]}>
                  <TextInput
                    style={[styles.input, !loading && styles.inputActive]}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.lightGray}
                    value={formData.email}
                    onChangeText={(t) => { handleChange('email', t); setTouched(p => ({ ...p, email: true })); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                  {emailValid && <CheckIcon />}
                </View>
                <FieldError message={emailError} />
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <PasswordInput
                  placeholder="Enter Password"
                  value={formData.password}
                  onChangeText={(t: string) => { handleChange('password', t); setTouched(p => ({ ...p, password: true })); }}
                  editable={!loading}
                  showPassword={showPassword}
                  togglePasswordVisibility={() => setShowPassword(v => !v)}
                  hasError={!!passwordError}
                  isValid={passwordValid}
                />
                <FieldError message={passwordError} />
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => Linking.openURL(`${API_BASE_URL}/forgot-password`)}
                disabled={loading}
                style={styles.forgotContainer} 
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>Login →</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              {/* Sign Up */}
              <TouchableOpacity
                onPress={() => { resetForm(); navigation.navigate('Signup'); }}
                disabled={loading}
                style={styles.signupRow}
              >
                <Text style={styles.linkText}>Don't have an account? </Text>
                <Text style={styles.linkBold}>Sign up</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  progressTrack: {
    height: 3,
    backgroundColor: COLORS.tertiary,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    minHeight: '100%',
  },
  contentWithKeyboard: { justifyContent: 'flex-start', paddingTop: 40 },

  headerContainer: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: {
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  // ✅ Updated to match SignupScreen styling
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.black, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },

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
  bannerError: { backgroundColor: COLORS.errorBg, borderColor: '#ffa8a8' },
  bannerSuccess: { backgroundColor: COLORS.primaryLight, borderColor: '#8ce99a' },
  bannerDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  bannerText: { fontSize: 13, fontWeight: '500', flex: 1 },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLORS.errorBorder,
    marginBottom: 16,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },

  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 16 },
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
    height: 50,
    gap: 8,
  },
  inputError: { borderColor: COLORS.error, backgroundColor: COLORS.errorBg },
  inputValid: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  input: { flex: 1, fontSize: 15, color: COLORS.dark, height: '100%' },
  inputActive: { opacity: 1 },
  inputDisabled: { opacity: 0.55 },

  eyeButton: { padding: 4 },

  fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, marginLeft: 2 },
  fieldErrorDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.error, flexShrink: 0 },
  fieldError: { fontSize: 12, color: COLORS.error, fontWeight: '500' },

  forgotContainer: { alignItems: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  button: {
    borderRadius: 12,
    marginBottom: 22,
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

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  divider: { flex: 1, height: 0.5, backgroundColor: COLORS.tertiary },
  dividerText: { marginHorizontal: 14, color: COLORS.lightGray, fontSize: 12, fontWeight: '600' },

  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  linkText: { color: COLORS.gray, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});