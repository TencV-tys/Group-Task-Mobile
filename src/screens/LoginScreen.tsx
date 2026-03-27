// src/screens/LoginScreen.tsx - Animated + Real-time Validation
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
  Keyboard,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLoginForm } from '../authHook/useLoginForm';
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

// ─── Validation Helpers ───────────────────────────────────────────────────────
const validateEmail = (email: string): string => {
  if (!email) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return '';
};

const validatePassword = (password: string): string => {
  if (!password) return '';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
};

// ─── Inline Error Message ─────────────────────────────────────────────────────
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
    hasError && styles.inputError,
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }: any) {
  const { formData, loading, message, handleChange, handleSubmit, resetForm } = useLoginForm();

  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  // ── Entrance Animations (similar to SignupScreen)
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

  // ── Real-time validation errors
  const emailError = touched.email ? validateEmail(formData.email) : '';
  const passwordError = touched.password ? validatePassword(formData.password) : '';

  const handleLogin = async () => {
    // Mark fields as touched
    setTouched({ email: true, password: true });
    
    // Validate fields
    const emailValidationError = validateEmail(formData.email);
    const passwordValidationError = validatePassword(formData.password);
    
    // Show validation error alert if any
    if (emailValidationError) {
      Alert.alert('Validation Error', emailValidationError, [{ text: 'OK' }]);
      return;
    }
    
    if (passwordValidationError) {
      Alert.alert('Validation Error', passwordValidationError, [{ text: 'OK' }]);
      return;
    }
    
    // Check if fields are empty
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Missing Information', 'Please enter both email and password', [{ text: 'OK' }]);
      return;
    }
    
    Keyboard.dismiss();
    const result = await handleSubmit();
    
    if (result?.success) {
      Alert.alert('✅ Success', 'Logged in successfully!', [{
        text: 'Continue',
        onPress: () => { resetForm(); navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); },
      }]);
    } else {
      // Show error alert if login failed
      Alert.alert(
        'Login Failed',
        result?.message || 'Invalid email or password. Please try again.',
        [{ text: 'Try Again', style: 'default' }]
      );
    }
  };

  return (
    <ScreenWrapper noTop={true} noBottom={true} backgroundColor={COLORS.white}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.content, keyboardVisible && styles.contentWithKeyboard]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header with Spring Animation (like SignupScreen) */}
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to continue to GroupTask</Text>
          </Animated.View>

          {/* ── Form with Slide Animation (like SignupScreen) */}
          <Animated.View 
            style={[
              styles.formContainer, 
              { 
                opacity: formAnim, 
                transform: [{ translateY: formSlide }] 
              }
            ]}
          >
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[
                styles.inputWrapper,
                emailError && styles.inputError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.email}
                  onChangeText={(t) => { handleChange('email', t); setTouched(p => ({ ...p, email: true })); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
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
              />
              <FieldError message={passwordError} />
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => Linking.openURL('http://192.168.1.29:5000/forgot-password')}
              disabled={loading}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
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
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* Sign Up Link */}
            <TouchableOpacity
              onPress={() => { resetForm(); navigation.navigate('Signup'); }}
              disabled={loading}
              style={styles.signupContainer}
            >
              <Text style={styles.linkText}>Don't have an account? </Text>
              <Text style={styles.linkBold}>Sign Up</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    minHeight: '100%',
  },
  contentWithKeyboard: { justifyContent: 'flex-start', paddingTop: 40 },
  headerContainer: { 
    alignItems: 'center', 
    marginBottom: 32,
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
    width: 84,
    height: 84,
    borderRadius: 24,
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
    letterSpacing: 1,
    marginTop: 4,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: COLORS.black, 
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 15, 
    color: COLORS.gray,
    textAlign: 'center',
  },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: COLORS.gray, 
    marginBottom: 8, 
    marginLeft: 4, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
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
  },
  eyeButton: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  eyeIcon: { fontSize: 20 },
  eyeIconDisabled: { opacity: 0.4 },
  inputDisabled: { opacity: 0.6 },
  fieldError: { fontSize: 12, color: COLORS.error, marginTop: 6, marginLeft: 4, fontWeight: '500' },
  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 24 },
  forgotPasswordLink: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  button: {
    borderRadius: 14,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.tertiary },
  dividerText: { marginHorizontal: 16, color: COLORS.lightGray, fontSize: 13, fontWeight: '600' },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  linkText: { color: COLORS.gray, fontSize: 15 },
  linkBold: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
});