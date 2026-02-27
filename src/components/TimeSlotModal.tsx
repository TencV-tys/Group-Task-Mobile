// src/components/TimeSlotModal.tsx - COMPLETE WITH AUTO END TIME
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal as RNModal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  convertTo24Hour,
  convertTo12Hour,
  validateTimeSlot,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  PERIOD_OPTIONS
} from '../utils/timeUtils';

interface TimeSlot {
  startTime: string;
  endTime: string;
  label?: string;
  points?: string;
}

interface TimeSlotModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (slot: TimeSlot) => void;
  editingSlot: TimeSlot | null;
  totalTaskPoints: number;
  usedPoints: number;
  maxPointsPerSlot?: number;
}

export const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  visible,
  onClose,
  onSave,
  editingSlot, 
  totalTaskPoints,
  usedPoints,
  maxPointsPerSlot = 10
}) => {
  const [currentStep, setCurrentStep] = useState<'time' | 'details'>('time');
  const [startTime, setStartTime] = useState({
    hour: '8',
    minute: '00',
    period: 'AM'
  });
  
  const [endTime, setEndTime] = useState({
    hour: '9',
    minute: '00',
    period: 'AM'
  });
  
  const [label, setLabel] = useState('');
  const [points, setPoints] = useState('');
  const [error, setError] = useState<string>('');

  // Helper function to calculate end time from start time
  const getDefaultEndTime = (startHour: string, startMinute: string, startPeriod: string) => {
    let hour = parseInt(startHour, 10);
    const minute = startMinute;
    let period = startPeriod;
    
    // Add 1 hour
    hour += 1;
    
    // Handle hour rollover and period changes
    if (hour === 12) {
      // 11 AM + 1 = 12 PM, 11 PM + 1 = 12 AM
      return {
        hour: '12',
        minute,
        period: period === 'AM' ? 'PM' : 'AM'
      };
    } else if (hour === 13) {
      // 12 PM + 1 = 1 PM, 12 AM + 1 = 1 AM
      return {
        hour: '1',
        minute,
        period: period // stays the same
      };
    } else if (hour > 12) {
      // 1 PM + 1 = 2 PM (keep same period)
      return {
        hour: (hour - 12).toString(),
        minute,
        period: period
      };
    } else {
      // Regular hours (1-11)
      return {
        hour: hour.toString(),
        minute,
        period: period
      };
    }
  };

  // Update end time when start time changes (but not when editing)
  useEffect(() => {
    if (!editingSlot && currentStep === 'time') {
      const newEndTime = getDefaultEndTime(startTime.hour, startTime.minute, startTime.period);
      setEndTime(newEndTime);
    }
  }, [startTime, editingSlot, currentStep]);

  useEffect(() => {
    if (editingSlot) {
      const start12 = convertTo12Hour(editingSlot.startTime);
      const end12 = convertTo12Hour(editingSlot.endTime);
      setStartTime(start12);
      setEndTime(end12);
      setLabel(editingSlot.label || '');
      setPoints(editingSlot.points || '');
    } else {
      setStartTime({ hour: '8', minute: '00', period: 'AM' });
      setEndTime({ hour: '9', minute: '00', period: 'AM' });
      setLabel('');
      setPoints('');
    }
    setError('');
    setCurrentStep('time');
  }, [editingSlot, visible]);

  const handleTimeNext = () => {
    const start24 = convertTo24Hour(startTime.hour, startTime.minute, startTime.period);
    const end24 = convertTo24Hour(endTime.hour, endTime.minute, endTime.period);
    
    if (!validateTimeSlot(start24, end24)) {
      setError('End time must be after start time');
      return;
    }
    
    setCurrentStep('details');
    setError('');
  };

  const handleSave = () => {
    const start24 = convertTo24Hour(startTime.hour, startTime.minute, startTime.period);
    const end24 = convertTo24Hour(endTime.hour, endTime.minute, endTime.period);
    
    const pointsNum = points ? parseInt(points, 10) : 0;
    
    if (points && (isNaN(pointsNum) || pointsNum < 0)) {
      setError('Points must be a valid number');
      return;
    }
    
    if (pointsNum > maxPointsPerSlot) {
      setError(`Maximum ${maxPointsPerSlot} points per time slot`);
      return;
    }
    
    let newTotalPoints;
    if (editingSlot) {
      const currentSlotPoints = parseInt(editingSlot.points || '0', 10);
      newTotalPoints = (usedPoints - currentSlotPoints) + pointsNum;
    } else {
      newTotalPoints = usedPoints + pointsNum;
    }
    
    if (newTotalPoints > totalTaskPoints) {
      setError(`Total points would exceed task limit of ${totalTaskPoints}`);
      return;
    }
    
    onSave({
      startTime: start24,
      endTime: end24,
      label: label.trim() || undefined,
      points: points || '0'
    });
  };

  const checkIfWouldExceed = () => {
    const pointsNum = points ? parseInt(points, 10) : 0;
    const newTotalPoints = editingSlot 
      ? (usedPoints - parseInt(editingSlot.points || '0', 10)) + pointsNum
      : usedPoints + pointsNum;
    return newTotalPoints > totalTaskPoints;
  };

  const renderTimePicker = (
    time: { hour: string; minute: string; period: string },
    setTime: (time: { hour: string; minute: string; period: string }) => void,
    title: string
  ) => (
    <View style={styles.timePickerContainer}>
      <Text style={styles.timePickerTitle}>{title}</Text>
      
      <View style={styles.timeRow}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeLabel}>Hour</Text>
          <View style={styles.numberGrid}>
            {HOUR_OPTIONS.map((hour) => (
              <TouchableOpacity
                key={`hour-${hour}`}
                style={[
                  styles.numberButton,
                  time.hour === hour && styles.numberButtonActive
                ]}
                onPress={() => setTime({ ...time, hour })}
              >
                <LinearGradient
                  colors={time.hour === hour ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.numberButtonGradient}
                >
                  <Text style={[
                    styles.numberText,
                    time.hour === hour && styles.numberTextActive
                  ]}>
                    {hour}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.timeColumn}>
          <Text style={styles.timeLabel}>Minute</Text>
          <View style={styles.numberGrid}>
            {MINUTE_OPTIONS.map((minute) => (
              <TouchableOpacity
                key={`minute-${minute}`}
                style={[
                  styles.numberButton,
                  styles.minuteButton,
                  time.minute === minute && styles.numberButtonActive
                ]}
                onPress={() => setTime({ ...time, minute })}
              >
                <LinearGradient
                  colors={time.minute === minute ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.numberButtonGradient}
                >
                  <Text style={[
                    styles.numberText,
                    time.minute === minute && styles.numberTextActive
                  ]}>
                    {minute}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.timeColumn}>
          <Text style={styles.timeLabel}>AM/PM</Text>
          <View style={styles.periodContainer}>
            {PERIOD_OPTIONS.map((period) => (
              <TouchableOpacity
                key={`period-${period}`}
                style={[
                  styles.periodButton,
                  time.period === period && styles.periodButtonActive
                ]}
                onPress={() => setTime({ ...time, period })}
              >
                <LinearGradient
                  colors={time.period === period ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.periodButtonGradient}
                >
                  <Text style={[
                    styles.periodText,
                    time.period === period && styles.periodTextActive
                  ]}>
                    {period}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      
      <View style={styles.timeDisplay}>
        <Text style={styles.timeDisplayText}>
          {time.hour}:{time.minute} {time.period}
        </Text>
      </View>
    </View>
  );

  const renderTimeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
        <Text style={styles.stepText}>Step 1 of 2: Set Time</Text>
      </View>
      
      <View style={styles.timePickersContainer}>
        {renderTimePicker(startTime, setStartTime, 'Start Time')}
        {renderTimePicker(endTime, setEndTime, 'End Time')}
      </View>
      
      <Text style={styles.autoUpdateNote}>
        ⏰ End time automatically adjusts to 1 hour after start time
      </Text>
    </View>
  );

  const renderDetailsStep = () => {
    const pointsNum = points ? parseInt(points, 10) : 0;
    const availablePoints = totalTaskPoints - usedPoints;
    const wouldExceed = editingSlot
      ? (usedPoints - parseInt(editingSlot.points || '0', 10)) + pointsNum > totalTaskPoints
      : usedPoints + pointsNum > totalTaskPoints;
    
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepIndicator}>
          <View style={styles.stepDot} />
          <View style={[styles.stepLine, styles.stepLineActive]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepText}>Step 2 of 2: Add Details</Text>
        </View>
        
        {/* Time Summary */}
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timeSummary}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#495057" />
          <Text style={styles.timeSummaryText}>
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).hour}:
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).minute} 
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).period}
            {' '}to{' '}
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).hour}:
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).minute} 
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).period}
          </Text>
        </LinearGradient>
        
        {/* Label Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            <MaterialCommunityIcons name="tag-outline" size={14} color="#495057" /> Label (Optional)
          </Text>
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inputGradient}
          >
            <TextInput
              style={styles.input}
              placeholder="e.g., Morning, Lunch, Evening"
              placeholderTextColor="#adb5bd"
              value={label}
              onChangeText={setLabel}
              maxLength={30}
            />
          </LinearGradient>
          <Text style={styles.helperText}>
            Helps identify this time slot
          </Text>
        </View>
        
        {/* Points Input */}
        <View style={styles.inputGroup}>
          <View style={styles.pointsHeader}>
            <Text style={styles.inputLabel}>
              <MaterialCommunityIcons name="star-outline" size={14} color="#495057" /> Points (0-{maxPointsPerSlot})
            </Text>
            <LinearGradient
              colors={availablePoints > 0 ? ['#d3f9d8', '#b2f2bb'] : ['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.availablePointsBadge}
            >
              <Text style={[
                styles.availablePoints,
                availablePoints <= 0 && styles.availablePointsZero
              ]}>
                Available: {availablePoints} pts
              </Text>
            </LinearGradient>
          </View>
          
          <View style={styles.pointsInputContainer}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsInputGradient}
            >
              <TextInput
                style={styles.pointsInput}
                placeholder="0"
                placeholderTextColor="#adb5bd"
                value={points}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num === '' || (parseInt(num, 10) >= 0 && parseInt(num, 10) <= maxPointsPerSlot)) {
                    setPoints(num);
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </LinearGradient>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
          
          {/* Quick Select Buttons */}
          <Text style={styles.quickSelectLabel}>Quick select:</Text>
          <View style={styles.pointsGrid}>
            {Array.from({ length: maxPointsPerSlot + 1 }, (_, i) => i).map((num) => {
              const wouldExceedThisNum = editingSlot
                ? (usedPoints - parseInt(editingSlot.points || '0', 10)) + num > totalTaskPoints
                : usedPoints + num > totalTaskPoints;
              
              return (
                <TouchableOpacity
                  key={`points-${num}`}
                  style={[
                    styles.pointsButton,
                    points === num.toString() && styles.pointsButtonActive,
                    wouldExceedThisNum && styles.pointsButtonDisabled
                  ]}
                  onPress={() => setPoints(num.toString())}
                  disabled={wouldExceedThisNum}
                >
                  <LinearGradient
                    colors={
                      points === num.toString() 
                        ? ['#2b8a3e', '#1e6b2c']
                        : wouldExceedThisNum 
                          ? ['#f1f3f5', '#e9ecef']
                          : ['#f8f9fa', '#e9ecef']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pointsButtonGradient}
                  >
                    <Text style={[
                      styles.pointsButtonText,
                      points === num.toString() && styles.pointsButtonTextActive,
                      wouldExceedThisNum && styles.pointsButtonTextDisabled
                    ]}>
                      {num}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Points Summary */}
          <View style={styles.pointsSummary}>
            <View style={styles.pointsSummaryRow}>
              <MaterialCommunityIcons name="star" size={14} color="#e67700" />
              <Text style={styles.pointsSummaryText}>
                Task Total: <Text style={styles.pointsHighlight}>{totalTaskPoints}</Text>
              </Text>
            </View>
            <View style={styles.pointsSummaryRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#495057" />
              <Text style={styles.pointsSummaryText}>
                Used in other slots: <Text style={styles.pointsHighlight}>{usedPoints}</Text>
              </Text>
            </View>
            <View style={styles.pointsSummaryRow}>
              <MaterialCommunityIcons name="star-outline" size={14} color="#495057" />
              <Text style={styles.pointsSummaryText}>
                This slot: <Text style={styles.pointsHighlight}>{pointsNum}</Text>
              </Text>
            </View>
            <View style={[
              styles.pointsSummaryRow,
              wouldExceed && styles.pointsSummaryRowError
            ]}>
              <MaterialCommunityIcons 
                name={wouldExceed ? "alert-circle" : "calculator"} 
                size={14} 
                color={wouldExceed ? "#fa5252" : "#495057"} 
              />
              <Text style={[
                styles.pointsSummaryText,
                wouldExceed && styles.errorText
              ]}>
                Total after: <Text style={[
                  styles.pointsHighlight,
                  wouldExceed && styles.errorText
                ]}>
                  {editingSlot
                    ? (usedPoints - parseInt(editingSlot.points || '0', 10)) + pointsNum
                    : usedPoints + pointsNum
                  }
                </Text> / {totalTaskPoints}
              </Text>
            </View>
          </View>
          
          {/* Warning if exceeding total */}
          {wouldExceed && pointsNum > 0 && (
            <LinearGradient
              colors={['#fff5f5', '#ffe3e3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.warningBox}
            >
              <MaterialCommunityIcons name="alert-circle" size={18} color="#fa5252" />
              <Text style={styles.warningText}>
                ⚠️ Exceeds by {
                  editingSlot
                    ? (usedPoints - parseInt(editingSlot.points || '0', 10)) + pointsNum - totalTaskPoints
                    : usedPoints + pointsNum - totalTaskPoints
                } point(s)
              </Text>
            </LinearGradient>
          )}
        </View>
      </View>
    );
  };

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  if (currentStep === 'details') {
                    setCurrentStep('time');
                  } else {
                    onClose();
                  }
                }}
                style={styles.backButton}
              >
                <MaterialCommunityIcons 
                  name={currentStep === 'details' ? 'chevron-left' : 'close'} 
                  size={24} 
                  color="#495057" 
                />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>
                {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
              </Text>
              
              <View style={styles.headerSpacer} />
            </View>

            {/* Body */}
            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {currentStep === 'time' ? renderTimeStep() : renderDetailsStep()}
              
              {error ? (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#fa5252" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Footer with BUTTONS */}
            <View style={styles.modalFooter}>
              {currentStep === 'time' ? (
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={handleTimeNext}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.nextButtonGradient}
                  >
                    <Text style={styles.nextButtonText}>NEXT</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.detailsActions}>
                  <TouchableOpacity
                    style={styles.backActionButton}
                    onPress={() => setCurrentStep('time')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#f8f9fa', '#e9ecef']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.backActionButtonGradient}
                    >
                      <MaterialCommunityIcons name="arrow-left" size={20} color="#495057" />
                      <Text style={styles.backActionButtonText}>BACK</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      checkIfWouldExceed() && styles.saveButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={checkIfWouldExceed()}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={checkIfWouldExceed() ? ['#f8f9fa', '#e9ecef'] : ['#2b8a3e', '#1e6b2c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.saveButtonGradient}
                    >
                      <Text style={[
                        styles.saveButtonText,
                        checkIfWouldExceed() && styles.saveButtonTextDisabled
                      ]}>
                        {editingSlot ? 'UPDATE' : 'ADD'}
                      </Text>
                      <MaterialCommunityIcons 
                        name="check" 
                        size={20} 
                        color={checkIfWouldExceed() ? "#868e96" : "white"} 
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end'
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    flex: 1
  },
  headerSpacer: {
    width: 40
  },
  modalBody: {
    padding: 20,
    maxHeight: 600,
    backgroundColor: '#f8f9fa',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: 'white',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  stepContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dee2e6'
  },
  stepDotActive: {
    backgroundColor: '#2b8a3e'
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#dee2e6',
    marginHorizontal: 6
  },
  stepLineActive: {
    backgroundColor: '#2b8a3e'
  },
  stepText: {
    fontSize: 12,
    color: '#868e96',
    marginLeft: 8,
    fontWeight: '500',
  },
  timePickersContainer: {
    gap: 16
  },
  timePickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  timePickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 16
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  timeColumn: {
    flex: 1
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#868e96',
    marginBottom: 6,
    textAlign: 'center'
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center'
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  minuteButton: {
    width: 48,
  },
  numberButtonActive: {
    borderColor: '#2b8a3e',
  },
  numberButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057'
  },
  numberTextActive: {
    color: 'white'
  },
  periodContainer: {
    gap: 4
  },
  periodButton: {
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  periodButtonActive: {
    borderColor: '#2b8a3e',
  },
  periodButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057'
  },
  periodTextActive: {
    color: 'white'
  },
  timeDisplay: {
    paddingVertical: 10,
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    alignItems: 'center'
  },
  timeDisplayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b8a3e'
  },
  autoUpdateNote: {
    fontSize: 11,
    color: '#2b8a3e',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  timeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 6,
  },
  inputGradient: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212529',
    backgroundColor: 'transparent',
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  availablePointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  availablePoints: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '500'
  },
  availablePointsZero: {
    color: '#fa5252',
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  pointsInputGradient: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pointsInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    backgroundColor: 'transparent',
    textAlign: 'center'
  },
  pointsLabel: {
    fontSize: 13,
    color: '#868e96',
    width: 30,
  },
  quickSelectLabel: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 6
  },
  pointsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  pointsButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pointsButtonActive: {
    borderColor: '#2b8a3e',
  },
  pointsButtonDisabled: {
    opacity: 0.5,
    borderColor: '#dee2e6',
  },
  pointsButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057'
  },
  pointsButtonTextActive: {
    color: 'white'
  },
  pointsButtonTextDisabled: {
    color: '#adb5bd',
  },
  pointsSummary: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 6,
  },
  pointsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsSummaryRowError: {
    backgroundColor: '#fff5f5',
    borderRadius: 6,
    padding: 4,
  },
  pointsSummaryText: {
    fontSize: 12,
    color: '#495057',
  },
  pointsHighlight: {
    fontWeight: '600',
    color: '#2b8a3e',
  },
  helperText: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 4,
    fontStyle: 'italic'
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ffc9c9',
    backgroundColor: '#fff5f5',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#fa5252',
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9',
    backgroundColor: '#fff5f5',
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#fa5252',
    fontWeight: '500',
  },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1,
  },
  detailsActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backActionButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  backActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    gap: 4,
  },
  backActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  saveButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    gap: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  saveButtonTextDisabled: {
    color: '#868e96',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
});

export default TimeSlotModal;