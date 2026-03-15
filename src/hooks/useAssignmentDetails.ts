// hooks/useAssignmentDetails.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert,Linking } from 'react-native';
import { AssignmentService } from '../services/AssignmentService';
import { SwapRequestService } from '../services/SwapRequestService';
import { TokenUtils } from '../utils/tokenUtils';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { useRealtimeAssignments } from './useRealtimeAssignments';
import { useRealtimeNotifications } from './useRealtimeNotifications';

export const useAssignmentDetails = (assignmentId: string, isAdmin: boolean, onVerified?: () => void) => {
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
  const [authError, setAuthError] = useState(false);

  const { hasPendingRequest, getPendingRequestForAssignment } = useSwapRequests();

  // Get user ID
  useEffect(() => {
    const getUserId = async () => {
      const user = await TokenUtils.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUserId();
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

  // Format time left
  const formatTimeLeft = useCallback((seconds: number) => {
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
  }, []);

  // Get submission status info
  const getSubmissionStatusInfo = useCallback(() => {
    if (submissionStatus === 'available' && isLate) {
      return {
        label: '⚠️ LATE SUBMISSION',
        color: '#e67700',
        bgColor: '#fff3bf',
        borderColor: '#ffd43b',
        icon: 'timer-alert',
        description: penaltyInfo 
          ? `You will receive ${penaltyInfo.finalPoints} points instead of ${penaltyInfo.originalPoints}`
          : 'Late submission - points will be reduced',
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
          description: 'Submit now for full points',
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
          description: 'Submission window has closed',
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
  }, [submissionStatus, isLate, penaltyInfo, timeLeft, assignment, formatTimeLeft]);

  // Get status helpers
  const getStatusColor = useCallback(() => {
    switch (verificationStatus) {
      case 'verified': return '#2b8a3e';
      case 'rejected': return '#fa5252';
      default: return '#e67700';
    }
  }, [verificationStatus]);

  const getStatusIcon = useCallback(() => {
    switch (verificationStatus) {
      case 'verified': return 'check-circle';
      case 'rejected': return 'close-circle';
      default: return assignment?.completed ? 'clock-check' : 'clock-outline';
    }
  }, [verificationStatus, assignment]);

  const getStatusText = useCallback(() => {
    if (!assignment?.completed) return 'Not Completed';
    
    switch (verificationStatus) {
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      default: return 'Pending Verification';
    }
  }, [assignment, verificationStatus]);

  const getTimeDifference = useCallback((dueDate: string, completedAt: string) => {
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
  }, []);

  // Check time validity
  const checkTimeValidity = useCallback((assignmentData: any) => {
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
      
      const lateThreshold = new Date(endTime.getTime() + 25 * 60000);
      const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000);
      
      const currentTime = now.getTime();
      const endTimeMs = endTime.getTime();
      const lateThresholdMs = lateThreshold.getTime();
      const graceEndMs = gracePeriodEnd.getTime();
      
      if (currentTime < endTimeMs) {
        setIsSubmittable(false);
        setSubmissionStatus('waiting');
        setIsLate(false);
        setPenaltyInfo(null);
        const timeUntilEnd = Math.floor((endTimeMs - currentTime) / 1000);
        setTimeLeft(timeUntilEnd);
      }
      else if (currentTime >= endTimeMs && currentTime <= graceEndMs) {
        setIsSubmittable(true);
        setSubmissionStatus('available');
        
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
      else {
        setIsSubmittable(false);
        setSubmissionStatus('expired');
        setIsLate(false);
        setPenaltyInfo(null);
        setTimeLeft(0);
      }
    } else {
      setIsSubmittable(true);
      setSubmissionStatus('available');
      setTimeLeft(null);
      setIsLate(false);
      setPenaltyInfo(null);
    }
  }, []);

  // Check time validity with server
  const checkTimeValidityWithServer = useCallback(async (assignmentData: any) => {
    try {
      const result = await AssignmentService.checkSubmissionTime(assignmentData.id);
      
      if (result.success && result.data) {
        setIsSubmittable(result.data.canSubmit);
        setTimeLeft(result.data.timeLeft || null);
        
        const now = new Date();
        const dueDate = new Date(assignmentData.dueDate);
        const [endHour, endMinute] = assignmentData.timeSlot?.endTime.split(':').map(Number) || [0, 0];
        
        const endTime = new Date(dueDate);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        const lateThreshold = new Date(endTime.getTime() + 25 * 60000);
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
        checkTimeValidity(assignmentData);
      }
    } catch (error) {
      checkTimeValidity(assignmentData);
    }
  }, [checkTimeValidity]);

  // Fetch assignment details
  const fetchAssignmentDetails = useCallback(async () => {
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
        
        if (!result.assignment.completed) {
          await checkTimeValidityWithServer(result.assignment);
        } else {
          setSubmissionStatus('completed');
        }
      } else {
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
        setError(result.message || 'Failed to load assignment details');
      }
    } catch (err: any) {
      console.error('Error fetching assignment:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, checkTimeValidityWithServer]);

  // Handle complete assignment
  const handleCompleteAssignment = useCallback((navigation: any) => {
    if (!assignment || !isSubmittable) {
      const statusInfo = getSubmissionStatusInfo();
      Alert.alert(
        'Cannot Submit',
        statusInfo.description,
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (isLate && penaltyInfo) {
      Alert.alert(
        'Late Submission',
        `You are submitting late.\n\nYou will receive ${penaltyInfo.finalPoints} points instead of ${penaltyInfo.originalPoints}.\n\nDo you want to continue?`,
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
                  if (onVerified) onVerified?.();
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
          if (onVerified) onVerified?.();
        }
      });
    }
  }, [assignment, isSubmittable, isLate, penaltyInfo, getSubmissionStatusInfo, fetchAssignmentDetails, onVerified]);

  // Handle request swap
  const handleRequestSwap = useCallback((navigation: any, preSelectedScope?: 'week' | 'day') => {
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
  }, [assignment]);

  // Handle verify
  const handleVerify = useCallback(async (verified: boolean) => {
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
            if (onVerified) onVerified?.();
          }}]
        );
      } else {
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
        Alert.alert('Error', result.message || 'Failed to verify assignment');
        setVerifying(false);
      }
    } catch (error: any) {
      console.error('Error verifying assignment:', error);
      Alert.alert('Error', error.message || 'Network error');
      setVerifying(false);
    }
  }, [assignment, assignmentId, adminNotes, fetchAssignmentDetails, onVerified]);

 const handleViewPhoto = useCallback(() => {
  if (assignment?.photoUrl) {
    Linking.openURL(assignment.photoUrl).catch(err => {
      console.error('Error opening photo URL:', err);
      Alert.alert('Error', 'Could not open image');
    });
  }
}, [assignment]);

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
  }, [assignmentEvents.assignmentVerified, assignmentId, fetchAssignmentDetails, onVerified, clearAssignmentVerified]);

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
  }, [assignmentEvents.assignmentRejected, assignmentId, fetchAssignmentDetails, onVerified, clearAssignmentRejected]);

  // Start countdown timer
  useEffect(() => {
    if (assignment && !assignment.completed) {
      const timer = setInterval(() => {
        if (assignment && !assignment.completed) {
          checkTimeValidity(assignment);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [assignment, checkTimeValidity]);

  // Initial load
  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentDetails();
    }
  }, [assignmentId, fetchAssignmentDetails]);

  return {
    // State
    loading,
    verifying,
    assignment,
    error,
    adminNotes,
    verificationStatus,
    timeLeft,
    isSubmittable,
    submissionStatus,
    isLate,
    penaltyInfo,
    authError,
    
    // Setters
    setAdminNotes,
    
    // Data
    hasPendingRequest: hasPendingRequest(assignmentId),
    pendingRequest: getPendingRequestForAssignment(assignmentId),
    
    // Helper functions
    getStatusColor,
    getStatusIcon,
    getStatusText,
    getTimeDifference,
    getSubmissionStatusInfo,
    formatTimeLeft,
    
    // Actions
    fetchAssignmentDetails,
    handleCompleteAssignment,
    handleRequestSwap,
    handleVerify,
    handleViewPhoto,
    clearAuthError: () => setAuthError(false)
  };
};