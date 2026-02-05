// src/components/TimeSlotModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal as RNModal,
  StyleSheet
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
}

interface TimeSlotModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (slot: TimeSlot) => void;
  editingSlot: TimeSlot | null;
}

export const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  visible,
  onClose,
  onSave,
  editingSlot
}) => {
  // Parse the time into hour, minute, period components
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
  const [error, setError] = useState<string>('');

  // Initialize with editing slot data
  useEffect(() => {
    if (editingSlot) {
      const start12 = convertTo12Hour(editingSlot.startTime);
      const end12 = convertTo12Hour(editingSlot.endTime);
      setStartTime(start12);
      setEndTime(end12);
      setLabel(editingSlot.label || '');
    } else {
      setStartTime({ hour: '8', minute: '00', period: 'AM' });
      setEndTime({ hour: '9', minute: '00', period: 'AM' });
      setLabel('');
    }
    setError('');
  }, [editingSlot, visible]);

  const handleSave = () => {
    const start24 = convertTo24Hour(startTime.hour, startTime.minute, startTime.period);
    const end24 = convertTo24Hour(endTime.hour, endTime.minute, endTime.period);
    
    // Validate end time is after start time
    if (!validateTimeSlot(start24, end24)) {
      setError('End time must be after start time');
      return;
    }
    
    onSave({
      startTime: start24,
      endTime: end24,
      label: label.trim() || undefined
    });
  };

  const renderTimePicker = (
    time: { hour: string; minute: string; period: string },
    setTime: (time: { hour: string; minute: string; period: string }) => void,
    label: string
  ) => (
    <View style={styles.modalInputGroup}>
      <Text style={styles.modalLabel}>{label} *</Text>
      
      {/* Hour Selection */}
      <View style={styles.timePickerRow}>
        <Text style={styles.timeSectionLabel}>Hour:</Text>
        <View style={styles.optionsContainer}>
          {HOUR_OPTIONS.map((hour) => (
            <TouchableOpacity
              key={`hour-${hour}`}
              style={[
                styles.optionButton,
                time.hour === hour && styles.optionButtonActive
              ]}
              onPress={() => setTime({ ...time, hour })}
            >
              <Text style={[
                styles.optionText,
                time.hour === hour && styles.optionTextActive
              ]}>
                {hour}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Minute Selection */}
      <View style={styles.timePickerRow}>
        <Text style={styles.timeSectionLabel}>Minute:</Text>
        <View style={styles.optionsContainer}>
          {MINUTE_OPTIONS.map((minute) => (
            <TouchableOpacity
              key={`minute-${minute}`}
              style={[
                styles.optionButton,
                time.minute === minute && styles.optionButtonActive
              ]}
              onPress={() => setTime({ ...time, minute })}
            >
              <Text style={[
                styles.optionText,
                time.minute === minute && styles.optionTextActive
              ]}>
                {minute}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* AM/PM Selection */}
      <View style={styles.timePickerRow}>
        <Text style={styles.timeSectionLabel}>AM/PM:</Text>
        <View style={styles.optionsContainer}>
          {PERIOD_OPTIONS.map((period) => (
            <TouchableOpacity
              key={`period-${period}`}
              style={[
                styles.optionButton,
                styles.periodButton,
                time.period === period && styles.optionButtonActive
              ]}
              onPress={() => setTime({ ...time, period })}
            >
              <Text style={[
                styles.optionText,
                time.period === period && styles.optionTextActive
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Display formatted time */}
      <View style={styles.timeDisplay}>
        <Text style={styles.timeDisplayText}>
          Selected: {time.hour}:{time.minute} {time.period}
        </Text>
      </View>
    </View>
  );

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#495057" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {renderTimePicker(startTime, setStartTime, 'Start Time')}
            {renderTimePicker(endTime, setEndTime, 'End Time')}
            
            {/* Label Input */}
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Label (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Morning, Lunch, Evening"
                value={label}
                onChangeText={setLabel}
                maxLength={30}
              />
              <Text style={styles.modalHelperText}>
                Helps identify this time slot
              </Text>
            </View>
            
            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSave}
            >
              <Text style={styles.modalSaveButtonText}>
                {editingSlot ? 'Update' : 'Add'} Slot
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBody: {
    padding: 20,
    maxHeight: 500
  },
  modalInputGroup: {
    marginBottom: 24
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 16
  },
  timePickerRow: {
    marginBottom: 16
  },
  timeSectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 8
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionButton: {
    minWidth: 50,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center'
  },
  periodButton: {
    minWidth: 60
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057'
  },
  optionTextActive: {
    color: 'white'
  },
  timeDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1864ab',
    textAlign: 'center'
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212529'
  },
  modalHelperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 6,
    marginLeft: 2
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffc9c9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: '#fa5252',
    fontSize: 14
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    alignItems: 'center'
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057'
  },
  modalSaveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center'
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  }
});