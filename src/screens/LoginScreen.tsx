// src/screens/LoginScreen.tsx - UPDATED with clean UI and consistent styling
import React from 'react';
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
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    const result = await handleSubmit();
    
    if (result?.success) {
      // SUCCESS: Navigate to HomeScreen
      Alert.alert('Success', 'Logged in successfully!', [
        { 
          text: 'Continue', 
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        }
      ]);
    } else if (message) {
      // ERROR: Show error message
      Alert.alert('Error', message);
    }
  };

  const handleForgotPassword = () => {
    Linking.openURL('http://192.168.1.29:5000/forgot-password');
  };

  const handleSignUp = () => {
    navigation.navigate('Signup');
  };
 
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to continue to GroupTask</Text>
          </View>
          
          {/* Show message if exists */}
          {message ? (
            <LinearGradient
              colors={message.includes('✅') ? ['#d3f9d8', '#b2f2bb'] : ['#fff5f5', '#ffe3e3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.messageBox}
            >
              <Text style={[
                styles.messageText,
                message.includes('✅') ? styles.successText : styles.errorText
              ]}>
                {message}
              </Text>
            </LinearGradient>
          ) : null}
          
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputGradient}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#adb5bd"
                  value={formData.email}
                  onChangeText={(text) => handleChange('email', text)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </LinearGradient>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputGradient}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#adb5bd"
                  value={formData.password}
                  onChangeText={(text) => handleChange('password', text)}
                  secureTextEntry
                  editable={!loading}
                />
              </LinearGradient>
            </View>
            
            <TouchableOpacity 
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']} // Dark green gradient for button
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>
            
            {/* Sign Up Link */}
            <TouchableOpacity 
              onPress={handleSignUp}
              disabled={loading}
              style={styles.signupContainer}
            >
              <Text style={styles.linkText}>Don't have an account? </Text>
              <Text style={styles.linkBold}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2b8a3e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#868e96',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordLink: {
    color: '#495057',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  button: {
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#868e96',
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    color: '#868e96',
    fontSize: 16,
  },
  linkBold: {
    color: '#2b8a3e',
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  messageBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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