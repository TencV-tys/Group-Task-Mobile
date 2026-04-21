// hooks/useAssignmentDetails.ts - COMPLETE FIXED VERSION

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AssignmentService } from '../services/AssignmentService';
import { SwapRequestService } from '../services/SwapRequestService';
import { TokenUtils } from '../utils/tokenUtils';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { useRealtimeAssignments } from './useRealtimeAssignments';
import { useRealtimeNotifications } from './useRealtimeNotifications'; 
import { getFullImageUrl } from '../utils/imageUrl';
import { formatUTCDate, getUTCDayName, isUTCToday } from '../utils/timeUtils';

export const useAssignmentDetails = (assignmentId: string, isAdminProp: boolean = false, onVerified?: () => void) => {
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
  const [isTaskDeleted, setIsTaskDeleted] = useState(false);
  const [deletedTaskTitle, setDeletedTaskTitle] = useState<string>('');
  
  // Admin/Owner flags from server
  const [isAdmin, setIsAdmin] = useState(isAdminProp);
  const [isOwner, setIsOwner] = useState(false);
  
  // Photo modal state
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

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
    clearAssignmentRejected,
    clearAssignmentUpdated
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
    if (isAdmin && !isOwner) {
      return {
        label: '👑 ADMIN VIEW',
        color: '#2b8a3e',
        bgColor: '#e7f5ff',
        borderColor: '#b2f2bb',
        icon: 'eye',
        description: 'You are viewing this assignment as an admin',
        buttonText: 'Read Only',
        canSubmit: false
      };
    }
    
    if (isTaskDeleted) {
      return {
        label: '🗑️ TASK DELETED',
        color: '#868e96',
        bgColor: '#f8f9fa',
        borderColor: '#e9ecef',
        icon: 'delete',
        description: 'The task associated with this assignment has been deleted.',
        buttonText: 'Not Available',
        canSubmit: false
      };
    }
    
    if (submissionStatus === 'completed') {
      return {
        label: '✓ COMPLETED',
        color: '#2b8a3e',
        bgColor: '#d3f9d8',
        borderColor: '#b2f2bb',
        icon: 'check-circle',
        description: 'This time slot has already been submitted. Waiting for admin verification.',
        buttonText: 'Already Submitted',
        canSubmit: false
      };
    }
    
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
            ? `Due on ${formatUTCDate(assignment.dueDate)}`
            : 'Not due today',
          buttonText: 'Not Due',
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
  }, [submissionStatus, isLate, penaltyInfo, timeLeft, assignment, formatTimeLeft, isTaskDeleted, isAdmin, isOwner]);

const getStatusText = useCallback(() => {
  if (isTaskDeleted) return 'Task Deleted';
  
  // ✅ PRIORITY 1: Verified/Rejected by admin
  if (assignment?.verified === true) return 'Verified';
  if (assignment?.verified === false) return 'Rejected';
  
  // ✅ PRIORITY 2: Has photo (submitted, pending verification)
  // This works for BOTH:
  // - Single-slot: completed = true, has photo
  // - Multi-slot: completed = false, has photo
  if (assignment?.photoUrl && assignment?.verified === null) {
    return 'Pending Verification';
  }
  
  // ✅ PRIORITY 3: Check completedTimeSlotIds for multi-slot tasks
  let completedSlotIds: string[] = [];
  const rawCompleted = assignment?.completedTimeSlotIds;
  
  if (rawCompleted) {
    if (typeof rawCompleted === 'string') {
      try {
        completedSlotIds = JSON.parse(rawCompleted);
      } catch (e) {
        completedSlotIds = [];
      }
    } else if (Array.isArray(rawCompleted)) {
      completedSlotIds = rawCompleted;
    }
  }
  
  const currentTimeSlotId = assignment?.timeSlot?.id;
  const isCurrentSlotCompleted = currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId);
  
  // ✅ PRIORITY 4: Completed time slot (submitted but not verified yet)
  if (isCurrentSlotCompleted) {
    return 'Pending Verification';
  }
  
  // ✅ PRIORITY 5: Admin View
  if (isAdmin && !isOwner) {
    if (assignment?.completed === true && assignment?.verified === null) return 'Pending Verification';
    if (assignment?.completed === true) return 'Completed';
    
    const now = new Date();
    const dueDate = new Date(assignment?.dueDate);
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dueUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
    
    if (todayUTC === dueUTC) return 'Available for User';
    if (dueUTC < todayUTC && !assignment?.completed) return 'Expired';
    if (dueUTC > todayUTC) return 'Upcoming';
    return 'Not Started (Admin)';
  }
  
  // ✅ PRIORITY 6: Check if due date has passed
  const now = new Date();
  const dueDate = new Date(assignment?.dueDate);
  const dueDateUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  
  if (dueDateUTC < todayUTC && !assignment?.completed) return 'Expired';
  if (assignment?.expired === true) return 'Expired';
  
  // ✅ PRIORITY 7: Missed time slot
  const missedSlotIds = assignment?.missedTimeSlotIds || [];
  if (currentTimeSlotId && missedSlotIds.includes(currentTimeSlotId)) return 'Missed';
  
  // ✅ PRIORITY 8: Submission status (during the day)
  if (submissionStatus === 'available') {
    return isLate ? 'Late' : 'Started';
  }
  
  if (submissionStatus === 'waiting') {
    const isRightDay = dueDateUTC === todayUTC;
    if (isRightDay) return 'Not Started';
    return 'Not Started';
  }
  
  // ✅ Default
  return 'Not Started';
}, [assignment, isTaskDeleted, submissionStatus, isLate, isAdmin, isOwner]);

