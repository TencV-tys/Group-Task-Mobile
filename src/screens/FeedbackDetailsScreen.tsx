// src/screens/FeedbackDetailsScreen.tsx - FIXED update issue
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
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
  { label: 'None', value: '' },
  { label: 'UI/UX', value: 'UI' },
  { label: 'Performance', value: 'Performance' },
  { label: 'Tasks', value: 'Task' },
  { label: 'Groups', value: 'Group' },
  { label: 'Authentication', value: 'Auth' },
  { label: 'Other', value: 'Other' }
];

export default function FeedbackDetailsScreen({ navigation, route }: any) {
  const { feedbackId } = route.params;
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const {
    loading,
    selectedFeedback,
    loadFeedbackDetails,
    updateFeedback,
    deleteFeedback,
    clearSelected
  } = useFeedback();

  useEffect(() => {
    loadFeedbackDetails(feedbackId);

    return () => {
      clearSelected();
    };
  }, [feedbackId]);

  // Initialize edit form when feedback loads
  useEffect(() => {
    if (selectedFeedback) {
      setEditType(selectedFeedback.type);
      setEditCategory(selectedFeedback.category || '');
      setEditMessage(selectedFeedback.message);
    }
  }, [selectedFeedback]);

  const handleDelete = () => {  
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFeedback(feedbackId).then((deleted: boolean) => {
              if (deleted) {
                navigation.goBack();
              }
            });
          }
        }
      ]
    );
  };

  const handleEdit = () => {
    if (selectedFeedback?.status === 'RESOLVED' || selectedFeedback?.status === 'CLOSED') {
      Alert.alert(
        'Cannot Edit',
        'This feedback is already resolved or closed and cannot be edited.'
      );
      return;
    }
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editMessage.trim()) {
      Alert.alert('Error', 'Feedback message cannot be empty');
      return;
    }

    setUpdating(true);
    const result = await updateFeedback(feedbackId, {
      type: editType,
      message: editMessage.trim(),
      category: editCategory || null
    });

    setUpdating(false);
    if (result.success) {
      setEditModalVisible(false);
      // Show loading while refreshing
      setLocalLoading(true);
      await loadFeedbackDetails(feedbackId);
      setLocalLoading(false);
    }
  };

  // Show loading state
  if (loading || localLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>
            {localLoading ? 'Updating feedback...' : 'Loading feedback...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedFeedback) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#fa5252" />
          <Text style={styles.errorText}>Feedback not found</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadFeedbackDetails(feedbackId)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = selectedFeedback.status !== 'RESOLVED' && selectedFeedback.status !== 'CLOSED';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Details</Text>
        <View style={styles.headerRight}>
          {canEdit && (
            <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconButtonGradient}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#495057" />
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <LinearGradient
              colors={['#fff5f5', '#ffe3e3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.iconButtonGradient, styles.deleteButtonGradient]}
            >
              <MaterialCommunityIcons name="delete" size={18} color="#fa5252" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedFeedback.status) }]}>
            <Text style={styles.statusText}>{selectedFeedback.status}</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(selectedFeedback.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Type Card */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailIcon, { backgroundColor: '#f1f3f5' }]}>
              <MaterialCommunityIcons 
                name={getFeedbackIcon(selectedFeedback.type) as any} 
                size={20} 
                color={getFeedbackColor(selectedFeedback.type)} 
              />
            </View>
            <Text style={styles.detailTitle}>Feedback Type</Text>
          </View>
          <Text style={styles.typeText}>{selectedFeedback.type.replace('_', ' ')}</Text>
          {selectedFeedback.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{selectedFeedback.category}</Text>
            </View>
          )}
        </View>

        {/* Message Card */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailIcon, { backgroundColor: '#f1f3f5' }]}>
              <MaterialCommunityIcons name="message" size={20} color="#495057" />
            </View>
            <Text style={styles.detailTitle}>Your Message</Text>
            {canEdit && (
              <TouchableOpacity onPress={handleEdit} style={styles.editMessageButton}>
                <MaterialCommunityIcons name="pencil" size={16} color="#495057" />
                <Text style={styles.editMessageText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.messageText}>{selectedFeedback.message}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Timeline</Text>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: '#2b8a3e' }]} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineEvent}>Feedback Submitted</Text>
              <Text style={styles.timelineDate}>
                {new Date(selectedFeedback.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>

          {selectedFeedback.updatedAt !== selectedFeedback.createdAt && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: '#495057' }]} />
              </View>
              <View style={styles.timelineRight}>
                <Text style={styles.timelineEvent}>Last Updated</Text>
                <Text style={styles.timelineDate}>
                  {new Date(selectedFeedback.updatedAt).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {selectedFeedback.status !== 'OPEN' && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(selectedFeedback.status) }]} />
              </View>
              <View style={styles.timelineRight}>
                <Text style={styles.timelineEvent}>Status Updated</Text>
                <Text style={styles.timelineDate}>
                  Changed to {selectedFeedback.status}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Edit Note for Resolved/Closed */}
        {!canEdit && (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#868e96" />
            <Text style={styles.infoText}>
              This feedback is {selectedFeedback.status.toLowerCase()} and cannot be edited.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Feedback</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={22} color="#868e96" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type Picker */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Feedback Type *</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={editType}
                    onValueChange={setEditType}
                    style={styles.picker}
                    enabled={!updating}
                  >
                    {FEEDBACK_TYPES.map(option => (
                      <Picker.Item 
                        key={option.value} 
                        label={option.label} 
                        value={option.value} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Category Picker */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Category (Optional)</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={editCategory}
                    onValueChange={setEditCategory}
                    style={styles.picker}
                    enabled={!updating}
                  >
                    {CATEGORIES.map(option => (
                      <Picker.Item 
                        key={option.value} 
                        label={option.label} 
                        value={option.value} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Message Input */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Your Feedback *</Text>
                <View style={styles.modalInputWrapper}>
                  <TextInput
                    style={styles.modalInput}
                    multiline
                    numberOfLines={6}
                    value={editMessage}
                    onChangeText={setEditMessage}
                    textAlignVertical="top"
                    editable={!updating}
                    placeholder="Enter your feedback..."
                    placeholderTextColor="#adb5bd"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={updating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, updating && styles.buttonDisabled]}
                onPress={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    'BUG': '#fa5252',
    'FEATURE_REQUEST': '#e67700',
    'GENERAL': '#2b8a3e',
    'SUGGESTION': '#4F46E5',
    'COMPLAINT': '#fa5252',
    'QUESTION': '#2b8a3e',
    'OTHER': '#868e96'
  };
  return colors[type] || '#2b8a3e';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'OPEN': '#e67700',
    'IN_PROGRESS': '#2b8a3e',
    'RESOLVED': '#2b8a3e',
    'CLOSED': '#868e96'
  };
  return colors[status] || '#868e96';
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  iconButtonGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  deleteButtonGradient: {
    borderColor: '#ffc9c9',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#868e96',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: '#868e96',
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  editMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f1f3f5',
    borderRadius: 16,
  },
  editMessageText: {
    fontSize: 12,
    color: '#495057',
  },
  typeText: {
    fontSize: 16,
    color: '#2b8a3e',
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    color: '#495057',
  },
  messageText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 22,
  },
  timelineCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e9ecef',
    marginTop: 4,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 12,
  },
  timelineEvent: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#868e96',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 6,
  },
  pickerWrapper: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 48,
    color: '#212529',
  },
  modalInputWrapper: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    color: '#212529',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#2b8a3e',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});