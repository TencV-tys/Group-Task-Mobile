 // src/screens/SignupScreen.tsx
import React, { useState } from 'react'; // Add useState
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useSignupForm } from '../authHook/useSignupForm';

// Gender options that match your backend enum
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
];

// Simple gender picker for React Native
const GenderPicker = ({ selectedValue, onValueChange }: any) => {
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>Gender *</Text>
      <View style={styles.pickerRow}>
        {GENDER_OPTIONS.map((gender) => (
          <TouchableOpacity
            key={gender.value}
            style={[
              styles.genderButton,
              selectedValue === gender.value && styles.genderButtonSelected
            ]}
            onPress={() => onValueChange(gender.value)}
          >
            <Text style={selectedValue === gender.value ? styles.genderTextSelected : styles.genderText}>
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
        style={styles.passwordInput}
        placeholder={placeholder}
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
        <Text style={styles.eyeIcon}>
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
    handleChange,
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
        Alert.alert('Success', 'Account created successfully!', [
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
        Alert.alert('Error', result.message || 'Signup failed');
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create Account</Text>
      
      {/* Message display */}
      {message ? (
        <View style={[
          styles.messageBox,
          message.includes('✅') ? styles.successBox : styles.errorBox
        ]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}
      
      {/* Full Name */}
      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        value={formData.fullName}
        onChangeText={(text) => handleChange('fullName', text)}
        editable={!loading}
      />
      
      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email *"
        value={formData.email}
        onChangeText={(text) => handleChange('email', text)}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      
      {/* Gender Picker */}
      <GenderPicker
        selectedValue={formData.gender}
        onValueChange={(value: string) => handleChange('gender', value)}
      />
      
      {/* Password with Eye Icon */}
      <PasswordInput
        placeholder="Password (min 6 characters) *"
        value={formData.password}
        onChangeText={(text) => handleChange('password', text)}
        editable={!loading}
        showPassword={showPassword}
        togglePasswordVisibility={() => setShowPassword(!showPassword)}
      />
      
      {/* Confirm Password with Eye Icon */}
      <PasswordInput
        placeholder="Confirm Password *"
        value={formData.confirmPassword}
        onChangeText={(text) => handleChange('confirmPassword', text)}
        editable={!loading}
        showPassword={showConfirmPassword}
        togglePasswordVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
      />
      
      {/* Signup Button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={onSignupPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>
      
      {/* Login Link */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
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
  passwordContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingRight: 50, // Space for eye icon
    backgroundColor: 'white',
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genderButton: {
    width: '48%', // Two per row
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  genderButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    color: '#666',
  },
  genderTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  button: {
    height: 50,
    backgroundColor: '#34C759',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    marginTop: 10,
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
  },
  messageBox: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
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
  },
});