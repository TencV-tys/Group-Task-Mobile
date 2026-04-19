// src/components/ReportModal.tsx - COMPLETE WITH FRONTEND RATE LIMITING

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator, 
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { TokenUtils } from '../utils/tokenUtils';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';

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
  navigation?: any;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  groupId,
  groupName,
  onSubmit,
  navigation
}) => {
  const { theme, isDark } = useTheme();
  const { isConnected } = useSocket();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'reason' | 'description'>('reason');
  const [authError, setAuthError] = useState(false);
  
  // ✅ Rate limit states
  const [canReport, setCanReport] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastReportTime, setLastReportTime] = useState<number | null>(null);

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);


// ✅ Update getTimeRemainingText to show time until midnight
const getTimeRemainingText = () => {
  if (!canReport && timeRemaining > 0) {
    if (timeRemaining >= 24) return 'Tomorrow';
    if (timeRemaining >= 1) return `${timeRemaining}h`;
    return `${Math.ceil(timeRemaining * 60)}min`;
  }
  return '';
};
// In ReportModal.tsx - REPLACE these functions

// In ReportModal.tsx - REPLACE checkLastReportTime with this

const checkLastReportTime = useCallback(async () => {
  try {
    // Get current user ID
    const user = await TokenUtils.getUser();
    const userId = user?.id || 'unknown';
    
    // ✅ ONLY check for the CURRENT group, not all groups
    const storageKey = `last_report_${groupId}_${userId}`;
    
    const lastTimeStr = await AsyncStorage.getItem(storageKey);
    
    if (lastTimeStr) {
      const lastReportDate = new Date(parseInt(lastTimeStr));
      const now = new Date();
      
      // Check if same LOCAL day
      const isSameDay = 
        lastReportDate.getFullYear() === now.getFullYear() &&
        lastReportDate.getMonth() === now.getMonth() &&
        lastReportDate.getDate() === now.getDate();
      
      if (isSameDay) {
        // Calculate hours until midnight LOCAL
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const remainingMs = endOfDay.getTime() - now.getTime();
        const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
        
        setTimeRemaining(remainingHours);
        setCanReport(false);
        console.log(`⚠️ Already reported group ${groupId} today. Hours remaining: ${remainingHours}`);
        return false;
      } else {
        // Different day, clear the old key
        await AsyncStorage.removeItem(storageKey);
        setCanReport(true);
        setTimeRemaining(0);
        console.log(`✅ Cleared old report key for group ${groupId}`);
        return true;
      }
    } else {
      console.log(`✅ No report found for group ${groupId}, can report`);
      setCanReport(true);
      return true;
    }
  } catch (error) {
    console.error('Error checking last report time:', error);
    setCanReport(true); // Default to allowing report on error
    return true;
  }
}, [groupId]);

// Add this temporarily to debug
const debugStorage = useCallback(async () => {
  const user = await TokenUtils.getUser();
  const userId = user?.id || 'unknown';
  const storageKey = `last_report_${groupId}_${userId}`;
  const value = await AsyncStorage.getItem(storageKey);
  console.log(`🔍 Storage key: ${storageKey}, value: ${value}`);
  
  // List all report-related keys
  const allKeys = await AsyncStorage.getAllKeys();
  const reportKeys = allKeys.filter(key => key.includes('last_report'));
  console.log('🔍 All report keys:', reportKeys);
}, [groupId]);

// Call this in a useEffect to debug
useEffect(() => {
  if (visible) {
    debugStorage();
  }
}, [visible, debugStorage]);


// Add this to clear any stale report data from previous users
useEffect(() => {
  const clearStaleData = async () => {
    try {
      const user = await TokenUtils.getUser();
      const userId = user?.id;
      if (!userId) return;
      
      const storageKey = `last_report_${groupId}_${userId}`;
      const existing = await AsyncStorage.getItem(storageKey);
      
      // If there's a value but it's from more than 24 hours ago, clear it
      if (existing) {
        const reportDate = new Date(parseInt(existing));
        const now = new Date();
        const diffHours = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60);
        
        if (diffHours > 24) {
          await AsyncStorage.removeItem(storageKey);
          console.log('✅ Cleared stale report data');
        }
      }
    } catch (error) {
      console.error('Error clearing stale data:', error);
    }
  };
  
  if (visible) {
    clearStaleData();
    checkLastReportTime();
  }
}, [visible, groupId, checkLastReportTime]);

