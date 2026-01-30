// src/screens/CreateGroupScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView 
} from 'react-native';

export default function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }
    
    console.log('Creating group:', groupName);
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      navigation.goBack();
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create New Group</Text>
        <Text style={styles.subtitle}>Give your group a name to get started</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Family, Roommates, Team..."
          value={groupName}
          onChangeText={setGroupName}
          editable={!loading}
          autoFocus
        />
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Group'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 30,
    backgroundColor: 'white',
    fontSize: 18,
  },
  button: {
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});