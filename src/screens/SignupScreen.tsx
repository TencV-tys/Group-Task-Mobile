// src/screens/SignupScreen.tsx
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
import { useSignupForm } from '../authHook/useSignupForm';
import { AvatarPicker } from '../components/AvatarPicker';

// Gender options that match your backend enum
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
];

// Simple gender picker for React Native
const GenderPicker = ({ selectedValue, onValueChange, disabled }: any) => {
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>Gender *</Text>
      <View style={styles.pickerRow}>
        {GENDER_OPTIONS.map((gender) => (
          <TouchableOpacity
            key={gender.value}
            style={[
              styles.genderButton,
              selectedValue === gender.value && styles.genderButtonSelected,
              disabled && styles.genderButtonDisabled
            ]}
            onPress={() => !disabled && onValueChange(gender.value)}
            disabled={disabled}
          >
            <Text style={[
              selectedValue === gender.value ? styles.genderTextSelected : styles.genderText,
              disabled && styles.genderTextDisabled
            ]}>
              {gender.label}
            </Text>
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
    <View style={styles.passwordContainer}>
      <TextInput
        style={[
          styles.passwordInput,
          !editable && styles.inputDisabled
        ]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        editable={editable}
        placeholderTextColor="#999"
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
    </View>
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
        // SUCCESS: Show success alert and navigate to Home
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
        // ERROR: Show error message
        Alert.alert('❌ Error', result.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join GroupTask to manage tasks with your team</Text>
        
        {/* Profile Picture Section */}
        <View style={styles.avatarSection}>
          <AvatarPicker
            avatarImage={avatarImage}
            onAvatarSelect={handleAvatarSelect}
            onAvatarRemove={handleAvatarRemove}
            uploading={uploadingAvatar}
            editable={!loading}
            size={140}
          />
        </View>
        
        {/* Message display */}
        {message ? (
          <View style={[
            styles.messageBox,
            message.includes('✅') || message.includes('📤') 
              ? styles.successBox 
              : styles.errorBox
          ]}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}
        
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={[
              styles.input,
              !loading && styles.inputFocused
            ]}
            placeholder="John Doe"
            value={formData.fullName}
            onChangeText={(text) => handleChange('fullName', text)}
            editable={!loading}
            placeholderTextColor="#999"
          />
        </View>
        
        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={[
              styles.input,
              !loading && styles.inputFocused
            ]}
            placeholder="john@example.com"
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            placeholderTextColor="#999"
          />
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
            loading && styles.buttonDisabled,
            styles.buttonWithIcon
          ]}
          onPress={onSignupPress}
          disabled={loading}
        >
          {loading || uploadingAvatar ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.buttonText}>Create Account</Text>
              <Text style={styles.buttonIcon}>→</Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Terms & Privacy */}
        <Text style={styles.termsText}>
          By signing up, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
        
        {/* Login Link */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    color: '#212529',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#007AFF',
  },
  inputDisabled: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 60,
    backgroundColor: 'white',
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 56,
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 22,
  },
  eyeIconDisabled: {
    opacity: 0.5,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#495057',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genderButton: {
    width: '48%',
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e9ecef',
  },
  genderButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderButtonDisabled: {
    opacity: 0.6,
  },
  genderText: {
    color: '#495057',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  genderTextDisabled: {
    color: '#adb5bd',
  },
  button: {
    height: 58,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonWithIcon: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
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
  termsText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 15,
    color: '#6c757d',
  },
  loginLinkBold: {
    color: '#007AFF',
    fontWeight: '700',
  },
  messageBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#155724',
  },
});