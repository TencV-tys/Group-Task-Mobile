// src/screens/SignupScreen.tsx - UPDATED with ScreenWrapper
import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSignupForm } from '../authHook/useSignupForm';
import { AvatarPicker } from '../components/AvatarPicker';
import { ScreenWrapper } from '../components/ScreenWrapper';

// Gender options that match your backend enum
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
];

// Simple gender picker with updated colors
const GenderPicker = ({ selectedValue, onValueChange, disabled }: any) => {
  return (
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
              colors={selectedValue === gender.value 
                ? ['#2b8a3e', '#1e6b2c']
                : ['#f8f9fa', '#e9ecef']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.genderButtonGradient}
            >
              <Text style={[
                styles.genderText,
                selectedValue === gender.value && styles.genderTextActive
              ]}>
                {gender.label}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Password Input with Eye Icon Component
const PasswordInput = ({ 
  placeholder, 
  value, 
  onChangeText, 
  editable,
  showPassword, 
  togglePasswordVisibility 
}: any) => {
  return (
    <LinearGradient
      colors={['#f8f9fa', '#e9ecef']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.passwordContainer}
    >
      <TextInput
        style={[
          styles.passwordInput,
          !editable && styles.inputDisabled
        ]}
        placeholder={placeholder}
        placeholderTextColor="#adb5bd"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        editable={editable}
      />
      <TouchableOpacity 
        style={styles.eyeButton}
        onPress={togglePasswordVisibility}
        disabled={!editable}
      >
        <Text style={[
          styles.eyeIcon,
          !editable && styles.eyeIconDisabled
        ]}>
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default function SignupScreen({ navigation }: any) {
  const {
    formData,
    loading,
    message,
    avatarImage,
    uploadingAvatar,
    handleChange,
    handleAvatarSelect,
    handleAvatarRemove,
    handleSubmit, 
    resetForm
  } = useSignupForm();

  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSignupPress = async () => {
    const result = await handleSubmit();
    
    if (result.success) {
        Alert.alert(
          '🎉 Success!', 
          'Your account has been created successfully!\n\nYou can update your profile picture anytime from your profile settings.',
          [
            { 
                text: 'Continue to Home', 
                onPress: () => {
                    resetForm();
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                }
            }
        ]);
    } else {
        Alert.alert('❌ Error', result.message || 'Signup failed. Please try again.');
    }
  };

  const handleTermsPress = () => {
    navigation.navigate('TermsOfService');
  };

  const handlePrivacyPress = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleLoginPress = () => {
    navigation.goBack();
  };

  return (
    <ScreenWrapper noTop={true} noBottom={true} backgroundColor="#ffffff">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <LinearGradient
                colors={['#d3f9d8', '#b2f2bb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }} 
                style={styles.logoContainer}
              >
                <Text style={styles.logoText}>GT</Text>
              </LinearGradient>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join GroupTask to manage tasks with your team</Text>
            </View>
            
            {/* Profile Picture Section */}
            <View style={styles.avatarSection}>
              <AvatarPicker
                avatarImage={avatarImage}
                onAvatarSelect={handleAvatarSelect}
                onAvatarRemove={handleAvatarRemove}
                uploading={uploadingAvatar}
                editable={!loading}
                size={120}
              />
              <Text style={styles.avatarHint}>Tap to add profile picture (optional)</Text>
            </View>
            
            {/* Message display */}
            {message ? (
              <LinearGradient
                colors={message.includes('✅') || message.includes('📤') ? ['#d3f9d8', '#b2f2bb'] : ['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.messageBox}
              >
                <Text style={[
                  styles.messageText,
                  message.includes('✅') || message.includes('📤') ? styles.successText : styles.errorText
                ]}>
                  {message}
                </Text>
              </LinearGradient>
            ) : null}
            
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputGradient}
              >
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#adb5bd"
                  value={formData.fullName}
                  onChangeText={(text) => handleChange('fullName', text)}
                  editable={!loading}
                />
              </LinearGradient>
            </View>
            
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputGradient}
              >
                <TextInput
                  style={styles.input}
                  placeholder="john@example.com"
                  placeholderTextColor="#adb5bd"
                  value={formData.email}
                  onChangeText={(text) => handleChange('email', text)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </LinearGradient>
            </View>
            
            {/* Gender Picker */}
            <GenderPicker
              selectedValue={formData.gender}
              onValueChange={(value: string) => handleChange('gender', value)}
              disabled={loading}
            />
            
            {/* Password with Eye Icon */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
              <PasswordInput
                placeholder="Enter at least 6 characters"
                value={formData.password}
                onChangeText={(text:string) => handleChange('password', text)}
                editable={!loading}
                showPassword={showPassword}
                togglePasswordVisibility={() => setShowPassword(!showPassword)}
              />
              <Text style={styles.hintText}>Minimum 6 characters</Text>
            </View>
            
            {/* Confirm Password with Eye Icon */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <PasswordInput
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChangeText={(text:string) => handleChange('confirmPassword', text)}
                editable={!loading}
                showPassword={showConfirmPassword}
                togglePasswordVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </View>
            
            {/* Signup Button */}
            <TouchableOpacity
              style={[
                styles.button,
                loading && styles.buttonDisabled
              ]}
              onPress={onSignupPress}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading || uploadingAvatar ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Create Account</Text>
                    <Text style={styles.buttonIcon}>→</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Terms & Privacy */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
              </Text>
              <View style={styles.termsLinks}>
                <TouchableOpacity onPress={handleTermsPress}>
                  <Text style={styles.link}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.termsText}> and </Text>
                <TouchableOpacity onPress={handlePrivacyPress}>
                  <Text style={styles.link}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Login Link */}
            <TouchableOpacity
              onPress={handleLoginPress}
              disabled={loading}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>
                Already have an account?{' '}
                <Text style={styles.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2b8a3e',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    color: '#212529',
  },
  subtitle: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarHint: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 8,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#adb5bd',
    marginLeft: 4,
  },
  inputGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#212529',
    backgroundColor: 'transparent',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  hintText: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 6,
    marginLeft: 4,
  },
  passwordContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#212529',
    backgroundColor: 'transparent',
  },
  eyeButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  eyeIconDisabled: {
    opacity: 0.5,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genderButton: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  genderButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: '#2b8a3e',
    borderWidth: 2,
  },
  genderButtonDisabled: {
    opacity: 0.5,
  },
  genderText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 15,
  },
  genderTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  button: {
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  termsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  termsText: {
    fontSize: 13,
    color: '#868e96',
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
    color: '#2b8a3e',
    fontWeight: '600',
    fontSize: 13,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  loginLinkText: {
    fontSize: 15,
    color: '#868e96',
  },
  loginLinkBold: {
    color: '#2b8a3e',
    fontWeight: '700',
    fontSize: 16,
  },
  messageBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: '#2b8a3e',
  },
  errorText: {
    color: '#fa5252',
  },
});