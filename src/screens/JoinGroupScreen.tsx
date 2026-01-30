// src/screens/JoinGroupScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView 
} from 'react-native';

export default function JoinGroupScreen({ navigation }: any) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = () => {
    if (!inviteCode.trim()) {
      alert('Please enter an invite code');
      return;
    }
    
    console.log('Joining with code:', inviteCode);
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
        <Text style={styles.title}>Join a Group</Text>
        <Text style={styles.subtitle}>Enter the 6-character invite code</Text>
        
        <TextInput
          style={styles.input}
          placeholder="ABC123"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          maxLength={6}
          editable={!loading}
          textAlign="center"
          autoFocus
        />
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Joining...' : 'Join Group'}
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
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  button: {
    height: 56,
    backgroundColor: '#34C759',
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