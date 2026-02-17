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
  Modal
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

  const {
    loading,
    selectedFeedback,
    loadFeedbackDetails,
    updateFeedback,
    deleteFeedback,
    clearSelected
  } = useFeedback();

  useEffect(() => {
    if (!selectedFeedback || selectedFeedback.id !== feedbackId) {
      loadFeedbackDetails(feedbackId);
    }

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
    // Don't allow editing if feedback is resolved or closed
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
      // Refresh details
      loadFeedbackDetails(feedbackId);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading feedback...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedFeedback) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Feedback not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = selectedFeedback.status !== 'RESOLVED' && selectedFeedback.status !== 'CLOSED';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Clean without filter icon */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Details</Text>
        <View style={styles.headerRight}>
          {canEdit && (
            <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
              <MaterialCommunityIcons name="pencil" size={22} color="#007AFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <MaterialCommunityIcons name="delete" size={22} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
            <MaterialCommunityIcons 
              name={getFeedbackIcon(selectedFeedback.type) as any} 
              size={24} 
              color={getFeedbackColor(selectedFeedback.type)} 
            />
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
            <MaterialCommunityIcons name="message" size={24} color="#007AFF" />
            <Text style={styles.detailTitle}>Your Message</Text>
            {canEdit && (
              <TouchableOpacity onPress={handleEdit} style={styles.editMessageButton}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#007AFF" />
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
              <View style={[styles.timelineDot, { backgroundColor: '#34C759' }]} />
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
                <View style={[styles.timelineDot, { backgroundColor: '#007AFF' }]} />
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
                  Status changed to {selectedFeedback.status}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Edit Note for Resolved/Closed */}
        {!canEdit && (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#6c757d" />
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
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
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
                      <Picker.Item key={option.value} label={option.label} value={option.value} />
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
                      <Picker.Item key={option.value} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Message Input */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Your Feedback *</Text>
                <TextInput
                  style={styles.modalInput}
                  multiline
                  numberOfLines={6}
                  value={editMessage}
                  onChangeText={setEditMessage}
                  textAlignVertical="top"
                  editable={!updating}
                />
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
                  <ActivityIndicator size="small" color="#fff" />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6c757d',
    marginTop: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    color: '#6c757d',
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  editMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
  },
  editMessageText: {
    fontSize: 12,
    color: '#007AFF',
  },
  typeText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#e9ecef',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    color: '#495057',
  },
  messageText: {
    fontSize: 16,
    color: '#212529',
    lineHeight: 24,
  },
  timelineCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timelineTitle: {
    fontSize: 16,
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
    width: 12,
    height: 12,
    borderRadius: 6,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: '#6c757d',
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
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6c757d',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  modalBody: {
    padding: 20,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#f8f9fa',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});