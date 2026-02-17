import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFeedback } from '../feedbackHook/useFeedback';

const FEEDBACK_TYPES = [
  { label: 'Bug Report', value: 'BUG' },
  { label: 'Feature Request', value: 'FEATURE_REQUEST' },
  { label: 'General Feedback', value: 'GENERAL' },
  { label: 'Suggestion', value: 'SUGGESTION' },
  { label: 'Complaint', value: 'COMPLAINT' },
  { label: 'Question', value: 'QUESTION' },
  { label: 'Other', value: 'OTHER' }
];

const CATEGORIES = [
  { label: 'Select category (optional)', value: '' },
  { label: 'UI/UX', value: 'UI' },
  { label: 'Performance', value: 'Performance' },
  { label: 'Tasks', value: 'Task' },
  { label: 'Groups', value: 'Group' },
  { label: 'Authentication', value: 'Auth' },
  { label: 'Other', value: 'Other' }
];

export default function FeedbackScreen({ navigation }: any) {
  const [type, setType] = useState('GENERAL');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  
  const { submitting, submitFeedback } = useFeedback();

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return;
    }

    const result = await submitFeedback({
      type,
      message: message.trim(),
      category: category || undefined
    });

    if (result.success) {
      setMessage('');
      setCategory('');
      setType('GENERAL');
      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Submit Feedback</Text>
          <Text style={styles.subtitle}>Help us improve</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('FeedbackHistory')}
          style={styles.historyButton}
        >
          <MaterialCommunityIcons name="history" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Type Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Feedback Type *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={type}
                onValueChange={setType}
                style={styles.picker}
              >
                {FEEDBACK_TYPES.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Category Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Category (Optional)</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={styles.picker}
              >
                {CATEGORIES.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Your Feedback *</Text>
            <TextInput
              style={styles.messageInput}
              multiline
              numberOfLines={8}
              placeholder="Tell us what you think..."
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            Your feedback helps us make the app better for everyone!
          </Text>
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="bug" size={18} color="#FF3B30" />
            <Text style={styles.tipText}>Report bugs with details of what happened</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="lightbulb" size={18} color="#FF9500" />
            <Text style={styles.tipText}>Suggest features you'd like to see</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="message" size={18} color="#34C759" />
            <Text style={styles.tipText}>Be specific - it helps us understand better</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  historyButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  picker: {
    height: 50,
  },
  inputContainer: {
    marginBottom: 20,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 150,
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
  },
}); 