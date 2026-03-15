// src/screens/CompleteAssignmentScreen.tsx - CLEAN with separated concerns
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCompleteAssignment } from '../hooks/useCompleteAssignment';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { completeAssignmentStyles as styles } from '../styles/completeAssignment.styles';

const { width } = Dimensions.get('window');

export default function CompleteAssignmentScreen({ navigation, route }: any) {
  const { assignmentId, taskTitle, dueDate, timeSlot, onCompleted } = route.params || {};
  
  // ===== HOOK - ALL LOGIC IS HERE =====
  const {
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
    setNotes,
    setPhoto,
    
    // Helper functions
    formatTime,
    getTimeStatusMessage,
    
    // Actions
    pickImage,
    takePhoto,
    submitCompletion,
    clearAuthError
  } = useCompleteAssignment(assignmentId, taskTitle, dueDate, timeSlot, onCompleted);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          {
            text: 'OK',
            onPress: () => {
              clearAuthError();
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation, clearAuthError]);

  // ===== RENDER TIME INFO =====
  const renderTimeInfo = () => {
    if (!timeSlot) return null;

    const timeStatusMsg = getTimeStatusMessage();
    const isCritical = timeLeft !== null && timeLeft < 300; // Less than 5 minutes
    const isWarning = timeLeft !== null && timeLeft < 600; // Less than 10 minutes
    
    // Format the opening time
    const openTimeFormatted = new Date();
    const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
    openTimeFormatted.setHours(endHour, endMinute, 0, 0);
    const openTimeString = openTimeFormatted.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Format late threshold time (25 minutes after end)
    const lateThresholdTime = new Date(openTimeFormatted.getTime() + 25 * 60000);
    const lateThresholdString = lateThresholdTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    return (
      <LinearGradient
        colors={
          timeStatus === 'expired' ? ['#fff5f5', '#ffe3e3'] :
          timeStatus === 'waiting' ? ['#fff3bf', '#ffec99'] :
          timeStatus === 'submission_open' && isLate ? ['#fff3bf', '#ffec99'] :
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
          timeStatus === 'submission_open' && isLate && styles.timeWarning,
          timeStatus === 'submission_open' && !isLate && styles.timeOpen,
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
              {isLate 
                ? 'Late submission - points will be reduced' 
                : `On-time until ${lateThresholdString} - submit now!`}
            </Text>
            
            {isWarning && !isLate && (
              <View style={styles.warningMessage}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#e67700" />
                <Text style={styles.warningText}>
                  {isCritical ? 'Late threshold approaching!' : 'On-time window ending soon'}
                </Text>
              </View>
            )}
            
            {isLate && (
              <View style={styles.warningMessage}>
                <MaterialCommunityIcons name="timer-alert" size={16} color="#e67700" />
                <Text style={styles.warningText}>
                  Submitting late - points will be reduced
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
              Submission opens at {openTimeString}
            </Text>
            <Text style={styles.scheduleInfo}>
              On-time: {openTimeString} - {lateThresholdString} | Late: {lateThresholdString} - {(() => {
                const graceEnd = new Date(openTimeFormatted.getTime() + 30 * 60000);
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
            On-time: Until {lateThresholdString} | Late: Until {(() => {
              const graceEnd = new Date(openTimeFormatted.getTime() + 30 * 60000);
              return graceEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            })()}
          </Text>
        </View>
      </LinearGradient>
    );
  };

  // ===== RENDER PHOTO SECTION =====
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

  // ===== RENDER NOTES SECTION =====
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

  // ===== RENDER HEADER =====
  const renderHeader = () => (
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
  );

  return (
    <ScreenWrapper style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {renderHeader()}

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
                  timeStatus === 'submission_open' && isLate ? ['#e67700', '#cc5f00'] :
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
                      name={timeStatus === 'submission_open' ? (isLate ? "timer-alert" : "check-circle") : "clock"} 
                      size={20} 
                      color={!isSubmittable ? "#868e96" : "white"} 
                    />
                    <Text style={[
                      styles.submitButtonText,
                      !isSubmittable && styles.submitButtonTextDisabled
                    ]}>
                      {timeStatus === 'submission_open' 
                        ? (isLate ? 'Submit Late (Points Reduced)' : 'Submit On-Time')
                       : timeStatus === 'waiting' 
                        ? `Opens at ${timeSlot?.endTime}`
                       : timeStatus === 'wrong_day' 
                        ? 'Wrong Day'
                       : 'Submission Closed'}
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
                Submission opens at {timeSlot?.endTime} ({formatTime(timeLeft)} remaining)
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
    </ScreenWrapper>
  );
}