const getStatusColor = useCallback(() => {
  if (isTaskDeleted) return '#868e96';
  
  // ✅ PRIORITY 1: Verified/Rejected by admin
  if (assignment?.verified === true) return '#2b8a3e';
  if (assignment?.verified === false) return '#fa5252';
  
  // ✅ PRIORITY 2: Has photo (pending verification)
  if (assignment?.photoUrl && assignment?.verified === null) return '#e67700';
  
  // ✅ PRIORITY 3: Check completed slot
  const completedSlotIds = assignment?.completedTimeSlotIds || [];
  const currentTimeSlotId = assignment?.timeSlot?.id;
  const isCurrentSlotCompleted = currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId);
  
  if (isCurrentSlotCompleted) return '#e67700';
  if (assignment?.completed === true && assignment?.verified === null) return '#e67700';
  if (assignment?.expired === true) return '#868e96';
  
  const missedSlotIds = assignment?.missedTimeSlotIds || [];
  if (currentTimeSlotId && missedSlotIds.includes(currentTimeSlotId)) return '#868e96';
  
  if (submissionStatus === 'available') return isLate ? '#e67700' : '#2b8a3e';
  if (submissionStatus === 'waiting') return '#e67700';
  if (assignment?.completed === true) return '#2b8a3e';
  
  return '#868e96';
}, [assignment, isTaskDeleted, submissionStatus, isLate]);

