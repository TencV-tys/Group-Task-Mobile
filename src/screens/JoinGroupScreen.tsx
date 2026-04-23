// src/screens/JoinGroupScreen.tsx - Upgraded with Dark Mode & Performance
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
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
import { useTheme } from '../context/ThemeContext';
import { makeJoinGroupStyles } from '../styles/joinGroup.styles';

export default function JoinGroupScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeJoinGroupStyles(theme), [theme]);
  
  const [inviteCode, setInviteCode] = useState('');
  const { loading, error, success, joinedGroup, joinGroup, reset, authError } = useJoinGroup();
  
  const onGroupJoined = route.params?.onGroupJoined;

  // Auth error handler
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [authError, navigation]);

  // Handle success
  useEffect(() => {
    if (success && joinedGroup) {
      Alert.alert(
        'Success! 🎉',
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

  const handleJoin = useCallback(async () => {
    reset();
    
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (inviteCode.trim().length !== 6) {
      Alert.alert('Error', 'Invite code must be 6 characters');
      return;
    }

    await joinGroup(inviteCode);
  }, [inviteCode, reset, joinGroup]);

  const handleCancel = useCallback(() => {
    reset();
    navigation.goBack();
  }, [reset, navigation]);

  const handleCodeChange = useCallback((text: string) => {
    setInviteCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  }, []);

  const isCodeValid = inviteCode.length === 6;

  return (
    <ScreenWrapper style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={[theme.bg, theme.bgSecondary]}
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
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={theme.primary} />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIcon}
                >
                  <MaterialCommunityIcons name="account-group" size={24} color="#fff" />
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
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.inputGradient,
                  { borderColor: theme.border },
                  error && !success && styles.inputError,
                  success && styles.inputSuccess
                ]}
              >
                <MaterialCommunityIcons name="key" size={20} color={theme.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-character code"
                  placeholderTextColor={theme.textPlaceholder}
                  value={inviteCode}
                  onChangeText={handleCodeChange}
                  autoCapitalize="characters"
                  maxLength={6}
                  editable={!loading}
                  autoFocus
                  selectionColor={theme.primary}
                />
              </LinearGradient>
              
              <View style={styles.codeHint}>
                <MaterialCommunityIcons 
                  name={isCodeValid ? "check-circle" : "information"} 
                  size={16} 
                  color={isCodeValid ? theme.primary : theme.textMuted} 
                />
                <Text style={[
                  styles.codeHintText,
                  isCodeValid && styles.codeHintValid
                ]}>
                  {isCodeValid 
                    ? "Code length valid" 
                    : `${inviteCode.length}/6 characters`}
                </Text>
              </View>
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[styles.button, (loading || !isCodeValid) && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={loading || !isCodeValid}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isCodeValid ? [theme.primary, theme.primaryDark] : [theme.bgTertiary, theme.border]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name={isCodeValid ? "login" : "lock"} 
                      size={20} 
                      color={isCodeValid ? "#fff" : theme.textMuted} 
                    />
                    <Text style={[
                      styles.buttonText,
                      !isCodeValid && styles.buttonTextDisabled
                    ]}>
                      {isCodeValid ? 'Join Group' : 'Enter Complete Code'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Info Card */}
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.infoCard, { borderColor: theme.primaryBorder }]}
            >
              <MaterialCommunityIcons name="help-circle" size={20} color={theme.primary} />
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
                colors={[theme.errorBg, theme.errorBg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.messageBox, { borderColor: theme.errorBorder }]}
              >
                <MaterialCommunityIcons name="alert-circle" size={20} color={theme.error} />
                <Text style={styles.errorText}>{error}</Text>
              </LinearGradient>
            )}

            {success && (
              <LinearGradient
                colors={[theme.primaryLight, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.messageBox, { borderColor: theme.primaryBorder }]}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.primary} />
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
              activeOpacity={0.6}
            >
              <Text style={styles.link}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}