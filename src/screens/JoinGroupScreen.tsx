// src/screens/JoinGroupScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useJoinGroup } from '../groupHook/useJoinGroup';

export default function JoinGroupScreen({ navigation, route }: any) {
  const [inviteCode, setInviteCode] = useState('');
  const { loading, error, success, joinedGroup, joinGroup, reset } = useJoinGroup();
  
  // Get callback from navigation params
  const onGroupJoined = route.params?.onGroupJoined;

  // Handle success
  useEffect(() => {
    if (success && joinedGroup) {
      // Show success message
      Alert.alert(
        'Success!',
        `You've joined "${joinedGroup.name || 'the group'}" successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Notify parent screen if callback exists
              if (onGroupJoined) {
                onGroupJoined({
                  ...joinedGroup,
                  userRole: 'MEMBER',
                  joinedAt: new Date().toISOString()
                });
              }
              
              // Go back to previous screen
              setTimeout(() => {
                navigation.goBack();
              }, 300);
            }
          }
        ]
      );
    }
  }, [success, joinedGroup, onGroupJoined, navigation]);

  // Handle errors
  useEffect(() => {
    if (error && !success) {
      Alert.alert('Error', error, [{ text: 'OK' }]);
    }
  }, [error, success]);

  const handleJoin = async () => {
    // Reset any previous state
    reset();
    
    // Validate
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (inviteCode.trim().length !== 6) {
      Alert.alert('Error', 'Invite code must be 6 characters');
      return;
    }

    // Call joinGroup hook
    const result = await joinGroup(inviteCode);
    
    // If successful, the useEffect above will handle navigation
    if (!result.success) {
      // Error is already set in the hook, Alert will show via useEffect
      console.log('Join failed:', result.message);
    }
  };

  const handleCancel = () => {
    reset();
    navigation.goBack();
  };

  // Auto-uppercase input
  const handleCodeChange = (text: string) => {
    setInviteCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={handleCancel}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Join Group</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>👥</Text>
              </View>
            </View>

            <Text style={styles.title}>Enter Invite Code</Text>
            <Text style={styles.subtitle}>
              Ask your group admin for the 6-character invite code
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  error && !success && styles.inputError,
                  success && styles.inputSuccess
                ]}
                placeholder="ABCD12"
                placeholderTextColor="#adb5bd"
                value={inviteCode}
                onChangeText={handleCodeChange}
                autoCapitalize="characters"
                maxLength={6}
                editable={!loading}
                textAlign="center"
                autoFocus
                selectTextOnFocus
              />
              <Text style={styles.inputLabel}>
                {inviteCode.length}/6 characters
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                loading && styles.buttonDisabled,
                success && styles.buttonSuccess
              ]}
              onPress={handleJoin}
              disabled={loading || inviteCode.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : success ? (
                <Text style={styles.buttonText}>✓ Joined!</Text>
              ) : (
                <Text style={styles.buttonText}>
                  {inviteCode.length === 6 ? 'Join Group' : 'Enter 6-digit Code'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Where to find invite code?</Text>
              <Text style={styles.infoText}>
                • Ask the group admin{'\n'}
                • Check group invitation message{'\n'}
                • Look for 6-character code (e.g., ABCD12)
              </Text>
            </View>

            {error && !success && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.successText}>
                  Success! You've joined {joinedGroup?.name || 'the group'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#495057',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 30,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#bbdefb',
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    height: 60,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: '#212529',
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  inputSuccess: {
    borderColor: '#51cf66',
    backgroundColor: '#ebfbee',
  },
  inputLabel: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    height: 56,
    backgroundColor: '#4263eb',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#4263eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
  },
  buttonSuccess: {
    backgroundColor: '#51cf66',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffc9c9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#fa5252',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebfbee',
    borderWidth: 1,
    borderColor: '#b2f2bb',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#2b8a3e',
    fontWeight: '500',
  },
});