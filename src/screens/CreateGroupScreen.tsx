// src/screens/CreateGroupScreen.tsx - UPDATED with clean, user-friendly UI
import React, { useState, useEffect } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCreateGroup } from '../groupHook/useCreateGroup';
import { ScreenWrapper } from '../components/ScreenWrapper';
export default function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState(''); 
  const [description, setDescription] = useState('');
  
  const { loading, message, success, createGroup, reset } = useCreateGroup();

  const { authError } = useCreateGroup();

useEffect(() => {
  if (authError) {
    Alert.alert(
      'Session Expired',
      'Please log in again',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    );
  }
}, [authError]);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    console.log('Creating group:', groupName);
    
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
  };
  
  const handleCancel = () => {
    reset();
    navigation.goBack();
  };

  return (
    <ScreenWrapper style={styles.container}>
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
                colors={success ? ['#d3f9d8', '#b2f2bb'] : ['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.messageBox}
              >
                <MaterialCommunityIcons 
                  name={success ? "check-circle" : "alert-circle"} 
                  size={20} 
                  color={success ? "#2b8a3e" : "#fa5252"} 
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
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputGradient}
            >
              <MaterialCommunityIcons name="account-group" size={20} color="#868e96" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Family, Roommates, Team"
                placeholderTextColor="#adb5bd"
                value={groupName}
                onChangeText={setGroupName}
                editable={!loading}
                autoFocus
              />
            </LinearGradient>
            
            {/* Description Input */}
            <View style={[styles.inputContainer, { marginTop: 20 }]}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.optional}>Optional</Text>
            </View>
            
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputGradient}
            >
              <MaterialCommunityIcons name="text" size={20} color="#868e96" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What's this group for? (e.g., Household chores, Project work)"
                placeholderTextColor="#adb5bd"
                value={description}
                onChangeText={setDescription}
                editable={!loading}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </LinearGradient>

            {/* Info Card */}
            <LinearGradient
              colors={['#e7f5ff', '#d0ebff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoCard}
            >
              <MaterialCommunityIcons name="information" size={20} color="#2b8a3e" />
              <Text style={styles.infoText}>
                After creating the group, you'll get an invite code to share with members
              </Text>
            </LinearGradient>
            
            {/* Create Button */}
            <TouchableOpacity
              style={[styles.button, (!groupName.trim() || loading) && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={!groupName.trim() || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={groupName.trim() ? ['#2b8a3e', '#1e6b2c'] : ['#e9ecef', '#dee2e6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="plus-circle" size={20} color={groupName.trim() ? "white" : "#868e96"} />
                    <Text style={[
                      styles.buttonText,
                      !groupName.trim() && styles.buttonTextDisabled
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
  content: {
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
  },
  rightSpacer: {
    width: 44,
  },
  subtitle: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  required: {
    fontSize: 12,
    color: '#fa5252',
    fontWeight: '500',
  },
  optional: {
    fontSize: 12,
    color: '#868e96',
    fontWeight: '500',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#212529',
    backgroundColor: 'transparent',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2b8a3e',
    lineHeight: 18,
  },
  button: {
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    height: 52,
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
  messageText: {
    flex: 1,
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