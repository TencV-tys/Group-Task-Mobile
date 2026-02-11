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
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssignmentService } from '../AssignmentServices/AssignmentService';

const { width } = Dimensions.get('window');

export default function CompleteAssignmentScreen({ navigation, route }: any) {
  const { assignmentId, taskTitle, dueDate, timeSlot, onCompleted } = route.params || {};
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmittable, setIsSubmittable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ photo?: string; notes?: string }>({});

  useEffect(() => {
    if (timeSlot) {
      startCountdownTimer();
    }
  }, [timeSlot]);

  const startCountdownTimer = () => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
      
      const endTime = new Date(today);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      // 30 minute grace period after end time
      const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000);
      
      const diff = gracePeriodEnd.getTime() - now.getTime();
      
      if (diff <= 0) {
        setIsSubmittable(false);
        setTimeLeft(0);
        return;
      }
      
      setTimeLeft(Math.floor(diff / 1000));
      setIsSubmittable(true);
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
      'Time Expired',
      'Submission time has passed. Please contact an administrator if this is an error.',
      [{ text: 'OK' }]
    );
    return;
  }

  if (!validateSubmission()) return;

  setSubmitting(true);
  
  try {
    // Create a File from the photo URI for upload
    let photoFile: File | undefined = undefined;
    
    if (photo) {
      const filename = photo.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Fetch the image and create a blob
      const response = await fetch(photo);
      const blob = await response.blob();
      
      photoFile = new File([blob], filename || 'photo.jpg', { type });
    }

    // Call the AssignmentService with correct parameters
    const result = await AssignmentService.completeAssignment(assignmentId, {
      notes,
      photoUri: photo || undefined, // Convert null to undefined
      photoFile: photoFile // Pass the File object (already undefined if no photo)
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
    if (!timeSlot || timeLeft === null) return null;

    const isWarning = timeLeft < 300; // Less than 5 minutes
    const isCritical = timeLeft < 60; // Less than 1 minute
    
    return (
      <View style={[
        styles.timeInfoContainer,
        isCritical && styles.timeCritical,
        isWarning && styles.timeWarning
      ]}>
        <View style={styles.timeInfoHeader}>
          <MaterialCommunityIcons 
            name={isSubmittable ? "timer" : "timer-off"} 
            size={20} 
            color={isSubmittable ? (isWarning ? "#e67700" : "#2b8a3e") : "#fa5252"} 
          />
          <Text style={[
            styles.timeInfoTitle,
            isCritical && styles.timeCriticalText,
            isWarning && styles.timeWarningText
          ]}>
            {isSubmittable ? 'Time Remaining' : 'Time Expired'}
          </Text>
        </View>
        
        {isSubmittable ? (
          <>
            <Text style={[
              styles.timerText,
              isCritical && styles.timeCriticalText,
              isWarning && styles.timeWarningText
            ]}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={styles.timeInstructions}>
              Submit before the timer runs out to receive full points
            </Text>
            
            {isWarning && (
              <View style={styles.warningMessage}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#e67700" />
                <Text style={styles.warningText}>
                  Hurry! Submission closing soon
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.expiredText}>
            The submission window has closed. Please contact an administrator.
          </Text>
        )}
      </View>
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
              <MaterialCommunityIcons name="image-edit" size={16} color="#007AFF" />
              <Text style={styles.photoActionText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
              <MaterialCommunityIcons name="camera" size={16} color="#007AFF" />
              <Text style={styles.photoActionText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.photoActionButton, styles.removeButton]} 
              onPress={() => setPhoto(null)}
            >
              <MaterialCommunityIcons name="delete" size={16} color="#fa5252" />
              <Text style={[styles.photoActionText, styles.removeText]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.photoUploadOptions}>
          <TouchableOpacity style={styles.photoOption} onPress={takePhoto}>
            <MaterialCommunityIcons name="camera" size={32} color="#007AFF" />
            <Text style={styles.photoOptionText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.photoOption} onPress={pickImage}>
            <MaterialCommunityIcons name="image" size={32} color="#007AFF" />
            <Text style={styles.photoOptionText}>Choose from Gallery</Text>
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
      
      <TextInput
        style={[styles.notesInput, errors.notes && styles.inputError]}
        value={notes}
        onChangeText={(text) => {
          setNotes(text);
          if (errors.notes) setErrors(prev => ({ ...prev, notes: undefined }));
        }}
        placeholder="Describe what you did, any issues encountered, or additional details..."
        multiline
        numberOfLines={4}
        maxLength={500}
        textAlignVertical="top"
      />
      
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
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              Complete Assignment
            </Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* Task Info */}
            <View style={styles.taskInfoSection}>
              <Text style={styles.taskTitle}>{taskTitle}</Text>
              
              <View style={styles.taskDetails}>
                <View style={styles.taskDetailRow}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#6c757d" />
                  <Text style={styles.taskDetailText}>
                    Due: {new Date(dueDate).toLocaleDateString()}
                  </Text>
                </View>
                
                {timeSlot && (
                  <View style={styles.taskDetailRow}>
                    <MaterialCommunityIcons name="clock" size={16} color="#6c757d" />
                    <Text style={styles.taskDetailText}>
                      Time: {timeSlot.startTime} - {timeSlot.endTime}
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

            {/* Submission Info */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information" size={20} color="#6c757d" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Submission Information</Text>
                <Text style={styles.infoText}>
                  • Photo is required as proof{'\n'}
                  • Submit within the allowed time window{'\n'}
                  • Your submission will be reviewed by an administrator{'\n'}
                  • Points will be awarded after verification
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isSubmittable || submitting) && styles.submitButtonDisabled
              ]}
              onPress={submitCompletion}
              disabled={!isSubmittable || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View style={styles.submitButtonContent}>
                  <MaterialCommunityIcons name="check-circle" size={22} color="white" />
                  <Text style={styles.submitButtonText}>
                    {isSubmittable ? 'Submit Completion' : 'Submission Closed'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {!isSubmittable && (
              <Text style={styles.disabledText}>
                The submission window has ended. Please contact an administrator.
              </Text>
            )}
          </View>
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
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '400'
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  taskInfoSection: {
    marginBottom: 24
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '600',
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
    fontSize: 15,
    color: '#6c757d'
  },
  timeInfoContainer: {
    backgroundColor: '#d3f9d8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#8ce99a'
  },
  timeWarning: {
    backgroundColor: '#fff3bf',
    borderColor: '#ffd43b'
  },
  timeCritical: {
    backgroundColor: '#ffc9c9',
    borderColor: '#fa5252'
  },
  timeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  timeInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2b8a3e'
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
    color: '#2b8a3e',
    marginBottom: 8
  },
  timeInstructions: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8
  },
  warningText: {
    fontSize: 14,
    color: '#e67700',
    fontWeight: '500'
  },
  expiredText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
    lineHeight: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 18
  },
  photoUploadOptions: {
    flexDirection: 'row',
    gap: 16
  },
  photoOption: {
    flex: 1,
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  photoOptionText: {
    fontSize: 14,
    color: '#1864ab',
    fontWeight: '500',
    textAlign: 'center'
  },
  photoPreviewContainer: {
    alignItems: 'center'
  },
  photoPreview: {
    width: width - 72,
    height: (width - 72) * 0.75,
    borderRadius: 8,
    marginBottom: 12
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  removeButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffc9c9'
  },
  photoActionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500'
  },
  removeText: {
    color: '#fa5252'
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top'
  },
  inputError: {
    borderColor: '#fa5252'
  },
  notesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  charCount: {
    fontSize: 12,
    color: '#868e96'
  },
  errorText: {
    fontSize: 14,
    color: '#fa5252',
    marginTop: 4
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 12
  },
  infoContent: {
    flex: 1
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20
  },
  submitButton: {
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
    padding: 18
  },
  submitButtonDisabled: {
    backgroundColor: '#868e96'
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  disabledText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic'
  }
});