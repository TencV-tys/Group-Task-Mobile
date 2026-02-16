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
  RefreshControl
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

export default function FeedbackScreen({ navigation,route }: any) {
  const [type, setType] = useState('GENERAL');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const {
    submitting,
    loading,
    feedbackList,
    stats,
    submitFeedback,
    loadFeedback,
    loadStats
  } = useFeedback();

useEffect(() => {
  loadStats();
  
  // Check if we should show history directly
  if (route.params?.showHistory) {
    setShowHistory(true);
  }
}, [route.params?.showHistory]);

  useEffect(() => {
    if (showHistory) {
      loadFeedback();
    }
  }, [showHistory]);

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
      loadStats(); // Refresh stats
    }
  };

  const handleViewHistory = () => {
    setShowHistory(!showHistory);
  };

  const handleFeedbackPress = (feedbackId: string) => {
    navigation.navigate('FeedbackDetails', { feedbackId });
  };

  if (showHistory) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setShowHistory(false)}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>My Feedback</Text>
            <Text style={styles.subtitle}>History</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => loadFeedback()}
            disabled={loading}
            style={styles.refreshButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={24} color="#007AFF" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => loadFeedback()} />
          }
          contentContainerStyle={styles.historyContent}
        >
          {feedbackList.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="message-text-outline" size={64} color="#dee2e6" />
              <Text style={styles.emptyStateText}>No feedback yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Your submitted feedback will appear here
              </Text>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={() => setShowHistory(false)}
              >
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          ) : (
            feedbackList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.feedbackCard}
                onPress={() => handleFeedbackPress(item.id)}
              >
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackTypeContainer}>
                    <MaterialCommunityIcons 
                      name={getFeedbackIcon(item.type) as any} 
                      size={20} 
                      color={getFeedbackColor(item.type)} 
                    />
                    <Text style={styles.feedbackType}>{item.type.replace('_', ' ')}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) }
                  ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>

                <Text style={styles.feedbackMessage} numberOfLines={2}>
                  {item.message}
                </Text>

                <View style={styles.feedbackFooter}>
                  {item.category && (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                  )}
                  <Text style={styles.feedbackDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Feedback</Text>
          <Text style={styles.subtitle}>Help us improve</Text>
        </View>
        
        <TouchableOpacity 
          onPress={handleViewHistory}
          style={styles.historyButton}
        >
          <MaterialCommunityIcons name="history" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>{stats.open || 0}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.resolved || 0}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>
        )}

        {/* Feedback Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Submit Feedback</Text>
          
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

          {/* Category Picker (Optional) */}
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
              numberOfLines={6}
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

// Helper functions
const getFeedbackIcon = (type: string) => {
  const icons: Record<string, string> = {
    'BUG': 'bug',
    'FEATURE_REQUEST': 'lightbulb',
    'GENERAL': 'message',
    'SUGGESTION': 'lightbulb-outline',
    'COMPLAINT': 'alert-circle',
    'QUESTION': 'help-circle',
    'OTHER': 'dots-horizontal'
  };
  return icons[type] || 'message';
};

const getFeedbackColor = (type: string) => {
  const colors: Record<string, string> = {
    'BUG': '#FF3B30',
    'FEATURE_REQUEST': '#FF9500',
    'GENERAL': '#007AFF',
    'SUGGESTION': '#5856D6',
    'COMPLAINT': '#FF3B30',
    'QUESTION': '#34C759',
    'OTHER': '#8E8E93'
  };
  return colors[type] || '#007AFF';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'OPEN': '#FF9500',
    'IN_PROGRESS': '#007AFF',
    'RESOLVED': '#34C759',
    'CLOSED': '#8E8E93'
  };
  return colors[status] || '#8E8E93';
};

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
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
  },
  content: {
    padding: 16,
  },
  historyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
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
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20,
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
    minHeight: 120,
    backgroundColor: '#f8f9fa',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  feedbackCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 12,
    lineHeight: 20,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    color: '#495057',
  },
  feedbackDate: {
    fontSize: 11,
    color: '#adb5bd',
  },
});