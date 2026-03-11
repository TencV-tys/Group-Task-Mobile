// src/components/ReportModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const REPORT_REASONS = [
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content', icon: 'alert-octagon' },
  { value: 'HARASSMENT', label: 'Harassment or Bullying', icon: 'account-alert' },
  { value: 'SPAM', label: 'Spam', icon: 'email-alert' },
  { value: 'OFFENSIVE_BEHAVIOR', label: 'Offensive Behavior', icon: 'emoticon-angry' },
  { value: 'TASK_ABUSE', label: 'Task Abuse', icon: 'clipboard-alert' },
  { value: 'GROUP_MISUSE', label: 'Group Misuse', icon: 'account-group' },
  { value: 'OTHER', label: 'Other', icon: 'dots-horizontal' },
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSubmit: (data: { type: string; description: string }) => Promise<void>;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  groupId,
  groupName,
  onSubmit
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'reason' | 'description'>('reason');

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }
    if (step === 'reason') {
      setStep('description');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ type: selectedReason, description });
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We will review your report.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    setStep('reason');
    onClose();
  };

  const handleBack = () => {
    setStep('reason');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {step === 'description' && (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color="#495057" />
                </TouchableOpacity>
              )}
              <LinearGradient
                colors={['#fa5252', '#e03131']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <MaterialCommunityIcons name="flag" size={18} color="white" />
              </LinearGradient>
              <Text style={styles.headerTitle}>Report Group</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color="#868e96" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.groupNameText}>{groupName}</Text>
            
            {step === 'reason' ? (
              <>
                <Text style={styles.sectionTitle}>Why are you reporting this group?</Text>
                <Text style={styles.sectionSubtitle}>
                  Your report is anonymous. We'll review it and take appropriate action.
                </Text>

                <View style={styles.reasonsContainer}>
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.value}
                      style={[
                        styles.reasonCard,
                        selectedReason === reason.value && styles.reasonCardSelected
                      ]}
                      onPress={() => setSelectedReason(reason.value)}
                    >
                      <LinearGradient
                        colors={selectedReason === reason.value 
                          ? ['#fa5252', '#e03131'] 
                          : ['#f8f9fa', '#e9ecef']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.reasonIcon,
                          selectedReason === reason.value && styles.reasonIconSelected
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name={reason.icon as any} 
                          size={18} 
                          color={selectedReason === reason.value ? 'white' : '#495057'} 
                        />
                      </LinearGradient>
                      <Text style={[
                        styles.reasonText,
                        selectedReason === reason.value && styles.reasonTextSelected
                      ]}>
                        {reason.label}
                      </Text>
                      {selectedReason === reason.value && (
                        <MaterialCommunityIcons name="check-circle" size={20} color="#fa5252" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.selectedReasonBanner}>
                  <LinearGradient
                    colors={['#fa5252', '#e03131']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.selectedReasonBadge}
                  >
                    <Text style={styles.selectedReasonText}>
                      {REPORT_REASONS.find(r => r.value === selectedReason)?.label}
                    </Text>
                  </LinearGradient>
                  <Text style={styles.selectedReasonHint}>
                    Please provide more details
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.inputGradient}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="Describe the issue in detail..."
                      placeholderTextColor="#adb5bd"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                  </LinearGradient>
                  <Text style={styles.charCount}>
                    {description.length}/500 characters
                  </Text>
                </View>

                <LinearGradient
                  colors={['#fff5f5', '#ffe3e3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.noteCard}
                >
                  <MaterialCommunityIcons name="information" size={18} color="#fa5252" />
                  <Text style={styles.noteText}>
                    Reports are reviewed by our team. False reports may result in action against your account.
                  </Text>
                </LinearGradient>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {step === 'reason' ? (
              <TouchableOpacity
                style={[styles.nextButton, !selectedReason && styles.nextButtonDisabled]}
                onPress={handleSubmit}
                disabled={!selectedReason}
              >
                <LinearGradient
                  colors={selectedReason ? ['#fa5252', '#e03131'] : ['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={[styles.nextButtonText, !selectedReason && styles.nextButtonTextDisabled]}>
                    Next
                  </Text>
                  <MaterialCommunityIcons 
                    name="arrow-right" 
                    size={18} 
                    color={selectedReason ? 'white' : '#868e96'} 
                  />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setStep('reason')}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cancelButtonGradient}
                  >
                    <Text style={styles.cancelButtonText}>Back</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={submitting ? ['#f8f9fa', '#e9ecef'] : ['#fa5252', '#e03131']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitButtonGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#868e96" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="flag" size={18} color="white" />
                        <Text style={styles.submitButtonText}>Submit Report</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
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
  body: {
    padding: 16,
    maxHeight: 500,
  },
  groupNameText: {
    fontSize: 14,
    color: '#868e96',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 20,
    lineHeight: 18,
  },
  reasonsContainer: {
    gap: 8,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 12,
  },
  reasonCardSelected: {
    borderColor: '#fa5252',
    backgroundColor: '#fff5f5',
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonIconSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
  },
  reasonTextSelected: {
    color: '#212529',
    fontWeight: '500',
  },
  selectedReasonBanner: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedReasonBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  selectedReasonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedReasonHint: {
    fontSize: 13,
    color: '#868e96',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  inputGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  input: {
    padding: 12,
    fontSize: 14,
    color: '#212529',
    minHeight: 100,
    backgroundColor: 'transparent',
  },
  charCount: {
    fontSize: 11,
    color: '#868e96',
    textAlign: 'right',
    marginTop: 4,
  },
  noteCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#495057',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  nextButtonTextDisabled: {
    color: '#868e96',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});