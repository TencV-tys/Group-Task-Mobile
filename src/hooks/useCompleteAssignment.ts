// hooks/useCompleteAssignment.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
      startCountdownTimer();
    }
  }, [timeSlot, dueDate]);

  const startCountdownTimer = useCallback(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const due = new Date(dueDate);
      
      // Check if it's the due date
      const isToday = now.toDateString() === due.toDateString();
      
      if (!isToday) {
        setTimeStatus('wrong_day');
        setIsSubmittable(false);
        setTimeLeft(null);
        return;
      }
      
      // Parse end time (this is when submission should OPEN)
      const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
      
      // Create end time object for today (submission OPENS at this time)
      const submissionOpenTime = new Date(now);
      submissionOpenTime.setHours(endHour, endMinute, 0, 0);
      
      // Grace period: 30 minutes after end time
      const gracePeriodEnd = new Date(submissionOpenTime.getTime() + 30 * 60000);
      
      // Late threshold: 25 minutes after end time
      const lateThreshold = new Date(submissionOpenTime.getTime() + 25 * 60000);
      
      // Current time in milliseconds
      const currentTime = now.getTime();
      const openTime = submissionOpenTime.getTime();
      const lateTime = lateThreshold.getTime();
      const graceEndTime = gracePeriodEnd.getTime();
      
      if (currentTime < openTime) {
        // Before end time - WAITING (cannot submit yet)
        setTimeStatus('waiting');
        setIsSubmittable(false);
        setIsLate(false);
        const timeUntilOpen = Math.floor((openTime - currentTime) / 1000);
        setTimeLeft(timeUntilOpen);
        
      } else if (currentTime >= openTime && currentTime <= graceEndTime) {
        // Within submission window (after end time, before grace period ends)
        setTimeStatus('submission_open');
        setIsSubmittable(true);
        
        // Check if late (submitted after the 25-minute threshold)
        const late = currentTime > lateTime;
        setIsLate(late);
        
        const timeLeftMs = graceEndTime - currentTime;
        setTimeLeft(Math.floor(timeLeftMs / 1000));
        
      } else {
        // After grace period - EXPIRED
        setTimeStatus('expired');
        setIsSubmittable(false);
        setIsLate(false);
        setTimeLeft(0);
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [dueDate, timeSlot]);

  // Get time status message
  const getTimeStatusMessage = useCallback(() => {
    if (timeStatus === 'submission_open' && isLate) {
      return {
        title: '⚠️ LATE SUBMISSION',
        message: 'You are submitting after 5:25 PM. Points will be reduced.',
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
          title: 'Opens After Time Slot',
          message: `Submit after ${timeSlot?.endTime}`,
          color: '#e67700',
          icon: 'clock-start'
        };
      case 'submission_open':
        return {
          title: 'Submission Open',
          message: 'Submit your completion now (on-time until 5:25 PM)',
          color: '#2b8a3e',
          icon: 'check-circle'
        };
      case 'expired':
        return {
          title: 'Submission Closed',
          message: 'The 30-minute grace period has ended',
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
  }, [timeStatus, isLate, dueDate, timeSlot]);

  // Pick image from gallery
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        setErrors(prev => ({ ...prev, photo: undefined }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
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
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        setErrors(prev => ({ ...prev, photo: undefined }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
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
      Alert.alert(
        'Cannot Submit',
        timeStatus === 'waiting' ? 
          `Submission opens at ${timeSlot?.endTime}` :
          'Submission time has passed. Please contact an administrator if this is an error.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!validateSubmission()) return;

    setSubmitting(true);
    
    try {
      const result = await AssignmentService.completeAssignment(assignmentId, {
        notes,
        photoUri: photo || undefined,
      });
      
      if (result.success) {
        Alert.alert(
          'Success!',
          result.isLate 
            ? 'Assignment submitted late. Points will be reduced. Waiting for admin verification.'
            : 'Assignment submitted successfully. Waiting for admin verification.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onCompleted) onCompleted();
              }
            }
          ]
        );
      } else {
        // Check if error is auth-related
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
        Alert.alert('Error', result.message || 'Failed to submit assignment');
      }
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      Alert.alert('Error', error.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  }, [assignmentId, notes, photo, isSubmittable, timeStatus, timeSlot, validateSubmission, onCompleted]);

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