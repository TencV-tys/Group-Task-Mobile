// src/screens/CompleteAssignmentScreen.tsx - UPDATED with clean UI and dark gray primary
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssignmentService } from '../services/AssignmentService';

const { width } = Dimensions.get('window');

export default function CompleteAssignmentScreen({ navigation, route }: any) {
  const { assignmentId, taskTitle, dueDate, timeSlot, onCompleted } = route.params || {};
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmittable, setIsSubmittable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ photo?: string; notes?: string }>({});
  const [timeStatus, setTimeStatus] = useState<'waiting' | 'submission_open' | 'expired' | 'wrong_day'>('waiting');

  useEffect(() => {
    if (timeSlot && dueDate) {
      startCountdownTimer();
    }
  }, [timeSlot, dueDate]);

  const startCountdownTimer = () => {
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
      
      // Parse end time
      const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
      
      // Create end time object for today
      const endTime = new Date(now);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      // Grace period: 30 minutes after end time
      const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000); // 30 min after end
      
      // Check current time against schedule
      if (now < endTime) {
        // Before end time - waiting
        setTimeStatus('waiting');
        setIsSubmittable(false);
        const timeUntilEnd = endTime.getTime() - now.getTime();
        setTimeLeft(Math.floor(timeUntilEnd / 1000));
      } else if (now >= endTime && now <= gracePeriodEnd) {
        // Within grace period - can submit
        setTimeStatus('submission_open');
        const timeUntilGraceEnd = gracePeriodEnd.getTime() - now.getTime();
        
        if (timeUntilGraceEnd <= 0) {
          setTimeStatus('expired');
          setIsSubmittable(false);
          setTimeLeft(0);
        } else {
          setIsSubmittable(true);
          setTimeLeft(Math.floor(timeUntilGraceEnd / 1000));
        }
      } else {
        // After grace period
        setTimeStatus('expired');
        setIsSubmittable(false);
        setTimeLeft(0);
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  };

  const formatTime = (seconds: number) => {
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
  };

  const getTimeStatusMessage = () => {
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
          title: 'Waiting for Time Slot',
          message: 'Submit after the time slot ends',
          color: '#e67700',
          icon: 'clock-alert'
        };
      case 'submission_open':
        return {
          title: 'Submission Open',
          message: 'Submit your completion now',
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
  };

  const pickImage = async () => {
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
  };

  const takePhoto = async () => {
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
  };

  const validateSubmission = () => {
    const newErrors: { photo?: string; notes?: string } = {};
    
    if (!photo) {
      newErrors.photo = 'Photo is required as proof of completion';
    }
    
    if (notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitCompletion = async () => {
    if (!isSubmittable) {
      Alert.alert(
        'Cannot Submit',
        timeStatus === 'waiting' ? 
          `Submit after ${timeSlot?.endTime} on the due date` :
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
          'Assignment submitted successfully. Waiting for admin verification.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onCompleted) onCompleted();
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to submit assignment');
      }
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      Alert.alert('Error', error.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTimeInfo = () => {
    if (!timeSlot) return null;

    const timeStatusMsg = getTimeStatusMessage();
    const isCritical = timeLeft !== null && timeLeft < 300; // Less than 5 minutes
    const isWarning = timeLeft !== null && timeLeft < 600; // Less than 10 minutes
    
    return (
      <LinearGradient
        colors={
          timeStatus === 'expired' ? ['#fff5f5', '#ffe3e3'] :
          timeStatus === 'waiting' ? ['#fff3bf', '#ffec99'] :
          timeStatus === 'submission_open' ? ['#d3f9d8', '#b2f2bb'] :
          timeStatus === 'wrong_day' ? ['#f8f9fa', '#e9ecef'] :
          ['#f8f9fa', '#e9ecef']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.timeInfoContainer,
          timeStatus === 'expired' && styles.timeCritical,
          timeStatus === 'waiting' && styles.timeWarning,
          timeStatus === 'submission_open' && styles.timeOpen,
          timeStatus === 'wrong_day' && styles.timeWrongDay
        ]}
      >
        <View style={styles.timeInfoHeader}>
          <MaterialCommunityIcons 
            name={timeStatusMsg.icon as any} 
            size={20} 
            color={timeStatusMsg.color} 
          />
          <Text style={[
            styles.timeInfoTitle,
            { color: timeStatusMsg.color }
          ]}>
            {timeStatusMsg.title}
          </Text>
        </View>
        
        {timeStatus === 'submission_open' && timeLeft !== null ? (
          <>
            <Text style={[
              styles.timerText,
              isCritical && styles.timeCriticalText,
              isWarning && styles.timeWarningText,
              { color: timeStatusMsg.color }
            ]}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={styles.timeInstructions}>
              Grace period ends in {formatTime(timeLeft)}
            </Text>
            
            {isWarning && (
              <View style={styles.warningMessage}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#e67700" />
                <Text style={styles.warningText}>
                  {isCritical ? 'Hurry! Grace period almost over!' : 'Grace period ending soon'}
                </Text>
              </View>
            )}
          </>
        ) : timeStatus === 'waiting' && timeLeft !== null ? (
          <>
            <Text style={[styles.timerText, { color: timeStatusMsg.color }]}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={styles.timeInstructions}>
              Time slot ends in {formatTime(timeLeft)}
            </Text>
            <Text style={styles.scheduleInfo}>
              Submit between {timeSlot.endTime} - {(() => {
                const [hour, minute] = timeSlot.endTime.split(':').map(Number);
                const graceEnd = new Date();
                graceEnd.setHours(hour, minute + 30, 0, 0);
                return graceEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              })()}
            </Text>
          </>
        ) : (
          <Text style={styles.timeMessage}>
            {timeStatusMsg.message}
          </Text>
        )}
        
        <View style={styles.timeSlotInfo}>
          <Text style={styles.timeSlotLabel}>Time Slot:</Text>
          <Text style={styles.timeSlotValue}>
            {timeSlot.startTime} - {timeSlot.endTime}
            {timeSlot.label && ` (${timeSlot.label})`}
          </Text>
        </View>
        
        <View style={styles.submissionWindowInfo}>
          <MaterialCommunityIcons name="information" size={14} color="#868e96" />
          <Text style={styles.submissionWindowText}>
            Submit within 30 minutes after {timeSlot.endTime}
          </Text>
        </View>
      </LinearGradient>
    );
  };

  const renderPhotoSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Proof Photo *</Text>
      <Text style={styles.sectionDescription}>
        Take or upload a photo as proof of completion
      </Text>
      
      {photo ? (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoActionButton} onPress={pickImage}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoActionGradient}
              >
                <MaterialCommunityIcons name="image-edit" size={14} color="#495057" />
                <Text style={styles.photoActionText}>Change</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoActionGradient}
              >
                <MaterialCommunityIcons name="camera" size={14} color="#495057" />
                <Text style={styles.photoActionText}>Retake</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.photoActionButton} 
              onPress={() => setPhoto(null)}
            >
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.photoActionGradient, styles.removeGradient]}
              >
                <MaterialCommunityIcons name="delete" size={14} color="#fa5252" />
                <Text style={[styles.photoActionText, styles.removeText]}>Remove</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.photoUploadOptions}>
          <TouchableOpacity style={styles.photoOption} onPress={takePhoto}>
            <LinearGradient
              colors={['#e7f5ff', '#d0ebff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.photoOptionGradient}
            >
              <MaterialCommunityIcons name="camera" size={28} color="#2b8a3e" />
              <Text style={styles.photoOptionText}>Take Photo</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.photoOption} onPress={pickImage}>
            <LinearGradient
              colors={['#e7f5ff', '#d0ebff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.photoOptionGradient}
            >
              <MaterialCommunityIcons name="image" size={28} color="#2b8a3e" />
              <Text style={styles.photoOptionText}>Choose from Gallery</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      
      {errors.photo && (
        <Text style={styles.errorText}>{errors.photo}</Text>
      )}
    </View>
  );

  const renderNotesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notes (Optional)</Text>
      <Text style={styles.sectionDescription}>
        Add any additional information about your completion
      </Text>
      
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.notesGradient, errors.notes && styles.inputError]}
      >
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={(text) => {
            setNotes(text);
            if (errors.notes) setErrors(prev => ({ ...prev, notes: undefined }));
          }}
          placeholder="Describe what you did, any issues encountered, or additional details..."
          placeholderTextColor="#adb5bd"
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
      </LinearGradient>
      
      <View style={styles.notesFooter}>
        <Text style={styles.charCount}>
          {notes.length}/500 characters
        </Text>
        {errors.notes && (
          <Text style={styles.errorText}>{errors.notes}</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              Complete Assignment
            </Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Task Info */}
            <View style={styles.taskInfoSection}>
              <Text style={styles.taskTitle}>{taskTitle}</Text>
              
              <View style={styles.taskDetails}>
                <View style={styles.taskDetailRow}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#868e96" />
                  <Text style={styles.taskDetailText}>
                    Due: {new Date(dueDate).toLocaleDateString()}
                  </Text>
                </View>
                
                {timeSlot && (
                  <View style={styles.taskDetailRow}>
                    <MaterialCommunityIcons name="clock" size={16} color="#868e96" />
                    <Text style={styles.taskDetailText}>
                      Time Slot: {timeSlot.startTime} - {timeSlot.endTime}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Time Info */}
            {renderTimeInfo()}

            {/* Photo Upload */}
            {renderPhotoSection()}

            {/* Notes */}
            {renderNotesSection()}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isSubmittable || submitting) && styles.submitButtonDisabled,
                timeStatus === 'wrong_day' && styles.submitButtonWrongDay
              ]}
              onPress={submitCompletion}
              disabled={!isSubmittable || submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  !isSubmittable || submitting ? ['#f8f9fa', '#e9ecef'] :
                  timeStatus === 'submission_open' ? ['#2b8a3e', '#1e6b2c'] :
                  ['#868e96', '#6c757d']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={!isSubmittable ? "#495057" : "white"} />
                ) : (
                  <View style={styles.submitButtonContent}>
                    <MaterialCommunityIcons 
                      name={timeStatus === 'submission_open' ? "check-circle" : "clock"} 
                      size={20} 
                      color={!isSubmittable ? "#868e96" : "white"} 
                    />
                    <Text style={[
                      styles.submitButtonText,
                      !isSubmittable && styles.submitButtonTextDisabled
                    ]}>
                      {timeStatus === 'submission_open' ? 'Submit Completion' : 
                       timeStatus === 'waiting' ? `Wait Until ${timeSlot?.endTime}` :
                       timeStatus === 'wrong_day' ? 'Wrong Day - Cannot Submit' :
                       'Submission Closed'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            {timeStatus === 'wrong_day' && (
              <Text style={styles.disabledText}>
                This assignment can only be submitted on the due date: {new Date(dueDate).toLocaleDateString()}
              </Text>
            )}
            
            {timeStatus === 'waiting' && timeLeft !== null && (
              <Text style={styles.waitingText}>
                Submit after {timeSlot?.endTime} (in {formatTime(timeLeft)})
              </Text>
            )}
            
            {timeStatus === 'expired' && (
              <Text style={styles.expiredMessage}>
                The 30-minute grace period has ended. Please contact an administrator.
              </Text>
            )}
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  keyboardView: {
    flex: 1
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
  taskInfoSection: {
    marginBottom: 24
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12
  },
  taskDetails: {
    gap: 8
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  taskDetailText: {
    fontSize: 14,
    color: '#495057'
  },
  timeInfoContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  timeOpen: {
    borderColor: '#b2f2bb',
  },
  timeWarning: {
    borderColor: '#ffec99',
  },
  timeCritical: {
    borderColor: '#ffc9c9',
  },
  timeWrongDay: {
    borderColor: '#e9ecef',
  },
  timeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  timeInfoTitle: {
    fontSize: 15,
    fontWeight: '600'
  },
  timeWarningText: {
    color: '#e67700'
  },
  timeCriticalText: {
    color: '#fa5252'
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  timeInstructions: {
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8
  },
  timeMessage: {
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 8
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8
  },
  warningText: {
    fontSize: 13,
    color: '#e67700',
    fontWeight: '500'
  },
  scheduleInfo: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 4
  },
  timeSlotInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#868e96',
    marginRight: 4
  },
  timeSlotValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057'
  },
  submissionWindowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
  },
  submissionWindowText: {
    fontSize: 11,
    color: '#868e96',
    fontStyle: 'italic'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6
  },
  sectionDescription: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 12,
    lineHeight: 18
  },
  photoUploadOptions: {
    flexDirection: 'row',
    gap: 12
  },
  photoOption: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  photoOptionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  photoOptionText: {
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: '500',
    textAlign: 'center'
  },
  photoPreviewContainer: {
    alignItems: 'center'
  },
  photoPreview: {
    width: width - 72,
    height: (width - 72) * 0.75,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  photoActionButton: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 80,
  },
  photoActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  removeGradient: {
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  photoActionText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500'
  },
  removeText: {
    color: '#fa5252'
  },
  notesGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  notesInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212529',
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: '#fa5252',
  },
  notesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  charCount: {
    fontSize: 11,
    color: '#868e96'
  },
  errorText: {
    fontSize: 12,
    color: '#fa5252',
    marginTop: 4
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonWrongDay: {
    opacity: 0.7,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  submitButtonTextDisabled: {
    color: '#868e96'
  },
  disabledText: {
    fontSize: 13,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic'
  },
  waitingText: {
    fontSize: 13,
    color: '#e67700',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic'
  },
  expiredMessage: {
    fontSize: 13,
    color: '#fa5252',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic'
  }
});