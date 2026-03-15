// src/screens/AssignmentDetailsScreen.tsx - UPDATED with matching timing logic
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  StatusBar  
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssignmentService } from '../services/AssignmentService';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';
const { width } = Dimensions.get('window');

export default function AssignmentDetailsScreen({ navigation, route }: any) {
  const { assignmentId, isAdmin, onVerified } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [assignment, setAssignment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmittable, setIsSubmittable] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'available' | 'waiting' | 'expired' | 'wrong_day' | 'completed'>('waiting');
  const [isLate, setIsLate] = useState(false);
  const [penaltyInfo, setPenaltyInfo] = useState<{
    originalPoints: number;
    finalPoints: number;
    penaltyAmount: number;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { hasPendingRequest, getPendingRequestForAssignment } = useSwapRequests();

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentDetails();
    }
  }, [assignmentId]);

  useEffect(() => {
    if (assignment && !assignment.completed) {
      const timer = startCountdownTimer();
      return () => clearInterval(timer);
    }
  }, [assignment]);

  useEffect(() => {
    const loadUserId = async () => {
      const userStr = await SecureStore.getItemAsync('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      }
    };
    loadUserId();
  }, []);

  // Real-time hooks
  const {
    events: assignmentEvents,
    clearAssignmentVerified,
    clearAssignmentRejected
  } = useRealtimeAssignments('', currentUserId || '');

  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if (notification.data?.assignmentId === assignmentId) {
        if (notification.type === 'SUBMISSION_VERIFIED' || 
            notification.type === 'SUBMISSION_REJECTED') {
          fetchAssignmentDetails();
          if (onVerified) onVerified();
        }
      }
    },
    showAlerts: true
  });

  // Handle real-time verification
  useEffect(() => {
    if (assignmentEvents.assignmentVerified && 
        assignmentEvents.assignmentVerified.assignmentId === assignmentId) {
      Alert.alert(
        '✅ Verified',
        'This assignment has been verified',
        [{ text: 'OK', onPress: () => fetchAssignmentDetails() }]
      );
      if (onVerified) onVerified();
      clearAssignmentVerified();
    }
  }, [assignmentEvents.assignmentVerified]);

  useEffect(() => {
    if (assignmentEvents.assignmentRejected && 
        assignmentEvents.assignmentRejected.assignmentId === assignmentId) {
      Alert.alert(
        '❌ Rejected',
        'This assignment has been rejected',
        [{ text: 'OK', onPress: () => fetchAssignmentDetails() }]
      );
      if (onVerified) onVerified();
      clearAssignmentRejected();
    }
  }, [assignmentEvents.assignmentRejected]);

  const fetchAssignmentDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await AssignmentService.getAssignmentDetails(assignmentId);

      if (result.success) {
        setAssignment(result.assignment);
        setVerificationStatus(
          result.assignment.verified ? 'verified' : 
          result.assignment.verified === false ? 'rejected' : 'pending'
        );
        setAdminNotes(result.assignment.adminNotes || '');
        
        // Check time validity with server if needed
        if (!result.assignment.completed) {
          await checkTimeValidityWithServer(result.assignment);
        } else {
          setSubmissionStatus('completed');
        }
      } else {
        setError(result.message || 'Failed to load assignment details');
      }
    } catch (err: any) {
      console.error('Error fetching assignment:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const checkTimeValidityWithServer = async (assignmentData: any) => {
    try {
      const result = await AssignmentService.checkSubmissionTime(assignmentData.id);
      
      if (result.success && result.data) {
        setIsSubmittable(result.data.canSubmit);
        setTimeLeft(result.data.timeLeft || null);
        
        // Check if late (after 25-minute threshold)
        const now = new Date();
        const dueDate = new Date(assignmentData.dueDate);
        const [endHour, endMinute] = assignmentData.timeSlot?.endTime.split(':').map(Number) || [0, 0];
        
        const endTime = new Date(dueDate);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        const lateThreshold = new Date(endTime.getTime() + 25 * 60000); // 25 minutes after end
        const isLateSubmission = now > lateThreshold;
        setIsLate(isLateSubmission);
        
        if (isLateSubmission && assignmentData.points) {
          const penaltyAmount = Math.floor(assignmentData.points * 0.5);
          setPenaltyInfo({
            originalPoints: assignmentData.points,
            finalPoints: assignmentData.points - penaltyAmount,
            penaltyAmount
          });
        } else {
          setPenaltyInfo(null);
        }
        
        if (result.data.canSubmit) {
          setSubmissionStatus('available');
        } else if (result.data.reason === 'Not due date') {
          setSubmissionStatus('wrong_day');
        } else if (result.data.reason === 'Submission not open yet') {
          setSubmissionStatus('waiting');
        } else {
          setSubmissionStatus('expired');
        }
      } else {
        // Fallback to local validation
        checkTimeValidity(assignmentData);
      }
    } catch (error) {
      // Fallback to local validation
      checkTimeValidity(assignmentData);
    }
  };

  const checkTimeValidity = (assignmentData: any) => {
    if (!assignmentData || assignmentData.completed) {
      setIsSubmittable(false);
      setSubmissionStatus('completed');
      return;
    }

    const now = new Date();
    const assignmentDate = new Date(assignmentData.dueDate);
    const today = now.toDateString();
    const assignmentDay = assignmentDate.toDateString();
    
    if (today !== assignmentDay) {
      setIsSubmittable(false);
      setSubmissionStatus('wrong_day');
      return;
    }

    if (assignmentData.timeSlot) {
      const [endHour, endMinute] = assignmentData.timeSlot.endTime.split(':').map(Number);
      
      const endTime = new Date(assignmentDate);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      const lateThreshold = new Date(endTime.getTime() + 25 * 60000); // 25 minutes after end
      const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000); // 30 minutes after end
      
      const currentTime = now.getTime();
      const endTimeMs = endTime.getTime();
      const lateThresholdMs = lateThreshold.getTime();
      const graceEndMs = gracePeriodEnd.getTime();
      
      // Check if before end time
      if (currentTime < endTimeMs) {
        setIsSubmittable(false);
        setSubmissionStatus('waiting');
        setIsLate(false);
        setPenaltyInfo(null);
        const timeUntilEnd = Math.floor((endTimeMs - currentTime) / 1000);
        setTimeLeft(timeUntilEnd);
      }
      // Check if within grace period
      else if (currentTime >= endTimeMs && currentTime <= graceEndMs) {
        setIsSubmittable(true);
        setSubmissionStatus('available');
        
        // Check if late (after 25-minute threshold)
        const isLateSubmission = currentTime > lateThresholdMs;
        setIsLate(isLateSubmission);
        
        if (isLateSubmission && assignmentData.points) {
          const penaltyAmount = Math.floor(assignmentData.points * 0.5);
          setPenaltyInfo({
            originalPoints: assignmentData.points,
            finalPoints: assignmentData.points - penaltyAmount,
            penaltyAmount
          });
        } else {
          setPenaltyInfo(null);
        }
        
        const timeLeftMs = graceEndMs - currentTime;
        setTimeLeft(Math.floor(timeLeftMs / 1000));
      }
      // After grace period
      else {
        setIsSubmittable(false);
        setSubmissionStatus('expired');
        setIsLate(false);
        setPenaltyInfo(null);
        setTimeLeft(0);
      }
    } else {
      // No time slot - always available
      setIsSubmittable(true);
      setSubmissionStatus('available');
      setTimeLeft(null);
      setIsLate(false);
      setPenaltyInfo(null);
    }
  };

  const startCountdownTimer = () => {
    const timer = setInterval(() => {
      if (assignment && !assignment.completed) {
        checkTimeValidity(assignment);
      }
    }, 1000);
    return timer;
  };

  const formatTimeLeft = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getSubmissionStatusInfo = () => {
    if (submissionStatus === 'available' && isLate) {
      return {
        label: '⚠️ LATE SUBMISSION',
        color: '#e67700',
        bgColor: '#fff3bf',
        borderColor: '#ffd43b',
        icon: 'timer-alert',
        description: penaltyInfo 
          ? `You will receive ${penaltyInfo.finalPoints} points instead of ${penaltyInfo.originalPoints}`
          : 'Late submission - points will be reduced (after 5:25 PM)',
        buttonText: 'Submit Late (Points Reduced)',
        canSubmit: true
      };
    }
    
    switch (submissionStatus) {
      case 'available':
        return {
          label: '✓ ON TIME',
          color: '#2b8a3e',
          bgColor: '#d3f9d8',
          borderColor: '#b2f2bb',
          icon: 'check-circle',
          description: 'Submit before 5:25 PM for full points',
          buttonText: 'Complete Assignment',
          canSubmit: true
        };
      case 'waiting':
        return {
          label: '⏳ WAITING',
          color: '#e67700',
          bgColor: '#fff3bf',
          borderColor: '#ffec99',
          icon: 'clock',
          description: timeLeft && timeLeft > 0 
            ? `Opens in ${formatTimeLeft(timeLeft)}` 
            : 'Submit after time slot ends',
          buttonText: 'Waiting',
          canSubmit: false
        };
      case 'expired':
        return {
          label: '❌ EXPIRED',
          color: '#fa5252',
          bgColor: '#fff5f5',
          borderColor: '#ffc9c9',
          icon: 'timer-off',
          description: 'Submission window has closed (after 5:30 PM)',
          buttonText: 'Expired',
          canSubmit: false
        };
      case 'wrong_day':
        return {
          label: '📅 WRONG DAY',
          color: '#868e96',
          bgColor: '#f8f9fa',
          borderColor: '#e9ecef',
          icon: 'calendar',
          description: assignment 
            ? `Due on ${new Date(assignment.dueDate).toLocaleDateString()}`
            : 'Not due today',
          buttonText: 'Not Due',
          canSubmit: false
        };
      case 'completed':
        return {
          label: '✓ COMPLETED',
          color: '#2b8a3e',
          bgColor: '#d3f9d8',
          borderColor: '#b2f2bb',
          icon: 'check-circle',
          description: 'Already submitted',
          buttonText: 'Completed',
          canSubmit: false
        };
      default:
        return {
          label: '⏳ CHECKING',
          color: '#868e96',
          bgColor: '#f8f9fa',
          borderColor: '#e9ecef',
          icon: 'clock',
          description: 'Checking status...',
          buttonText: 'Checking',
          canSubmit: false
        };
    }
  };

  const handleCompleteAssignment = () => {
    if (!assignment || !isSubmittable) {
      const statusInfo = getSubmissionStatusInfo();
      Alert.alert(
        'Cannot Submit',
        statusInfo.description,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Show warning for late submissions (after 5:25 PM)
    if (isLate && penaltyInfo) {
      Alert.alert(
        'Late Submission',
        `You are submitting after 5:25 PM.\n\nYou will receive ${penaltyInfo.finalPoints} points instead of ${penaltyInfo.originalPoints}.\n\nDo you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Submit Anyway', 
            onPress: () => {
              navigation.navigate('CompleteAssignment', {
                assignmentId: assignment.id,
                taskTitle: assignment.task?.title || 'Unknown Task',
                dueDate: assignment.dueDate,
                timeSlot: assignment.timeSlot,
                onCompleted: () => {
                  fetchAssignmentDetails();
                  if (onVerified) onVerified();
                }
              });
            }
          }
        ]
      );
    } else {
      navigation.navigate('CompleteAssignment', {
        assignmentId: assignment.id,
        taskTitle: assignment.task?.title || 'Unknown Task',
        dueDate: assignment.dueDate,
        timeSlot: assignment.timeSlot,
        onCompleted: () => {
          fetchAssignmentDetails();
          if (onVerified) onVerified();
        }
      });
    }
  };

  const handleRequestSwap = (preSelectedScope?: 'week' | 'day') => {
    return async () => {
      if (!assignment) return;
      
      try {
        const checkResult = await SwapRequestService.checkCanSwap(assignment.id);
        
        if (!checkResult.success) {
          Alert.alert('Cannot Swap', checkResult.message || 'Unable to request swap');
          return;
        }
        
        if (checkResult.canSwap === false) {
          Alert.alert('Cannot Swap', checkResult.reason || 'This assignment cannot be swapped');
          return;
        }
        
        const assignmentDay = assignment.assignmentDay || 
          (assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() : undefined);
        
        navigation.navigate('CreateSwapRequest', {
          assignmentId: assignment.id,
          groupId: assignment.task.group.id,
          taskTitle: assignment.task.title,
          dueDate: assignment.dueDate,
          taskPoints: assignment.points,
          timeSlot: assignment.timeSlot?.startTime || 'Scheduled time',
          executionFrequency: assignment.task.executionFrequency,
          timeSlots: assignment.task.timeSlots || [],
          selectedDay: assignmentDay,
          assignmentDay: assignmentDay,
          selectedTimeSlotId: assignment.timeSlot?.id,
          scope: preSelectedScope
        });
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to check swap availability');
      }
    };
  };

  const handleVerify = async (verified: boolean) => {
    if (!assignment) return;
    setVerifying(true);
    
    try {
      const result = await AssignmentService.verifyAssignment(assignmentId, {
        verified,
        adminNotes: adminNotes.trim() || undefined
      });
 
      if (result.success) {
        Alert.alert(
          'Success',
          verified ? 'Assignment verified successfully!' : 'Assignment rejected.',
          [{ text: 'OK', onPress: () => {
            setVerificationStatus(verified ? 'verified' : 'rejected');
            setVerifying(false);
            fetchAssignmentDetails();
            if (onVerified) onVerified();
          }}]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to verify assignment');
        setVerifying(false);
      }
    } catch (error: any) {
      console.error('Error verifying assignment:', error);
      Alert.alert('Error', error.message || 'Network error');
      setVerifying(false);
    }
  };

  const handleViewPhoto = () => {
    if (assignment?.photoUrl) {
      Linking.openURL(assignment.photoUrl).catch(err => {
        Alert.alert('Error', 'Could not open image');
      });
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'verified': return '#2b8a3e';
      case 'rejected': return '#fa5252';
      default: return '#e67700';
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified': return 'check-circle';
      case 'rejected': return 'close-circle';
      default: return assignment?.completed ? 'clock-check' : 'clock-outline';
    }
  };

  const getStatusText = () => {
    if (!assignment?.completed) return 'Not Completed';
    
    switch (verificationStatus) {
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      default: return 'Pending Verification';
    }
  };

  const getTimeDifference = (dueDate: string, completedAt: string) => {
    const due = new Date(dueDate);
    const completed = new Date(completedAt);
    const diffMs = completed.getTime() - due.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return `${Math.abs(diffHours)} hours early`;
    } else if (diffHours === 0) {
      return "on time";
    } else {
      return `${diffHours} hours late`;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Assignment Details
        </Text>
      </View>
      
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderCompleteButton = () => {
    if (!assignment?.completed) {
      const submissionStatusInfo = getSubmissionStatusInfo();
      
      // Format end time and late threshold for display
      let endTimeStr = '';
      let lateThresholdStr = '';
      if (assignment?.timeSlot) {
        const [endHour, endMinute] = assignment.timeSlot.endTime.split(':').map(Number);
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);
        endTimeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const lateThreshold = new Date(endTime.getTime() + 25 * 60000);
        lateThresholdStr = lateThreshold.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      return (
        <View style={styles.completeSection}>
          <Text style={styles.sectionTitle}>Complete This Assignment</Text>
          
          <LinearGradient
            colors={[submissionStatusInfo.bgColor, submissionStatusInfo.bgColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.submissionStatusCard, { borderColor: submissionStatusInfo.borderColor }]}
          >
            <View style={styles.submissionStatusHeader}>
              <View style={[styles.statusIconContainer, { backgroundColor: submissionStatusInfo.color + '20' }]}>
                <MaterialCommunityIcons 
                  name={submissionStatusInfo.icon as any} 
                  size={22} 
                  color={submissionStatusInfo.color} 
                />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={[styles.submissionStatusLabel, { color: submissionStatusInfo.color }]}>
                  {submissionStatusInfo.label}
                </Text>
                <Text style={[styles.submissionStatusDescription, { color: submissionStatusInfo.color }]}>
                  {submissionStatusInfo.description}
                </Text>
              </View>
            </View>
            
            {assignment?.timeSlot && submissionStatus === 'available' && (
              <View style={styles.timeWindowInfo}>
                <Text style={styles.timeWindowText}>
                  On-time: Until {lateThresholdStr} | Late: {lateThresholdStr} - {(() => {
                    const [endHour, endMinute] = assignment.timeSlot.endTime.split(':').map(Number);
                    const endTime = new Date();
                    endTime.setHours(endHour, endMinute, 0, 0);
                    const graceEnd = new Date(endTime.getTime() + 30 * 60000);
                    return graceEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  })()}
                </Text>
              </View>
            )}
            
            {isLate && penaltyInfo && (
              <LinearGradient
                colors={['#fff3bf', '#ffec99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.penaltyInfo}
              >
                <MaterialCommunityIcons name="alert" size={16} color="#e67700" />
                <Text style={styles.penaltyText}>
                  Points: {penaltyInfo.finalPoints} / {penaltyInfo.originalPoints} 
                  (Penalty: -{penaltyInfo.penaltyAmount})
                </Text>
              </LinearGradient>
            )}
            
            {submissionStatus === 'available' && timeLeft !== null && (
              <View style={styles.timerContainer}>
                <LinearGradient
                  colors={timeLeft < 300 ? ['#ffc9c9', '#ffb3b3'] : isLate ? ['#fff3bf', '#ffec99'] : ['#d3f9d8', '#b2f2bb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.timerBadge, 
                    timeLeft < 300 && styles.urgentTimerBadge,
                    isLate && styles.lateTimerBadge
                  ]}
                >
                  <MaterialCommunityIcons 
                    name={timeLeft < 300 ? "timer-alert" : isLate ? "timer-alert" : "timer"} 
                    size={16} 
                    color={timeLeft < 300 ? "#fa5252" : isLate ? "#e67700" : "#2b8a3e"} 
                  />
                  <Text style={[styles.timerText, { color: timeLeft < 300 ? "#fa5252" : isLate ? "#e67700" : "#2b8a3e" }]}>
                    {formatTimeLeft(timeLeft)} remaining
                  </Text>
                </LinearGradient>
                {timeLeft < 300 && (
                  <Text style={styles.urgentMessage}>Hurry! Grace period ending soon.</Text>
                )}
              </View>
            )}
            
            {submissionStatus === 'waiting' && timeLeft !== null && timeLeft > 0 && (
              <View style={styles.waitingContainer}>
                <LinearGradient
                  colors={['#fff3bf', '#ffec99']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.waitingBadge}
                >
                  <MaterialCommunityIcons name="clock-start" size={16} color="#e67700" />
                  <Text style={styles.waitingText}>
                    Opens in {formatTimeLeft(timeLeft)}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </LinearGradient>
          
          {submissionStatusInfo.canSubmit ? (
            <TouchableOpacity
              style={[
                styles.completeButton,
                isLate && styles.lateButton
              ]}
              onPress={handleCompleteAssignment}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isLate ? ['#e67700', '#cc5f00'] : ['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.completeButtonGradient}
              >
                <View style={styles.completeButtonContent}>
                  <MaterialCommunityIcons 
                    name={isLate ? "timer-alert" : "check-circle"} 
                    size={20} 
                    color="white" 
                  />
                  <Text style={styles.completeButtonText}>{submissionStatusInfo.buttonText}</Text>
                </View>
                {timeLeft && timeLeft < 600 && (
                  <View style={styles.completeButtonFooter}>
                    <MaterialCommunityIcons name="alert" size={14} color="white" />
                    <Text style={styles.completeButtonSubtext}>
                      {timeLeft < 300 ? 'Urgent! ' : ''}{formatTimeLeft(timeLeft)} left
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.disabledButtonContainer}>
              <TouchableOpacity
                style={styles.disabledButton}
                disabled={true}
                onPress={() => {
                  Alert.alert(
                    submissionStatusInfo.label,
                    submissionStatusInfo.description,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.disabledButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name={submissionStatusInfo.icon as any} 
                    size={20} 
                    color="#868e96" 
                  />
                  <Text style={styles.disabledButtonText}>
                    {submissionStatusInfo.buttonText}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.disabledButtonHint}>
                ⓘ {submissionStatusInfo.description}
              </Text>
            </View>
          )}
        </View>
      );
    }
    return null;
  };

  const renderSwapButton = () => {
    if (!assignment?.completed && assignment) {
      const hasPending = hasPendingRequest(assignment.id);
      const pendingRequest = getPendingRequestForAssignment(assignment.id);
      
      return (
        <View style={styles.swapSection}>
          <Text style={styles.sectionTitle}>Need to Swap?</Text>
          
          {!hasPending ? (
            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleRequestSwap()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EEF2FF', '#dbe4ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.swapButtonGradient}
              >
                <View style={styles.swapButtonContent}>
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="#4F46E5" />
                  <Text style={styles.swapButtonText}>Request Swap</Text>
                </View>
                <Text style={styles.swapButtonSubtext}>
                  Find someone to take over this assignment
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.pendingSwapButton}
              onPress={() => {
                if (pendingRequest) {
                  navigation.navigate('SwapRequestDetails', { requestId: pendingRequest.id });
                }
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FEF3C7', '#FFE5B4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pendingSwapGradient}
              >
                <View style={styles.swapButtonContent}>
                  <MaterialCommunityIcons name="clock" size={20} color="#F59E0B" />
                  <Text style={styles.pendingSwapText}>Swap Request Pending</Text>
                </View>
                <Text style={styles.pendingSwapSubtext}>
                  Tap to view request details
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return null;
  };

  const renderVerificationControls = () => {
    if (!isAdmin || !assignment?.completed || assignment.verified !== null) return null;

    return (
      <View style={styles.verificationSection}>
        <Text style={styles.sectionTitle}>Admin Verification</Text>
        
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.notesInputGradient}
        >
          <TextInput
            style={styles.notesInput}
            value={adminNotes}
            onChangeText={setAdminNotes}
            placeholder="Add notes for the user (optional)..."
            placeholderTextColor="#adb5bd"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </LinearGradient>
        <Text style={styles.charCount}>
          {adminNotes.length}/500 characters
        </Text>

        <View style={styles.verificationButtons}>
          <TouchableOpacity
            style={[styles.verifyButton, styles.rejectButton]}
            onPress={() => handleVerify(false)}
            disabled={verifying}
          >
            <LinearGradient
              colors={['#fa5252', '#e03131']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifyButtonGradient}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle" size={20} color="white" />
                  <Text style={styles.verifyButtonText}>Reject</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.verifyButton, styles.approveButton]}
            onPress={() => handleVerify(true)}
            disabled={verifying}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifyButtonGradient}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="white" />
                  <Text style={styles.verifyButtonText}>Approve</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPhotoSection = () => {
    if (!assignment?.photoUrl) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Proof Photo</Text>
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={handleViewPhoto}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: assignment.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.photoOverlay}
          >
            <MaterialCommunityIcons name="magnify" size={28} color="white" />
            <Text style={styles.viewPhotoText}>Tap to view full image</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading assignment...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAssignmentDetails}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (!assignment) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-question" size={64} color="#dee2e6" />
          <Text style={styles.emptyText}>Assignment not found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Header with status */}
          <View style={styles.headerRow}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {assignment.task?.title || 'Unknown Task'}
            </Text>
            <LinearGradient
              colors={[getStatusColor() + '20', getStatusColor() + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statusBadge, { borderColor: getStatusColor() }]}
            >
              <MaterialCommunityIcons 
                name={getStatusIcon()} 
                size={14} 
                color={getStatusColor()} 
              />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </LinearGradient>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              {assignment.user?.avatarUrl ? (
                <Image source={{ uri: assignment.user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {assignment.user?.fullName?.charAt(0) || 'U'}
                </Text>
              )}
            </LinearGradient>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{assignment.user?.fullName || 'Unknown User'}</Text>
              {assignment.completed && assignment.completedAt && (
                <Text style={styles.completionDate}>
                  Completed {new Date(assignment.completedAt).toLocaleDateString()} • {getTimeDifference(assignment.dueDate, assignment.completedAt)}
                </Text>
              )}
            </View>
          </View>

          {/* Complete Assignment Button */}
          {renderCompleteButton()}

          {/* Swap Request Button */}
          {renderSwapButton()}

          {/* Points and Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Points</Text>
              <LinearGradient
                colors={['#fff3bf', '#ffec99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pointsBadge}
              >
                <MaterialCommunityIcons name="star" size={14} color="#e67700" />
                <Text style={styles.pointsValue}>{assignment.points || 0}</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>
                {new Date(assignment.dueDate).toLocaleDateString()}
              </Text>
            </View>

            {assignment.timeSlot && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time Slot</Text>
                <Text style={styles.detailValue}>
                  {assignment.timeSlot.startTime} - {assignment.timeSlot.endTime}
                </Text>
              </View>
            )}

            {assignment.assignmentDay && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Day</Text>
                <Text style={styles.detailValue}>{assignment.assignmentDay}</Text>
              </View>
            )}
          </View>

          {/* Photo Section */}
          {renderPhotoSection()}

          {/* User Notes */}
          {assignment.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Notes</Text>
              <LinearGradient
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.notesCard}
              >
                <Text style={styles.notesText}>{assignment.notes}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Admin Notes */}
          {assignment.adminNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Admin Feedback</Text>
              <LinearGradient
                colors={assignment.verified === false ? ['#fff5f5', '#ffe3e3'] : ['#d3f9d8', '#b2f2bb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.adminNotesCard,
                  assignment.verified === false ? styles.rejectedNotes : styles.verifiedNotes
                ]}
              >
                <Text style={styles.adminNotesText}>{assignment.adminNotes}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Verification Controls */}
          {renderVerificationControls()}

          {/* Assignment Info */}
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoSection}
          >
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-week" size={14} color="#868e96" />
              <Text style={styles.infoText}>
                Rotation Week: {assignment.rotationWeek || 1}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-range" size={14} color="#868e96" />
              <Text style={styles.infoText}>
                Week: {new Date(assignment.weekStart).toLocaleDateString()} - {new Date(assignment.weekEnd).toLocaleDateString()}
              </Text>
            </View>
            {assignment.task?.group && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-group" size={14} color="#868e96" />
                <Text style={styles.infoText}>
                  Group: {assignment.task.group.name}
                </Text>
              </View>
            )}
          </LinearGradient>
        </LinearGradient>
      </ScrollView>
    );
  };

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      {renderContent()}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
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
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  headerSpacer: {
    width: 36
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80
  },
  loadingText: {
    marginTop: 12,
    color: '#868e96',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#fa5252',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 16,
    color: '#868e96',
    marginTop: 16,
    textAlign: 'center'
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    marginRight: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarText: {
    color: '#495057',
    fontSize: 18,
    fontWeight: '600'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2
  },
  completionDate: {
    fontSize: 12,
    color: '#868e96'
  },
  completeSection: {
    marginBottom: 16
  },
  submissionStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  submissionStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextContainer: {
    flex: 1,
  },
  submissionStatusLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  submissionStatusDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  timerContainer: {
    marginTop: 12,
    marginLeft: 52,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  normalTimerBadge: {},
  urgentTimerBadge: {},
  lateTimerBadge: {},
  timerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  urgentMessage: {
    fontSize: 12,
    color: '#fa5252',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  waitingContainer: {
    marginTop: 12,
    marginLeft: 52,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  waitingText: {
    fontSize: 13,
    color: '#e67700',
    fontWeight: '600',
  },
  completeButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    padding: 14,
  },
  lateButton: {},
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  completeButtonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  completeButtonSubtext: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButtonContainer: {
    marginTop: 8,
  },
  disabledButton: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  disabledButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  disabledButtonText: {
    color: '#868e96',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButtonHint: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  penaltyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffec99',
  },
  penaltyText: {
    fontSize: 12,
    color: '#e67700',
    fontWeight: '600'
  },
  timeWindowInfo: {
    marginTop: 12,
    marginLeft: 52,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeWindowText: {
    fontSize: 11,
    color: '#868e96',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  swapSection: {
    marginBottom: 24,
  },
  swapButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe4ff',
  },
  swapButtonGradient: {
    padding: 16,
  },
  swapButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  swapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  swapButtonSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 32,
  },
  pendingSwapButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pendingSwapGradient: {
    padding: 16,
  },
  pendingSwapText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
  },
  pendingSwapSubtext: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 32,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  detailItem: {
    width: '48%'
  },
  detailLabel: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529'
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 4
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden'
  },
  photo: {
    width: '100%',
    height: 220,
    backgroundColor: '#f8f9fa'
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    alignItems: 'center'
  },
  viewPhotoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2
  },
  notesCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0ebff',
  },
  notesText: {
    fontSize: 14,
    color: '#2b8a3e',
    lineHeight: 20
  },
  adminNotesCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  rejectedNotes: {
    borderColor: '#ffc9c9',
  },
  verifiedNotes: {
    borderColor: '#b2f2bb',
  },
  adminNotesText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20
  },
  verificationSection: {
    marginBottom: 24
  },
  notesInputGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  notesInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  charCount: {
    textAlign: 'right',
    color: '#868e96',
    fontSize: 11,
    marginBottom: 16
  },
  verificationButtons: {
    flexDirection: 'row',
    gap: 12
  },
  verifyButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  rejectButton: {},
  approveButton: {},
  verifyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600'
  },
  infoSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    fontSize: 13,
    color: '#495057'
  }
});