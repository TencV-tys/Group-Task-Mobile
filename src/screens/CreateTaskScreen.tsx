// src/screens/CreateTaskScreen.tsx - UPDATED VERSION WITH TIME SLOT POINTS
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useCreateTask } from '../taskHook/useCreateTask';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TimeSlotModal } from '../components/TimeSlotModal';
import { DAY_OF_WEEK_OPTIONS, formatTimeDisplay } from '../utils/timeUtils';

export default function CreateTaskScreen({ navigation, route }: any) {
  const { groupId, groupName } = route.params || {};
  const { loading, error, success, createTask, reset } = useCreateTask();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<{
    startTime: string;
    endTime: string;
    label?: string;
    points?: string; // Added points for time slot
  } | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    points: '1', // Total task points
    executionFrequency: 'WEEKLY' as 'DAILY' | 'WEEKLY',
    selectedDays: [] as string[],
    dayOfWeek: '',
    isRecurring: true,
    category: '',
    timeSlots: [] as Array<{ 
      startTime: string; 
      endTime: string; 
      label?: string;
      points?: string; // Points for this specific time slot
    }>,
  });

  const handleSubmit = async () => {
    Keyboard.dismiss();
    
    if (!groupId) {
      Alert.alert('Error', 'Group ID is missing');
      return;
    }

    if (!form.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const points = parseInt(form.points, 10);
    if (isNaN(points) || points < 1) {
      Alert.alert('Error', 'Total points must be at least 1');
      return;
    }

    // Validate that time slots points sum doesn't exceed total points
    let totalTimeSlotPoints = 0;
    if (form.timeSlots.length > 0) {
      for (const slot of form.timeSlots) {
        const slotPoints = parseInt(slot.points || '0', 10);
        if (!isNaN(slotPoints) && slotPoints > 0) {
          totalTimeSlotPoints += slotPoints;
        }
      }
    }

    if (totalTimeSlotPoints > points) {
      Alert.alert('Error', `Time slots points (${totalTimeSlotPoints}) exceed total task points (${points}). Please adjust the points.`);
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

    // Prepare task data with time slot points
    const taskData: any = {
      title: form.title,
      description: form.description || undefined,
      points: points,
      executionFrequency: form.executionFrequency,
      timeFormat: '12h', // Always use 12h format
      isRecurring: form.isRecurring,
      category: form.category || undefined,
      timeSlots: form.timeSlots.length > 0 ? form.timeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label || undefined,
        points: slot.points ? parseInt(slot.points, 10) : undefined
      })) : undefined,
    };

    // Add day selections based on frequency
    if (form.executionFrequency === 'WEEKLY') {
      if (form.selectedDays.length > 0) {
        taskData.selectedDays = form.selectedDays;
      } else if (form.dayOfWeek) {
        taskData.dayOfWeek = form.dayOfWeek;
      }
    }

    console.log("Creating task with data:", taskData);

    const result = await createTask(groupId, taskData);
    if (result.success) {
      Alert.alert(
        'Success!',
        'Task created successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              reset();
              setForm({
                title: '',
                description: '',
                points: '1',
                executionFrequency: 'WEEKLY',
                selectedDays: [],
                dayOfWeek: '',
                isRecurring: true,
                category: '',
                timeSlots: [],
              });
              if (route.params?.onTaskCreated) {
                route.params.onTaskCreated(result.task);
              }
              navigation.goBack();
            }
          }
        ]
      );
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
      selectedDays: frequency === 'DAILY' ? [] : prev.selectedDays,
      dayOfWeek: frequency === 'DAILY' ? '' : prev.dayOfWeek,
    }));
  };

  // Time slot management
  const handleAddTimeSlot = () => {
    setEditingSlot(null);
    setEditingSlotIndex(null);
    setShowTimeSlotModal(true);
  };

  const handleEditTimeSlot = (index: number) => {
    const slot = form.timeSlots[index];
    setEditingSlot(slot);
    setEditingSlotIndex(index);
    setShowTimeSlotModal(true);
  };

  const handleRemoveTimeSlot = (index: number) => {
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

  const handleSaveTimeSlot = (slot: { 
    startTime: string; 
    endTime: string; 
    label?: string;
    points?: string; // Points for this time slot
  }) => {
    if (editingSlotIndex !== null) {
      // Edit existing slot
      const updatedSlots = [...form.timeSlots];
      updatedSlots[editingSlotIndex] = slot;
      setForm(prev => ({ ...prev, timeSlots: updatedSlots }));
    } else {
      // Add new slot
      setForm(prev => ({
        ...prev,
        timeSlots: [...prev.timeSlots, slot]
      }));
    }
    
    setEditingSlot(null);
    setEditingSlotIndex(null);
    setShowTimeSlotModal(false);
  };

  // Calculate total points from time slots
  const calculateTimeSlotPoints = () => {
    return form.timeSlots.reduce((total, slot) => {
      const points = parseInt(slot.points || '0', 10);
      return total + (isNaN(points) ? 0 : points);
    }, 0);
  };

  const totalTimeSlotPoints = calculateTimeSlotPoints();
  const remainingPoints = parseInt(form.points, 10) - totalTimeSlotPoints;
  const isPointsValid = remainingPoints >= 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          Create Task
        </Text>
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
                  This task will be added to the group's rotation
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

              {/* Total Points Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Total Task Points *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  value={form.points}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    if (text === '' || (!isNaN(num) && num >= 1)) {
                      setForm({ ...form, points: text });
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!loading}
                />
                <Text style={styles.helperText}>
                  Total reward points for this task (minimum 1)
                </Text>
                <Text style={[styles.helperText, !isPointsValid && styles.pointsError]}>
                  Time slots assigned: {totalTimeSlotPoints} points
                  {!isPointsValid && ` (exceeds total by ${-remainingPoints})`}
                </Text>
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
                  <View>
                    <Text style={styles.label}>
                      Time Slots {form.executionFrequency === 'DAILY' ? '*' : ''}
                    </Text>
                    <Text style={[styles.helperText, { marginTop: 2 }]}>
                      Assign points to each time slot
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addTimeSlotButton}
                    onPress={handleAddTimeSlot}
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
                      Click "Add Slot" to create time slots with points
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timeSlotsList}>
                    {form.timeSlots.map((slot, index) => (
                      <View key={index} style={styles.timeSlotItem}>
                        <View style={styles.timeSlotInfo}>
                          <View style={styles.timeSlotHeader}>
                            <Text style={styles.timeSlotTime}>
                              {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                            </Text>
                            {slot.points && parseInt(slot.points, 10) > 0 ? (
                              <View style={styles.pointsBadge}>
                                <Text style={styles.pointsBadgeText}>
                                  {slot.points} pts
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {slot.label ? (
                            <Text style={styles.timeSlotLabel}>{slot.label}</Text>
                          ) : null}
                          <Text style={styles.timeSlotPoints}>
                            Points: {slot.points || '0'} (use task default)
                          </Text>
                        </View>
                        <View style={styles.timeSlotActions}>
                          <TouchableOpacity
                            style={styles.timeSlotActionButton}
                            onPress={() => handleEditTimeSlot(index)}
                            disabled={loading}
                          >
                            <MaterialCommunityIcons name="pencil" size={18} color="#6c757d" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.timeSlotActionButton}
                            onPress={() => handleRemoveTimeSlot(index)}
                            disabled={loading}
                          >
                            <MaterialCommunityIcons name="delete" size={18} color="#fa5252" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {/* Points Summary */}
                    <View style={styles.pointsSummary}>
                      <Text style={styles.pointsSummaryText}>
                        Total Task Points: <Text style={styles.pointsHighlight}>{form.points}</Text>
                      </Text>
                      <Text style={styles.pointsSummaryText}>
                        Time Slots Assigned: <Text style={styles.pointsHighlight}>{totalTimeSlotPoints}</Text>
                      </Text>
                      <Text style={[styles.pointsSummaryText, !isPointsValid && styles.pointsError]}>
                        Remaining: <Text style={[styles.pointsHighlight, !isPointsValid && styles.pointsError]}>
                          {remainingPoints}
                        </Text>
                      </Text>
                    </View>
                  </View>
                )}
                <Text style={styles.helperText}>
                  {form.executionFrequency === 'DAILY'
                    ? 'Daily tasks require time slots. Assign points to each slot.'
                    : 'Optional time slots for selected days. You can assign points to each slot.'}
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
                    Select days for weekly tasks (multiple allowed)
                  </Text>
                </View>
              )}

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
                    !isPointsValid ||
                    (form.executionFrequency === 'DAILY' && form.timeSlots.length === 0) ||
                    (form.executionFrequency === 'WEEKLY' && form.selectedDays.length === 0 && !form.dayOfWeek) ||
                    loading) && styles.buttonDisabled
                ]}
                onPress={handleSubmit}
                disabled={
                  !form.title.trim() ||
                  !isPointsValid ||
                  (form.executionFrequency === 'DAILY' && form.timeSlots.length === 0) ||
                  (form.executionFrequency === 'WEEKLY' && form.selectedDays.length === 0 && !form.dayOfWeek) ||
                  loading
                }
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Task</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>💡 Task Creation Tips</Text>
              <Text style={styles.infoText}>
                • Daily tasks require time slots (e.g., 8-10 AM, 1-3 PM, 6-8 PM){'\n'}
                • Weekly tasks need at least one day selected{'\n'}
                • Assign points to each time slot (optional){'\n'}
                • Time slot points cannot exceed total task points{'\n'}
                • If time slot has no points, it uses task default points{'\n'}
                • Select hours (1-12), minutes (00, 15, 30, 45), and AM/PM{'\n'}
                • End time must be after start time{'\n'}
                • Time slots can have labels (Morning, Lunch, etc.){'\n'}
                • Recurring tasks rotate among members automatically{'\n'}
                • Points motivate participation and track progress
              </Text>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Time Slot Modal - Updated to include points input */}
      <TimeSlotModal
        visible={showTimeSlotModal}
        onClose={() => setShowTimeSlotModal(false)}
        onSave={handleSaveTimeSlot}
        editingSlot={editingSlot}
        totalTaskPoints={parseInt(form.points, 10)}
        usedPoints={totalTimeSlotPoints}
      />
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
    paddingVertical: 5,
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
  pointsError: {
    color: '#fa5252',
    fontWeight: '500'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '100%'
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
    gap: 12
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  timeSlotInfo: {
    flex: 1
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  timeSlotTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529'
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4
  },
  timeSlotPoints: {
    fontSize: 12,
    color: '#495057',
    fontStyle: 'italic'
  },
  pointsBadge: {
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF'
  },
  timeSlotActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
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
  pointsSummary: {
    backgroundColor: '#f1f3f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginTop: 8
  },
  pointsSummaryText: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 4
  },
  pointsHighlight: {
    fontWeight: '600',
    color: '#212529'
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
  infoBox: {
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
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 20
  } 
});