const getStatusIcon = useCallback(() => {
  if (isTaskDeleted) return 'delete';
  
  // ✅ PRIORITY 1: Verified/Rejected by admin
  if (assignment?.verified === true) return 'check-circle';
  if (assignment?.verified === false) return 'close-circle';
  
  // ✅ PRIORITY 2: Has photo (pending verification)
  if (assignment?.photoUrl && assignment?.verified === null) return 'clock-check';
   
  // ✅ PRIORITY 3: Check completed slot
  const completedSlotIds = assignment?.completedTimeSlotIds || [];
  const currentTimeSlotId = assignment?.timeSlot?.id;
  const isCurrentSlotCompleted = currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId);
  
  if (isCurrentSlotCompleted) return 'clock-check';
  if (assignment?.completed === true && assignment?.verified === null) return 'clock-check';
  if (assignment?.expired === true) return 'timer-off';
  
  const missedSlotIds = assignment?.missedTimeSlotIds || [];
  if (currentTimeSlotId && missedSlotIds.includes(currentTimeSlotId)) return 'timer-off';
  
  if (submissionStatus === 'available') return isLate ? 'timer-alert' : 'check-circle';
  if (submissionStatus === 'waiting') return 'clock-outline';
  if (assignment?.completed === true) return 'check-circle';
  
  return 'clock-outline';
}, [assignment, isTaskDeleted, submissionStatus, isLate]);

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


  // ✅ UPDATED: Check time validity with completed slot detection
  const checkTimeValidity = useCallback((assignmentData: any) => {
    if (isAdmin && !isOwner) {
      setIsSubmittable(false);
      setSubmissionStatus('waiting');
      return;
    }
    
    if (isTaskDeleted) {
      setIsSubmittable(false);
      setSubmissionStatus('completed');
      return;
    }
    
    if (!assignmentData || assignmentData.completed) {
      setIsSubmittable(false);
      setSubmissionStatus('completed');
      return;
    }

    // ✅ CRITICAL: Check if this specific time slot is already completed
    const completedSlotIds = assignmentData.completedTimeSlotIds || [];
    const currentTimeSlotId = assignmentData.timeSlot?.id;
    
    if (currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId)) {
      console.log('⚠️ This time slot is already completed! Setting status to completed.');
      setIsSubmittable(false);
      setSubmissionStatus('completed');
      setTimeLeft(null);
      setIsLate(false);
      setPenaltyInfo(null);
      return;
    }

    const now = new Date();
    const assignmentDate = new Date(assignmentData.dueDate);
    
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const assignmentUTC = Date.UTC(assignmentDate.getUTCFullYear(), assignmentDate.getUTCMonth(), assignmentDate.getUTCDate());
    
    console.log('🔍 [checkTimeValidity] Debug:', {
      nowUTC: now.toISOString(),
      assignmentDateUTC: assignmentDate.toISOString(),
      todayUTC: new Date(todayUTC).toISOString(),
      assignmentUTC: new Date(assignmentUTC).toISOString(),
      isSameDay: todayUTC === assignmentUTC,
      completedSlotIds,
      currentTimeSlotId,
      isSlotCompleted: currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId)
    });
    
    if (todayUTC !== assignmentUTC) {
      setIsSubmittable(false);
      setSubmissionStatus('wrong_day');
      console.log('📅 Not due today, setting status to wrong_day');
      return;
    }

    if (assignmentData.timeSlot) {
      const [startHour, startMinute] = assignmentData.timeSlot.startTime.split(':').map(Number);
      const [endHour, endMinute] = assignmentData.timeSlot.endTime.split(':').map(Number);
      
      const endTimeUTC = new Date(Date.UTC(
        assignmentDate.getUTCFullYear(),
        assignmentDate.getUTCMonth(),
        assignmentDate.getUTCDate(),
        endHour - 8, endMinute, 0, 0
      ));
      
      const gracePeriodEndUTC = new Date(endTimeUTC.getTime() + 30 * 60000);
      const lateThresholdUTC = new Date(endTimeUTC.getTime() + 25 * 60000);
      
      const currentTimeMs = now.getTime();
      const endTimeMs = endTimeUTC.getTime();
      const graceEndMs = gracePeriodEndUTC.getTime();
      const lateThresholdMs = lateThresholdUTC.getTime();
      
      console.log('⏰ [checkTimeValidity] Time slot check:', {
        startTime: `${startHour}:${startMinute} PHT`,
        endTime: `${endHour}:${endMinute} PHT`,
        endTimeUTC: endTimeUTC.toISOString(),
        graceEndUTC: gracePeriodEndUTC.toISOString(),
        currentTime: now.toISOString(),
        isBeforeEnd: currentTimeMs < endTimeMs,
        isDuringGrace: currentTimeMs >= endTimeMs && currentTimeMs <= graceEndMs,
        isAfterGrace: currentTimeMs > graceEndMs
      });
      
      if (currentTimeMs < endTimeMs) {
        setIsSubmittable(false);
        setSubmissionStatus('waiting');
        setIsLate(false);
        setPenaltyInfo(null);
        const timeUntilOpen = Math.floor((endTimeMs - currentTimeMs) / 1000);
        setTimeLeft(timeUntilOpen);
        console.log('⏳ Submission window opens at end time, waiting for:', timeUntilOpen, 'seconds');
      }
      else if (currentTimeMs >= endTimeMs && currentTimeMs <= graceEndMs) {
        const isLateSubmission = currentTimeMs > lateThresholdMs;
        setIsSubmittable(true);
        setSubmissionStatus('available');
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
        
        const timeLeftMs = graceEndMs - currentTimeMs;
        setTimeLeft(Math.floor(timeLeftMs / 1000));
        console.log('⚠️ During grace period, late:', isLateSubmission, 'timeLeft:', timeLeftMs / 1000, 'seconds');
      }
      else {
        setIsSubmittable(false);
        setSubmissionStatus('expired');
        setIsLate(false);
        setPenaltyInfo(null);
        setTimeLeft(0);
        console.log('❌ After grace period, expired');
      }
    } else {
      setIsSubmittable(true);
      setSubmissionStatus('available');
      setTimeLeft(null);
      setIsLate(false);
      setPenaltyInfo(null);
      console.log('✅ No time slot, always available');
    }
  }, [isAdmin, isOwner, isTaskDeleted]);

  useEffect(() => {
    console.log('📊 [Status Debug]', {
      submissionStatus,
      isSubmittable,
      isLate,
      timeLeft,
      assignmentDay: assignment?.assignmentDay,
      dueDate: assignment?.dueDate,
      taskTitle: assignment?.task?.title
    });
  }, [submissionStatus, isSubmittable, isLate, timeLeft, assignment]);

  const checkTimeValidityWithServer = useCallback(async (assignmentData: any) => {
    if (isAdmin && !isOwner) {
      setIsSubmittable(false);
      setSubmissionStatus('waiting');
      return;
    }
    
    if (isTaskDeleted) {
      setIsSubmittable(false);
      setSubmissionStatus('completed');
      return;
    }
    
    try {
      const result = await AssignmentService.checkSubmissionTime(assignmentData.id);
      
      if (result.success && result.data) {
        setIsSubmittable(result.data.canSubmit);
        setTimeLeft(result.data.timeLeft || null);
        
        const now = new Date();
        const dueDate = new Date(assignmentData.dueDate);
        const [endHour, endMinute] = assignmentData.timeSlot?.endTime.split(':').map(Number) || [0, 0];
        
        const endTime = new Date(Date.UTC(
          dueDate.getUTCFullYear(),
          dueDate.getUTCMonth(),
          dueDate.getUTCDate(),
          endHour - 8, endMinute, 0, 0
        ));
        
        const lateThreshold = new Date(endTime.getTime() + 25 * 60000);
        const isLateSubmission = now.getTime() > lateThreshold.getTime();
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
      console.error(`❌ Server check failed, falling back to local:`, error);
      checkTimeValidity(assignmentData);
    }
  }, [checkTimeValidity, isTaskDeleted, isAdmin, isOwner]);

  const getUTCDayNameFromDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getUTCDay()];
  }, []);

  const fetchAssignmentDetails = useCallback(async () => {
  console.log('🔄 [fetchAssignmentDetails] START loading');
  setLoading(true);
  setError(null);

  try {
    const result = await AssignmentService.getAssignmentDetails(assignmentId);
    console.log('📦 [fetchAssignmentDetails] API response received');
    
    if (result.success) {
      console.log('✅ [fetchAssignmentDetails] Success, setting data');
      
      const assignmentData = result.assignment;
      
      // ✅ FIX: Parse completedTimeSlotIds (handle both string and array)
      let parsedCompletedSlotIds: string[] = [];
      const rawCompleted = assignmentData.completedTimeSlotIds;
      
      console.log('📊 Raw completedTimeSlotIds type:', typeof rawCompleted);
      console.log('📊 Raw completedTimeSlotIds value:', rawCompleted);
      
      if (rawCompleted) {
        if (typeof rawCompleted === 'string') {
          try {
            parsedCompletedSlotIds = JSON.parse(rawCompleted);
            console.log('📊 Parsed from string:', parsedCompletedSlotIds);
          } catch (e) {
            console.error('Failed to parse completedTimeSlotIds:', e);
            parsedCompletedSlotIds = [];
          }
        } else if (Array.isArray(rawCompleted)) {
          parsedCompletedSlotIds = rawCompleted;
          console.log('📊 Already array:', parsedCompletedSlotIds);
        }
      }
      
      // Replace with parsed version
      assignmentData.completedTimeSlotIds = parsedCompletedSlotIds;
      
      const assignmentWithUTCDay = {
        ...assignmentData,
        assignmentDay: assignmentData.assignmentDay || getUTCDayNameFromDate(assignmentData.dueDate)
      };
      
      console.log('✅ [fetchAssignmentDetails] Assignment data:', {
        id: assignmentWithUTCDay.id,
        dueDate: assignmentWithUTCDay.dueDate,
        assignmentDay: assignmentWithUTCDay.assignmentDay,
        taskTitle: assignmentWithUTCDay.task?.title, 
        timeSlot: assignmentWithUTCDay.timeSlot,
        userId: assignmentWithUTCDay.userId,
        isOwner: assignmentWithUTCDay.userId === currentUserId,
        completedSlotIds: parsedCompletedSlotIds,
        currentTimeSlotId: assignmentWithUTCDay.timeSlot?.id,
        isSlotCompleted: parsedCompletedSlotIds.includes(assignmentWithUTCDay.timeSlot?.id)
      });
      
      setIsAdmin(assignmentWithUTCDay.isAdmin || isAdminProp);
      setIsOwner(assignmentWithUTCDay.userId === currentUserId);
      
      if (assignmentWithUTCDay.isTaskDeleted || (!assignmentWithUTCDay.task && assignmentWithUTCDay.taskTitle)) {
        setIsTaskDeleted(true);
        setDeletedTaskTitle(assignmentWithUTCDay.taskTitle || 'Deleted Task');
        
        setAssignment({
          ...assignmentWithUTCDay,
          isTaskDeleted: true,
          taskTitle: assignmentWithUTCDay.taskTitle || 'Deleted Task'
        });
        setVerificationStatus(
          assignmentWithUTCDay.verified ? 'verified' : 
          assignmentWithUTCDay.verified === false ? 'rejected' : 'pending'
        );
        setAdminNotes(assignmentWithUTCDay.adminNotes || '');
        setSubmissionStatus('completed');
        setIsSubmittable(false);
        
        Alert.alert(
          'Task Deleted',
          `The task "${assignmentWithUTCDay.taskTitle || 'Unknown Task'}" has been deleted.\n\nYou can view the submission details but cannot make changes.`,
          [{ text: 'OK' }]
        );
      } else {
        setIsTaskDeleted(false);
        setAssignment(assignmentWithUTCDay);
        setVerificationStatus(
          assignmentWithUTCDay.verified ? 'verified' : 
          assignmentWithUTCDay.verified === false ? 'rejected' : 'pending'
        );
        setAdminNotes(assignmentWithUTCDay.adminNotes || '');
        
        // ✅ Check if this specific time slot is already completed
        const currentTimeSlotId = assignmentWithUTCDay.timeSlot?.id;
        
        if (currentTimeSlotId && parsedCompletedSlotIds.includes(currentTimeSlotId)) {
          console.log('⚠️ This time slot is already completed! Setting status to completed.');
          setSubmissionStatus('completed');
          setIsSubmittable(false);
        } else if (assignmentWithUTCDay.completed) {
          setSubmissionStatus('completed');
          setIsSubmittable(false);
        } else {
          await checkTimeValidityWithServer(assignmentWithUTCDay);
        }
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
}, [assignmentId, checkTimeValidityWithServer, isAdminProp, currentUserId, getUTCDayNameFromDate]);

  const handleCompleteAssignment = useCallback((navigation: any, onComplete?: () => void) => {
    if (!isOwner) {
      Alert.alert(
        'Cannot Submit',
        'You can only submit your own assignments.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (isTaskDeleted) {
      Alert.alert(
        'Cannot Submit',
        'This assignment is for a deleted task. You cannot submit or modify it.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!assignment || !isSubmittable) {
      const statusInfo = getSubmissionStatusInfo();
      Alert.alert(
        'Cannot Submit',
        statusInfo.description,
        [{ text: 'OK' }]
      );
      return;
    }
    
    const navigateToComplete = () => {
      const timeSlots = assignment.task?.timeSlots || [];
      
      console.log('🎯 [handleCompleteAssignment] Navigating to CompleteAssignment');
      
      navigation.navigate('CompleteAssignment', {
        assignmentId: assignment.id,
        taskTitle: assignment.task?.title || 'Unknown Task',
        dueDate: assignment.dueDate,
        timeSlot: assignment.timeSlot,
        timeSlots: timeSlots,
        onCompleted: () => {
          console.log('🔄 [onCompleted] Called - refreshing assignment details');
          fetchAssignmentDetails();
          if (onVerified) onVerified?.();
          if (onComplete) onComplete();
        }
      });
    };
    
    if (isLate && penaltyInfo) {
      Alert.alert(
        'Late Submission',
        `You are submitting late.\n\nYou will receive ${penaltyInfo.finalPoints} points instead of ${penaltyInfo.originalPoints}.\n\nDo you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: navigateToComplete }
        ]
      ); 
    } else {
      navigateToComplete();
    }
  }, [assignment, isSubmittable, isLate, penaltyInfo, getSubmissionStatusInfo, fetchAssignmentDetails, onVerified, isTaskDeleted, isOwner]);

  const handleRequestSwap = useCallback((navigation: any, preSelectedScope?: 'week' | 'day') => {
    return async () => {
      if (!isOwner) {
        Alert.alert(
          'Cannot Swap',
          'You can only request swaps for your own assignments.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (isTaskDeleted) {
        Alert.alert(
          'Cannot Swap',
          'This assignment is for a deleted task. You cannot request a swap.',
          [{ text: 'OK' }]
        );
        return;
      }
      
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
        
        const assignmentDay = assignment.assignmentDay || getUTCDayNameFromDate(assignment.dueDate);
        
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
  }, [assignment, isTaskDeleted, isOwner, getUTCDayNameFromDate]);

  const handleVerify = useCallback(async (verified: boolean) => {
    if (!isAdmin) {
      Alert.alert(
        'Cannot Verify',
        'Only group admins can verify assignments.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (isTaskDeleted) {
      Alert.alert(
        'Cannot Verify',
        'This assignment is for a deleted task. Verification is disabled.',
        [{ text: 'OK' }]
      );
      return;
    }
    
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
  }, [assignment, assignmentId, adminNotes, fetchAssignmentDetails, onVerified, isTaskDeleted, isAdmin]);

  const handleViewPhoto = useCallback(() => {
    if (assignment?.photoUrl) {
      const fullUrl = getFullImageUrl(assignment.photoUrl);
      
      if (fullUrl) {
        console.log('📸 Showing photo modal:', fullUrl);
        setSelectedPhotoUrl(fullUrl);
        setPhotoModalVisible(true);
      } else {
        console.error('Invalid photo URL:', assignment.photoUrl);
        Alert.alert('Error', 'Could not load image. Invalid URL.');
      }
    }
  }, [assignment]);

  const closePhotoModal = useCallback(() => {
    setPhotoModalVisible(false);
    setSelectedPhotoUrl(null);
  }, []);

  // Handle real-time assignment updated (when swapped)
  useEffect(() => {
    if (assignmentEvents.assignmentUpdated && 
        assignmentEvents.assignmentUpdated.assignmentId === assignmentId) {
      console.log('🔄 Current assignment was updated (possibly swapped), refreshing...');
      fetchAssignmentDetails();
      clearAssignmentUpdated();
    }
  }, [assignmentEvents.assignmentUpdated, assignmentId, fetchAssignmentDetails, clearAssignmentUpdated]);

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

  // Start countdown timer - only for owner and if slot not completed
  useEffect(() => {
    const completedSlotIds = assignment?.completedTimeSlotIds || [];
    const currentTimeSlotId = assignment?.timeSlot?.id;
    const isSlotCompleted = currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId);
    
    if (assignment && !assignment.completed && !isTaskDeleted && isOwner && !isSlotCompleted) {
      const timer = setInterval(() => {
        if (assignment && !assignment.completed && !isTaskDeleted && isOwner) {
          checkTimeValidity(assignment);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [assignment, checkTimeValidity, isTaskDeleted, isOwner]);

  // Initial load
  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentDetails();
    }
  }, [assignmentId, fetchAssignmentDetails]);

  return {
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
    isTaskDeleted,
    deletedTaskTitle,
    isAdmin,
    isOwner,
    photoModalVisible,
    selectedPhotoUrl,
    closePhotoModal,
    setAdminNotes,
    hasPendingRequest: hasPendingRequest(assignmentId),
    pendingRequest: getPendingRequestForAssignment(assignmentId),
    getStatusColor,
    getStatusIcon,
    getStatusText,
    getTimeDifference,
    getSubmissionStatusInfo,
    formatTimeLeft, 
    fetchAssignmentDetails,
    handleCompleteAssignment, 
    handleRequestSwap,
    handleVerify,
    handleViewPhoto,
    clearAuthError: () => setAuthError(false)
  };
};