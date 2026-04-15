// src/components/TimeSlotModal.tsx - FULLY UPDATED WITH ALERTS

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
  Alert,
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
import { useTheme } from '../context/ThemeContext';

const LABEL_OPTIONS = [
  { value: 'Morning', icon: 'weather-sunset-up', color: '#fab005' },
  { value: 'Lunch', icon: 'food', color: '#e67700' },
  { value: 'Evening', icon: 'weather-sunset-down', color: '#5c7cfa' },
  { value: 'Other', icon: 'dots-horizontal', color: '#868e96' }
];

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
  initialTime?: {
    startTime: { hour: string; minute: string; period: string };
    endTime: { hour: string; minute: string; period: string };
  } | null;
  totalTaskPoints: number;
  usedPoints: number;
  maxPointsPerSlot?: number;
}

export const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  visible,
  onClose,
  onSave,
  editingSlot,
  initialTime,
  totalTaskPoints,
  usedPoints,
  maxPointsPerSlot = 10
}) => {
  const { theme } = useTheme();
  
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
  const [customLabel, setCustomLabel] = useState('');
  const [points, setPoints] = useState('');
  const [error, setError] = useState<string>('');
  const [isManualEndTimeChange, setIsManualEndTimeChange] = useState(false);

  // Helper function to calculate end time from start time (add 1 hour)
  const getDefaultEndTime = (startHour: string, startMinute: string, startPeriod: string) => {
    let hour = parseInt(startHour, 10);
    const minute = startMinute;
    let period = startPeriod;
    
    hour += 1;
    
    if (hour === 12) {
      return {
        hour: '12',
        minute,
        period: period === 'AM' ? 'PM' : 'AM'
      };
    } else if (hour === 13) {
      return {
        hour: '1',
        minute,
        period: period
      };
    } else if (hour > 12) {
      return {
        hour: (hour - 12).toString(),
        minute,
        period: period
      };
    } else {
      return {
        hour: hour.toString(),
        minute,
        period: period
      };
    }
  };

  // ✅ Check if time slot is in the past for today
  const isTimeSlotInPast = (startHour12: string, startMinute: string, startPeriod: string): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Convert 12-hour format to 24-hour for comparison
    const convertTo24 = (hour: string, minute: string, period: string): number => {
      let h = parseInt(hour, 10);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + parseInt(minute, 10);
    };
    
    const startTotalMinutes = convertTo24(startHour12, startMinute, startPeriod);
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    return startTotalMinutes < currentTotalMinutes;
  };

  useEffect(() => {
    if (!editingSlot && !isManualEndTimeChange && currentStep === 'time') {
      const newEndTime = getDefaultEndTime(startTime.hour, startTime.minute, startTime.period);
      setEndTime(newEndTime);
    }
  }, [startTime, editingSlot, currentStep, isManualEndTimeChange]);

  useEffect(() => {
    if (currentStep === 'time') {
      setIsManualEndTimeChange(false);
    }
  }, [currentStep]);

  useEffect(() => {
    if (editingSlot) {
      const start12 = convertTo12Hour(editingSlot.startTime);
      const end12 = convertTo12Hour(editingSlot.endTime);
      setStartTime(start12);
      setEndTime(end12);
      setIsManualEndTimeChange(true);
      
      if (editingSlot.label) {
        const predefinedLabel = LABEL_OPTIONS.find(opt => opt.value === editingSlot.label);
        if (predefinedLabel) {
          setLabel(editingSlot.label);
          setCustomLabel('');
        } else {
          setLabel('Other');
          setCustomLabel(editingSlot.label);
        }
      } else {
        setLabel('');
        setCustomLabel('');
      }
      
      setPoints(editingSlot.points || '');
    } else if (initialTime) {
      setStartTime(initialTime.startTime);
      setEndTime(initialTime.endTime);
      setIsManualEndTimeChange(false);
      setLabel('');
      setCustomLabel('');
      setPoints('');
    } else {
      setStartTime({ hour: '8', minute: '00', period: 'AM' });
      setEndTime({ hour: '9', minute: '00', period: 'AM' });
      setIsManualEndTimeChange(false);
      setLabel('');
      setCustomLabel('');
      setPoints('');
    }
    setError('');
    setCurrentStep('time');
  }, [editingSlot, initialTime, visible]);

  // In handleTimeNext function - REMOVE "Add Anyway" option

