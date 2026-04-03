// src/screens/FeedbackScreen.tsx - Fixed Picker visibility in dark mode
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
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFeedback } from '../feedbackHook/useFeedback';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

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
  const { theme, isDark } = useTheme();
  const [type, setType] = useState('GENERAL');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  
  const { submitting, submitFeedback, authError } = useFeedback();

  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [authError]);

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
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Submit Feedback</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Help us improve</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('FeedbackHistory')}
          style={styles.historyButton}
        >
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.historyButtonGradient, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name="history" size={18} color={theme.primary} />
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
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.formCard, { borderColor: theme.border }]}
        >
          {/* Type Picker */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Feedback Type *</Text>
            <View style={[styles.pickerWrapper, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
              <Picker
                selectedValue={type}
                onValueChange={setType}
                style={[styles.picker, { color: theme.text }]}
                dropdownIconColor={theme.primary}
                mode="dropdown"
                prompt="Select feedback type"
              >
                {FEEDBACK_TYPES.map(option => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value} 
                    color={theme.text}
                    style={{ backgroundColor: theme.card, color: theme.text }}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Category Picker */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Category (Optional)</Text>
            <View style={[styles.pickerWrapper, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={[styles.picker, { color: theme.text }]}
                dropdownIconColor={theme.primary}
                mode="dropdown"
                prompt="Select category"
              >
                {CATEGORIES.map(option => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value}
                    color={theme.text}
                    style={{ backgroundColor: theme.card, color: theme.text }}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Spacer between pickers and input */}
          <View style={{ height: 20 }} />

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Your Feedback *</Text>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.messageInputGradient, { borderColor: theme.border }]}
            >
              <TextInput
                style={[styles.messageInput, { color: theme.text, backgroundColor: theme.bgSecondary }]}
                multiline
                numberOfLines={8}
                placeholder="Tell us what you think..."
                placeholderTextColor={theme.textPlaceholder}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
                selectionColor={theme.primary}
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
              colors={submitting ? [theme.bgSecondary, theme.bgTertiary] : [theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.textMuted} />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.note, { color: theme.textMuted }]}>
            Your feedback helps us make the app better for everyone!
          </Text>
        </LinearGradient>

        {/* Quick Tips */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tipsCard, { borderColor: theme.border }]}
        >
          <Text style={[styles.tipsTitle, { color: theme.text }]}>💡 Quick Tips</Text>
          <View style={styles.tipItem}>
            <LinearGradient
              colors={[theme.errorBg, theme.errorBg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.tipIcon, { borderColor: theme.errorBorder }]}
            >
              <MaterialCommunityIcons name="bug" size={16} color={theme.error} />
            </LinearGradient>
            <Text style={[styles.tipText, { color: theme.textSecondary }]}>Report bugs with details of what happened</Text>
          </View>
          <View style={styles.tipItem}>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.tipIcon, { borderColor: theme.primaryBorder }]}
            >
              <MaterialCommunityIcons name="lightbulb" size={16} color={theme.primary} />
            </LinearGradient>
            <Text style={[styles.tipText, { color: theme.textSecondary }]}>Suggest features you'd like to see</Text>
          </View>
          <View style={styles.tipItem}>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.tipIcon, { borderColor: theme.primaryBorder }]}
            >
              <MaterialCommunityIcons name="message" size={16} color={theme.primary} />
            </LinearGradient>
            <Text style={[styles.tipText, { color: theme.textSecondary }]}>Be specific - it helps us understand better</Text>
          </View>
        </LinearGradient>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  historyButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
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
  },
  pickerContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 55,
    justifyContent: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 55,
    width: '100%',
    marginLeft: Platform.OS === 'android' ? -8 : 0,
  },
  pickerItem: {
    fontSize: 16,
    height: 120,
  },
  inputContainer: {
    marginBottom: 20,
  },
  messageInputGradient: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  messageInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    fontSize: 14,
    minHeight: 150,
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
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tipsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});