// src/screens/JoinGroupScreen.tsx - UPDATED with clean UI
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useJoinGroup } from '../groupHook/useJoinGroup';
import { ScreenWrapper } from '../components/ScreenWrapper';
export default function JoinGroupScreen({ navigation, route }: any) {
  const [inviteCode, setInviteCode] = useState('');
  const { loading, error, success, joinedGroup, joinGroup, reset } = useJoinGroup();
  
  // Get callback from navigation params
  const onGroupJoined = route.params?.onGroupJoined;

  // Handle success
  useEffect(() => {
    if (success && joinedGroup) {
      Alert.alert(
        'Success!',
        `You've joined "${joinedGroup.name || 'the group'}" successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onGroupJoined) {
                onGroupJoined({
                  ...joinedGroup,
                  userRole: 'MEMBER',
                  joinedAt: new Date().toISOString()
                });
              }
              
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
    reset();
    
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (inviteCode.trim().length !== 6) {
      Alert.alert('Error', 'Invite code must be 6 characters');
      return;
    }

    const result = await joinGroup(inviteCode);
    
    if (!result.success) {
      console.log('Join failed:', result.message);
    }
  };

  const handleCancel = () => {
    reset();
    navigation.goBack();
  };

  const handleCodeChange = (text: string) => {
    setInviteCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  };

  return (
    <ScreenWrapper style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={handleCancel}
                style={styles.backButton}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIcon}
                >
                  <MaterialCommunityIcons name="account-group" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.headerTitle}>Join Group</Text>
              </View>
              
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.subtitle}>
              Enter the invite code shared by your group admin
            </Text>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.inputGradient,
                  error && !success && styles.inputError,
                  success && styles.inputSuccess
                ]}
              >
                <MaterialCommunityIcons name="key" size={20} color="#868e96" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-character code"
                  placeholderTextColor="#adb5bd"
                  value={inviteCode}
                  onChangeText={handleCodeChange}
                  autoCapitalize="characters"
                  maxLength={6}
                  editable={!loading}
                  autoFocus
                />
              </LinearGradient>
              
              <View style={styles.codeHint}>
                <MaterialCommunityIcons 
                  name={inviteCode.length === 6 ? "check-circle" : "information"} 
                  size={16} 
                  color={inviteCode.length === 6 ? "#2b8a3e" : "#868e96"} 
                />
                <Text style={[
                  styles.codeHintText,
                  inviteCode.length === 6 && styles.codeHintValid
                ]}>
                  {inviteCode.length === 6 
                    ? "Code length valid" 
                    : `${inviteCode.length}/6 characters`}
                </Text>
              </View>
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={loading || inviteCode.length !== 6}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={inviteCode.length === 6 ? ['#2b8a3e', '#1e6b2c'] : ['#e9ecef', '#dee2e6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name={inviteCode.length === 6 ? "login" : "lock"} 
                      size={20} 
                      color={inviteCode.length === 6 ? "white" : "#868e96"} 
                    />
                    <Text style={[
                      styles.buttonText,
                      inviteCode.length !== 6 && styles.buttonTextDisabled
                    ]}>
                      {inviteCode.length === 6 ? 'Join Group' : 'Enter Complete Code'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Info Card */}
            <LinearGradient
              colors={['#e7f5ff', '#d0ebff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoCard}
            >
              <MaterialCommunityIcons name="help-circle" size={20} color="#2b8a3e" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Where to find the code?</Text>
                <View style={styles.infoBullets}>
                  <View style={styles.bulletItem}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>Ask the group admin</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>Check your invitation message</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>Look for 6-character code (e.g., ABC123)</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Status Messages */}
            {error && !success && (
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.messageBox}
              >
                <MaterialCommunityIcons name="alert-circle" size={20} color="#fa5252" />
                <Text style={styles.errorText}>{error}</Text>
              </LinearGradient>
            )}

            {success && (
              <LinearGradient
                colors={['#d3f9d8', '#b2f2bb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.messageBox}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color="#2b8a3e" />
                <Text style={styles.successText}>
                  Success! You've joined {joinedGroup?.name || 'the group'}
                </Text>
              </LinearGradient>
            )}

            {/* Cancel Link */}
            <TouchableOpacity
              onPress={handleCancel}
              disabled={loading}
              style={styles.cancelContainer}
            >
              <Text style={styles.link}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </ScreenWrapper>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  subtitle: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 60,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#212529',
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: '#fa5252',
    backgroundColor: '#fff5f5',
  },
  inputSuccess: {
    borderColor: '#2b8a3e',
    backgroundColor: '#f0f9f0',
  },
  codeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  codeHintText: {
    fontSize: 12,
    color: '#868e96',
  },
  codeHintValid: {
    color: '#2b8a3e',
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    marginBottom: 24,
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
    shadowOpacity: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonTextDisabled: {
    color: '#868e96',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 8,
  },
  infoBullets: {
    gap: 6,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulletDot: {
    fontSize: 14,
    color: '#2b8a3e',
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
    lineHeight: 18,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#fa5252',
    lineHeight: 20,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#2b8a3e',
    fontWeight: '500',
    lineHeight: 20,
  },
  cancelContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  link: {
    color: '#868e96',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
});