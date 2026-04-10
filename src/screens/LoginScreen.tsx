// src/screens/LoginScreen.tsx
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLoginForm } from '../authHook/useLoginForm';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { API_BASE_URL } from '../config/api';

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

// ─── Validation ─────────────────────────────────────────────────────────────────
const validateEmail = (email: string): string => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return '';
};

const validatePassword = (password: string): string => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
};

// ─── SVG Eye Icon ───────────────────────────────────────────────────────────────
const EyeIcon = ({ visible, color }: { visible: boolean; color: string }) => (
  <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
    {visible ? (
      // Eye open
      <View>
        <View style={{ width: 18, height: 10, borderRadius: 9, borderWidth: 1.5, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
        </View>
      </View>
    ) : (
      // Eye closed (slash line)
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
  const { formData, loading, handleChange, handleSubmit, resetForm } = useLoginForm();

  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [banner, setBanner] = useState<{ message: string; type: 'error' | 'success' | null }>({ message: '', type: null });

  // ── Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const formSlide = useRef(new Animated.Value(28)).current;
  // Shake
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Faster parallel entrance — no stagger needed
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

 // In LoginScreen.tsx - update the handleLogin function

const handleLogin = async () => {
  setTouched({ email: true, password: true });

  const emailErr = validateEmail(formData.email);
  const passErr = validatePassword(formData.password);

  if (emailErr || passErr) {
    setBanner({ message: emailErr || passErr, type: 'error' });
    shake();
    return;
  }

  setBanner({ message: '', type: null });
  Keyboard.dismiss();
  const result = await handleSubmit();

  if (result?.success) {
    setBanner({ message: 'Logged in successfully!', type: 'success' });
    setTimeout(() => {
      resetForm();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }, 600);
  } else {
    // ✅ Handle field-specific errors
    if (result?.field === 'email') {
      setBanner({ 
        message: 'Email not found. Please check your email or sign up.', 
        type: 'error' 
      });
      // Highlight the email field with error styling
      setTouched(prev => ({ ...prev, email: true }));
    } else if (result?.field === 'password') {
      setBanner({ 
        message: 'Incorrect password. Please try again.', 
        type: 'error' 
      });
      // Highlight the password field with error styling
      setTouched(prev => ({ ...prev, password: true }));
    } else {
      setBanner({
        message: result?.message || 'Invalid email or password — please try again.',
        type: 'error',
      });
    }
    shake();
  }
};

  return (
    <ScreenWrapper noTop={true} noBottom={true} backgroundColor={COLORS.white}>
      {/* Top progress bar */}
      <ProgressBar loading={loading} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Tap outside to dismiss keyboard */}
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[styles.content, keyboardVisible && styles.contentWithKeyboard]}
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
              {/* Inline banner */}
              <InlineBanner message={banner.message} type={banner.type} />

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
                  placeholder="Enter your password"
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

              {/* Forgot */}
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

  // Progress bar
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

  // Header / Logo
  headerContainer: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: {
    marginBottom: 20,
    // Layered ring glow effect
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  logoContainer: { 
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },  
  logoCheck: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    position: 'absolute',
    top: 11,
    left: 11,
  },
  logoText: { fontSize: 30, fontWeight: '900', color: COLORS.white, letterSpacing: 1.5, marginTop: 4 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.black, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },

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
  bannerError: { backgroundColor: COLORS.errorBg, borderColor: '#ffa8a8' },
  bannerSuccess: { backgroundColor: COLORS.primaryLight, borderColor: '#8ce99a' },
  bannerDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  bannerText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Form
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

  // Eye button
  eyeButton: { padding: 4 },

  // Field error
  fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, marginLeft: 2 },
  fieldErrorDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.error, flexShrink: 0 },
  fieldError: { fontSize: 12, color: COLORS.error, fontWeight: '500' },

  // Forgot
  forgotContainer: { alignItems: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  // Button
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

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  divider: { flex: 1, height: 0.5, backgroundColor: COLORS.tertiary },
  dividerText: { marginHorizontal: 14, color: COLORS.lightGray, fontSize: 12, fontWeight: '600' },

  // Signup row
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  linkText: { color: COLORS.gray, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});