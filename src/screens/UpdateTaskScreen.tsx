// src/screens/UpdateTaskScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useUpdateTask } from '../taskHook/useUpdateTask';

// Time of day options (matching backend enum)
const TIME_OF_DAY_OPTIONS = [
  { value: 'MORNING', label: 'Morning (6 AM - 12 PM)' },
  { value: 'AFTERNOON', label: 'Afternoon (12 PM - 6 PM)' },
  { value: 'EVENING', label: 'Evening (6 PM - 10 PM)' },
  { value: 'ANYTIME', label: 'Anytime' }
];

// Day of week options (matching backend enum)
const DAY_OF_WEEK_OPTIONS = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' }
];

export default function UpdateTaskScreen({ navigation, route }: any) {
  const { task, groupId, groupName } = route.params || {};
  const { loading, error, success, updateTask, reset } = useUpdateTask();

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    points: task?.points?.toString() || '1',
    frequency: task?.frequency || 'WEEKLY',
    category: task?.category || '',
    timeOfDay: task?.timeOfDay || '',
    dayOfWeek: task?.dayOfWeek || '',
    isRecurring: task?.isRecurring !== false // Default to true
  });

  useEffect(() => {
    if (!task) {
      Alert.alert('Error', 'No task data provided');
      navigation.goBack();
    }
  }, [task, navigation]);

  const handleSubmit = async () => {
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

    // Prepare update data with new fields
    const updateData: any = {
      title: form.title,
      description: form.description || undefined,
      points: points,
      frequency: form.frequency,
      category: form.category || undefined,
      isRecurring: form.isRecurring
    };

    // Add optional enum fields if provided
    if (form.timeOfDay) {
      updateData.timeOfDay = form.timeOfDay;
    }
    if (form.dayOfWeek) {
      updateData.dayOfWeek = form.dayOfWeek;
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
    navigation.goBack();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Task</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
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

          {/* Time of Day Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time of Day</Text>
            <View style={styles.optionsContainer}>
              {TIME_OF_DAY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    form.timeOfDay === option.value && styles.optionButtonActive
                  ]}
                  onPress={() => setForm({ ...form, timeOfDay: option.value })}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      form.timeOfDay === option.value && styles.optionButtonTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>When should this task be done?</Text>
          </View>

          {/* Day of Week Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Day of Week</Text>
            <View style={styles.optionsContainer}>
              {DAY_OF_WEEK_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    form.dayOfWeek === option.value && styles.optionButtonActive
                  ]}
                  onPress={() => setForm({ ...form, dayOfWeek: option.value })}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      form.dayOfWeek === option.value && styles.optionButtonTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>Optional - For weekly scheduling</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.frequencyButtons}>
                {['WEEKLY', 'DAILY', 'MONTHLY'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      form.frequency === freq && styles.frequencyButtonActive
                    ]}
                    onPress={() => setForm({ ...form, frequency: freq })}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        form.frequency === freq && styles.frequencyButtonTextActive
                      ]}
                    >
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Recurring</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  form.isRecurring && styles.toggleButtonActive
                ]}
                onPress={() => setForm({ ...form, isRecurring: !form.isRecurring })}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    form.isRecurring && styles.toggleButtonTextActive
                  ]}
                >
                  {form.isRecurring ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Recurring tasks rotate among members
              </Text>
            </View>
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
      </ScrollView>
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
    padding: 20
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
    marginBottom: 20
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
    paddingVertical: 10,
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
    marginTop: 4,
    marginLeft: 4
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '48%'
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionButton: {
    flex: 1,
    minWidth: '48%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center'
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center'
  },
  optionButtonTextActive: {
    color: 'white'
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  frequencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  frequencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057'
  },
  frequencyButtonTextActive: {
    color: 'white'
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center'
  },
  toggleButtonActive: {
    backgroundColor: '#34c759',
    borderColor: '#34c759'
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057'
  },
  toggleButtonTextActive: {
    color: 'white'
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffc9c9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  errorText: {
    color: '#fa5252',
    fontSize: 14
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
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