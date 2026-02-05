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
  TouchableWithoutFeedback
} from 'react-native';
import { useUpdateTask } from '../taskHook/useUpdateTask';

// Time options for scheduled time
const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

// Day of week options (for multiple selection)
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
    
    // Check if executionFrequency exists (new field)
    if (taskData.executionFrequency) {
      return taskData.executionFrequency;
    }
    
    // Fallback to frequency field (old field)
    return taskData.frequency || 'WEEKLY';
  };

  // Parse scheduledTime from task data
  const parseScheduledTime = (taskData: any) => {
    if (!taskData) return '';
    
    // Check if scheduledTime exists (new field)
    if (taskData.scheduledTime) {
      return taskData.scheduledTime;
    }
    
    return '';
  };

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    points: task?.points?.toString() || '1',
    executionFrequency: parseExecutionFrequency(task) as 'DAILY' | 'WEEKLY',
    scheduledTime: parseScheduledTime(task),
    timeFormat: task?.timeFormat || '12h' as '12h' | '24h',
    selectedDays: parseSelectedDays(task),
    isRecurring: task?.isRecurring !== false,
    category: task?.category || '',
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

    if (form.executionFrequency === 'DAILY' && !form.scheduledTime) {
      Alert.alert('Error', 'Daily tasks require a scheduled time');
      return;
    }

    if (form.executionFrequency === 'WEEKLY' && form.selectedDays.length === 0) {
      Alert.alert('Error', 'Weekly tasks require at least one day selection');
      return;
    }

    // Prepare update data
    const updateData: any = {
      title: form.title,
      description: form.description || undefined,
      points: points,
      executionFrequency: form.executionFrequency,
      scheduledTime: form.scheduledTime || undefined,
      timeFormat: form.timeFormat,
      isRecurring: form.isRecurring,
      category: form.category || undefined,
    };

    // Add day selections for weekly tasks
    if (form.executionFrequency === 'WEEKLY' && form.selectedDays.length > 0) {
      updateData.selectedDays = form.selectedDays;
      // Clear dayOfWeek if we're using selectedDays
      updateData.dayOfWeek = undefined;
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
      // Reset time selection when switching frequencies
      scheduledTime: frequency === 'DAILY' ? prev.scheduledTime : '',
    }));
  };

  const scrollToInput = (reactNode: any) => {
    scrollViewRef.current?.scrollTo({ y: reactNode, animated: true });
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading task data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
              <Text style={styles.backButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Task</Text>
            <View style={styles.headerSpacer} />
          </View>

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

              {/* Scheduled Time for DAILY tasks */}
              {form.executionFrequency === 'DAILY' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Time *</Text>
                  <View style={styles.timeOptionsContainer}>
                    {TIME_OPTIONS.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeOptionButton,
                          form.scheduledTime === time && styles.timeOptionButtonActive
                        ]}
                        onPress={() => setForm({ ...form, scheduledTime: time })}
                        disabled={loading}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          form.scheduledTime === time && styles.timeOptionTextActive
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.helperText}>
                    Select a time for daily tasks
                  </Text>
                </View>
              )}

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
                  (!form.title.trim() || loading) && styles.buttonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!form.title.trim() || loading}
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
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 20,
    color: '#495057',
    fontWeight: '300'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  headerSpacer: {
    width: 36
  },
  content: {
    flex: 1,
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
  timeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  timeOptionButton: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center'
  },
  timeOptionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  timeOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057'
  },
  timeOptionTextActive: {
    color: 'white'
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
  }
});