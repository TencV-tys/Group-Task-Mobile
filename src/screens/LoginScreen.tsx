// src/screens/LoginScreen.tsx
import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useLoginForm } from '../authHook/useLoginForm';

export default function LoginScreen({ navigation }: any) {
  const {
    formData, 
    loading,
    message,
    handleChange,
    handleSubmit
  } = useLoginForm();

  const handleLogin = async () => {
    await handleSubmit();
    
    // If success, navigate to dashboard
    // You would check a global state here (like Redux or Context)
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      {/* Show message if exists */}
      {message ? (
        <View style={[
          styles.messageBox, 
          message.includes('✅') ? styles.successBox : styles.errorBox
        ]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={formData.email}
        onChangeText={(text) => handleChange('email', text)}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={formData.password}
        onChangeText={(text) => handleChange('password', text)}
        secureTextEntry
        editable={!loading}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => navigation.navigate('Signup')}
        disabled={loading}
      >
        <Text style={styles.link}>Need an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
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
  button: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
    marginTop: 20,
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
  },
  messageBox: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
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