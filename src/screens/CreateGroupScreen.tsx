// src/screens/CreateGroupScreen.tsx - Upgraded with Dark Mode & Performance
import React, { useState, useCallback, useMemo,useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCreateGroup } from '../groupHook/useCreateGroup';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { makeCreateGroupStyles } from '../styles/createGroup.styles';

export default function CreateGroupScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeCreateGroupStyles(theme), [theme]);
  
  const [groupName, setGroupName] = useState(''); 
  const [description, setDescription] = useState('');
  
  const { loading, message, success, createGroup, reset, authError } = useCreateGroup();

  // Auth error handler
  React.useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [authError, navigation]);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    const processedDescription = description && description.trim() ? description.trim() : undefined;
    const result = await createGroup(groupName.trim(), processedDescription);
    
    if (result.success) {
      Alert.alert(
        'Success! 🎉',
        `Group "${groupName}" created successfully!${result.inviteCode ? `\n\nInvite Code: ${result.inviteCode}` : ''}`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              reset();
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      Alert.alert('Error', result.message || 'Failed to create group');
    }
  }, [groupName, description, createGroup, reset, navigation]);

  // Add this useEffect to your CreateGroupScreen
useEffect(() => {
  // Set up a navigation focus listener to refresh the previous screen when we come back
  const unsubscribe = navigation.addListener('blur', () => {
    // When leaving CreateGroup screen, trigger refresh in the previous screen
    const previousRoute = navigation.getState().routes[navigation.getState().index - 1];
    if (previousRoute && previousRoute.params?.refreshGroups) {
      previousRoute.params.refreshGroups();
    }
  });
  
  return unsubscribe;
}, [navigation]);

  const handleCancel = useCallback(() => {
    reset();
    navigation.goBack();
  }, [reset, navigation]);

  const isFormValid = groupName.trim().length > 0;

  return (
    <ScreenWrapper style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={[theme.bg, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={handleCancel}
                disabled={loading}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
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
                <Text style={styles.title}>Create New Group</Text>
              </View>
              
              <View style={styles.rightSpacer} />
            </View>

            <Text style={styles.subtitle}>
              Start a new group to collaborate with your team, family, or friends
            </Text>
            
            {/* Message Display */}
            {message ? (
              <LinearGradient
                colors={success ? [theme.primaryLight, theme.primaryLight] : [theme.errorBg, theme.errorBg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.messageBox, { borderColor: success ? theme.primaryBorder : theme.errorBorder }]}
              >
                <MaterialCommunityIcons 
                  name={success ? "check-circle" : "alert-circle"} 
                  size={20} 
                  color={success ? theme.primary : theme.error} 
                />
                <Text style={[
                  styles.messageText,
                  success ? styles.successText : styles.errorText
                ]}>
                  {message}
                </Text>
              </LinearGradient>
            ) : null}
            
            {/* Group Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Group Name</Text>
              <Text style={styles.required}>* Required</Text>
            </View>
            
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.inputGradient, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="account-group" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Family, Roommates, Team"
                placeholderTextColor={theme.textPlaceholder}
                value={groupName}
                onChangeText={setGroupName}
                editable={!loading}
                autoFocus
                selectionColor={theme.primary}
              />
            </LinearGradient>
            
            {/* Description Input */}
            <View style={[styles.inputContainer, { marginTop: 20 }]}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.optional}>Optional</Text>
            </View>
            
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.inputGradient, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="text" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What's this group for? (e.g., Household chores, Project work)"
                placeholderTextColor={theme.textPlaceholder}
                value={description}
                onChangeText={setDescription}
                editable={!loading}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                selectionColor={theme.primary}
              />
            </LinearGradient>

            {/* Info Card */}
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.infoCard, { borderColor: theme.primaryBorder }]}
            >
              <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
              <Text style={styles.infoText}>
                After creating the group, you'll get an invite code to share with members
              </Text>
            </LinearGradient>
            
            {/* Create Button */}
            <TouchableOpacity
              style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isFormValid ? [theme.primary, theme.primaryDark] : [theme.bgTertiary, theme.border]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name="plus-circle" 
                      size={20} 
                      color={isFormValid ? "#fff" : theme.textMuted} 
                    />
                    <Text style={[
                      styles.buttonText,
                      !isFormValid && styles.buttonTextDisabled
                    ]}>
                      Create Group
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
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