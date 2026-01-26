// src/screens/SignupScreen.tsx
import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Picker
} from 'react-native';
import { useSignupForm } from '../authHook//useSignupForm';

// Simple gender picker for React Native
const GenderPicker = ({ selectedValue, onValueChange }: any) => {
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>Gender:</Text>
      <View style={styles.picker}>
        <TouchableOpacity
          style={[
            styles.genderButton,
            selectedValue === 'male' && styles.genderButtonSelected
          ]}
          onPress={() => onValueChange('male')}
        >
          <Text style={selectedValue === 'male' ? styles.genderTextSelected : styles.genderText}>
            Male
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.genderButton,
            selectedValue === 'female' && styles.genderButtonSelected
          ]}
          onPress={() => onValueChange('female')}
        >
          <Text style={selectedValue === 'female' ? styles.genderTextSelected : styles.genderText}>
            Female
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.genderButton,
            selectedValue === 'other' && styles.genderButtonSelected
          ]}
          onPress={() => onValueChange('other')}
        >
          <Text style={selectedValue === 'other' ? styles.genderTextSelected : styles.genderText}>
            Other
          </Text>
        </TouchableOpacity>
      </View>
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

  const onSignupPress = async () => {
    await handleSubmit();
    
    // If successful, navigate back to login
    if (message.includes('✅')) {
      Alert.alert('Success', 'Account created! Please login.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
        placeholder="Full Name"
        value={formData.fullName}
        onChangeText={(text) => handleChange('fullName', text)}
        editable={!loading}
      />
      
      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
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
      
      {/* Password */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={formData.password}
        onChangeText={(text) => handleChange('password', text)}
        secureTextEntry
        editable={!loading}
      />
      
      {/* Confirm Password */}
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(text) => handleChange('confirmPassword', text)}
        secureTextEntry
        editable={!loading}
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
  pickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
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