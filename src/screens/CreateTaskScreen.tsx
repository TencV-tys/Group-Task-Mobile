// src/screens/CreateTaskScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { createTaskStyles as styles } from '../styles/createTask.styles';
import { useCreateTask } from '../taskHook/useCreateTask';
import { useRotationStatus } from '../hooks/useRotationStatus';
import { TimeSlotModal } from '../components/TimeSlotModal';
import { DAY_OF_WEEK_OPTIONS } from '../utils/timeUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { TaskDraftService } from '../services/TaskDraftService';

// ─── Constants ──────────────────────────────────────────────────────────────

type Category = 'Work' | 'Study' | 'Chores' | '';

const CATEGORIES: { value: Category; icon: string }[] = [
  { value: 'Work',   icon: 'briefcase-outline' },
  { value: 'Study',  icon: 'book-open-outline' },
  { value: 'Chores', icon: 'broom' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const convertTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

const formatTimeForDisplay = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 || 12;
  return `${display}:${m.toString().padStart(2, '0')} ${period}`;
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimeSlot {
  id?: string;
  startTime: string;
  endTime: string;
  label?: string;
  points?: string;
}

interface FormState {
  title: string;
  description: string;
  points: string;
  executionFrequency: 'DAILY' | 'WEEKLY';
  selectedDays: string[];
  dayOfWeek: string;
  isRecurring: boolean;
  category: Category;
  timeSlots: TimeSlot[];
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  points: '1',
  executionFrequency: 'WEEKLY',
  selectedDays: [],
  dayOfWeek: '',
  isRecurring: true,
  category: '',
  timeSlots: [],
};

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function CreateTaskScreen({ navigation, route }: any) {
  const { groupId, groupName, draftData, isEditingDraft, createFromDraft } = route.params || {};
  const { loading, error, success, createTask, reset, authError } = useCreateTask();
  const { status, checkStatus, getTaskRecommendation } = useRotationStatus(groupId);

  const scrollViewRef = useRef<ScrollView>(null);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [modalInitialTime, setModalInitialTime] = useState<{
    startTime: { hour: string; minute: string; period: string };
    endTime: { hour: string; minute: string; period: string };
  } | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // ─── Points derived state ────────────────────────────────────────────────

  const totalPoints = parseInt(form.points, 10) || 0;
  const usedPoints = form.timeSlots.reduce(
    (sum, s) => sum + (parseInt(s.points || '0', 10) || 0),
    0,
  );
  const remainingPoints = totalPoints - usedPoints;
  const canAddMoreSlots = remainingPoints > 0 && form.timeSlots.length < 10;

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (draftData && (isEditingDraft || createFromDraft)) {
      setForm({
        title: draftData.title,
        description: draftData.description || '',
        points: draftData.points.toString(),
        executionFrequency: draftData.executionFrequency,
        selectedDays: draftData.selectedDays || [],
        dayOfWeek: '',
        isRecurring: draftData.isRecurring,
        category: (draftData.category as Category) || '',
        timeSlots: draftData.timeSlots.map((s: any) => ({
          ...s,
          points: s.points?.toString() || '',
        })),
      });
      setCurrentDraftId(draftData.id);

      if (createFromDraft) {
        Alert.alert(
          'Draft Loaded',
          'Edit and create this task. Keep the draft afterwards?',
          [
            { text: 'Keep Draft', style: 'cancel' },
            {
              text: 'Delete Draft',
              onPress: async () => {
                await TaskDraftService.deleteDraft(draftData.id);
                setCurrentDraftId(null);
              },
            },
          ],
        );
      }
    }
  }, [draftData, isEditingDraft, createFromDraft]);

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    }
  }, [authError]);

  useEffect(() => {
    if (groupId) checkStatus();
  }, [groupId]);

  // ─── Time slot helpers ───────────────────────────────────────────────────

  const getNextAvailableStartTime = () => {
    if (form.timeSlots.length === 0) return { hour: '8', minute: '00', period: 'AM' };

    const sorted = [...form.timeSlots].sort(
      (a, b) => convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime),
    );
    const last = sorted[sorted.length - 1];
    let [h, m] = last.endTime.split(':').map(Number);

    m += 30;
    if (m >= 60) { m -= 60; h += 1; }
    if (h >= 24) { h = 0; }

    const period = h >= 12 ? 'PM' : 'AM';
    const display = h % 12 || 12;
    return { hour: display.toString(), minute: m.toString().padStart(2, '0'), period };
  };

  const getEndTimeFromStart = (start: { hour: string; minute: string; period: string }) => {
    const h = parseInt(start.hour, 10);
    if (start.period === 'AM' && start.hour === '11') return { ...start, period: 'PM', hour: '12' };
    if (start.period === 'PM' && start.hour === '11') return { ...start, period: 'AM', hour: '12' };
    if (start.hour === '12') return { ...start, hour: '1' };
    return { ...start, hour: (h + 1).toString() };
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const updateForm = (patch: Partial<FormState>) =>
    setForm(prev => ({ ...prev, ...patch }));

  const handleFrequencyChange = (executionFrequency: 'DAILY' | 'WEEKLY') =>
    updateForm({
      executionFrequency,
      selectedDays: executionFrequency === 'DAILY' ? [] : form.selectedDays,
      dayOfWeek: executionFrequency === 'DAILY' ? '' : form.dayOfWeek,
    });

  const handlePointsChange = (text: string) => {
    const num = parseInt(text, 10);
    if (text === '' || (!isNaN(num) && num >= 1 && num <= 10)) updateForm({ points: text });
  };

  const toggleDaySelection = (day: string) =>
    updateForm({
      selectedDays: form.selectedDays.includes(day)
        ? form.selectedDays.filter(d => d !== day)
        : [...form.selectedDays, day],
    });

  const toggleCategory = (cat: Category) =>
    updateForm({ category: form.category === cat ? '' : cat });

  const handleAddTimeSlot = () => {
    if (!canAddMoreSlots) {
      Alert.alert(
        'Cannot Add More Slots',
        `${usedPoints}/${totalPoints} points used. Remaining: ${remainingPoints}.`,
      );
      return;
    }
    const start = getNextAvailableStartTime();
    setModalInitialTime({ startTime: start, endTime: getEndTimeFromStart(start) });
    setEditingSlot(null);
    setEditingSlotIndex(null);
    setShowTimeSlotModal(true);
  };

  const handleEditTimeSlot = (index: number) => {
    setEditingSlot(form.timeSlots[index]);
    setEditingSlotIndex(index);
    setModalInitialTime(null);
    setShowTimeSlotModal(true);
  };

  const handleRemoveTimeSlot = (index: number) => {
    Alert.alert('Remove Time Slot', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const slots = [...form.timeSlots];
          slots.splice(index, 1);
          updateForm({ timeSlots: slots });
        },
      },
    ]);
  };

  const handleSaveTimeSlot = (slot: TimeSlot) => {
    let slots: TimeSlot[];
    if (editingSlotIndex !== null) {
      slots = [...form.timeSlots];
      slots[editingSlotIndex] = slot;
    } else {
      slots = [...form.timeSlots, slot];
    }
    slots.sort((a, b) => convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime));
    updateForm({ timeSlots: slots });
    setEditingSlot(null);
    setEditingSlotIndex(null);
    setModalInitialTime(null);
    setShowTimeSlotModal(false);
  };

  // ─── Validation helpers ──────────────────────────────────────────────────

  const hasSlotExceedingLimit = () =>
    form.timeSlots.some(s => parseInt(s.points || '0', 10) > 10);

  const isPointsWithinLimit = () => {
    const p = parseInt(form.points, 10);
    return !isNaN(p) && p >= 1 && p <= 10;
  };

  const weeklyDaysOk =
    form.executionFrequency === 'WEEKLY'
      ? form.selectedDays.length > 0 || !!form.dayOfWeek
      : true;

  const isSubmitDisabled = () =>
    !form.title.trim() ||
    !isPointsWithinLimit() ||
    usedPoints > totalPoints ||
    hasSlotExceedingLimit() ||
    (form.executionFrequency === 'DAILY' && form.timeSlots.length === 0) ||
    !weeklyDaysOk ||
    loading;

  const isDraftDisabled = () =>
    !form.title.trim() ||
    !isPointsWithinLimit() ||
    usedPoints > totalPoints ||
    hasSlotExceedingLimit() ||
    (form.executionFrequency === 'DAILY' && form.timeSlots.length === 0) ||
    !weeklyDaysOk;

  // ─── Submit / Draft ───────────────────────────────────────────────────────

  const buildTaskPayload = () => {
    const points = parseInt(form.points, 10);
    const payload: any = {
      title: form.title,
      description: form.description || undefined,
      points,
      executionFrequency: form.executionFrequency,
      timeFormat: '12h',
      isRecurring: form.isRecurring,
      category: form.category || undefined,
      timeSlots: form.timeSlots.length
        ? form.timeSlots.map(s => ({
            startTime: s.startTime,
            endTime: s.endTime,
            label: s.label || undefined,
            points: s.points ? parseInt(s.points, 10) : undefined,
          }))
        : undefined,
    };
    if (form.executionFrequency === 'WEEKLY') {
      if (form.selectedDays.length > 0) payload.selectedDays = form.selectedDays;
      else if (form.dayOfWeek) payload.dayOfWeek = form.dayOfWeek;
    }
    return payload;
  };

  const handleSaveAsDraft = async () => {
    if (!groupId) return Alert.alert('Error', 'Group ID is missing');
    if (!form.title.trim()) return Alert.alert('Error', 'Please enter a task title');
    const points = parseInt(form.points, 10);
    if (isNaN(points) || points < 1 || points > 10)
      return Alert.alert('Error', 'Points must be between 1 and 10');
    if (usedPoints > points)
      return Alert.alert('Error', `Slot points (${usedPoints}) exceed total (${points})`);

    setIsSavingDraft(true);
    try {
      const data = {
        ...buildTaskPayload(),
        selectedDays: form.executionFrequency === 'WEEKLY' ? form.selectedDays : undefined,
      };
      if (currentDraftId) {
        await TaskDraftService.updateDraft(currentDraftId, data);
        Alert.alert('Draft Updated', 'Your draft has been updated.');
      } else {
        const draft = await TaskDraftService.saveDraft(groupId, groupName, data);
        setCurrentDraftId(draft.id);
        Alert.alert('Draft Saved', 'Task saved as draft.', [
          {
            text: 'View Drafts',
            onPress: () => navigation.navigate('TaskDrafts', { groupId, groupName }),
          },
          { text: 'Continue Editing', style: 'cancel' },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!groupId) return Alert.alert('Error', 'Group ID is missing');
    if (!form.title.trim()) return Alert.alert('Error', 'Please enter a task title');

    const result = await createTask(groupId, buildTaskPayload());
    if (result.success) {
      if (createFromDraft && currentDraftId) {
        await TaskDraftService.deleteDraft(currentDraftId);
      }
      Alert.alert('Success!', 'Task created successfully', [
        {
          text: 'OK',
          onPress: () => {
            reset();
            setForm(DEFAULT_FORM);
            setCurrentDraftId(null);
            if (route.params?.onTaskCreated) route.params.onTaskCreated(result.task);
            navigation.navigate('GroupTasks', {
              groupId,
              groupName,
              userRole: 'ADMIN',
              switchToAllTasks: true,
              refreshTasks: true,
            });
          },
        },
      ]);
    }
  };

  const recommendation = getTaskRecommendation();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {currentDraftId ? 'Edit Draft' : 'Create Task'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Group Banner */}
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
                  This task will be added to the group's rotation
                </Text>
              </LinearGradient>
            )}

            {/* Rotation Warning */}
            {status && !status.hasEnoughTasks && status.totalTasks > 0 && (
              <LinearGradient
                colors={['#fff3bf', '#ffec99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.warningContainer}
              >
                <View style={styles.warningContent}>
                  <MaterialCommunityIcons name="alert" size={20} color="#e67700" />
                  <View style={styles.warningTextContainer}>
                    <Text style={styles.warningTitle}>Rotation Warning</Text>
                    <Text style={styles.warningMessage}>{recommendation?.message}</Text>
                  </View>
                </View>
              </LinearGradient>
            )}

            {/* No Tasks Info */}
            {status && status.totalTasks === 0 && (
              <LinearGradient
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoContainer}
              >
                <View style={styles.warningContent}>
                  <MaterialCommunityIcons name="information" size={20} color="#2b8a3e" />
                  <View style={styles.warningTextContainer}>
                    <Text style={styles.infoTitle}>No Tasks Yet</Text>
                    <Text style={styles.infoMessage}>
                      Create your first recurring task to start the rotation.
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            )}

            {/* ── Form ── */}
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.formSection}
            >
              <Text style={styles.sectionTitle}>Task Details</Text>

              {/* Title */}
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
                    onChangeText={t => updateForm({ title: t })}
                    maxLength={100}
                    editable={!loading}
                  />
                </LinearGradient>
                <Text style={styles.helperText}>{form.title.length}/100 characters</Text>
              </View>

              {/* Description */}
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
                    onChangeText={t => updateForm({ description: t })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                    editable={!loading}
                  />
                </LinearGradient>
                <Text style={styles.helperText}>{form.description.length}/500 characters</Text>
              </View>

              {/* Points */}
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
                <View style={styles.pointsInputContainer}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.pointsInputGradient,
                      !isPointsWithinLimit() && styles.inputErrorGradient,
                    ]}
                  >
                    <TextInput
                      style={styles.pointsInput}
                      value={form.points}
                      onChangeText={handlePointsChange}
                      placeholder="1-10"
                      placeholderTextColor="#adb5bd"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </LinearGradient>
                  <Text style={styles.pointsLabel}>points</Text>
                </View>
                <Text style={styles.helperText}>Total reward points for this task (1-10)</Text>
                {!isPointsWithinLimit() && (
                  <Text style={styles.errorText}>Points must be between 1 and 10</Text>
                )}
              </View>

              {/* Points Usage Bar */}
              <View style={styles.pointsUsageContainer}>
                <LinearGradient
                  colors={remainingPoints > 0 ? ['#d3f9d8', '#b2f2bb'] : ['#fff5f5', '#ffe3e3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pointsUsageBar}
                >
                  <View
                    style={[
                      styles.pointsUsageFill,
                      { width: `${Math.min(100, (usedPoints / (totalPoints || 1)) * 100)}%` },
                    ]}
                  />
                </LinearGradient>
                <View style={styles.pointsUsageInfo}>
                  <Text style={[styles.pointsUsageText, remainingPoints === 0 && styles.pointsUsageFull]}>
                    {usedPoints}/{totalPoints} points used
                  </Text>
                  {remainingPoints > 0 ? (
                    <Text style={styles.pointsRemainingText}>
                      {remainingPoints} point{remainingPoints !== 1 ? 's' : ''} remaining
                    </Text>
                  ) : (
                    <Text style={styles.pointsFullText}>All points allocated ✓</Text>
                  )}
                </View>
              </View>

              {/* ── Category Chip Selector ── */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryChipsContainer}>
                  {CATEGORIES.map(({ value, icon }) => {
                    const isActive = form.category === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                        onPress={() => toggleCategory(value)}
                        disabled={loading}
                      >
                        <LinearGradient
                          colors={isActive ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.categoryChipGradient}
                        >
                          <MaterialCommunityIcons
                            name={icon as any}
                            size={16}
                            color={isActive ? 'white' : '#495057'}
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              isActive && styles.categoryChipTextActive,
                            ]}
                          >
                            {value}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.helperText}>Optional — tap to select, tap again to deselect</Text>
              </View>

              {/* Frequency */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Frequency *</Text>
                <View style={styles.frequencyContainer}>
                  {(['WEEKLY', 'DAILY'] as const).map(freq => {
                    const isActive = form.executionFrequency === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        style={[styles.frequencyButton, isActive && styles.frequencyButtonActive]}
                        onPress={() => handleFrequencyChange(freq)}
                        disabled={loading}
                      >
                        <LinearGradient
                          colors={isActive ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.frequencyButtonGradient}
                        >
                          <Text
                            style={[
                              styles.frequencyButtonText,
                              isActive && styles.frequencyButtonTextActive,
                            ]}
                          >
                            {freq.charAt(0) + freq.slice(1).toLowerCase()}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Time Slots */}
              <View style={styles.inputGroup}>
                <View style={styles.timeSlotsHeader}>
                  <View style={styles.timeSlotsTitleContainer}>
                    <Text style={styles.label}>
                      Time Slots {form.executionFrequency === 'DAILY' ? '*' : ''}
                    </Text>
                    <Text style={styles.timeSlotsSubtitle}>
                      Max 10 pts per slot • {remainingPoints} pts left
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addTimeSlotButton,
                      (!canAddMoreSlots || loading) && styles.addTimeSlotDisabled,
                    ]}
                    onPress={handleAddTimeSlot}
                    disabled={!canAddMoreSlots || loading}
                  >
                    <LinearGradient
                      colors={canAddMoreSlots ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addTimeSlotGradient}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={16}
                        color={canAddMoreSlots ? 'white' : '#868e96'}
                      />
                      <Text
                        style={[
                          styles.addTimeSlotText,
                          !canAddMoreSlots && styles.addTimeSlotTextDisabled,
                        ]}
                      >
                        Add
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {form.timeSlots.length === 0 ? (
                  <View style={styles.emptyTimeSlots}>
                    <MaterialCommunityIcons name="clock-outline" size={40} color="#dee2e6" />
                    <Text style={styles.emptyTimeSlotsText}>No time slots added yet</Text>
                    <Text style={styles.emptyTimeSlotsSubtext}>
                      Tap "Add" to create time slots with points
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timeSlotsList}>
                    {form.timeSlots.map((slot, index) => {
                      const slotPts = parseInt(slot.points || '0', 10);
                      const exceeds = slotPts > 10;
                      return (
                        <LinearGradient
                          key={index}
                          colors={exceeds ? ['#fff5f5', '#ffe3e3'] : ['#f8f9fa', '#e9ecef']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.timeSlotItem, exceeds && styles.timeSlotItemError]}
                        >
                          <View style={styles.timeSlotInfo}>
                            <View style={styles.timeSlotHeader}>
                              <Text style={styles.timeSlotTime}>
                                {formatTimeForDisplay(slot.startTime)} –{' '}
                                {formatTimeForDisplay(slot.endTime)}
                              </Text>
                              {slot.points && slotPts > 0 && (
                                <LinearGradient
                                  colors={
                                    exceeds ? ['#fff5f5', '#ffe3e3'] : ['#d3f9d8', '#b2f2bb']
                                  }
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.pointsBadge}
                                >
                                  <Text
                                    style={[
                                      styles.pointsBadgeText,
                                      exceeds && styles.pointsBadgeErrorText,
                                    ]}
                                  >
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

                {!canAddMoreSlots && totalPoints > 0 && form.timeSlots.length > 0 && (
                  <LinearGradient
                    colors={['#fff5f5', '#ffe3e3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.limitWarning}
                  >
                    <MaterialCommunityIcons name="alert-circle" size={16} color="#fa5252" />
                    <Text style={styles.limitWarningText}>
                      All {totalPoints} points allocated. Adjust total or remove slots.
                    </Text>
                  </LinearGradient>
                )}
              </View>

              {/* Days (Weekly only) */}
              {form.executionFrequency === 'WEEKLY' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Days *</Text>
                  <View style={styles.daysContainer}>
                    {DAY_OF_WEEK_OPTIONS.map(day => {
                      const isActive = form.selectedDays.includes(day.value);
                      return (
                        <TouchableOpacity
                          key={day.value}
                          style={[styles.dayButton, isActive && styles.dayButtonActive]}
                          onPress={() => toggleDaySelection(day.value)}
                          disabled={loading}
                        >
                          <LinearGradient
                            colors={isActive ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.dayButtonGradient}
                          >
                            <Text
                              style={[
                                styles.dayButtonText,
                                isActive && styles.dayButtonTextActive,
                              ]}
                            >
                              {day.label}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Recurring Toggle */}
              <View style={styles.inputGroup}>
                <View style={styles.toggleContainer}>
                  <Text style={styles.label}>Recurring Task</Text>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, form.isRecurring && styles.toggleSwitchActive]}
                    onPress={() => updateForm({ isRecurring: !form.isRecurring })}
                    disabled={loading}
                  >
                    <View
                      style={[
                        styles.toggleCircle,
                        form.isRecurring && styles.toggleCircleActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Recurring tasks rotate among group members weekly
                </Text>
              </View>
            </LinearGradient>

            {/* Error */}
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
              {/* Cancel */}
              <TouchableOpacity
                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={() => navigation.goBack()}
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

              {/* Save as Draft */}
              <TouchableOpacity
                style={[
                  styles.draftButton,
                  (isDraftDisabled() || isSavingDraft) && styles.buttonDisabled,
                ]}
                onPress={handleSaveAsDraft}
                disabled={isDraftDisabled() || isSavingDraft}
              >
                <LinearGradient
                  colors={['#6c757d', '#495057']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.draftButtonGradient}
                >
                  {isSavingDraft ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save" size={16} color="white" />
                      <Text style={styles.draftButtonText}>
                        {currentDraftId ? 'Update' : 'Draft'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Create Task */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitDisabled() && styles.buttonDisabled]}
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
                    <ActivityIndicator
                      color={isSubmitDisabled() ? '#495057' : 'white'}
                      size="small"
                    />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="plus-circle"
                        size={16}
                        color={isSubmitDisabled() ? '#868e96' : 'white'}
                      />
                      <Text
                        style={[
                          styles.submitButtonText,
                          isSubmitDisabled() && styles.submitButtonTextDisabled,
                        ]}
                      >
                        Create
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Info Box */}
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoBox}
            >
              <Text style={styles.infoTitle}>💡 Important Rules</Text>
              <View style={styles.infoList}>
                {[
                  'Total task points: 1-10 only',
                  'Time slot points: Max 10 per slot',
                  'Daily tasks require time slots',
                  'Weekly tasks need at least one day',
                  'End time must be after start time',
                ].map(rule => (
                  <View key={rule} style={styles.infoItem}>
                    <MaterialCommunityIcons name="circle-small" size={16} color="#2b8a3e" />
                    <Text style={styles.infoText}>{rule}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <TimeSlotModal
        visible={showTimeSlotModal}
        onClose={() => { setShowTimeSlotModal(false); setModalInitialTime(null); }}
        onSave={handleSaveTimeSlot}
        editingSlot={editingSlot}
        initialTime={modalInitialTime}
        totalTaskPoints={totalPoints}
        usedPoints={usedPoints}
        maxPointsPerSlot={10}
      />
    </ScreenWrapper>
  );
}