// src/components/TimeSlotModal.tsx - UPDATED with clean UI and dark gray primary
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
  
  const getAvailablePoints = () => {
    if (editingSlot) {
      const currentSlotPoints = parseInt(editingSlot.points || '0', 10);
      return totalTaskPoints - (usedPoints - currentSlotPoints);
    } else {
      return totalTaskPoints - usedPoints;
    }
  };
  
  const availablePoints = getAvailablePoints();
  const hasAvailablePoints = availablePoints > 0;
  const maxAllowedPoints = Math.min(availablePoints, maxPointsPerSlot);

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
    
    if (points) {
      const pointsNum = parseInt(points, 10);
      if (isNaN(pointsNum) || pointsNum < 0) {
        setError('Points must be a positive number');
        return;
      }
      
      if (pointsNum > maxPointsPerSlot) {
        setError(`Maximum ${maxPointsPerSlot} points per time slot`);
        return;
      }
      
      if (pointsNum > maxAllowedPoints) {
        setError(`Only ${maxAllowedPoints} points available. Please reduce the points for this slot.`);
        return;
      }
    }
    
    if (!editingSlot && !points && !hasAvailablePoints) {
      setError('No points available. Please assign at least 0 points to this slot.');
      return;
    }
    
    onSave({
      startTime: start24,
      endTime: end24,
      label: label.trim() || undefined,
      points: points || '0'
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
      
      {!editingSlot && !hasAvailablePoints && (
        <LinearGradient
          colors={['#fff3bf', '#ffec99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.warningBox}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#e67700" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>No Points Available</Text>
            <Text style={styles.warningText}>
              All points are assigned. This slot can have 0 points.
            </Text>
          </View>
        </LinearGradient>
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
              <MaterialCommunityIcons name="star-outline" size={14} color="#495057" /> Points (Optional)
            </Text>
            <LinearGradient
              colors={hasAvailablePoints ? ['#d3f9d8', '#b2f2bb'] : ['#fff5f5', '#ffe3e3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.availablePointsBadge}
            >
              <Text style={[
                styles.availablePoints,
                !hasAvailablePoints && styles.availablePointsZero
              ]}>
                {availablePoints} available
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
          
          {/* Points Quick Select */}
          <Text style={styles.quickSelectLabel}>Quick select:</Text>
          <View style={styles.pointsGrid}>
            {Array.from({ length: maxPointsPerSlot + 1 }, (_, i) => i).map((num) => (
              <TouchableOpacity
                key={`points-${num}`}
                style={[
                  styles.pointsButton,
                  points === num.toString() && styles.pointsButtonActive,
                  num > maxAllowedPoints && styles.pointsButtonDisabled
                ]}
                onPress={() => setPoints(num.toString())}
                disabled={num > maxAllowedPoints}
              >
                <LinearGradient
                  colors={points === num.toString() ? ['#2b8a3e', '#1e6b2c'] : 
                          num > maxAllowedPoints ? ['#f8f9fa', '#e9ecef'] : ['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pointsButtonGradient}
                >
                  <Text style={[
                    styles.pointsButtonText,
                    points === num.toString() && styles.pointsButtonTextActive,
                    num > maxAllowedPoints && styles.pointsButtonTextDisabled
                  ]}>
                    {num}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Info Messages */}
          <Text style={styles.helperText}>
            {pointsNum > 0 
              ? `Awards ${pointsNum} point${pointsNum === 1 ? '' : 's'}`
              : 'Uses task default points if set to 0'
            }
          </Text>
          
          {!hasAvailablePoints && !editingSlot && (
            <LinearGradient
              colors={['#e7f5ff', '#d0ebff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoBox}
            >
              <MaterialCommunityIcons name="information-outline" size={14} color="#2b8a3e" />
              <Text style={styles.infoText}>
                No points available. This slot will use task default points.
              </Text>
            </LinearGradient>
          )}
        </View>
        
        {/* Save button disabled state information */}
        {!canAddSlot && (
          <LinearGradient
            colors={['#fff5f5', '#ffe3e3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.errorBox}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#fa5252" />
            <Text style={styles.errorText}>
              Cannot add slot. No points available.
            </Text>
          </LinearGradient>
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
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalContent}
        >
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
                size={20} 
                color="#495057" 
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
            
            {error ? (
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.errorBox}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#fa5252" />
                <Text style={styles.errorText}>{error}</Text>
              </LinearGradient>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            {currentStep === 'time' ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleTimeNext}
              >
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Next</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.detailsActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setCurrentStep('time')}
                >
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.secondaryButtonGradient}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, (!hasAvailablePoints && !editingSlot && points !== '0' && points !== '') && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={(!hasAvailablePoints && !editingSlot && points !== '0' && points !== '') || !!error}
                >
                  <LinearGradient
                    colors={['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>
                      {editingSlot ? 'Update' : 'Add'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </LinearGradient>
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    flex: 1
  },
  headerSpacer: {
    width: 36
  },
  modalBody: {
    padding: 20,
    maxHeight: 500
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  stepContainer: {
    marginBottom: 20
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
    fontSize: 11,
    color: '#868e96',
    marginLeft: 8
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffd43b',
  },
  warningTextContainer: {
    flex: 1
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e67700',
    marginBottom: 2
  },
  warningText: {
    fontSize: 11,
    color: '#e67700'
  },
  timePickersContainer: {
    gap: 20
  },
  timePickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  timePickerTitle: {
    fontSize: 14,
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
    color: '#fa5252'
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
    marginBottom: 8
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
    color: '#adb5bd'
  },
  helperText: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 4,
    fontStyle: 'italic'
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#2b8a3e'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#fa5252'
  },
  primaryButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white'
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  detailsActions: {
    flexDirection: 'row',
    gap: 10
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  secondaryButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057'
  },
});