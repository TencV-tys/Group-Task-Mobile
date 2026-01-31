// src/screens/CreateGroupScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useCreateGroup } from '../groupHook/useCreateGroup';

export default function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  
  const { loading, message, success, createGroup, reset } = useCreateGroup();

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    console.log('Creating group:', groupName);
    
    const result = await createGroup(groupName.trim(), description.trim() || undefined);
    
    if (result.success) {
      // Show success alert with invite code
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
      // Show error alert
      Alert.alert('Error', result.message || 'Failed to create group');
    }
  };

  const handleCancel = () => {
    reset();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Group</Text>
          <View style={styles.rightSpacer} />
        </View>
        
        {/* Message Display */}
        {message ? (
          <View style={[
            styles.messageBox,
            success ? styles.successBox : styles.errorBox
          ]}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}
        
        {/* Group Name Input */}
        <Text style={styles.label}>Group Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Family, Roommates, Team..."
          value={groupName}
          onChangeText={setGroupName}
          editable={!loading}
          autoFocus
        />
        
        {/* Description Input */}
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What's this group for?"
          value={description}
          onChangeText={setDescription}
          editable={!loading}
          multiline
          numberOfLines={3}
        />
        
        {/* Create Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Create Group</Text>
          )}
        </TouchableOpacity>
        
        {/* Cancel Link */}
        <TouchableOpacity
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.link}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    flex: 1,
  },
  rightSpacer: {
    width: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  button: {
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    shadowOpacity: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#6c757d',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
  },
  messageBox: {
    padding: 14,
    borderRadius: 8,
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
    color: '#155724',
  },
});