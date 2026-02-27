// src/screens/FeedbackScreen.tsx - COMPLETELY FIXED with proper picker height
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Submit Feedback</Text>
          <Text style={styles.subtitle}>Help us improve</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('FeedbackHistory')}
          style={styles.historyButton}
        >
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.historyButtonGradient}
          >
            <MaterialCommunityIcons name="history" size={18} color="#2b8a3e" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Card */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.formCard}
        >
          {/* Type Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Feedback Type *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={type}
                onValueChange={setType}
                style={styles.picker}
                dropdownIconColor="#2b8a3e"
                itemStyle={styles.pickerItem}
              >
                {FEEDBACK_TYPES.map(option => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value} 
                    color="#212529"
                  />
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
                dropdownIconColor="#2b8a3e"
                itemStyle={styles.pickerItem}
              >
                {CATEGORIES.map(option => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value}
                    color="#212529"
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Spacer between pickers and input */}
          <View style={{ height: 20 }} />

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Your Feedback *</Text>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.messageInputGradient}
            >
              <TextInput
                style={styles.messageInput}
                multiline
                numberOfLines={8}
                placeholder="Tell us what you think..."
                placeholderTextColor="#adb5bd"
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />
            </LinearGradient>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <LinearGradient
              colors={submitting ? ['#f8f9fa', '#e9ecef'] : ['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#495057" />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={18} color="white" />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.note}>
            Your feedback helps us make the app better for everyone!
          </Text>
        </LinearGradient>

        {/* Quick Tips */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipsCard}
        >
          <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
          <View style={styles.tipItem}>
            <LinearGradient
              colors={['#fff5f5', '#ffe3e3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tipIcon}
            >
              <MaterialCommunityIcons name="bug" size={16} color="#fa5252" />
            </LinearGradient>
            <Text style={styles.tipText}>Report bugs with details of what happened</Text>
          </View>
          <View style={styles.tipItem}>
            <LinearGradient
              colors={['#fff3bf', '#ffec99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tipIcon}
            >
              <MaterialCommunityIcons name="lightbulb" size={16} color="#e67700" />
            </LinearGradient>
            <Text style={styles.tipText}>Suggest features you'd like to see</Text>
          </View>
          <View style={styles.tipItem}>
            <LinearGradient
              colors={['#d3f9d8', '#b2f2bb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tipIcon}
            >
              <MaterialCommunityIcons name="message" size={16} color="#2b8a3e" />
            </LinearGradient>
            <Text style={styles.tipText}>Be specific - it helps us understand better</Text>
          </View>
        </LinearGradient>
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
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  subtitle: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2,
  },
  historyButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  historyButtonGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#adb5bd',
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerWrapper: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 55,
    justifyContent: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 55,
    width: '100%',
    color: '#212529',
    marginLeft: Platform.OS === 'android' ? -8 : 0,
  },
  pickerItem: {
    fontSize: 16,
    height: 120,
    color: '#212529',
  },
  inputContainer: {
    marginBottom: 20,
  },
  messageInputGradient: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    overflow: 'hidden',
  },
  messageInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    fontSize: 14,
    minHeight: 150,
    color: '#212529',
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    fontSize: 11,
    color: '#868e96',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tipsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
    lineHeight: 18,
  },
});