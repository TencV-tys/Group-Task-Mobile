// hooks/useCompleteAssignment.ts - FIXED photo info handling

import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { AssignmentService } from '../services/AssignmentService';
import { TokenUtils } from '../utils/tokenUtils';

export const useCompleteAssignment = (
  assignmentId: string, 
  taskTitle: string, 
  dueDate: string, 
  timeSlot: any, 
  onCompleted?: () => void
) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmittable, setIsSubmittable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ photo?: string; notes?: string }>({});
  const [timeStatus, setTimeStatus] = useState<'waiting' | 'submission_open' | 'expired' | 'wrong_day'>('waiting');
  const [isLate, setIsLate] = useState(false);
  const [authError, setAuthError] = useState(false);

  console.log('🎯 [useCompleteAssignment] Initialized with:', {
    assignmentId,
    taskTitle,
    dueDate,
    timeSlot: timeSlot ? `${timeSlot.startTime}-${timeSlot.endTime}` : 'none'
  });

  // Format time
  const formatTime = useCallback((seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }, []);

  // Start countdown timer
  useEffect(() => {
    if (timeSlot && dueDate) {
      const timer = startCountdownTimer();
      return () => clearInterval(timer);
    }
  }, [timeSlot, dueDate]);

  const startCountdownTimer = useCallback(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const due = new Date(dueDate);
      
      // Check if it's the due date
      const isToday = now.toDateString() === due.toDateString();
      
      console.log('⏰ [useCompleteAssignment] Time check:', {
        now: now.toLocaleString(),
        dueDate: due.toLocaleString(),
        isToday,
        timeSlot: timeSlot ? `${timeSlot.startTime}-${timeSlot.endTime}` : 'none'
      });
      
      if (!isToday) {
        setTimeStatus('wrong_day');
        setIsSubmittable(false);
        setTimeLeft(null);
        return;
      }
      
      // Parse end time (this is when submission OPENS)
      const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
      
      // ✅ Submission opens AT end time
      const submissionOpenTime = new Date(now);
      submissionOpenTime.setHours(endHour, endMinute, 0, 0);
      
      // ✅ On-time window: 0 to 25 minutes after end time
      const onTimeEnd = new Date(submissionOpenTime.getTime() + 25 * 60000);
      
      // ✅ Late window: 25 to 30 minutes after end time
      const lateWindowEnd = new Date(submissionOpenTime.getTime() + 30 * 60000);
      
      const currentTime = now.getTime();
      const openTime = submissionOpenTime.getTime();
      const onTimeEndMs = onTimeEnd.getTime();
      const lateWindowEndMs = lateWindowEnd.getTime();
      
      console.log('⏰ [useCompleteAssignment] Time windows:', {
        submissionOpen: submissionOpenTime.toLocaleTimeString(),
        onTimeEnd: onTimeEnd.toLocaleTimeString(),
        lateWindowEnd: lateWindowEnd.toLocaleTimeString(),
        currentTime: now.toLocaleTimeString()
      });
      
      if (currentTime < openTime) {
        // BEFORE submission opens - WAITING
        const timeUntilOpen = Math.floor((openTime - currentTime) / 1000);
        setTimeStatus('waiting');
        setIsSubmittable(false);
        setIsLate(false);
        setTimeLeft(timeUntilOpen);
        console.log('⏰ [useCompleteAssignment] Status: waiting, opens in', timeUntilOpen, 'seconds');
        
      } else if (currentTime >= openTime && currentTime <= onTimeEndMs) {
        // ✅ ON TIME: First 25 minutes after end time
        const timeLeftMs = onTimeEndMs - currentTime;
        setTimeStatus('submission_open');
        setIsSubmittable(true);
        setIsLate(false);
        setTimeLeft(Math.floor(timeLeftMs / 1000));
        console.log('✅ [useCompleteAssignment] Status: on-time, time left:', Math.floor(timeLeftMs / 1000), 'seconds');
        
      } else if (currentTime > onTimeEndMs && currentTime <= lateWindowEndMs) {
        // ✅ LATE: Next 5 minutes (25-30 minutes after end time)
        const timeLeftMs = lateWindowEndMs - currentTime;
        setTimeStatus('submission_open');
        setIsSubmittable(true);
        setIsLate(true);
        setTimeLeft(Math.floor(timeLeftMs / 1000));
        console.log('⚠️ [useCompleteAssignment] Status: late, time left:', Math.floor(timeLeftMs / 1000), 'seconds');
        
      } else {
        // After 30 minutes - EXPIRED
        setTimeStatus('expired');
        setIsSubmittable(false);
        setIsLate(false);
        setTimeLeft(0);
        console.log('❌ [useCompleteAssignment] Status: expired');
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return timer;
  }, [dueDate, timeSlot]);

  // Get time status message
  const getTimeStatusMessage = useCallback(() => {
    if (timeStatus === 'submission_open' && isLate) {
      return {
        title: '⚠️ LATE SUBMISSION',
        message: 'You are submitting after the on-time window. Points will be reduced by 50%.',
        color: '#e67700',
        icon: 'timer-alert'
      };
    }
    
    switch (timeStatus) {
      case 'wrong_day':
        return {
          title: 'Wrong Day',
          message: `This assignment is due on ${new Date(dueDate).toLocaleDateString()}. Please come back then.`,
          color: '#868e96',
          icon: 'calendar-clock'
        };
      case 'waiting':
        return {
          title: 'Not Open Yet',
          message: `Submission opens at ${timeSlot?.endTime}.`,
          color: '#e67700',
          icon: 'clock-start'
        };
      case 'submission_open':
        return {
          title: isLate ? '⚠️ LATE WINDOW' : '✅ ON TIME',
          message: isLate 
            ? `You have ${formatTime(timeLeft || 0)} to submit (points reduced by 50%)`
            : `You have ${formatTime(timeLeft || 0)} to submit for full points`,
          color: isLate ? '#e67700' : '#2b8a3e',
          icon: isLate ? 'timer-alert' : 'check-circle'
        };
      case 'expired':
        return {
          title: 'Submission Closed',
          message: 'The 30-minute submission window has ended.',
          color: '#fa5252',
          icon: 'timer-off'
        };
      default:
        return {
          title: 'Checking...',
          message: 'Checking submission status',
          color: '#868e96',
          icon: 'clock'
        };
    }
  }, [timeStatus, isLate, dueDate, timeSlot, formatTime]);

  // Pick image from gallery
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhoto(uri);
        
        // ✅ FIXED: Check if file exists and get size safely
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            console.log('📸 [useCompleteAssignment] Photo selected:', {
              uri: uri.substring(0, 100) + '...',
              size: 'size' in fileInfo ? fileInfo.size : 'unknown',
              exists: fileInfo.exists
            });
          } else {
            console.log('📸 [useCompleteAssignment] Photo selected but file not found:', uri);
          }
        } catch (infoError) {
          console.log('📸 [useCompleteAssignment] Could not get file info:', infoError);
        }
        
        setErrors(prev => ({ ...prev, photo: undefined }));
      }
    } catch (error) {
      console.error('❌ [useCompleteAssignment] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  // Take photo with camera
  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhoto(uri);
        
        // ✅ FIXED: Check if file exists and get size safely
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            console.log('📸 [useCompleteAssignment] Photo taken:', {
              uri: uri.substring(0, 100) + '...',
              size: 'size' in fileInfo ? fileInfo.size : 'unknown',
              exists: fileInfo.exists
            });
          } else {
            console.log('📸 [useCompleteAssignment] Photo taken but file not found:', uri);
          }
        } catch (infoError) {
          console.log('📸 [useCompleteAssignment] Could not get file info:', infoError);
        }
        
        setErrors(prev => ({ ...prev, photo: undefined }));
      }
    } catch (error) {
      console.error('❌ [useCompleteAssignment] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  }, []);

  // Validate submission
  const validateSubmission = useCallback(() => {
    const newErrors: { photo?: string; notes?: string } = {};
    
    if (!photo) {
      newErrors.photo = 'Photo is required as proof of completion';
    }
    
    if (notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [photo, notes]);

  // Submit completion
  const submitCompletion = useCallback(async () => {
    console.log('🚀 [useCompleteAssignment] submitCompletion called');
    console.log('   isSubmittable:', isSubmittable);
    console.log('   timeStatus:', timeStatus);
    console.log('   isLate:', isLate);
    console.log('   hasPhoto:', !!photo);
    console.log('   notes length:', notes.length);
    
    // Check token first
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }

    if (!isSubmittable) {
      const statusMsg = getTimeStatusMessage();
      Alert.alert(
        'Cannot Submit',
        statusMsg.message,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!validateSubmission()) return;

    setSubmitting(true);
    
    try {
      console.log('📤 [useCompleteAssignment] Calling AssignmentService.completeAssignment');
      
      const result = await AssignmentService.completeAssignment(assignmentId, {
        notes: notes.trim(),
        photoUri: photo || undefined,
      });
      
      console.log('📥 [useCompleteAssignment] Result:', result);
      
      if (result.success) {
        console.log('✅ [useCompleteAssignment] Submission successful!');
        Alert.alert(
          'Success!',
          result.isLate 
            ? `Assignment submitted late. Points reduced from ${result.originalPoints} to ${result.finalPoints}. Waiting for admin verification.`
            : 'Assignment submitted successfully. Waiting for admin verification.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onCompleted) onCompleted();
                // Clear form after submission
                setPhoto(null);
                setNotes('');
              }
            }
          ]
        );
      } else {
        console.log('❌ [useCompleteAssignment] Submission failed:', result.message);
        
        // Check if error is about time validation
        if (result.message?.toLowerCase().includes('late') || 
            result.message?.toLowerCase().includes('time') ||
            result.message?.toLowerCase().includes('window')) {
          Alert.alert(
            'Submission Time Error',
            result.message + '\n\nPlease check the time window requirements.',
            [{ text: 'OK' }]
          );
        } else if (result.message?.toLowerCase().includes('token') || 
                   result.message?.toLowerCase().includes('auth') ||
                   result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
          Alert.alert('Session Expired', 'Please log in again');
        } else {
          Alert.alert('Error', result.message || 'Failed to submit assignment');
        }
      }
    } catch (error: any) {
      console.error('❌ [useCompleteAssignment] Error submitting assignment:', error);
      Alert.alert('Error', error.message || 'Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  }, [assignmentId, notes, photo, isSubmittable, validateSubmission, getTimeStatusMessage, onCompleted]);

  return {
    // State
    timeLeft,
    isSubmittable,
    submitting,
    photo,
    notes,
    errors,
    timeStatus,
    isLate,
    authError,
     
    // Setters
    setPhoto,
    setNotes,
    setErrors,
    
    // Helper functions
    formatTime,
    getTimeStatusMessage,
    
    // Actions
    pickImage,
    takePhoto,
    submitCompletion,
    clearAuthError: () => setAuthError(false)
  };
};