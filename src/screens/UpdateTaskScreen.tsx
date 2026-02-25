// src/screens/UpdateTaskScreen.tsx - UPDATED with clean UI and dark gray primary
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUpdateTask } from '../taskHook/useUpdateTask';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TimeSlotModal } from '../components/TimeSlotModal';
import { DAY_OF_WEEK_OPTIONS, formatTimeDisplay } from '../utils/timeUtils';

export default function UpdateTaskScreen({ navigation, route }: any) {
  const { task, groupId, groupName } = route.params || {};
  const { loading, error, success, updateTask, reset } = useUpdateTask();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<{
    startTime: string;
    endTime: string;
    label?: string;
    points?: string;
  } | null>(null);

  // Parse time slots from task data (updated to include points)
  const parseTimeSlots = (taskData: any) => {
    if (!taskData) return [];
    
    // Check if timeSlots exists in task data
    if (taskData.timeSlots && Array.isArray(taskData.timeSlots)) {
      return taskData.timeSlots.map((slot: any) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label || undefined,
        points: slot.points?.toString() || undefined
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
        label: 'Default',
        points: taskData.points?.toString() || undefined
      }];
    }
    
    return [];
  };

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    points: task?.points?.toString() || '1',
    executionFrequency: task?.executionFrequency || 'WEEKLY' as 'DAILY' | 'WEEKLY',
    timeFormat: task?.timeFormat || '12h' as '12h' | '24h',
    selectedDays: task?.selectedDays || [],
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

  // Calculate total points from time slots
  const calculateTimeSlotPoints = () => {
    return form.timeSlots.reduce((total: number, slot: { startTime: string; endTime: string; label?: string; points?: string }) => {
      const points = parseInt(slot.points || '0', 10);
      return total + (isNaN(points) ? 0 : points);
    }, 0);
  }

  const totalTimeSlotPoints = calculateTimeSlotPoints();
  const remainingPoints = parseInt(form.points, 10) - totalTimeSlotPoints;
  
  // VALIDATION: Check if points are valid (1-10 range)
  const isPointsValid = remainingPoints >= 0;
  const isPointsWithinLimit = () => {
    const points = parseInt(form.points, 10);
    return !isNaN(points) && points >= 1 && points <= 10;
  };

  // Check if any time slot exceeds 10 points
  const hasTimeSlotExceedingLimit = () => {
    return form.timeSlots.some((slot: { startTime: string; endTime: string; label?: string; points?: string }) => {
      const points = parseInt(slot.points || '0', 10);
      return points > 10;
    });
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    
    if (!task?.id) {
      Alert.alert('Error', 'Task ID is missing');
      return;
    }
 
    if (!form.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    } 

    const points = parseInt(form.points, 10);
    
    // VALIDATION: Points must be between 1 and 10
    if (isNaN(points) || points < 1) {
      Alert.alert('Error', 'Total points must be at least 1');
      return;
    }
    
    if (points > 10) {
      Alert.alert('Error', 'Total points cannot exceed 10');
      return;
    }

    // VALIDATION: Check time slot points don't exceed 10 each
    if (hasTimeSlotExceedingLimit()) {
      Alert.alert('Error', 'Time slots cannot have more than 10 points each');
      return;
    }

    if (!isPointsValid) {
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

    const updateData: any = {
      title: form.title,
      description: form.description || undefined,
      points: points,
      executionFrequency: form.executionFrequency,
      timeFormat: '12h',
      isRecurring: form.isRecurring,
      category: form.category || undefined,
      timeSlots: form.timeSlots.length > 0 ? form.timeSlots.map((slot: { startTime: string; endTime: string; label?: string; points?: string }) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label || undefined,
        points: slot.points ? parseInt(slot.points, 10) : undefined
      })) : undefined,
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
        selectedDays: prev.selectedDays.filter((d: string) => d !== day)
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

  const handlePointsChange = (text: string) => {
    const num = parseInt(text, 10);
    if (text === '' || (!isNaN(num) && num >= 1 && num <= 10)) {
      setForm(prev => ({ ...prev, points: text }));
    }
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
    points?: string;
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

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Task</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#495057" />
          <Text style={styles.loadingText}>Loading task data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if submit button should be disabled
  const isSubmitDisabled = () => {
    const points = parseInt(form.points, 10);
    const isPointsInvalid = isNaN(points) || points < 1 || points > 10;
    
    return (
      !form.title.trim() ||
      isPointsInvalid ||
      !isPointsValid ||
      hasTimeSlotExceedingLimit() ||
      (form.executionFrequency === 'DAILY' && form.timeSlots.length === 0) ||
      (form.executionFrequency === 'WEEKLY' && form.selectedDays.length === 0 && !form.dayOfWeek) ||
      loading
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
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
              <LinearGradient
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.groupInfo}
              >
                <View style={styles.groupInfoContent}>
                  <MaterialCommunityIcons name="account-group" size={16} color="#2b8a3e" />
                  <View>
                    <Text style={styles.groupLabel}>Group:</Text>
                    <Text style={styles.groupName}>{groupName}</Text>
                  </View>
                </View>
                <Text style={styles.groupNote}>
                  Editing rotation task
                </Text>
              </LinearGradient>
            )}

            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.formSection}
            >
              <Text style={styles.sectionTitle}>Task Details</Text>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.inputGradient}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="What needs to be done?"
                    placeholderTextColor="#adb5bd"
                    value={form.title}
                    onChangeText={(text) => setForm({ ...form, title: text })}
                    maxLength={100}
                    editable={!loading}
                  />
                </LinearGradient>
                <Text style={styles.helperText}>
                  {form.title.length}/100 characters
                </Text>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.inputGradient, styles.textAreaGradient]}
                >
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add more details about this task..."
                    placeholderTextColor="#adb5bd"
                    value={form.description}
                    onChangeText={(text) => setForm({ ...form, description: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                    editable={!loading}
                  />
                </LinearGradient>
                <Text style={styles.helperText}>
                  {form.description.length}/500 characters
                </Text>
              </View>

              {/* Total Points Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Total Task Points *</Text>
                  <LinearGradient
                    colors={['#fff5f5', '#ffe3e3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pointsLimitBadge}
                  >
                    <Text style={styles.pointsLimitText}>Max: 10</Text>
                  </LinearGradient>
                </View>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.inputGradient,
                    !isPointsWithinLimit() && styles.inputErrorGradient
                  ]}
                >
                  <TextInput
                    style={[
                      styles.input,
                      !isPointsWithinLimit() && styles.inputError
                    ]}
                    placeholder="1-10"
                    placeholderTextColor="#adb5bd"
                    value={form.points}
                    onChangeText={handlePointsChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    editable={!loading}
                  />
                </LinearGradient>
                <Text style={styles.helperText}>
                  Total reward points for this task (1-10)
                </Text>
                {!isPointsWithinLimit() && (
                  <Text style={styles.errorText}>
                    Points must be between 1 and 10
                  </Text>
                )}
              </View>

              {/* Points Summary */}
              <View style={styles.pointsSummary}>
                <View style={styles.pointsSummaryRow}>
                  <MaterialCommunityIcons name="star" size={14} color="#e67700" />
                  <Text style={styles.pointsSummaryText}>
                    Total: <Text style={styles.pointsHighlight}>{form.points}</Text>
                  </Text>
                </View>
                <View style={styles.pointsSummaryRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#495057" />
                  <Text style={styles.pointsSummaryText}>
                    Assigned to slots: <Text style={styles.pointsHighlight}>{totalTimeSlotPoints}</Text>
                  </Text>
                </View>
                <View style={styles.pointsSummaryRow}>
                  <MaterialCommunityIcons name="star-outline" size={14} color="#495057" />
                  <Text style={[
                    styles.pointsSummaryText,
                    !isPointsValid && styles.errorText
                  ]}>
                    Remaining: <Text style={[
                      styles.pointsHighlight,
                      !isPointsValid && styles.errorText
                    ]}>
                      {remainingPoints}
                    </Text>
                  </Text>
                </View>
                {hasTimeSlotExceedingLimit() && (
                  <View style={styles.warningRow}>
                    <MaterialCommunityIcons name="alert-circle" size={14} color="#fa5252" />
                    <Text style={styles.errorText}>
                      Some slots exceed 10 points
                    </Text>
                  </View>
                )}
              </View>

              {/* Category Input */}
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Category</Text>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.inputGradient}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Chores, Work, Study"
                    placeholderTextColor="#adb5bd"
                    value={form.category}
                    onChangeText={(text) => setForm({ ...form, category: text })}
                    maxLength={50}
                    editable={!loading}
                  />
                </LinearGradient>
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
                    <LinearGradient
                      colors={form.executionFrequency === 'WEEKLY' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.frequencyButtonGradient}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        form.executionFrequency === 'WEEKLY' && styles.frequencyButtonTextActive
                      ]}>
                        Weekly
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.frequencyButton,
                      form.executionFrequency === 'DAILY' && styles.frequencyButtonActive
                    ]}
                    onPress={() => handleFrequencyChange('DAILY')}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={form.executionFrequency === 'DAILY' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.frequencyButtonGradient}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        form.executionFrequency === 'DAILY' && styles.frequencyButtonTextActive
                      ]}>
                        Daily
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  How often this task needs to be done
                </Text>
              </View>

              {/* Time Slots Section */}
              <View style={styles.inputGroup}>
                <View style={styles.timeSlotsHeader}>
                  <View style={styles.timeSlotsTitleContainer}>
                    <Text style={styles.label}>
                      Time Slots {form.executionFrequency === 'DAILY' ? '*' : ''}
                    </Text>
                    <Text style={styles.timeSlotsSubtitle}>
                      Max 10 points per slot
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addTimeSlotButton}
                    onPress={handleAddTimeSlot}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#2b8a3e', '#1e6b2c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addTimeSlotGradient}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color="white" />
                      <Text style={styles.addTimeSlotText}>Add</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                
                {form.timeSlots.length === 0 ? (
                  <View style={styles.emptyTimeSlots}>
                    <MaterialCommunityIcons name="clock-outline" size={40} color="#dee2e6" />
                    <Text style={styles.emptyTimeSlotsText}>
                      No time slots added yet
                    </Text>
                    <Text style={styles.emptyTimeSlotsSubtext}>
                      Click "Add" to create time slots with points
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timeSlotsList}>
                    {form.timeSlots.map((slot:{startTime:string, endTime:string, label?:string, points?:string}, index:number) => {
                      const slotPoints = parseInt(slot.points || '0', 10);
                      const exceedsLimit = slotPoints > 10;
                      
                      return (
                        <LinearGradient
                          key={index}
                          colors={exceedsLimit ? ['#fff5f5', '#ffe3e3'] : ['#f8f9fa', '#e9ecef']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.timeSlotItem,
                            exceedsLimit && styles.timeSlotItemError
                          ]}
                        >
                          <View style={styles.timeSlotInfo}>
                            <View style={styles.timeSlotHeader}>
                              <Text style={styles.timeSlotTime}>
                                {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                              </Text>
                              {slot.points && slotPoints > 0 && (
                                <LinearGradient
                                  colors={exceedsLimit ? ['#fff5f5', '#ffe3e3'] : ['#d3f9d8', '#b2f2bb']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.pointsBadge}
                                >
                                  <Text style={[
                                    styles.pointsBadgeText,
                                    exceedsLimit && styles.pointsBadgeErrorText
                                  ]}>
                                    {slot.points} pts
                                  </Text>
                                </LinearGradient>
                              )}
                            </View>
                            {slot.label ? (
                              <Text style={styles.timeSlotLabel}>{slot.label}</Text>
                            ) : null}
                          </View>
                          <View style={styles.timeSlotActions}>
                            <TouchableOpacity
                              style={styles.timeSlotActionButton}
                              onPress={() => handleEditTimeSlot(index)}
                              disabled={loading}
                            >
                              <MaterialCommunityIcons name="pencil" size={16} color="#495057" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.timeSlotActionButton}
                              onPress={() => handleRemoveTimeSlot(index)}
                              disabled={loading}
                            >
                              <MaterialCommunityIcons name="delete" size={16} color="#fa5252" />
                            </TouchableOpacity>
                          </View>
                        </LinearGradient>
                      );
                    })}
                  </View>
                )}
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
                        <LinearGradient
                          colors={form.selectedDays.includes(day.value) ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.dayButtonGradient}
                        >
                          <Text style={[
                            styles.dayButtonText,
                            form.selectedDays.includes(day.value) && styles.dayButtonTextActive
                          ]}>
                            {day.label}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.helperText}>
                    Selected: {form.selectedDays.length} day(s)
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
            </LinearGradient>

            {error && (
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.errorBox}
              >
                <MaterialCommunityIcons name="alert-circle" size={18} color="#fa5252" />
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </LinearGradient>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={handleCancel}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cancelButtonGradient}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitDisabled() && styles.buttonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isSubmitDisabled()}
              >
                <LinearGradient
                  colors={isSubmitDisabled() ? ['#f8f9fa', '#e9ecef'] : ['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={isSubmitDisabled() ? "#495057" : "white"} size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons 
                        name="check-circle" 
                        size={18} 
                        color={isSubmitDisabled() ? "#868e96" : "white"} 
                      />
                      <Text style={[
                        styles.submitButtonText,
                        isSubmitDisabled() && styles.submitButtonTextDisabled
                      ]}>
                        Update Task
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Task Information */}
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskInfo}
            >
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
            </LinearGradient>

            {/* Info Box */}
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoBox}
            >
              <Text style={styles.infoTitle}>💡 Important Rules</Text>
              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="circle-small" size={16} color="#2b8a3e" />
                  <Text style={styles.infoText}>Total task points: 1-10 only</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="circle-small" size={16} color="#2b8a3e" />
                  <Text style={styles.infoText}>Time slot points: Max 10 per slot</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="circle-small" size={16} color="#2b8a3e" />
                  <Text style={styles.infoText}>Daily tasks require time slots</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="circle-small" size={16} color="#2b8a3e" />
                  <Text style={styles.infoText}>Weekly tasks need at least one day</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="circle-small" size={16} color="#2b8a3e" />
                  <Text style={styles.infoText}>End time must be after start time</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Bottom padding for keyboard */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Time Slot Modal */}
      <TimeSlotModal
        visible={showTimeSlotModal}
        onClose={() => setShowTimeSlotModal(false)}
        onSave={handleSaveTimeSlot}
        editingSlot={editingSlot}
        totalTaskPoints={parseInt(form.points, 10)}
        usedPoints={totalTimeSlotPoints}
        maxPointsPerSlot={10}
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
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 60,
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    textAlign: 'center'
  },
  headerSpacer: {
    width: 36
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96'
  },
  groupInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  groupInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 12,
    color: '#2b8a3e',
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529'
  },
  groupNote: {
    fontSize: 12,
    color: '#495057',
    fontStyle: 'italic',
    marginLeft: 24,
  },
  formSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pointsLimitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsLimitText: {
    fontSize: 11,
    color: '#fa5252',
    fontWeight: '600',
  },
  inputGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputErrorGradient: {
    borderColor: '#fa5252',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212529',
    backgroundColor: 'transparent',
  },
  inputError: {
    color: '#fa5252',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  textAreaGradient: {
    minHeight: 100,
  },
  helperText: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 4,
    marginLeft: 2
  },
  errorText: {
    color: '#fa5252',
    fontSize: 12,
    marginTop: 2,
  },
  pointsSummary: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
    gap: 6,
  },
  pointsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsSummaryText: {
    fontSize: 13,
    color: '#495057',
  },
  pointsHighlight: {
    fontWeight: '600',
    color: '#2b8a3e',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  frequencyButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    borderColor: '#2b8a3e',
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
  timeSlotsTitleContainer: {
    flex: 1,
    marginRight: 12
  },
  timeSlotsSubtitle: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2
  },
  addTimeSlotButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  addTimeSlotGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  addTimeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white'
  },
  emptyTimeSlots: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed'
  },
  emptyTimeSlotsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#868e96',
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeSlotItemError: {
    borderColor: '#fa5252',
  },
  timeSlotInfo: {
    flex: 1,
    marginRight: 8
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  timeSlotTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529'
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#868e96',
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2b8a3e',
  },
  pointsBadgeErrorText: {
    color: '#fa5252',
  },
  timeSlotActions: {
    flexDirection: 'row',
    gap: 6,
  },
  timeSlotActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dayButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    borderColor: '#2b8a3e',
  },
  dayButtonText: {
    fontSize: 11,
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
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e9ecef',
    padding: 2,
    justifyContent: 'center'
  },
  toggleSwitchActive: {
    backgroundColor: '#2b8a3e'
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  toggleCircleActive: {
    transform: [{ translateX: 22 }]
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057'
  },
  submitButton: {
    flex: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white'
  },
  submitButtonTextDisabled: {
    color: '#868e96'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  taskInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#868e96',
  },
  infoValue: {
    fontSize: 13,
    color: '#212529',
    fontWeight: '500',
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoList: {
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 18,
    flex: 1,
  },
  bottomPadding: {
    height: 100,
  },
}); 