const handleTimeNext = () => {
  const start24 = convertTo24Hour(startTime.hour, startTime.minute, startTime.period);
  const end24 = convertTo24Hour(endTime.hour, endTime.minute, endTime.period);
  
  if (!validateTimeSlot(start24, end24)) {
    Alert.alert(
      '⏰ Invalid Time Range',
      'End time must be after start time.\n\nPlease adjust your time selection.',
      [{ text: 'OK' }]
    );
    return;
  }
  
  // ✅ Check if time slot is in the past for today - PREVENT completely
  if (!editingSlot && isTimeSlotInPast(startTime.hour, startTime.minute, startTime.period)) {
    Alert.alert(
      '❌ Cannot Add Past Time Slot',
      `You cannot add a time slot that has already passed for today (${startTime.hour}:${startTime.minute} ${startTime.period}).\n\n` +
      `This time slot would be automatically marked as MISSED and points would be deducted.\n\n` +
      `Please select a future time slot.`,
      [{ text: 'OK' }]
    );
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
      Alert.alert('Invalid Points', 'Points must be a valid number');
      return;
    }
    
    if (pointsNum > maxPointsPerSlot) {
      Alert.alert('Points Limit Exceeded', `Maximum ${maxPointsPerSlot} points per time slot`);
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
      Alert.alert(
        'Points Limit Exceeded', 
        `Total points (${newTotalPoints}) would exceed task limit of ${totalTaskPoints}`
      );
      return;
    }

    let finalLabel = '';
    if (label === 'Other') {
      finalLabel = customLabel.trim();
    } else {
      finalLabel = label;
    }
    
    onSave({
      startTime: start24,
      endTime: end24,
      label: finalLabel || undefined,
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

  const handleEndTimeChange = (newEndTime: { hour: string; minute: string; period: string }) => {
    setIsManualEndTimeChange(true);
    setEndTime(newEndTime);
  };

  const renderLabelOptions = () => (
    <View style={styles.labelOptionsContainer}>
      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
        <MaterialCommunityIcons name="tag-outline" size={14} color={theme.textMuted} /> Label (Optional)
      </Text>
      
      <View style={styles.labelGrid}>
        {LABEL_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.labelOption,
              label === option.value && styles.labelOptionActive
            ]}
            onPress={() => setLabel(option.value)}
          >
            <LinearGradient
              colors={label === option.value 
                ? [option.color, option.color] 
                : [theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.labelOptionGradient}
            >
              <MaterialCommunityIcons 
                name={option.icon as any} 
                size={18} 
                color={label === option.value ? 'white' : theme.textSecondary} 
              />
              <Text style={[
                styles.labelOptionText,
                label === option.value && styles.labelOptionTextActive,
                { color: label === option.value ? '#fff' : theme.textSecondary }
              ]}>
                {option.value}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {label === 'Other' && (
        <View style={styles.customLabelContainer}>
          <Text style={[styles.customLabelHint, { color: theme.textMuted }]}>Enter custom label:</Text>
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.inputGradient, { borderColor: theme.border }]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="e.g., Night, Weekend, etc."
              placeholderTextColor={theme.textPlaceholder}
              value={customLabel}
              onChangeText={setCustomLabel}
              maxLength={20}
              selectionColor={theme.primary}
            />
          </LinearGradient>
        </View>
      )}
    </View>
  );

  const renderTimePicker = (
    time: { hour: string; minute: string; period: string },
    setTime: (time: { hour: string; minute: string; period: string }) => void,
    title: string,
    isStartTime: boolean = true
  ) => (
    <View style={[styles.timePickerContainer, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
      <Text style={[styles.timePickerTitle, { color: theme.textSecondary }]}>{title}</Text>
      
      <View style={styles.timeRow}>
        <View style={styles.timeColumn}>
          <Text style={[styles.timeLabel, { color: theme.textMuted }]}>Hour</Text>
          <View style={styles.numberGrid}>
            {HOUR_OPTIONS.map((hour) => (
              <TouchableOpacity
                key={`hour-${hour}`}
                style={[
                  styles.numberButton,
                  time.hour === hour && styles.numberButtonActive,
                  { borderColor: theme.border }
                ]}
                onPress={() => {
                  setTime({ ...time, hour });
                  if (isStartTime && !editingSlot && currentStep === 'time') {
                    const newEndTime = getDefaultEndTime(hour, time.minute, time.period);
                    setEndTime(newEndTime);
                    setIsManualEndTimeChange(false);
                  }
                }}
              >
                <LinearGradient
                  colors={time.hour === hour ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.numberButtonGradient}
                >
                  <Text style={[
                    styles.numberText,
                    time.hour === hour && styles.numberTextActive,
                    { color: time.hour === hour ? '#fff' : theme.textSecondary }
                  ]}>
                    {hour}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.timeColumn}>
          <Text style={[styles.timeLabel, { color: theme.textMuted }]}>Minute</Text>
          <View style={styles.numberGrid}>
            {MINUTE_OPTIONS.map((minute) => (
              <TouchableOpacity
                key={`minute-${minute}`}
                style={[
                  styles.numberButton,
                  styles.minuteButton,
                  time.minute === minute && styles.numberButtonActive,
                  { borderColor: theme.border }
                ]}
                onPress={() => {
                  setTime({ ...time, minute });
                  if (isStartTime && !editingSlot && currentStep === 'time') {
                    const newEndTime = getDefaultEndTime(time.hour, minute, time.period);
                    setEndTime(newEndTime);
                    setIsManualEndTimeChange(false);
                  }
                }}
              >
                <LinearGradient
                  colors={time.minute === minute ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.numberButtonGradient}
                >
                  <Text style={[
                    styles.numberText,
                    time.minute === minute && styles.numberTextActive,
                    { color: time.minute === minute ? '#fff' : theme.textSecondary }
                  ]}>
                    {minute}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.timeColumn}>
          <Text style={[styles.timeLabel, { color: theme.textMuted }]}>AM/PM</Text>
          <View style={styles.periodContainer}>
            {PERIOD_OPTIONS.map((period) => (
              <TouchableOpacity
                key={`period-${period}`}
                style={[
                  styles.periodButton,
                  time.period === period && styles.periodButtonActive,
                  { borderColor: theme.border }
                ]}
                onPress={() => {
                  setTime({ ...time, period });
                  if (isStartTime && !editingSlot && currentStep === 'time') {
                    const newEndTime = getDefaultEndTime(time.hour, time.minute, period);
                    setEndTime(newEndTime);
                    setIsManualEndTimeChange(false);
                  }
                }}
              >
                <LinearGradient
                  colors={time.period === period ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.periodButtonGradient}
                >
                  <Text style={[
                    styles.periodText,
                    time.period === period && styles.periodTextActive,
                    { color: time.period === period ? '#fff' : theme.textSecondary }
                  ]}>
                    {period}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      
      <View style={[styles.timeDisplay, { backgroundColor: theme.primaryLight }]}>
        <Text style={[styles.timeDisplayText, { color: theme.primary }]}>
          {time.hour}:{time.minute} {time.period}
        </Text>
      </View>
    </View>
  );

  const renderTimeStep = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepDotActive, { backgroundColor: theme.primary }]} />
        <View style={[styles.stepLine, { backgroundColor: theme.border }]} />
        <View style={[styles.stepDot, { backgroundColor: theme.border }]} />
        <Text style={[styles.stepText, { color: theme.textMuted }]}>Step 1 of 2: Set Time</Text>
      </View>
      
      <View style={styles.timePickersContainer}>
        {renderTimePicker(startTime, setStartTime, 'Start Time', true)}
        {renderTimePicker(endTime, handleEndTimeChange, 'End Time', false)}
      </View>
      
      <Text style={[styles.autoUpdateNote, { color: theme.primary }]}>
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
      <View style={[styles.stepContainer, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, { backgroundColor: theme.border }]} />
          <View style={[styles.stepLine, styles.stepLineActive, { backgroundColor: theme.primary }]} />
          <View style={[styles.stepDot, styles.stepDotActive, { backgroundColor: theme.primary }]} />
          <Text style={[styles.stepText, { color: theme.textMuted }]}>Step 2 of 2: Add Details</Text>
        </View>
        
        <LinearGradient
          colors={[theme.bgSecondary, theme.bgTertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.timeSummary, { borderColor: theme.border }]}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color={theme.textMuted} />
          <Text style={[styles.timeSummaryText, { color: theme.text }]}>
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).hour}:
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).minute} 
            {convertTo12Hour(convertTo24Hour(startTime.hour, startTime.minute, startTime.period)).period}
            {' '}to{' '}
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).hour}:
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).minute} 
            {convertTo12Hour(convertTo24Hour(endTime.hour, endTime.minute, endTime.period)).period}
          </Text>
        </LinearGradient>
        
        {renderLabelOptions()}
        
        <View style={styles.inputGroup}>
          <View style={styles.pointsHeader}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              <MaterialCommunityIcons name="star-outline" size={14} color={theme.textMuted} /> Points (0-{maxPointsPerSlot})
            </Text>
            <LinearGradient
              colors={availablePoints > 0 ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.availablePointsBadge}
            >
              <Text style={[
                styles.availablePoints,
                { color: availablePoints > 0 ? theme.primary : theme.error },
                availablePoints <= 0 && styles.availablePointsZero
              ]}>
                Available: {availablePoints} pts
              </Text>
            </LinearGradient>
          </View>
          
          <View style={styles.pointsInputContainer}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.pointsInputGradient, { borderColor: theme.border }]}
            >
              <TextInput
                style={[styles.pointsInput, { color: theme.text }]}
                placeholder="0"
                placeholderTextColor={theme.textPlaceholder}
                value={points}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num === '' || (parseInt(num, 10) >= 0 && parseInt(num, 10) <= maxPointsPerSlot)) {
                    setPoints(num);
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
                selectionColor={theme.primary}
              />
            </LinearGradient>
            <Text style={[styles.pointsLabel, { color: theme.textMuted }]}>pts</Text>
          </View>
          
          <Text style={[styles.quickSelectLabel, { color: theme.textMuted }]}>Quick select:</Text>
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
                    wouldExceedThisNum && styles.pointsButtonDisabled,
                    { borderColor: theme.border }
                  ]}
                  onPress={() => setPoints(num.toString())}
                  disabled={wouldExceedThisNum}
                >
                  <LinearGradient
                    colors={
                      points === num.toString() 
                        ? [theme.primary, theme.primaryDark]
                        : wouldExceedThisNum 
                          ? [theme.bgTertiary, theme.bgTertiary]
                          : [theme.bgSecondary, theme.bgTertiary]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pointsButtonGradient}
                  >
                    <Text style={[
                      styles.pointsButtonText,
                      points === num.toString() && styles.pointsButtonTextActive,
                      wouldExceedThisNum && styles.pointsButtonTextDisabled,
                      { color: points === num.toString() ? '#fff' : wouldExceedThisNum ? theme.textPlaceholder : theme.textSecondary }
                    ]}>
                      {num}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={[styles.pointsSummary, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
            <View style={styles.pointsSummaryRow}>
              <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
              <Text style={[styles.pointsSummaryText, { color: theme.textSecondary }]}>
                Task Total: <Text style={[styles.pointsHighlight, { color: theme.primary }]}>{totalTaskPoints}</Text>
              </Text>
            </View>
            <View style={styles.pointsSummaryRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.pointsSummaryText, { color: theme.textSecondary }]}>
                Used in other slots: <Text style={[styles.pointsHighlight, { color: theme.primary }]}>{usedPoints}</Text>
              </Text>
            </View>
            <View style={styles.pointsSummaryRow}>
              <MaterialCommunityIcons name="star-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.pointsSummaryText, { color: theme.textSecondary }]}>
                This slot: <Text style={[styles.pointsHighlight, { color: theme.primary }]}>{pointsNum}</Text>
              </Text>
            </View>
            <View style={[
              styles.pointsSummaryRow,
              wouldExceed && styles.pointsSummaryRowError
            ]}>
              <MaterialCommunityIcons 
                name={wouldExceed ? "alert-circle" : "calculator"} 
                size={14} 
                color={wouldExceed ? theme.error : theme.textMuted} 
              />
              <Text style={[
                styles.pointsSummaryText,
                wouldExceed && { color: theme.error },
                { color: theme.textSecondary }
              ]}>
                Total after: <Text style={[
                  styles.pointsHighlight,
                  wouldExceed && { color: theme.error }
                ]}>
                  {editingSlot
                    ? (usedPoints - parseInt(editingSlot.points || '0', 10)) + pointsNum
                    : usedPoints + pointsNum
                  }
                </Text> / {totalTaskPoints}
              </Text>
            </View>
          </View>
          
          {wouldExceed && pointsNum > 0 && (
            <LinearGradient
              colors={[theme.errorBg, theme.errorBg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.warningBox, { borderColor: theme.errorBorder }]}
            >
              <MaterialCommunityIcons name="alert-circle" size={18} color={theme.error} />
              <Text style={[styles.warningText, { color: theme.error }]}>
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
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
              <TouchableOpacity
                onPress={() => {
                  if (currentStep === 'details') {
                    setCurrentStep('time');
                  } else {
                    onClose();
                  }
                }}
                style={[styles.backButton, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
              >
                <MaterialCommunityIcons 
                  name={currentStep === 'details' ? 'chevron-left' : 'close'} 
                  size={24} 
                  color={theme.textMuted} 
                />
              </TouchableOpacity>
              
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
              </Text>
              
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView 
              style={[styles.modalBody, { backgroundColor: theme.bgSecondary }]} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {currentStep === 'time' ? renderTimeStep() : renderDetailsStep()}
              
              {error && currentStep !== 'time' ? (
                <View style={[styles.errorBox, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color={theme.error} />
                  <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
              {currentStep === 'time' ? (
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={handleTimeNext}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[theme.primary, theme.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.nextButtonGradient}
                  >
                    <Text style={styles.nextButtonText}>NEXT</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.detailsActions}>
                  <TouchableOpacity
                    style={[styles.backActionButton, { borderColor: theme.border }]}
                    onPress={() => setCurrentStep('time')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[theme.bgSecondary, theme.bgTertiary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.backActionButtonGradient}
                    >
                      <MaterialCommunityIcons name="arrow-left" size={20} color={theme.textSecondary} />
                      <Text style={[styles.backActionButtonText, { color: theme.textSecondary }]}>BACK</Text>
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
                      colors={checkIfWouldExceed() ? [theme.bgSecondary, theme.bgTertiary] : [theme.primary, theme.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.saveButtonGradient}
                    >
                      <Text style={[
                        styles.saveButtonText,
                        checkIfWouldExceed() && styles.saveButtonTextDisabled,
                        { color: checkIfWouldExceed() ? theme.textMuted : '#fff' }
                      ]}>
                        {editingSlot ? 'UPDATE' : 'ADD'}
                      </Text>
                      <MaterialCommunityIcons 
                        name="check" 
                        size={20} 
                        color={checkIfWouldExceed() ? theme.textMuted : "#fff"} 
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
    justifyContent: 'flex-end'
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1
  },
  headerSpacer: {
    width: 40
  },
  modalBody: {
    padding: 20,
    maxHeight: 600,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  stepContainer: {
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
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
  },
  stepDotActive: {},
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 6
  },
  stepLineActive: {},
  stepText: {
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  timePickersContainer: {
    gap: 16
  },
  timePickerContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  timePickerTitle: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  minuteButton: {
    width: 48,
  },
  numberButtonActive: {},
  numberButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 13,
    fontWeight: '500',
  },
  numberTextActive: {},
  periodContainer: {
    gap: 4
  },
  periodButton: {
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  periodButtonActive: {},
  periodButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '500',
  },
  periodTextActive: {},
  timeDisplay: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  timeDisplayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  autoUpdateNote: {
    fontSize: 11,
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
  },
  timeSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputGradient: {
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
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
    fontWeight: '500'
  },
  availablePointsZero: {},
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
  },
  pointsInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'transparent',
    textAlign: 'center'
  },
  pointsLabel: {
    fontSize: 13,
    width: 30,
  },
  quickSelectLabel: {
    fontSize: 11,
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
  },
  pointsButtonActive: {},
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
  },
  pointsButtonTextActive: {},
  pointsButtonTextDisabled: {},
  pointsSummary: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  pointsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsSummaryRowError: {
    borderRadius: 6,
    padding: 4,
  },
  pointsSummaryText: {
    fontSize: 12,
  },
  pointsHighlight: {
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
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
    color: '#fff',
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
  },
  saveButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
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
  },
  saveButtonTextDisabled: {},
  saveButtonDisabled: {
    opacity: 0.7,
  },
  labelOptionsContainer: {
    marginBottom: 20,
  },
  labelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  labelOption: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  labelOptionActive: {},
  labelOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  labelOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  labelOptionTextActive: {},
  customLabelContainer: {
    marginTop: 8,
  },
  customLabelHint: {
    fontSize: 12,
    marginBottom: 4,
  },
});

export default TimeSlotModal;