// ✅ Store report time with user-specific key
const storeReportTime = useCallback(async () => {
  try {
    const user = await TokenUtils.getUser();
    const userId = user?.id || 'unknown';
    const storageKey = `last_report_${groupId}_${userId}`;
    await AsyncStorage.setItem(storageKey, Date.now().toString());
    setCanReport(false);
    setTimeRemaining(24);
    setLastReportTime(Date.now());
    console.log(`✅ Stored report time for user ${userId}, group ${groupId}`);
  } catch (error) {
    console.error('Error storing report time:', error);
  }
}, [groupId]);

// ✅ Clear the stored report time (for debugging)
const clearReportTime = useCallback(async () => {
  try {
    const user = await TokenUtils.getUser();
    const userId = user?.id || 'unknown';
    const storageKey = `last_report_${groupId}_${userId}`;
    await AsyncStorage.removeItem(storageKey);
    setCanReport(true);
    setTimeRemaining(0);
    console.log(`✅ Cleared report time for user ${userId}, group ${groupId}`);
  } catch (error) {
    console.error('Error clearing report time:', error);
  }
}, [groupId]);

  // ✅ Check rate limit when modal opens
  useEffect(() => {
    if (visible) {
      checkLastReportTime();
    }
  }, [visible, checkLastReportTime]);

  // ✅ Show warning if cannot report and modal is open
  useEffect(() => {
// Update the warning alert
if (visible && !canReport && !submitting) {
  Alert.alert(
    '⚠️ Cannot Submit Report',
    `You have already reported this group today.\n\nPlease try again ${timeRemaining >= 24 ? 'tomorrow' : `in ${timeRemaining} hour${timeRemaining !== 1 ? 's' : ''}`}.`,
    [{ text: 'OK', onPress: handleClose }]
  );
}
  }, [visible, canReport, timeRemaining]);

  useEffect(() => {
    if (authError && visible) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              onClose();
              if (navigation) {
                navigation.navigate('Login');
              }
            }
          }
        ]
      );
    }
  }, [authError, visible, navigation, onClose]);

 // In ReportModal.tsx - Fix the handleSubmit function

