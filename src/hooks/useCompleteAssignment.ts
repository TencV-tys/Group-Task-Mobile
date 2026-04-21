// hooks/useCompleteAssignment.ts - COMPLETE FIXED with time slot completion tracking

import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { AssignmentService } from '../services/AssignmentService';
import { TokenUtils } from '../utils/tokenUtils';
import { UploadService } from '../uploadService/UploadService';

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
  const [timeStatus, setTimeStatus] = useState<'waiting' | 'submission_open' | 'expired' | 'wrong_day' | 'completed'>('waiting');
  const [isLate, setIsLate] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [lastSubmitSuccess, setLastSubmitSuccess] = useState(false);
  const [isTimeSlotAlreadyCompleted, setIsTimeSlotAlreadyCompleted] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  console.log('🎯 [useCompleteAssignment] Initialized with:', {
    assignmentId,
    taskTitle,
    dueDate,
    timeSlot: timeSlot ? `${timeSlot.startTime}-${timeSlot.endTime}` : 'none',
    timeSlotId: timeSlot?.id
  });

  // ✅ Check if this specific time slot is already completed
  const checkTimeSlotStatus = useCallback(async () => {
    if (!timeSlot?.id) {
      setCheckingStatus(false);
      return false;
    }
    
    try {
      console.log('🔍 [useCompleteAssignment] Checking if time slot already completed...');
      const result = await AssignmentService.getAssignmentDetails(assignmentId);
      
      if (result.success && result.assignment) {
        const completedSlotIds = result.assignment.completedTimeSlotIds || [];
        const currentTimeSlotId = timeSlot.id;
        
        console.log('📊 [useCompleteAssignment] Time slot status:', {
          currentTimeSlotId,
          completedSlotIds,
          isAlreadyCompleted: completedSlotIds.includes(currentTimeSlotId)
        });
        
        if (currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId)) {
          console.log('⚠️ This time slot has already been submitted!');
          setIsTimeSlotAlreadyCompleted(true);
          setTimeStatus('completed');
          setIsSubmittable(false);
          setCheckingStatus(false);
          return true;
        }
      }
      setCheckingStatus(false);
      return false;
    } catch (error) {
      console.error('Error checking time slot status:', error);
      setCheckingStatus(false);
      return false;
    }
  }, [assignmentId, timeSlot]);

  // Call check on mount
  useEffect(() => {
    if (timeSlot && assignmentId) {
      checkTimeSlotStatus();
    } else {
      setCheckingStatus(false);
    }
  }, [timeSlot, assignmentId, checkTimeSlotStatus]);

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
    if (timeSlot && dueDate && !isTimeSlotAlreadyCompleted && !checkingStatus) {
      const timer = startCountdownTimer();
      return () => clearInterval(timer);
    }
  }, [timeSlot, dueDate, isTimeSlotAlreadyCompleted, checkingStatus]);

  const startCountdownTimer = useCallback(() => {
    const calculateTimeLeft = () => {
      // If this time slot is already completed, don't allow submission
      if (isTimeSlotAlreadyCompleted) {
        setTimeStatus('completed');
        setIsSubmittable(false);
        setTimeLeft(null);
        return;
      }
      
      const now = new Date();
      const assignmentDate = new Date(dueDate);
      
      // Use UTC comparison
      const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const assignmentUTC = Date.UTC(assignmentDate.getUTCFullYear(), assignmentDate.getUTCMonth(), assignmentDate.getUTCDate());
      
      if (todayUTC !== assignmentUTC) {
        setTimeStatus('wrong_day');
        setIsSubmittable(false);
        setTimeLeft(null);
        return;
      }
      
      if (!timeSlot) {
        setTimeStatus('submission_open');
        setIsSubmittable(true);
        setIsLate(false);
        setTimeLeft(null);
        return;
      }
      
      const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
      
      // Convert PHT to UTC (subtract 8 hours)
      const endTime = new Date(Date.UTC(
        assignmentDate.getUTCFullYear(),
        assignmentDate.getUTCMonth(),
        assignmentDate.getUTCDate(),
        endHour - 8, endMinute, 0, 0
      ));
      
      const lateThreshold = new Date(endTime.getTime() + 25 * 60000);
      const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000);
      
      const currentTime = now.getTime();
      const endTimeMs = endTime.getTime();
      const lateThresholdMs = lateThreshold.getTime();
      const graceEndMs = gracePeriodEnd.getTime();
      
      if (currentTime < endTimeMs) {
        setTimeStatus('waiting');
        setIsSubmittable(false);
        setIsLate(false);
        setTimeLeft(Math.floor((endTimeMs - currentTime) / 1000));
      } else if (currentTime >= endTimeMs && currentTime <= graceEndMs) {
        const isLateSubmission = currentTime > lateThresholdMs;
        setTimeStatus('submission_open');
        setIsSubmittable(true);
        setIsLate(isLateSubmission);
        setTimeLeft(Math.floor((graceEndMs - currentTime) / 1000));
      } else {
        setTimeStatus('expired');
        setIsSubmittable(false);
        setIsLate(false);
        setTimeLeft(0);
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return timer;
  }, [dueDate, timeSlot, isTimeSlotAlreadyCompleted]);

  // Get time status message
  const getTimeStatusMessage = useCallback(() => {
    if (isTimeSlotAlreadyCompleted) {
      return {
        title: '✓ ALREADY SUBMITTED',
        message: 'You have already completed this time slot. Your submission is pending admin verification.',
        color: '#2b8a3e',
        icon: 'check-circle'
      };
    }
    
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
      case 'completed':
        return {
          title: 'Already Submitted',
          message: 'This time slot has already been completed.',
          color: '#2b8a3e',
          icon: 'check-circle'
        };
      default:
        return {
          title: 'Checking...',
          message: 'Checking submission status',
          color: '#868e96', 
          icon: 'clock'
        };
    }
  }, [timeStatus, isLate, dueDate, timeSlot, formatTime, isTimeSlotAlreadyCompleted]);

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
        
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            console.log('📸 [useCompleteAssignment] Photo selected:', {
              uri: uri.substring(0, 100) + '...',
              size: 'size' in fileInfo ? fileInfo.size : 'unknown',
              exists: fileInfo.exists
            });
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
        
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            console.log('📸 [useCompleteAssignment] Photo taken:', {
              uri: uri.substring(0, 100) + '...',
              size: 'size' in fileInfo ? fileInfo.size : 'unknown',
              exists: fileInfo.exists
            });
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
  const submitCompletion = useCallback(async (timeSlotId?: string | null): Promise<{ success: boolean; message?: string }> => {
    console.log('\n🚀🚀🚀 [SUBMIT COMPLETION] START 🚀🚀🚀');
    console.log('   isSubmittable:', isSubmittable);
    console.log('   timeStatus:', timeStatus);
    console.log('   isTimeSlotAlreadyCompleted:', isTimeSlotAlreadyCompleted);
    console.log('   isLate:', isLate);
    console.log('   hasPhoto:', !!photo);
    console.log('   notes length:', notes.length);
    console.log('   timeSlotId:', timeSlotId);
    
    // ✅ Check if time slot already completed
    if (isTimeSlotAlreadyCompleted) {
      console.log('❌ [SUBMIT] This time slot is already completed');
      Alert.alert('Already Submitted', 'This time slot has already been completed. You cannot submit again.');
      return { success: false, message: 'Time slot already completed' };
    }
    
    // Check token first
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) {
      console.log('❌ [SUBMIT] No valid token');
      Alert.alert('Authentication Error', 'Please log in again');
      return { success: false, message: 'No valid token' };
    }

    if (!isSubmittable) {
      const statusMsg = getTimeStatusMessage();
      console.log('❌ [SUBMIT] Not submittable:', statusMsg.message);
      Alert.alert(
        'Cannot Submit',
        statusMsg.message,
        [{ text: 'OK' }]
      );
      return { success: false, message: statusMsg.message };
    }

    if (!validateSubmission()) {
      console.log('❌ [SUBMIT] Validation failed');
      return { success: false, message: 'Validation failed' };
    }
   
    setSubmitting(true);
    
    try {
      let finalPhotoUrl: string | undefined = undefined;
      
      // STEP 1: Upload photo to Cloudinary if exists
      if (photo) {
        console.log('📸 [SUBMIT] Uploading photo to Cloudinary...');
        
        const uploadResult = await UploadService.uploadTaskPhotoCloudinary(photo);
        
        if (uploadResult.success && uploadResult.data?.photoUrl) {
          finalPhotoUrl = uploadResult.data.photoUrl;
          console.log('✅ [SUBMIT] Photo uploaded to Cloudinary:', finalPhotoUrl);
        } else {
          console.error('❌ [SUBMIT] Failed to upload photo:', uploadResult.message);
          Alert.alert('Upload Error', 'Failed to upload photo. Please try again.');
          setSubmitting(false);
          return { success: false, message: 'Photo upload failed' };
        }
      }
      
      // STEP 2: Submit assignment with Cloudinary URL
      console.log('📤 [SUBMIT] Calling AssignmentService.completeAssignment...');
      
      const result = await AssignmentService.completeAssignment(assignmentId, {
        notes: notes.trim(),
        photoUri: finalPhotoUrl,
        timeSlotId: timeSlotId || undefined,
      });
      
      console.log('📥 [SUBMIT] Result from server:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ [SUBMIT] Submission successful!');
        
        setLastSubmitSuccess(true);
        
        // Mark this time slot as completed
        setIsTimeSlotAlreadyCompleted(true);
        setTimeStatus('completed');
        setIsSubmittable(false);
        
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
                setPhoto(null);
                setNotes('');
              }
            }
          ]
        );
        
        return { success: true, message: 'Submission successful' };
      } else {
        console.log('❌ [SUBMIT] Submission failed:', result.message);
        
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
        
        return { success: false, message: result.message || 'Submission failed' };
      }
    } catch (error: any) {
      console.error('❌❌❌ [SUBMIT] Error submitting assignment:', error);
      Alert.alert('Error', error.message || 'Network error. Please check your connection.');
      return { success: false, message: error.message || 'Network error' };
    } finally { 
      setSubmitting(false);
      console.log('🏁 [SUBMIT] Submission flow completed');
    }
  }, [assignmentId, notes, photo, isSubmittable, isTimeSlotAlreadyCompleted, validateSubmission, getTimeStatusMessage, onCompleted]);

  // Reset success state
  const resetSubmitSuccess = useCallback(() => {
    setLastSubmitSuccess(false);
  }, []);

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
    lastSubmitSuccess,
    isTimeSlotAlreadyCompleted,
    checkingStatus,
     
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
    resetSubmitSuccess,
    clearAuthError: () => setAuthError(false)
  };
};