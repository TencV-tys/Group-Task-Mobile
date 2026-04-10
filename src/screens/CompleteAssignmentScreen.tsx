// src/screens/CompleteAssignmentScreen.tsx - COMPLETE FIXED with auto-detection and submission disable

import React, { useEffect, useState, useRef } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { makeCompleteAssignmentStyles } from '../styles/completeAssignment.styles';

const { width } = Dimensions.get('window');

export default function CompleteAssignmentScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const styles = makeCompleteAssignmentStyles(theme);
  const { assignmentId, taskTitle, dueDate, timeSlot, timeSlots, onCompleted } = route.params || {};
  
  // ✅ AUTO-DETECT which time slot to use
  const assignmentTimeSlotId = timeSlot?.id;
  const isMultiSlotTask = timeSlots && timeSlots.length > 1;
  const needsManualSelection = isMultiSlotTask && !assignmentTimeSlotId;
  
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(assignmentTimeSlotId || null);
  const [hasSubmitted, setHasSubmitted] = useState(false); // ✅ Track if already submitted
  const isMounted = useRef(true);
  
  console.log('🎯 [CompleteAssignmentScreen]', {
    assignmentTimeSlotId,
    isMultiSlotTask,
    needsManualSelection,
    selectedTimeSlotId,
    hasSubmitted
  });
  
  const {
    timeLeft, 
    isSubmittable,
    submitting,
    photo,
    notes,
    errors,
    timeStatus,
    isLate,
    authError,
    lastSubmitSuccess, // ✅ Get success state from hook
    setNotes,
    setPhoto,
    formatTime,   
    getTimeStatusMessage,
    pickImage,
    takePhoto, 
    submitCompletion,
    resetSubmitSuccess,
    clearAuthError
  } = useCompleteAssignment(assignmentId, taskTitle, dueDate, timeSlot, onCompleted);

  // ✅ Monitor submission success from hook
  useEffect(() => {
    if (lastSubmitSuccess && isMounted.current) {
      console.log('✅✅✅ Submission was successful! Disabling submit button.');
      setHasSubmitted(true);
      // Reset after a delay (optional)
      setTimeout(() => {
        if (isMounted.current) {
          resetSubmitSuccess();
        }
      }, 1000);
    }
  }, [lastSubmitSuccess, resetSubmitSuccess]);

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => { clearAuthError(); navigation.navigate('Login'); } }
      ]);
    }
  }, [authError, navigation, clearAuthError]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = async () => {
    // ✅ Prevent multiple submissions after success
    if (hasSubmitted) {
      console.log('🚫 Assignment already submitted, ignoring duplicate submit');
      Alert.alert('Already Submitted', 'This assignment has already been submitted successfully.');
      return;
    }
    
    if (submitting) {
      console.log('⏳ Already submitting, please wait...');
      return;
    }
    
    if (needsManualSelection && !selectedTimeSlotId) {
      Alert.alert('Select Time Slot', 'Please select which time slot you are completing');
      return;
    }
    
    const finalTimeSlotId = assignmentTimeSlotId || selectedTimeSlotId;
    
    console.log('📤 [Screen] Submitting with timeSlotId:', finalTimeSlotId);
    
    // Call submit and wait for result
    const result = await submitCompletion(finalTimeSlotId);
    
    // ✅ If successful, disable the button immediately
    if (result.success) {
      console.log('✅ [Screen] Submit successful, disabling button');
      setHasSubmitted(true);
      
      // Optional: Navigate back after a short delay
      setTimeout(() => {
        if (isMounted.current) {
          // navigation.goBack(); // Uncomment if you want auto-navigation
        }
      }, 2000);
    }
  };

  const renderTimeSlotSelector = () => {
    if (!needsManualSelection || !timeSlots) return null;
    
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Time Slot *</Text>
        <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
          Choose which time slot you are completing
        </Text>
        
        {timeSlots.map((slot: any) => {
          const isSelected = selectedTimeSlotId === slot.id;
          const slotTime = `${slot.startTime} - ${slot.endTime}`;
          
          return (
            <TouchableOpacity 
              key={slot.id} 
              onPress={() => !hasSubmitted && !submitting && setSelectedTimeSlotId(slot.id)} // ✅ Disable if submitted or submitting
              activeOpacity={0.7}
              disabled={hasSubmitted || submitting}
            >
              <LinearGradient
                colors={isSelected ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
                style={[
                  styles.timeSlotCard,
                  isSelected && styles.timeSlotCardSelected,
                  { borderColor: isSelected ? theme.primary : theme.border },
                  (hasSubmitted || submitting) && styles.disabledCard
                ]}
              >
                <View style={styles.radioButton}>
                  {isSelected && <View style={[styles.radioButtonInner, { backgroundColor: theme.primary }]} />}
                </View>
                <View style={styles.timeSlotInfo}>
                  <Text style={[styles.timeSlotTitle, { color: theme.text }]}>{slotTime}</Text>
                  <Text style={[styles.timeSlotPoints, { color: theme.primary }]}>{slot.points || 0} pts</Text>
                  {slot.label && <Text style={[styles.timeSlotLabel, { color: theme.textMuted }]}>{slot.label}</Text>}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTimeInfo = () => {
    const currentSlot = assignmentTimeSlotId ? timeSlot : (selectedTimeSlotId ? timeSlots?.find((s: any) => s.id === selectedTimeSlotId) : timeSlot);
    if (!currentSlot && !isMultiSlotTask) return null;

    const timeStatusMsg = getTimeStatusMessage();
    const isCritical = timeLeft !== null && timeLeft < 300;
    const isWarning = timeLeft !== null && timeLeft < 600;
    
    const openTimeFormatted = new Date();
    const [endHour, endMinute] = (currentSlot?.endTime || '18:00').split(':').map(Number);
    openTimeFormatted.setHours(endHour, endMinute, 0, 0);
    const openTimeString = openTimeFormatted.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const lateThresholdTime = new Date(openTimeFormatted.getTime() + 25 * 60000);
    const lateThresholdString = lateThresholdTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
    return (
      <LinearGradient
        colors={
          timeStatus === 'expired' ? [theme.errorBg, theme.errorBg] :
          timeStatus === 'waiting' ? [theme.primaryLight, theme.primaryLight] :
          timeStatus === 'submission_open' && isLate ? [theme.primaryLight, theme.primaryLight] :
          timeStatus === 'submission_open' ? [theme.primaryLight, theme.primaryLight] :
          timeStatus === 'wrong_day' ? [theme.bgSecondary, theme.bgTertiary] :
          [theme.bgSecondary, theme.bgTertiary]
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
          <MaterialCommunityIcons name={timeStatusMsg.icon as any} size={20} color={timeStatusMsg.color} />
          <Text style={[styles.timeInfoTitle, { color: timeStatusMsg.color }]}>{timeStatusMsg.title}</Text>
        </View>
        
        {timeStatus === 'submission_open' && timeLeft !== null && !hasSubmitted ? (
          <>
            <Text style={[styles.timerText, isCritical && styles.timeCriticalText, isWarning && styles.timeWarningText, { color: timeStatusMsg.color }]}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={[styles.timeInstructions, { color: theme.textSecondary }]}>
              {isLate ? 'Late submission - points will be reduced' : `On-time until ${lateThresholdString} - submit now!`}
            </Text>
            {isWarning && !isLate && (
              <View style={styles.warningMessage}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={theme.primary} />
                <Text style={[styles.warningText, { color: theme.primary }]}>
                  {isCritical ? 'Late threshold approaching!' : 'On-time window ending soon'}
                </Text>
              </View>
            )}
            {isLate && (
              <View style={styles.warningMessage}>
                <MaterialCommunityIcons name="timer-alert" size={16} color={theme.primary} />
                <Text style={[styles.warningText, { color: theme.primary }]}>Submitting late - points will be reduced</Text>
              </View>
            )}
          </>
        ) : timeStatus === 'waiting' && timeLeft !== null && !hasSubmitted ? (
          <>
            <Text style={[styles.timerText, { color: timeStatusMsg.color }]}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.timeInstructions, { color: theme.textSecondary }]}>Submission opens at {openTimeString}</Text>
            <Text style={[styles.scheduleInfo, { color: theme.textMuted }]}>
              On-time: {openTimeString} - {lateThresholdString} | Late: {lateThresholdString} - {(() => {
                const graceEnd = new Date(openTimeFormatted.getTime() + 30 * 60000);
                return graceEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              })()}
            </Text>
          </>
        ) : hasSubmitted ? (
          <View style={styles.successMessageContainer}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#2b8a3e" />
            <Text style={[styles.successMessage, { color: '#2b8a3e' }]}>✓ Assignment Submitted Successfully!</Text>
            <Text style={[styles.successSubMessage, { color: theme.textMuted }]}>Waiting for admin verification</Text>
          </View>
        ) : (
          <Text style={[styles.timeMessage, { color: theme.textSecondary }]}>{timeStatusMsg.message}</Text>
        )}
        
        <View style={[styles.timeSlotInfo, { borderTopColor: theme.border }]}>
          <Text style={[styles.timeSlotLabel, { color: theme.textMuted }]}>Time Slot:</Text>
          <Text style={[styles.timeSlotValue, { color: theme.textSecondary }]}>
            {currentSlot ? `${currentSlot.startTime} - ${currentSlot.endTime}` : 'Select a time slot below'}
          </Text>
        </View>
      </LinearGradient>
    );
  };

  const renderPhotoSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Proof Photo *</Text>
      <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>Take or upload a photo as proof of completion</Text>
      
      {photo ? (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
          <View style={styles.photoActions}>
            <TouchableOpacity 
              style={styles.photoActionButton} 
              onPress={pickImage}
              disabled={hasSubmitted || submitting}
            >
              <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.photoActionGradient}>
                <MaterialCommunityIcons name="image-edit" size={14} color={theme.textSecondary} />
                <Text style={[styles.photoActionText, { color: theme.textSecondary }]}>Change</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.photoActionButton} 
              onPress={takePhoto}
              disabled={hasSubmitted || submitting}
            >
              <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.photoActionGradient}>
                <MaterialCommunityIcons name="camera" size={14} color={theme.textSecondary} />
                <Text style={[styles.photoActionText, { color: theme.textSecondary }]}>Retake</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.photoActionButton} 
              onPress={() => !hasSubmitted && !submitting && setPhoto(null)}
              disabled={hasSubmitted || submitting}
            >
              <LinearGradient colors={[theme.errorBg, theme.errorBg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.photoActionGradient, styles.removeGradient]}>
                <MaterialCommunityIcons name="delete" size={14} color={theme.error} />
                <Text style={[styles.photoActionText, styles.removeText, { color: theme.error }]}>Remove</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.photoUploadOptions}>
          <TouchableOpacity 
            style={styles.photoOption} 
            onPress={takePhoto}
            disabled={hasSubmitted || submitting}
          >
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.photoOptionGradient}>
              <MaterialCommunityIcons name="camera" size={28} color={theme.primary} />
              <Text style={[styles.photoOptionText, { color: theme.primary }]}>Take Photo</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.photoOption} 
            onPress={pickImage}
            disabled={hasSubmitted || submitting}
          >
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.photoOptionGradient}>
              <MaterialCommunityIcons name="image" size={28} color={theme.primary} />
              <Text style={[styles.photoOptionText, { color: theme.primary }]}>Choose from Gallery</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      {errors.photo && <Text style={[styles.errorText, { color: theme.error }]}>{errors.photo}</Text>}
    </View>
  );

  const renderNotesSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes (Optional)</Text>
      <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>Add any additional information about your completion</Text>
      
      <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.notesGradient, errors.notes && styles.inputError, { borderColor: theme.border }]}>
        <TextInput
          style={[styles.notesInput, { color: theme.text }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Describe what you did, any issues encountered, or additional details..."
          placeholderTextColor={theme.textPlaceholder}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
          selectionColor={theme.primary}
          editable={!hasSubmitted && !submitting}
        />
      </LinearGradient>
      
      <View style={styles.notesFooter}>
        <Text style={[styles.charCount, { color: theme.textMuted }]}>{notes.length}/500 characters</Text>
        {errors.notes && <Text style={[styles.errorText, { color: theme.error }]}>{errors.notes}</Text>}
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        disabled={submitting}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>Complete Assignment</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );

  // ✅ Updated submit disabled logic
  const isSubmitDisabled = hasSubmitted || submitting || !isSubmittable || (needsManualSelection && !selectedTimeSlotId);

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        {renderHeader()}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[theme.card, theme.bgSecondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.taskInfoSection}>
              <Text style={[styles.taskTitle, { color: theme.text }]}>{taskTitle}</Text>
              <View style={styles.taskDetails}>
                <View style={styles.taskDetailRow}>
                  <MaterialCommunityIcons name="calendar" size={16} color={theme.textMuted} />
                  <Text style={[styles.taskDetailText, { color: theme.textSecondary }]}>Due: {new Date(dueDate).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>

            {renderTimeSlotSelector()}
            {renderTimeInfo()}
            {renderPhotoSection()}
            {renderNotesSection()}

            <TouchableOpacity 
              style={[
                styles.submitButton, 
                isSubmitDisabled && styles.submitButtonDisabled, 
                timeStatus === 'wrong_day' && styles.submitButtonWrongDay,
                hasSubmitted && styles.submitButtonSuccess
              ]} 
              onPress={handleSubmit} 
              disabled={isSubmitDisabled} 
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  hasSubmitted ? ['#2b8a3e', '#2b8a3e'] :
                  isSubmitDisabled ? [theme.bgSecondary, theme.bgTertiary] : 
                  timeStatus === 'submission_open' && isLate ? [theme.primary, theme.primaryDark] : 
                  timeStatus === 'submission_open' ? [theme.primary, theme.primaryDark] : 
                  [theme.textMuted, theme.textMuted]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : hasSubmitted ? (
                  <View style={styles.submitButtonContent}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                    <Text style={[styles.submitButtonText, { color: "#fff" }]}>✓ Submitted Successfully!</Text>
                  </View>
                ) : (
                  <View style={styles.submitButtonContent}>
                    <MaterialCommunityIcons name={timeStatus === 'submission_open' ? (isLate ? "timer-alert" : "check-circle") : "clock"} size={20} color={!isSubmitDisabled ? "#fff" : theme.textMuted} />
                    <Text style={[styles.submitButtonText, !isSubmitDisabled && styles.submitButtonTextDisabled, { color: !isSubmitDisabled ? "#fff" : theme.textMuted }]}>
                      {needsManualSelection && !selectedTimeSlotId ? 'Select Time Slot First' : 
                       hasSubmitted ? 'Already Submitted' :
                       timeStatus === 'submission_open' ? (isLate ? 'Submit Late (Points Reduced)' : 'Submit On-Time') : 
                       timeStatus === 'waiting' ? `Opens at ${timeSlot?.endTime}` : 
                       timeStatus === 'wrong_day' ? 'Wrong Day' : 'Submission Closed'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            {timeStatus === 'wrong_day' && <Text style={[styles.disabledText, { color: theme.textMuted }]}>This assignment can only be submitted on the due date: {new Date(dueDate).toLocaleDateString()}</Text>}
            {timeStatus === 'waiting' && timeLeft !== null && !hasSubmitted && <Text style={[styles.waitingText, { color: theme.primary }]}>Submission opens at {timeSlot?.endTime} ({formatTime(timeLeft)} remaining)</Text>}
            {timeStatus === 'expired' && !hasSubmitted && <Text style={[styles.expiredMessage, { color: theme.error }]}>The 30-minute grace period has ended. Please contact an administrator.</Text>}
            {hasSubmitted && <Text style={[styles.successFooter, { color: theme.textMuted }]}>You can now close this screen. Your submission is pending admin approval.</Text>}
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}