// src/components/TimeSlotModal.tsx - UPDATED WITH POINTS AVAILABILITY CHECK
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
  Alert
} from 'react-native';
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
}

export const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  visible,
  onClose,
  onSave,
  editingSlot,
  totalTaskPoints,
  usedPoints
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
  
  // Calculate available points (when adding a NEW slot)
  const getAvailablePoints = () => {
    if (editingSlot) {
      // When editing: available points = total points - (used points - current slot points)
      const currentSlotPoints = parseInt(editingSlot.points || '0', 10);
      return totalTaskPoints - (usedPoints - currentSlotPoints);
    } else {
      // When adding new: available points = total points - used points
      return totalTaskPoints - usedPoints;
    }
  };
  
  const availablePoints = getAvailablePoints();
  const hasAvailablePoints = availablePoints > 0;

  // Initialize with editing slot data
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
    
    // Validate points
    if (points) {
      const pointsNum = parseInt(points, 10);
      if (isNaN(pointsNum) || pointsNum < 0) {
        setError('Points must be a positive number (0-10)');
        return;
      }
      if (pointsNum > 10) {
        setError('Maximum 10 points per time slot');
        return;
      }
      if (pointsNum > availablePoints) {
        setError(`Only ${availablePoints} points available. Please reduce the points for this slot.`);
        return;
      }
    }
    
    // If adding a NEW slot (not editing), and points are not specified
    // But there are no available points, show error
    if (!editingSlot && !points && !hasAvailablePoints) {
      setError('No points available. Please assign at least 0 points to this slot.');
      return;
    }
    
    onSave({
      startTime: start24,
      endTime: end24,
      label: label.trim() || undefined,
      points: points || '0' // Default to 0 if empty
    });
  };

  const renderTimePicker = (
    time: { hour: string; minute: string; period: string },
    setTime: (time: { hour: string; minute: string; period: string }) => void,
    title: string
  ) => (
    <View style={styles.timePickerContainer}>
      <Text style={styles.timePickerTitle}>{title}</Text>
      
      <View style={styles.timeRow}>
        {/* Hour */}
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
                <Text style={[
                  styles.numberText,
                  time.hour === hour && styles.numberTextActive
                ]}>
                  {hour}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Minute */}
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
                <Text style={[
                  styles.numberText,
                  time.minute === minute && styles.numberTextActive
                ]}>
                  {minute}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* AM/PM */}
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
                <Text style={[
                  styles.periodText,
                  time.period === period && styles.periodTextActive
                ]}>
                  {period}
                </Text>
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
      
      {/* Points Availability Warning for NEW slots */}
      {!editingSlot && !hasAvailablePoints && (
        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#fa5252" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>No Points Available</Text>
            <Text style={styles.warningText}>
              All {totalTaskPoints} task points have been assigned to other time slots.
              You can still add a time slot with 0 points.
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.timePickersContainer}>
        {renderTimePicker(startTime, setStartTime, 'Start Time')}
        {renderTimePicker(endTime, setEndTime, 'End Time')}
      </View>
    </View>
  );

  const renderDetailsStep = () => {
    const pointsNum = parseInt(points, 10) || 0;
    const canAddSlot = hasAvailablePoints || editingSlot || pointsNum === 0;
    
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepIndicator}>
          <View style={styles.stepDot} />
          <View style={[styles.stepLine, styles.stepLineActive]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepText}>Step 2 of 2: Add Details</Text>
        </View>
        
        {/* Time Summary */}
        <View style={styles.timeSummary}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#007AFF" />
          <Text style={styles.timeSummaryText}>
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).hour}:
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).minute} 
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).period}
            {' '}to{' '}
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).hour}:
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).minute} 
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).period}
          </Text>
        </View>
        
        {/* Label Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            <MaterialCommunityIcons name="tag-outline" size={16} color="#6c757d" /> Label (Optional)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Morning, Lunch, Evening"
            value={label}
            onChangeText={setLabel}
            maxLength={30}
          />
          <Text style={styles.helperText}>
            Helps identify this time slot
          </Text>
        </View>
        
        {/* Points Input */}
        <View style={styles.inputGroup}>
          <View style={styles.pointsHeader}>
            <Text style={styles.inputLabel}>
              <MaterialCommunityIcons name="star-outline" size={16} color="#6c757d" /> Points (Optional)
            </Text>
            <Text style={[
              styles.availablePoints,
              !hasAvailablePoints && !editingSlot && styles.availablePointsZero
            ]}>
              Available: {availablePoints} points
            </Text>
          </View>
          
          <View style={styles.pointsInputContainer}>
            <TextInput
              style={styles.pointsInput}
              placeholder="0-10"
              value={points}
              onChangeText={(text) => {
                // Only allow numbers and limit to 2 digits
                const num = text.replace(/[^0-9]/g, '');
                if (num === '' || (parseInt(num, 10) >= 0 && parseInt(num, 10) <= 10)) {
                  setPoints(num);
                }
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.pointsLabel}>points</Text>
          </View>
          
          {/* Points Quick Select */}
          <Text style={styles.quickSelectLabel}>Quick select:</Text>
          <View style={styles.pointsGrid}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <TouchableOpacity
                key={`points-${num}`}
                style={[
                  styles.pointsButton,
                  points === num.toString() && styles.pointsButtonActive,
                  num > availablePoints && styles.pointsButtonDisabled
                ]}
                onPress={() => setPoints(num.toString())}
                disabled={num > availablePoints}
              >
                <Text style={[
                  styles.pointsButtonText,
                  points === num.toString() && styles.pointsButtonTextActive,
                  num > availablePoints && styles.pointsButtonTextDisabled
                ]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Points Information */}
          <Text style={styles.helperText}>
            {pointsNum > 0 
              ? `This slot awards ${pointsNum} point${pointsNum === 1 ? '' : 's'}`
              : 'Uses task default points if left at 0'
            }
          </Text>
          
          {/* Special warning when no points available */}
          {!hasAvailablePoints && !editingSlot && (
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#1864ab" />
              <Text style={styles.infoText}>
                All points are assigned. This slot will use task default points.
              </Text>
            </View>
          )}
        </View>
        
        {/* Save button disabled state information */}
        {!canAddSlot && (
          <View style={styles.warningBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#fa5252" />
            <Text style={styles.warningText}>
              Cannot add slot. No points available and this slot has points assigned.
            </Text>
          </View>
        )}
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
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
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
                color="#007AFF" 
              />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>
              {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
            </Text>
            
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView 
            style={styles.modalBody} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentStep === 'time' ? renderTimeStep() : renderDetailsStep()}
            
            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#fa5252" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            {currentStep === 'time' ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleTimeNext}
              >
                <Text style={styles.primaryButtonText}>Next: Add Details</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <View style={styles.detailsActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setCurrentStep('time')}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, (!hasAvailablePoints && !editingSlot && points !== '0' && points !== '') && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={(!hasAvailablePoints && !editingSlot && points !== '0' && points !== '') || !!error}
                >
                  <Text style={styles.primaryButtonText}>
                    {editingSlot ? 'Update Slot' : 'Add Slot'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    flex: 1
  },
  headerSpacer: {
    width: 40
  },
  modalBody: {
    padding: 20,
    maxHeight: 500
  },
  stepContainer: {
    marginBottom: 20
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dee2e6'
  },
  stepDotActive: {
    backgroundColor: '#007AFF'
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#dee2e6',
    marginHorizontal: 8
  },
  stepLineActive: {
    backgroundColor: '#007AFF'
  },
  stepText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 12
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  warningTextContainer: {
    flex: 1
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 2
  },
  warningText: {
    fontSize: 12,
    color: '#856404'
  },
  timePickersContainer: {
    gap: 24
  },
  timePickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 16
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  timeColumn: {
    flex: 1
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center'
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center'
  },
  numberButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  minuteButton: {
    width: 54
  },
  numberButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  numberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057'
  },
  numberTextActive: {
    color: 'white'
  },
  periodContainer: {
    gap: 6
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center'
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057'
  },
  periodTextActive: {
    color: 'white'
  },
  timeDisplay: {
    paddingVertical: 12,
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    alignItems: 'center'
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1864ab'
  },
  timeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  timeSummaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginLeft: 12
  },
  inputGroup: {
    marginBottom: 24
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212529'
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  availablePoints: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500'
  },
  availablePointsZero: {
    color: '#fa5252',
    fontWeight: '600'
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  pointsInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  pointsLabel: {
    fontSize: 14,
    color: '#6c757d'
  },
  quickSelectLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8
  },
  pointsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  pointsButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  pointsButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  pointsButtonDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef'
  },
  pointsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057'
  },
  pointsButtonTextActive: {
    color: 'white'
  },
  pointsButtonTextDisabled: {
    color: '#adb5bd'
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 6,
    fontStyle: 'italic'
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e7f5ff',
    borderWidth: 1,
    borderColor: '#a5d8ff',
    borderRadius: 8,
    padding: 8,
    marginTop: 8
  },
  infoText: {
    fontSize: 12,
    color: '#1864ab'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffc9c9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    flex: 1,
    color: '#fa5252',
    fontSize: 14
  },
  modalActions: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
    opacity: 0.5
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  detailsActions: {
    flexDirection: 'row',
    gap: 12
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057'
  }
});