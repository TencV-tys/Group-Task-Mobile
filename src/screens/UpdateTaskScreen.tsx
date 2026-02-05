// src/screens/UpdateTaskScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal
} from 'react-native';
import { useUpdateTask } from '../taskHook/useUpdateTask';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Time options for time slots
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [`${hour}:00`, `${hour}:30`];
}).flat();

// Day of week options
const DAY_OF_WEEK_OPTIONS = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' }
];

export default function UpdateTaskScreen({ navigation, route }: any) {
  const { task, groupId, groupName } = route.params || {};
  const { loading, error, success, updateTask, reset } = useUpdateTask();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [timeSlotModal, setTimeSlotModal] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [currentTimeSlot, setCurrentTimeSlot] = useState({
    startTime: '08:00',
    endTime: '09:00',
    label: ''
  });

  // Helper function to parse selectedDays from task data
  const parseSelectedDays = (taskData: any) => {
    if (!taskData) return [];
    
    // Check if selectedDays exists and is an array
    if (taskData.selectedDays && Array.isArray(taskData.selectedDays)) {
      return taskData.selectedDays;
    }
    
    // If dayOfWeek exists, use it as a single selected day
    if (taskData.dayOfWeek) {
      return [taskData.dayOfWeek];
    }
    
    return [];
  };

  // Parse executionFrequency from task data
  const parseExecutionFrequency = (taskData: any) => {
    if (!taskData) return 'WEEKLY';
    
    // Check if executionFrequency exists
    if (taskData.executionFrequency) {
      return taskData.executionFrequency;
    }
    
    // Fallback to frequency field (old field)
    return taskData.frequency || 'WEEKLY';
  };

  // Parse time slots from task data
  const parseTimeSlots = (taskData: any) => {
    if (!taskData) return [];
    
    // Check if timeSlots exists in task data
    if (taskData.timeSlots && Array.isArray(taskData.timeSlots)) {
      return taskData.timeSlots;
    }
    
    // Check if task has timeSlots relation loaded
    if (taskData.timeSlots && Array.isArray(taskData.timeSlots)) {
      return taskData.timeSlots.map((slot: any) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label
      }));
    }
    
    // If scheduledTime exists (legacy), create a single time slot
    if (taskData.scheduledTime) {
      return [{
        startTime: taskData.scheduledTime,
        endTime: (() => {
          const timeParts = taskData.scheduledTime.split(':');
          const hour = parseInt(timeParts[0]);
          const nextHour = (hour + 1) % 24;
          return `${nextHour.toString().padStart(2, '0')}:${timeParts[1] || '00'}`;
        })(),
        label: 'Default'
      }];
    }
    
    return [];
  };

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    points: task?.points?.toString() || '1',
    executionFrequency: parseExecutionFrequency(task) as 'DAILY' | 'WEEKLY',
    timeFormat: task?.timeFormat || '12h' as '12h' | '24h',
    selectedDays: parseSelectedDays(task),
    dayOfWeek: task?.dayOfWeek || '',
    isRecurring: task?.isRecurring !== false,
    category: task?.category || '',
    timeSlots: parseTimeSlots(task),
  });

  useEffect(() => {
    if (!task) {
      Alert.alert('Error', 'No task data provided');
      navigation.goBack();
    }
  }, [task, navigation]);

  const handleSubmit = async () => {
    Keyboard.dismiss(); // Dismiss keyboard first
    
    if (!task?.id) {
      Alert.alert('Error', 'Task ID is missing');
      return;
    }
 
    if (!form.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    } 

    const points = parseInt(form.points, 10);
    if (isNaN(points) || points < 1) {
      Alert.alert('Error', 'Points must be at least 1');
      return;
    }

    // Validation for DAILY tasks
    if (form.executionFrequency === 'DAILY') {
      if (form.timeSlots.length === 0) {
        Alert.alert('Error', 'Daily tasks require at least one time slot');
        return;
      }
    }

    // Validation for WEEKLY tasks
    if (form.executionFrequency === 'WEEKLY') {
      if (form.selectedDays.length === 0 && !form.dayOfWeek) {
        Alert.alert('Error', 'Weekly tasks require at least one day selection');
        return;
      }
    }

    // Prepare update data
    const updateData: any = {
      title: form.title,
      description: form.description || undefined,
      points: points,
      executionFrequency: form.executionFrequency,
      timeFormat: form.timeFormat,
      isRecurring: form.isRecurring,
      category: form.category || undefined,
      timeSlots: form.timeSlots.length > 0 ? form.timeSlots : undefined,
    };

    // Add day selections for weekly tasks
    if (form.executionFrequency === 'WEEKLY') {
      if (form.selectedDays.length > 0) {
        updateData.selectedDays = form.selectedDays;
      } else if (form.dayOfWeek) {
        updateData.dayOfWeek = form.dayOfWeek;
      }
    }

    const result = await updateTask(task.id, updateData);

    if (result.success) {
      Alert.alert(
        'Success!',
        'Task updated successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              reset();
              // Pass updated task back
              if (route.params?.onTaskUpdated) {
                route.params.onTaskUpdated(result.task);
              }
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const toggleDaySelection = (day: string) => {
    if (form.selectedDays.includes(day)) {
      setForm(prev => ({
        ...prev,
        selectedDays: prev.selectedDays.filter(d => d !== day)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        selectedDays: [...prev.selectedDays, day]
      }));
    }
  };

  const handleFrequencyChange = (frequency: 'DAILY' | 'WEEKLY') => {
    setForm(prev => ({ 
      ...prev, 
      executionFrequency: frequency,
      // Clear days if switching to DAILY
      selectedDays: frequency === 'DAILY' ? [] : prev.selectedDays,
      dayOfWeek: frequency === 'DAILY' ? '' : prev.dayOfWeek,
    }));
  };

  // Time slot management
  const addTimeSlot = () => {
    if (!currentTimeSlot.startTime || !currentTimeSlot.endTime) {
      Alert.alert('Error', 'Please select both start and end times');
      return;
    }

    const newSlot = { 
      startTime: currentTimeSlot.startTime,
      endTime: currentTimeSlot.endTime,
      label: currentTimeSlot.label || undefined
    };
    
    if (editingSlotIndex !== null) {
      // Edit existing slot
      const updatedSlots = [...form.timeSlots];
      updatedSlots[editingSlotIndex] = newSlot;
      setForm(prev => ({ ...prev, timeSlots: updatedSlots }));
    } else {
      // Add new slot
      setForm(prev => ({ 
        ...prev, 
        timeSlots: [...prev.timeSlots, newSlot]
      }));
    }
    
    // Reset form
    setCurrentTimeSlot({
      startTime: '08:00',
      endTime: '09:00',
      label: ''
    });
    setEditingSlotIndex(null);
    setTimeSlotModal(false);
  };

  const editTimeSlot = (index: number) => {
    const slot = form.timeSlots[index];
    setCurrentTimeSlot({ 
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: slot.label || ''
    });
    setEditingSlotIndex(index);
    setTimeSlotModal(true);
  };

  const removeTimeSlot = (index: number) => {
    Alert.alert(
      'Remove Time Slot',
      'Are you sure you want to remove this time slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedSlots = [...form.timeSlots];
            updatedSlots.splice(index, 1);
            setForm(prev => ({ ...prev, timeSlots: updatedSlots }));
          }
        }
      ]
    );
  };

  // Helper to format time
  const formatTime = (time: string) => {
    if (form.timeFormat === '12h') {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return time;
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Task</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading task data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Task</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {groupName && (
              <View style={styles.groupInfo}>
                <Text style={styles.groupLabel}>Group:</Text>
                <Text style={styles.groupName}>{groupName}</Text>
                <Text style={styles.groupNote}>
                  Editing rotation task
                </Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Task Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What needs to be done?"
                  value={form.title}
                  onChangeText={(text) => setForm({ ...form, title: text })}
                  maxLength={100}
                  editable={!loading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                <Text style={styles.helperText}>
                  {form.title.length}/100 characters
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add more details about this task..."
                  value={form.description}
                  onChangeText={(text) => setForm({ ...form, description: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                  editable={!loading}
                />
                <Text style={styles.helperText}>
                  {form.description.length}/500 characters
                </Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Points</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    value={form.points}
                    onChangeText={(text) => setForm({ ...form, points: text })}
                    keyboardType="number-pad"
                    maxLength={3}
                    editable={!loading}
                  />
                  <Text style={styles.helperText}>Reward points</Text>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Chores, Work, Study"
                    value={form.category}
                    onChangeText={(text) => setForm({ ...form, category: text })}
                    maxLength={50}
                    editable={!loading}
                  />
                  <Text style={styles.helperText}>Optional</Text>
                </View>
              </View>

              {/* Frequency Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Frequency *</Text>
                <View style={styles.frequencyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.frequencyButton,
                      form.executionFrequency === 'WEEKLY' && styles.frequencyButtonActive
                    ]}
                    onPress={() => handleFrequencyChange('WEEKLY')}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      form.executionFrequency === 'WEEKLY' && styles.frequencyButtonTextActive
                    ]}>
                      Weekly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.frequencyButton,
                      form.executionFrequency === 'DAILY' && styles.frequencyButtonActive
                    ]}
                    onPress={() => handleFrequencyChange('DAILY')}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      form.executionFrequency === 'DAILY' && styles.frequencyButtonTextActive
                    ]}>
                      Daily
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  How often this task needs to be done
                </Text>
              </View>

              {/* Time Slots Section */}
              <View style={styles.inputGroup}>
                <View style={styles.timeSlotsHeader}>
                  <Text style={styles.label}>
                    Time Slots {form.executionFrequency === 'DAILY' ? '*' : ''}
                  </Text>
                  <TouchableOpacity
                    style={styles.addTimeSlotButton}
                    onPress={() => {
                      setCurrentTimeSlot({
                        startTime: '08:00',
                        endTime: '09:00',
                        label: ''
                      });
                      setEditingSlotIndex(null);
                      setTimeSlotModal(true);
                    }}
                    disabled={loading}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color="#007AFF" />
                    <Text style={styles.addTimeSlotText}>Add Slot</Text>
                  </TouchableOpacity>
                </View>
                
                {form.timeSlots.length === 0 ? (
                  <View style={styles.emptyTimeSlots}>
                    <MaterialCommunityIcons name="clock-outline" size={40} color="#dee2e6" />
                    <Text style={styles.emptyTimeSlotsText}>
                      No time slots added yet
                    </Text>
                    <Text style={styles.emptyTimeSlotsSubtext}>
                      Click "Add Slot" to create time slots
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timeSlotsList}>
                    {form.timeSlots.map((slot, index) => (
                      <View key={index} style={styles.timeSlotItem}>
                        <View style={styles.timeSlotInfo}>
                          <Text style={styles.timeSlotTime}>
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </Text>
                          {slot.label ? (
                            <Text style={styles.timeSlotLabel}>{slot.label}</Text>
                          ) : null}
                        </View>
                        <View style={styles.timeSlotActions}>
                          <TouchableOpacity
                            style={styles.timeSlotActionButton}
                            onPress={() => editTimeSlot(index)}
                            disabled={loading}
                          >
                            <MaterialCommunityIcons name="pencil" size={18} color="#6c757d" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.timeSlotActionButton}
                            onPress={() => removeTimeSlot(index)}
                            disabled={loading}
                          >
                            <MaterialCommunityIcons name="delete" size={18} color="#fa5252" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.helperText}>
                  {form.executionFrequency === 'DAILY' 
                    ? 'Time slots for daily tasks (e.g., 8-10 AM, 1-3 PM, 6-8 PM)'
                    : 'Optional time slots for selected days'}
                </Text>
              </View>

              {/* Day Selection for WEEKLY tasks */}
              {form.executionFrequency === 'WEEKLY' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Days *</Text>
                  <View style={styles.daysContainer}>
                    {DAY_OF_WEEK_OPTIONS.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayButton,
                          form.selectedDays.includes(day.value) && styles.dayButtonActive
                        ]}
                        onPress={() => toggleDaySelection(day.value)}
                        disabled={loading}
                      >
                        <Text style={[
                          styles.dayButtonText,
                          form.selectedDays.includes(day.value) && styles.dayButtonTextActive
                        ]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.helperText}>
                    Selected: {form.selectedDays.length} day(s)
                  </Text>
                </View>
              )}

              {/* Time Format */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time Format</Text>
                <View style={styles.timeFormatContainer}>
                  <TouchableOpacity
                    style={[
                      styles.formatButton,
                      form.timeFormat === '12h' && styles.formatButtonActive
                    ]}
                    onPress={() => setForm({ ...form, timeFormat: '12h' })}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.formatButtonText,
                      form.timeFormat === '12h' && styles.formatButtonTextActive
                    ]}>
                      12-hour (AM/PM)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formatButton,
                      form.timeFormat === '24h' && styles.formatButtonActive
                    ]}
                    onPress={() => setForm({ ...form, timeFormat: '24h' })}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.formatButtonText,
                      form.timeFormat === '24h' && styles.formatButtonTextActive
                    ]}>
                      24-hour
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Recurring Toggle */}
              <View style={styles.inputGroup}>
                <View style={styles.toggleContainer}>
                  <Text style={styles.label}>Recurring Task</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      form.isRecurring && styles.toggleSwitchActive
                    ]}
                    onPress={() => setForm({ ...form, isRecurring: !form.isRecurring })}
                    disabled={loading}
                  >
                    <View style={[
                      styles.toggleCircle,
                      form.isRecurring && styles.toggleCircleActive
                    ]} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Recurring tasks rotate among group members weekly
                </Text>
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!form.title.trim() || 
                   (form.executionFrequency === 'DAILY' && form.timeSlots.length === 0) ||
                   (form.executionFrequency === 'WEEKLY' && form.selectedDays.length === 0 && !form.dayOfWeek) ||
                   loading) && styles.buttonDisabled
                ]}
                onPress={handleSubmit}
                disabled={
                  !form.title.trim() || 
                  (form.executionFrequency === 'DAILY' && form.timeSlots.length === 0) ||
                  (form.executionFrequency === 'WEEKLY' && form.selectedDays.length === 0 && !form.dayOfWeek) ||
                  loading
                }
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Task</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.taskInfo}>
              <Text style={styles.infoTitle}>Task Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>
                  {new Date(task.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Creator:</Text>
                <Text style={styles.infoValue}>
                  {task.creator?.fullName || 'Admin'}
                </Text>
              </View> 
              {task.rotationOrder && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rotation Order:</Text>
                  <Text style={styles.infoValue}>#{task.rotationOrder}</Text>
                </View>
              )}
              {task.currentAssignee && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Current Assignee:</Text>
                  <Text style={styles.infoValue}>
                    {task.assignments?.[0]?.user?.fullName || 'Assigned'}
                  </Text>
                </View>
              )}
              {task.assignments && task.assignments.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total Assignments:</Text>
                  <Text style={styles.infoValue}>
                    {task.assignments.length} time(s)
                  </Text>
                </View>
              )}
            </View>

            {/* Bottom padding for keyboard */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Time Slot Modal */}
      <Modal
        visible={timeSlotModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTimeSlotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSlotIndex !== null ? 'Edit Time Slot' : 'Add Time Slot'}
              </Text>
              <TouchableOpacity
                onPress={() => setTimeSlotModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#495057" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Start Time *</Text>
                <View style={styles.timePickerContainer}>
                  {TIME_OPTIONS.slice(0, 48).map((time) => (
                    <TouchableOpacity
                      key={`start-${time}`}
                      style={[
                        styles.timePickerButton,
                        currentTimeSlot.startTime === time && styles.timePickerButtonActive
                      ]}
                      onPress={() => setCurrentTimeSlot({...currentTimeSlot, startTime: time})}
                    >
                      <Text style={[
                        styles.timePickerText,
                        currentTimeSlot.startTime === time && styles.timePickerTextActive
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>End Time *</Text>
                <View style={styles.timePickerContainer}>
                  {TIME_OPTIONS.slice(0, 48).map((time) => (
                    <TouchableOpacity
                      key={`end-${time}`}
                      style={[
                        styles.timePickerButton,
                        currentTimeSlot.endTime === time && styles.timePickerButtonActive
                      ]}
                      onPress={() => setCurrentTimeSlot({...currentTimeSlot, endTime: time})}
                    >
                      <Text style={[
                        styles.timePickerText,
                        currentTimeSlot.endTime === time && styles.timePickerTextActive
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Label (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., Morning, Lunch, Evening"
                  value={currentTimeSlot.label}
                  onChangeText={(text) => setCurrentTimeSlot({...currentTimeSlot, label: text})}
                  maxLength={30}
                />
                <Text style={styles.modalHelperText}>
                  Helps identify this time slot
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelButton, loading && styles.buttonDisabled]}
                onPress={() => setTimeSlotModal(false)}
                disabled={loading}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, loading && styles.buttonDisabled]}
                onPress={addTimeSlot}
                disabled={loading || !currentTimeSlot.startTime || !currentTimeSlot.endTime}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingSlotIndex !== null ? 'Update' : 'Add'} Slot
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    fontSize: 24,
    color: '#007AFF',
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginHorizontal: 12,
    textAlign: 'center'
  },
  headerSpacer: {
    width: 36
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  bottomPadding: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d'
  },
  groupInfo: {
    backgroundColor: '#e7f5ff',
    padding: 12,
    borderRadius: 8,
    margin: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  groupLabel: {
    fontSize: 12,
    color: '#1864ab',
    marginBottom: 4
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529'
  },
  groupNote: {
    fontSize: 12,
    color: '#1864ab',
    marginTop: 4,
    fontStyle: 'italic'
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 6,
    marginLeft: 2
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '48%'
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 10
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center'
  },
  frequencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057'
  },
  frequencyButtonTextActive: {
    color: 'white'
  },
  timeSlotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  addTimeSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e7f5ff',
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  addTimeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF'
  },
  emptyTimeSlots: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderStyle: 'dashed'
  },
  emptyTimeSlotsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 12,
    marginBottom: 4
  },
  emptyTimeSlotsSubtext: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center'
  },
  timeSlotsList: {
    gap: 8
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  timeSlotInfo: {
    flex: 1
  },
  timeSlotTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529'
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2
  },
  timeSlotActions: {
    flexDirection: 'row',
    gap: 8
  },
  timeSlotActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8
  },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057'
  },
  dayButtonTextActive: {
    color: 'white'
  },
  timeFormatContainer: {
    flexDirection: 'row',
    gap: 10
  },
  formatButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center'
  },
  formatButtonActive: {
    backgroundColor: '#34c759',
    borderColor: '#34c759'
  },
  formatButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057'
  },
  formatButtonTextActive: {
    color: 'white'
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e9ecef',
    padding: 2,
    justifyContent: 'center'
  },
  toggleSwitchActive: {
    backgroundColor: '#34c759'
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2
  },
  toggleCircleActive: {
    transform: [{ translateX: 22 }]
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffc9c9',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20
  },
  errorText: {
    color: '#fa5252',
    fontSize: 14
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 30
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057'
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center'
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  taskInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 14,
    color: '#6c757d'
  },
  infoValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500'
  },
  // Modal styles
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
    maxHeight: 400
  },
  modalInputGroup: {
    marginBottom: 24
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 12
  },
  timePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  timePickerButton: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center'
  },
  timePickerButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  timePickerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057'
  },
  timePickerTextActive: {
    color: 'white'
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