const handleSubmit = async () => {
  const hasToken = await checkToken();
  if (!hasToken) return;

  // ✅ Check rate limit BEFORE sending request
  if (!canReport) {
    Alert.alert(
      'Rate Limit Exceeded',
      `You have already reported this group. Please wait ${timeRemaining} hour${timeRemaining !== 1 ? 's' : ''} before submitting another report.`,
      [{ text: 'OK', onPress: () => handleClose() }]
    );
    return;
  }

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
    await onSubmit({ type: selectedReason, description: description.trim() });
    
    // ✅ ONLY store the report time on SUCCESSFUL submission
    // Remove the automatic storeReportTime() call - let the backend tell us if it was successful
    
    Alert.alert(
      'Report Submitted',
      `Thank you for helping keep our community safe.\n\nYour report has been submitted and will be reviewed by our team.${
        isConnected ? ' You will receive updates in real-time.' : ' You will be notified when a decision is made.'
      }`,
      [{ text: 'OK', onPress: handleClose }]
    );
  } catch (error: any) {
    console.error('❌ Report submission error:', error);
    
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorLower = errorMessage.toLowerCase();
    
    // ✅ Handle backend rate limit error
    if (errorMessage.includes('429') || errorLower.includes('rate limit') || errorLower.includes('wait 24 hours')) {
      Alert.alert(
        '⚠️ Rate Limit Exceeded',
        'You have already reported this group recently.\n\nPlease wait 24 hours before submitting another report.',
        [{ text: 'OK', onPress: () => {
          // Refresh the rate limit check from backend
          checkLastReportTime();
        }}]
      );
    } 
    else if (errorLower.includes('already reported')) {
      // ✅ Backend says already reported - store the time from backend response
      Alert.alert(
        'Already Reported',
        'You have already reported this group. Our team is reviewing your previous report.',
        [{ text: 'OK', onPress: handleClose }]
      );
    }
    else if (errorLower.includes('token') || errorLower.includes('auth') || errorLower.includes('unauthorized')) {
      setAuthError(true);
    }
    else if (errorLower.includes('network') || errorLower.includes('connection')) {
      Alert.alert(
        'Network Error',
        'Unable to submit report. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } 
    else {
      Alert.alert(
        'Submission Failed',
        errorMessage || 'Failed to submit report. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  } finally {
    setSubmitting(false);
  }
};

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    setStep('reason');
    setAuthError(false);
    onClose();
  };

  const handleBack = () => {
    setStep('reason');
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedReason('');
      setDescription('');
      setStep('reason');
    }
  }, [visible]);

  if (authError) {
    return null;
  }


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              {step === 'description' && (
                <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: theme.bgSecondary }]}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
              <LinearGradient
                colors={[theme.error, theme.error]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <MaterialCommunityIcons name="flag" size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Report Group</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={[styles.closeButton, { backgroundColor: theme.bgTertiary }]}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView 
            style={[styles.body, { backgroundColor: theme.card }]} 
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <Text style={[styles.groupNameText, { color: theme.textMuted }]}>{groupName}</Text>
            
            {step === 'reason' ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Why are you reporting this group?</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                  Your report is anonymous. We'll review it and take appropriate action.
                </Text>

                <View style={styles.reasonsContainer}>
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.value}
                      style={[
                        styles.reasonCard,
                        selectedReason === reason.value && styles.reasonCardSelected,
                        { 
                          backgroundColor: selectedReason === reason.value ? theme.errorBg : theme.bgSecondary,
                          borderColor: selectedReason === reason.value ? theme.errorBorder : theme.border
                        }
                      ]}
                      onPress={() => setSelectedReason(reason.value)}
                    >
                      <LinearGradient
                        colors={selectedReason === reason.value 
                          ? [theme.error, theme.error] 
                          : [theme.bgSecondary, theme.bgTertiary]}
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
                          color={selectedReason === reason.value ? '#fff' : theme.textSecondary} 
                        />
                      </LinearGradient>
                      <Text style={[
                        styles.reasonText,
                        selectedReason === reason.value && styles.reasonTextSelected,
                        { color: selectedReason === reason.value ? theme.text : theme.textSecondary }
                      ]}>
                        {reason.label}
                      </Text>
                      {selectedReason === reason.value && (
                        <MaterialCommunityIcons name="check-circle" size={20} color={theme.error} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.selectedReasonBanner}>
                  <LinearGradient
                    colors={[theme.error, theme.error]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.selectedReasonBadge}
                  >
                    <Text style={styles.selectedReasonText}>
                      {REPORT_REASONS.find(r => r.value === selectedReason)?.label}
                    </Text>
                  </LinearGradient>
                  <Text style={[styles.selectedReasonHint, { color: theme.textMuted }]}>
                    Please provide more details
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description *</Text>
                  <LinearGradient
                    colors={[theme.bgSecondary, theme.bgTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.inputGradient, { borderColor: theme.border }]}
                  >
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Describe the issue in detail..."
                      placeholderTextColor={theme.textPlaceholder}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                      maxLength={500}
                      selectionColor={theme.primary}
                    />
                  </LinearGradient>
                  <Text style={[styles.charCount, { color: theme.textMuted }]}>
                    {description.length}/500 characters
                  </Text>
                </View>

                <LinearGradient
                  colors={[theme.errorBg, theme.errorBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.noteCard, { borderColor: theme.errorBorder }]}
                >
                  <MaterialCommunityIcons name="information" size={18} color={theme.error} />
                  <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                    Reports are reviewed by our team. False reports may result in action against your account.
                  </Text>
                </LinearGradient>
              </>
            )}
            
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
            {step === 'reason' ? (
              <TouchableOpacity
                style={[styles.nextButton, (!selectedReason || submitting) && styles.nextButtonDisabled]}
                onPress={handleSubmit}
                disabled={!selectedReason || submitting}
              >
                <LinearGradient
                  colors={selectedReason ? [theme.error, theme.error] : [theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={[styles.nextButtonText, !selectedReason && styles.nextButtonTextDisabled, { color: selectedReason ? '#fff' : theme.textMuted }]}>
                    Next
                  </Text>
                  <MaterialCommunityIcons 
                    name="arrow-right" 
                    size={18} 
                    color={selectedReason ? '#fff' : theme.textMuted} 
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
                    colors={[theme.bgSecondary, theme.bgTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cancelButtonGradient}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Back</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, (!canReport || submitting) && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={!canReport || submitting}
                >
                  <LinearGradient
                    colors={(!canReport || submitting) ? [theme.bgSecondary, theme.bgTertiary] : [theme.error, theme.error]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitButtonGradient}
                  >
                    {!canReport ? (
                      <>
                        <MaterialCommunityIcons name="clock-outline" size={18} color={theme.textMuted} />
                        <Text style={[styles.submitButtonText, { color: theme.textMuted }]}>
                          Try again in {getTimeRemainingText()}
                        </Text>
                      </>
                    ) : submitting ? (
                      <ActivityIndicator size="small" color={theme.textMuted} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="flag" size={18} color="#fff" />
                        <Text style={styles.submitButtonText}>Submit Report</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 8,
  },
  groupNameText: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
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
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  reasonCardSelected: {
    borderWidth: 2,
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
  },
  reasonTextSelected: {
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedReasonHint: {
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputGradient: {
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    backgroundColor: 'transparent',
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  noteCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
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
  },
  nextButtonTextDisabled: {},
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
    color: '#fff',
    fontSize: 15,
    fontWeight: '600', 
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});