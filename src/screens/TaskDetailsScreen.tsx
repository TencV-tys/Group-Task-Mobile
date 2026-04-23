// src/screens/TaskDetailsScreen.tsx - COMPLETE WITH ALL SECTIONS

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { TaskService } from '../services/TaskService';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper'; 
import { useTheme } from '../context/ThemeContext';
import { makeTaskDetailsStyles } from '../styles/taskDetails.styles';

export default function TaskDetailsScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => makeTaskDetailsStyles(theme), [theme]);
  
  const { taskId, groupId, userRole, onRefresh } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmittable, setIsSubmittable] = useState(false);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'available' | 'waiting' | 'expired' | 'wrong_day' | 'completed'>('waiting');
  const [currentWeekSubmissions, setCurrentWeekSubmissions] = useState<any[]>([]);
  const [todayAssignment, setTodayAssignment] = useState<any>(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const isAdmin = userRole === 'ADMIN';

  // ===== UTC DATE HELPERS =====
  const formatUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month]} ${day}, ${year}`;
  };
  
  const formatTimeTo12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes?.toString().padStart(2, '0') || '00';
    return `${hours12}:${minutesStr} ${period}`;
  };

  const isDueTodayUTC = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate); 
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dueUTC = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
    return todayUTC === dueUTC;
  };

  // ===== LOAD USER ID =====
  useEffect(() => {
    const loadUserId = async () => {
      const user = await TokenUtils.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    loadUserId();
  }, []);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => {
          setAuthError(false);
          navigation.navigate('Login');
        }}
      ]);
    }
  }, [authError, navigation]);

  useEffect(() => {
    if (taskId && currentUserId) {
      fetchTaskDetails();
    }
  }, [taskId, currentUserId]);

  // ===== REAL-TIME HOOKS =====
  const { events: taskEvents, clearTaskUpdated, clearTaskDeleted } = useRealtimeTasks(groupId);
  const { events: assignmentEvents, clearAssignmentCompleted, clearAssignmentVerified, clearAssignmentUpdated } = useRealtimeAssignments(groupId, currentUserId || '');
  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if (notification.data?.taskId === taskId) {
        fetchTaskDetails();
      }
    },
    showAlerts: true
  });

  // ===== HANDLE REAL-TIME EVENTS =====
  useEffect(() => {
    if (taskEvents.taskUpdated && taskEvents.taskUpdated.id === taskId) {
      fetchTaskDetails();
      clearTaskUpdated();
    }
  }, [taskEvents.taskUpdated]);

  useEffect(() => {
    if (taskEvents.taskDeleted && taskEvents.taskDeleted.taskId === taskId) {
      Alert.alert('🗑️ Task Deleted', 'This task has been deleted', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      clearTaskDeleted();
    }
  }, [taskEvents.taskDeleted]);

  useEffect(() => {
    if (assignmentEvents.assignmentCompleted || assignmentEvents.assignmentVerified || assignmentEvents.assignmentUpdated) {
      fetchTaskDetails();
      clearAssignmentCompleted();
      clearAssignmentVerified();
      clearAssignmentUpdated();
    }
  }, [assignmentEvents]);

  // ===== HELPER FUNCTIONS =====
  const convertTimeToMinutes = (time: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const formatTimeLeft = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // ===== PROCESS TASK DATA =====
  const processTaskData = (taskData: any) => {
    if (taskData.timeSlots && taskData.timeSlots.length > 0) {
      taskData.timeSlots.sort((a: any, b: any) => {
        return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
      });
    }
    
    if (taskData.selectedDays && taskData.selectedDays.length > 0) {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      taskData.selectedDays.sort((a: string, b: string) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    }
    
    if (taskData.assignments && taskData.assignments.length > 0 && currentUserId) {
      const currentWeek = taskData.group?.currentRotationWeek || 1;
      taskData.userAssignment = taskData.assignments.find(
        (a: any) => a.userId === currentUserId && a.rotationWeek === currentWeek
      ) || null;
    }
    
    return taskData;
  };

  // ===== FIND TODAY'S ASSIGNMENT - SUPPORTS MULTI-SLOT TASKS (FIXED) =====
const findTodayAssignment = (taskData: any) => {
  if (!taskData.assignments || !currentUserId) {
    setTodayAssignment(null);
    return;
  }

  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  
  const todayAssignments = taskData.assignments.filter((a: any) => {
    if (a.userId !== currentUserId) return false;
    const dueDate = new Date(a.dueDate);
    const dueUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
    return dueUTC === todayUTC;
  });

  if (todayAssignments.length === 0) {
    setTodayAssignment(null);
    return;
  }

  // ✅ FIX: Sort by end time (EARLIEST FIRST - ascending order)
  todayAssignments.sort((a: any, b: any) => {
    const timeA = a.timeSlot?.endTime ? convertTimeToMinutes(a.timeSlot.endTime) : 0;
    const timeB = b.timeSlot?.endTime ? convertTimeToMinutes(b.timeSlot.endTime) : 0;
    return timeA - timeB; // ASCENDING - earliest first
  });

  const currentTimeMs = now.getTime();
  
  // ✅ First, check for active assignment (in submission window)
  let activeAssignment = null;
  for (const assignment of todayAssignments) {
    if (!assignment.timeSlot) continue;
    
    const dueDate = new Date(assignment.dueDate);
    const [endHour, endMinute] = assignment.timeSlot.endTime.split(':').map(Number);
    const endTimeUTC = new Date(Date.UTC(
      dueDate.getUTCFullYear(),
      dueDate.getUTCMonth(),
      dueDate.getUTCDate(),
      endHour - 8, endMinute, 0, 0
    ));
    const gracePeriodEndUTC = new Date(endTimeUTC.getTime() + 30 * 60000);
    
    if (currentTimeMs >= endTimeUTC.getTime() && currentTimeMs <= gracePeriodEndUTC.getTime()) {
      activeAssignment = assignment;
      break;
    }
  }
  
  if (activeAssignment) {
    console.log('📅 Found active time slot:', activeAssignment.timeSlot?.endTime);
    setTodayAssignment(activeAssignment);
    return;
  }
  
  // ✅ Then, find the NEXT upcoming slot (positive time difference, smallest first)
  let nextUpcomingAssignment = null;
  let smallestPositiveDiff = Infinity;
  
  for (const assignment of todayAssignments) {
    if (!assignment.timeSlot) continue;
    
    const dueDate = new Date(assignment.dueDate);
    const [endHour, endMinute] = assignment.timeSlot.endTime.split(':').map(Number);
    const endTimeUTC = new Date(Date.UTC(
      dueDate.getUTCFullYear(),
      dueDate.getUTCMonth(),
      dueDate.getUTCDate(),
      endHour - 8, endMinute, 0, 0
    ));
    const timeDiff = endTimeUTC.getTime() - currentTimeMs;
    
    // Find the next upcoming slot (positive time difference, smallest first)
    if (timeDiff > 0 && timeDiff < smallestPositiveDiff) {
      smallestPositiveDiff = timeDiff;
      nextUpcomingAssignment = assignment;
    }
  }
  
  // If found upcoming assignment, show that one
  if (nextUpcomingAssignment) {
    console.log('📅 Next upcoming time slot:', nextUpcomingAssignment.timeSlot?.endTime);
    setTodayAssignment(nextUpcomingAssignment);
    return;
  }
  
  // ✅ If no active and no upcoming, show the FIRST slot (earliest of the day)
  if (todayAssignments.length > 0) {
    console.log('📅 Showing first (earliest) slot as fallback');
    setTodayAssignment(todayAssignments[0]); // Already sorted ascending, first is earliest
  } else {
    setTodayAssignment(null);
  }
};

  // ===== CHECK TIME VALIDITY =====
  const checkTimeValidity = () => {
    if (!todayAssignment || todayAssignment.completed) {
      setIsSubmittable(false);
      setCurrentTimeSlot(null);
      setSubmissionStatus('completed');
      return;
    }

    let completedSlotIds: string[] = [];
    const rawCompleted = todayAssignment.completedTimeSlotIds;
    
    if (rawCompleted) {
      if (typeof rawCompleted === 'string') {
        try {
          completedSlotIds = JSON.parse(rawCompleted);
        } catch (e) {
          completedSlotIds = [];
        }
      } else if (Array.isArray(rawCompleted)) {
        completedSlotIds = rawCompleted;
      }
    }
    
    const currentTimeSlotId = todayAssignment.timeSlot?.id;
    if (currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId)) {
      setIsSubmittable(false);
      setSubmissionStatus('completed');
      setCurrentTimeSlot(null);
      return;
    }

    const now = new Date();
    const assignmentDate = new Date(todayAssignment.dueDate);
    
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const assignmentUTC = Date.UTC(assignmentDate.getUTCFullYear(), assignmentDate.getUTCMonth(), assignmentDate.getUTCDate());
    
    if (todayUTC !== assignmentUTC) {
      setIsSubmittable(false);
      setCurrentTimeSlot(null);
      setSubmissionStatus('wrong_day');
      return;
    }

    if (todayAssignment.timeSlot) {
      const [endHour, endMinute] = todayAssignment.timeSlot.endTime.split(':').map(Number);
      
      const endTimeUTC = new Date(Date.UTC(
        assignmentDate.getUTCFullYear(),
        assignmentDate.getUTCMonth(),
        assignmentDate.getUTCDate(),
        endHour - 8, endMinute, 0, 0
      ));
      
      const gracePeriodEndUTC = new Date(endTimeUTC.getTime() + 30 * 60000);
      const lateThresholdUTC = new Date(endTimeUTC.getTime() + 25 * 60000);
      
      const currentTimeMs = now.getTime();
      const endTimeMs = endTimeUTC.getTime();
      const graceEndMs = gracePeriodEndUTC.getTime();
      
      if (currentTimeMs < endTimeMs) {
        setIsSubmittable(false);
        setCurrentTimeSlot(null);
        setSubmissionStatus('waiting');
        const timeUntilOpen = Math.floor((endTimeMs - currentTimeMs) / 1000);
        setTimeLeft(timeUntilOpen);
      } else if (currentTimeMs >= endTimeMs && currentTimeMs <= graceEndMs) {
        setIsSubmittable(true);
        setCurrentTimeSlot(todayAssignment.timeSlot);
        setSubmissionStatus('available');
        const timeLeftMs = graceEndMs - currentTimeMs;
        setTimeLeft(Math.floor(timeLeftMs / 1000));
      } else {
        setIsSubmittable(false);
        setCurrentTimeSlot(null);
        setSubmissionStatus('expired');
        setTimeLeft(0);
      }
    } else {
      setIsSubmittable(true);
      setCurrentTimeSlot(null);
      setSubmissionStatus('available');
      setTimeLeft(null);
    }
  };

  useEffect(() => {
    if (todayAssignment && !loading) {
      checkTimeValidity();
    }
  }, [todayAssignment, loading]);

  useEffect(() => {
    if (todayAssignment && !todayAssignment.completed && submissionStatus !== 'expired') {
      const timer = setInterval(() => {
        checkTimeValidity();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [todayAssignment, submissionStatus]);
  
  // ===== FETCH TASK DETAILS =====
  const fetchTaskDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await TaskService.getTaskDetails(taskId);
      if (result.success) {
        const processedTask = processTaskData(result.task);
        setTask(processedTask);
        findTodayAssignment(processedTask);
        
        const currentWeek = processedTask.group?.currentRotationWeek || 1;
        const myAllAssignments = processedTask.assignments?.filter((a: any) => 
          a.userId === currentUserId && a.rotationWeek === currentWeek
        ) || [];
        
        setCurrentWeekSubmissions(myAllAssignments.filter((a: any) => a.completed === true));
        
        const othersAssignments = processedTask.assignments?.filter((a: any) => 
          a.rotationWeek === currentWeek && a.userId !== currentUserId
        ) || [];
        setUpcomingAssignments(othersAssignments);
      } else {
        setError(result.message || 'Failed to load task details');
      }
    } catch (err: any) {
      console.error('Error fetching task details:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // ===== GET VERIFICATION STATUS - FIXED (Check verified FIRST) =====
const getVerificationStatus = (assignment: any) => {
  // ✅ PRIORITY 1: Check if VERIFIED by admin (most important)
  if (assignment.verified === true) {
    return { status: 'verified', color: '#2b8a3e', icon: 'check-circle', text: 'Verified' };
  }
  
  // ✅ PRIORITY 2: Check if REJECTED by admin
  if (assignment.verified === false) {
    return { status: 'rejected', color: theme.error, icon: 'close-circle', text: 'Rejected' };
  }
  
  // ✅ PRIORITY 3: Parse completedTimeSlotIds for multi-slot tasks
  let completedSlotIds: string[] = [];
  const rawCompleted = assignment.completedTimeSlotIds;
  
  if (rawCompleted) {
    if (typeof rawCompleted === 'string') {
      try {
        completedSlotIds = JSON.parse(rawCompleted);
      } catch (e) {
        completedSlotIds = [];
      }
    } else if (Array.isArray(rawCompleted)) {
      completedSlotIds = rawCompleted;
    }
  }
  
  const currentTimeSlotId = assignment.timeSlot?.id;
  const isCurrentSlotCompleted = currentTimeSlotId && completedSlotIds.includes(currentTimeSlotId);
  
  // ✅ PRIORITY 4: Check if this specific time slot is completed (submitted but not verified)
  if (isCurrentSlotCompleted) {
    return { status: 'submitted', color: '#e67700', icon: 'clock-check', text: 'Pending' };
  }
  
  // ✅ PRIORITY 5: Check if EXPIRED
  if (assignment.expired === true) {
    return { status: 'expired', color: theme.error, icon: 'timer-off', text: 'Expired' };
  }
  
  // ✅ PRIORITY 6: Check if MISSED
  const missedSlotIds = assignment.missedTimeSlotIds || [];
  if (currentTimeSlotId && missedSlotIds.includes(currentTimeSlotId)) {
    return { status: 'missed', color: theme.error, icon: 'close-circle', text: 'Missed' };
  }
  
  // ✅ PRIORITY 7: Check if COMPLETED (but not verified)
  if (assignment.completed === true && assignment.verified === null) {
    return { status: 'pending_verification', color: theme.primary, icon: 'clock-check', text: 'Pending' };
  }
  
  if (assignment.completed === true) {
    return { status: 'completed', color: theme.primary, icon: 'check-circle', text: 'Done' };
  }
  
  // ✅ PRIORITY 8: Check if OVERDUE
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const dueDateUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const isOverdue = dueDateUTC < nowUTC;
  
  if (isOverdue) {
    return { status: 'overdue', color: theme.error, icon: 'alert-circle', text: 'Late' };
  }
  
  // ✅ PRIORITY 9: Check if DUE TODAY
  if (isDueTodayUTC(assignment.dueDate)) {
    return { status: 'due_today', color: theme.primary, icon: 'clock-alert', text: 'Today' };
  }
  
  // ✅ Default
  return { status: 'pending', color: theme.textSecondary, icon: 'clock-outline', text: 'Wait' };
};


  // ===== GET SUBMISSION STATUS INFO =====
  const getSubmissionStatusInfo = () => {
    switch (submissionStatus) {
      case 'available':
        return { label: '✓ AVAILABLE', color: theme.primary, bgColor: theme.primaryLight, borderColor: theme.primaryBorder, icon: 'check-circle', description: 'You can submit your completion now', buttonText: 'Complete Assignment', canSubmit: true };
      case 'waiting':
        return { label: '⏳ WAITING', color: theme.primary, bgColor: theme.primaryLight, borderColor: theme.primaryBorder, icon: 'clock', description: timeLeft && timeLeft > 0 ? `Opens in ${formatTimeLeft(timeLeft)}` : 'Submit within 30 minutes of time slot', buttonText: 'Waiting', canSubmit: false };
      case 'expired':
        return { label: '❌ EXPIRED', color: theme.error, bgColor: theme.errorBg, borderColor: theme.errorBorder, icon: 'timer-off', description: 'The 30-minute submission window has expired', buttonText: 'Expired', canSubmit: false };
      case 'wrong_day':
        return { label: '📅 NOT DUE', color: theme.textMuted, bgColor: theme.bgSecondary, borderColor: theme.border, icon: 'calendar', description: task?.userAssignment ? `Due on ${formatUTCDate(task.userAssignment.dueDate)}` : 'Not due today', buttonText: 'Not Due', canSubmit: false };
      case 'completed':
        return { label: '✓ COMPLETED', color: theme.primary, bgColor: theme.primaryLight, borderColor: theme.primaryBorder, icon: 'check-circle', description: 'Already submitted', buttonText: 'Completed', canSubmit: false };
      default:
        return { label: '⏳ CHECKING', color: theme.textMuted, bgColor: theme.bgSecondary, borderColor: theme.border, icon: 'clock', description: 'Checking status...', buttonText: 'Checking', canSubmit: false };
    }
  };

  // ===== NAVIGATION HANDLERS =====
  const handleBack = () => navigation.goBack();
  
  const isTaskAssigned = () => {
    if (task?.currentAssignee) return true;
    if (task?.assignments?.some((a: any) => a.rotationWeek === task.group?.currentRotationWeek)) return true;
    return false;
  };

  const handleEdit = () => {
    if (!task) return;
    if (isTaskAssigned()) {
      Alert.alert('Cannot Edit Task', 'This task is already assigned to members. Editing assigned tasks could break the rotation system.\n\nConsider creating a new task instead, or wait until the rotation week ends.', [{ text: 'OK' }]);
      return;
    }
    navigation.navigate('UpdateTask', { task, groupId: task.groupId || groupId, groupName: task.group?.name, onTaskUpdated: fetchTaskDetails });
  };

  const handleDelete = async () => {
    if (!task) return;
    const hasAssignments = task.assignments && task.assignments.length > 0;
    const warningMessage = hasAssignments 
      ? `⚠️ TASK HAS ${task.assignments.length} ASSIGNMENT(S)!\n\nWhat will happen:\n✅ Assignment records will be PRESERVED\n✅ Points earned will NOT be lost\n❌ New assignments cannot be created\n\nAre you sure you want to delete "${task.title}"?`
      : `Are you sure you want to delete "${task.title}"?\n\nThis action cannot be undone.`;
    
    Alert.alert('Delete Task', warningMessage, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const result = await TaskService.deleteTask(task.id);
        if (result.success) {
          Alert.alert('Success', hasAssignments ? `Task "${task.title}" has been deleted. Assignment history preserved.` : 'Task deleted successfully');
          if (onRefresh) onRefresh();
          navigation.goBack();
        } else {
          Alert.alert('Error', result.message || 'Failed to delete task');
        }
      }}
    ]);
  };

  const handleCompleteAssignment = () => {
    if (!todayAssignment || !isSubmittable) {
      const statusInfo = getSubmissionStatusInfo();
      Alert.alert('Cannot Submit', statusInfo.description, [{ text: 'OK' }]);
      return;
    }
    
    navigation.navigate('CompleteAssignment', {
      assignmentId: todayAssignment.id,
      taskTitle: task.title,
      dueDate: todayAssignment.dueDate,
      timeSlot: currentTimeSlot || todayAssignment.timeSlot,
      timeSlots: task.timeSlots || [],
      onCompleted: () => {
        fetchTaskDetails();
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleViewAssignmentDetails = (assignment?: any) => {
    const assignmentId = assignment?.id || todayAssignment?.id;
    if (!assignmentId) {
      Alert.alert('Error', 'No assignment found');
      return;
    }
    navigation.navigate('AssignmentDetails', { assignmentId, isAdmin, onVerified: () => fetchTaskDetails() });
  };

  // ===== RENDER FUNCTIONS =====
  const renderHeader = () => {
    const assigned = isTaskAssigned();
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>Task Details</Text>
        </View>
        {isAdmin && task && (
          <TouchableOpacity style={[styles.editButton, assigned && styles.editButtonDisabled]} onPress={handleEdit} disabled={assigned}>
            <MaterialCommunityIcons name="pencil" size={20} color={assigned ? theme.textPlaceholder : theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderWeekInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.sectionIcon}>
          <MaterialCommunityIcons name="calendar-week" size={16} color={theme.textSecondary} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Current Week</Text>
      </View>
      <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.weekInfoCard}>
        <View style={styles.weekInfoRow}>
          <MaterialCommunityIcons name="counter" size={16} color={theme.textMuted} />
          <Text style={styles.weekInfoLabel}>Week:</Text>
          <Text style={styles.weekInfoValue}>{task.group?.currentRotationWeek || 1}</Text>
        </View>
        {task.group?.weekStart && task.group?.weekEnd && (
          <View style={styles.weekInfoRow}>
            <MaterialCommunityIcons name="calendar-range" size={16} color={theme.textMuted} />
            <Text style={styles.weekInfoLabel}>Dates:</Text>
            <Text style={styles.weekInfoValue}>
              {formatUTCDate(task.group.weekStart)} - {formatUTCDate(task.group.weekEnd)}
            </Text>
          </View> 
        )}
      </LinearGradient>
    </View>
  );

  const renderTodayAssignmentCard = () => {
  if (!todayAssignment) return null;
  
  const status = getVerificationStatus(todayAssignment);
  const isOverdue = status.status === 'overdue';
  const isSubmitted = status.status === 'submitted';
  const isPendingVerification = status.status === 'pending_verification';
  const submissionStatusInfo = getSubmissionStatusInfo();
  
  // ✅ Determine card style based on status
  let cardBorderColor = theme.border;
  let iconColor = theme.primary;
  let badgeColors: [string, string] = [theme.primary, theme.primaryDark];
  let cardBgColor = theme.card;
  
  if (isSubmitted) {
    cardBorderColor = theme.primaryBorder;
    iconColor = theme.primary;
    badgeColors = [theme.primary, theme.primaryDark];
    cardBgColor = theme.card;
  } else if (isOverdue) {
    cardBorderColor = theme.errorBorder;
    iconColor = theme.error;
    badgeColors = [theme.error, theme.error];
    cardBgColor = theme.card;
  } else if (isPendingVerification) {
    cardBorderColor = theme.primaryBorder;
    iconColor = theme.primary;
    badgeColors = [theme.primary, theme.primaryDark];
    cardBgColor = theme.card;
  }
  
  return (
    <TouchableOpacity style={styles.section} onPress={() => handleViewAssignmentDetails(todayAssignment)} activeOpacity={0.7}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Assignment</Text>
        <LinearGradient colors={badgeColors} style={styles.todayAssignmentBadge}>
          <MaterialCommunityIcons name={isSubmitted ? "check-circle" : isPendingVerification ? "clock-check" : isOverdue ? "alert-circle" : "clock-alert"} size={12} color="#fff" />
          <Text style={styles.todayAssignmentBadgeText}>
            {isSubmitted ? 'Submitted' : isPendingVerification ? 'Pending' : isOverdue ? 'Overdue' : 'Due Today'}
          </Text>
        </LinearGradient>
      </View>
      
      <View style={[styles.assignmentCard, { borderColor: cardBorderColor, borderWidth: 1, backgroundColor: cardBgColor }]}>
        <View style={styles.assignmentHeader}>
          <MaterialCommunityIcons name={isSubmitted ? "check-circle" : isOverdue ? "alert-circle" : "clock-alert"} size={24} color={iconColor} />
          <View style={styles.assignmentInfo}>
            <Text style={[styles.todayAssignmentTitle, { color: theme.text, fontWeight: '600' }]}>{task.title}</Text>
            <Text style={[styles.assignmentDate, { color: theme.textSecondary }]}>
              Due: {formatUTCDate(todayAssignment.dueDate)}
              {todayAssignment.timeSlot && ` • ${formatTimeTo12Hour(todayAssignment.timeSlot.startTime)} - ${formatTimeTo12Hour(todayAssignment.timeSlot.endTime)}`}
            </Text>
          </View>
        </View>
        
        {!isSubmitted && !isOverdue && !isPendingVerification && (
          <View style={[styles.submissionStatusCard, { borderColor: theme.border, backgroundColor: theme.bgSecondary }]}>
            <View style={styles.submissionStatusHeader}>
              <View style={[styles.statusIconContainer, { backgroundColor: theme.primaryLight }]}>
                <MaterialCommunityIcons name={submissionStatusInfo.icon as any} size={22} color={theme.primary} />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={[styles.submissionStatusLabel, { color: theme.primary }]}>{submissionStatusInfo.label}</Text>
                <Text style={[styles.submissionStatusDescription, { color: theme.textSecondary }]}>{submissionStatusInfo.description}</Text>
              </View>
            </View>
            {submissionStatus === 'available' && timeLeft !== null && (
              <View style={styles.timerContainer}>
                <View style={[styles.timerBadge, { backgroundColor: theme.bgSecondary }]}>
                  <MaterialCommunityIcons name={timeLeft < 300 ? "timer-alert" : "timer"} size={16} color={timeLeft < 300 ? theme.error : theme.primary} />
                  <Text style={[styles.timerText, { color: timeLeft < 300 ? theme.error : theme.primary }]}>{formatTimeLeft(timeLeft)} remaining</Text>
                </View>
              </View>
            )}
            {submissionStatus === 'waiting' && timeLeft !== null && timeLeft > 0 && (
              <View style={styles.waitingContainer}>
                <View style={[styles.waitingBadge, { backgroundColor: theme.bgSecondary }]}>
                  <MaterialCommunityIcons name="clock-start" size={16} color={theme.primary} />
                  <Text style={styles.waitingText}>Opens in {formatTimeLeft(timeLeft)}</Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.viewDetailsIndicator}>
          <Text style={[styles.viewDetailsText, { color: theme.textMuted }]}>Tap to view full details</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ===== MY ASSIGNMENTS (CURRENT WEEK) - SORT: TODAY FIRST, THEN FUTURE, THEN PAST =====
const renderAllWeekAssignments = () => {
  const currentWeek = task?.group?.currentRotationWeek || 1;
  
  let allWeekAssignments = task?.assignments?.filter((a: any) => 
    a.rotationWeek === currentWeek
  ) || [];
  
  if (!isAdmin && currentUserId) {
    allWeekAssignments = allWeekAssignments.filter((a: any) => 
      a.userId === currentUserId
    );
  }
  
  if (allWeekAssignments.length === 0) return null;
  
  // Get current UTC date for prioritization
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayDateKey = new Date(todayUTC).toISOString().split('T')[0];
  
  // ✅ Sort assignments: TODAY first, then FUTURE days, then PAST days at bottom
  const sortedAssignments = [...allWeekAssignments].sort((a, b) => {
    const dueDateA = new Date(a.dueDate);
    const dueDateB = new Date(b.dueDate);
    const dueUTC_A = Date.UTC(dueDateA.getUTCFullYear(), dueDateA.getUTCMonth(), dueDateA.getUTCDate());
    const dueUTC_B = Date.UTC(dueDateB.getUTCFullYear(), dueDateB.getUTCMonth(), dueDateB.getUTCDate());
    
    const isTodayA = dueUTC_A === todayUTC;
    const isTodayB = dueUTC_B === todayUTC;
    const isFutureA = dueUTC_A > todayUTC;
    const isFutureB = dueUTC_B > todayUTC;
    const isPastA = dueUTC_A < todayUTC;
    const isPastB = dueUTC_B < todayUTC;
    
    // TODAY comes first
    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;
    
    // Then FUTURE days (earliest first)
    if (isFutureA && isFutureB) return dueUTC_A - dueUTC_B;
    if (isFutureA && !isFutureB) return -1;
    if (!isFutureA && isFutureB) return 1;
    
    // Then PAST days at the bottom (latest first, so recent past shows before older)
    if (isPastA && isPastB) return dueUTC_B - dueUTC_A;
    
    return 0;
  });
  
  const groupedByDay = new Map();
  
  sortedAssignments.forEach((assignment: any) => {
    const dueDate = new Date(assignment.dueDate);
    const dateKey = dueDate.toISOString().split('T')[0];
    const dayKey = formatUTCDate(assignment.dueDate);
    const dayName = dueDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    
    if (!groupedByDay.has(dateKey)) {
      groupedByDay.set(dateKey, {
        dateKey: dateKey,
        displayDate: dayKey,
        dayName: dayName,
        assignments: []
      });
    }
    groupedByDay.get(dateKey).assignments.push(assignment);
  });
  
  // Sort days: TODAY first, then FUTURE days, then PAST days at bottom
  const groupedDays = Array.from(groupedByDay.values()).sort((a, b) => {
    const isTodayA = a.dateKey === todayDateKey;
    const isTodayB = b.dateKey === todayDateKey;
    const isFutureA = a.dateKey > todayDateKey;
    const isFutureB = b.dateKey > todayDateKey;
    const isPastA = a.dateKey < todayDateKey;
    const isPastB = b.dateKey < todayDateKey;
    
    // TODAY first
    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;
    
    // Then FUTURE days (ascending - earliest future first)
    if (isFutureA && isFutureB) return a.dateKey.localeCompare(b.dateKey);
    if (isFutureA && !isFutureB) return -1;
    if (!isFutureA && isFutureB) return 1;
    
    // Then PAST days at the bottom (descending - most recent past first)
    if (isPastA && isPastB) return b.dateKey.localeCompare(a.dateKey);
    
    return 0;
  });

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.sectionIcon}>
          <MaterialCommunityIcons name="format-list-checks" size={16} color={theme.textSecondary} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>
          {isAdmin ? 'All Assignments (Current Week)' : 'My Assignments (Current Week)'}
        </Text>
      </View>
      
      {groupedDays.map((dayGroup: any, dayIndex: number) => {
        const isToday = dayGroup.dateKey === todayDateKey;
        
        return (
          <View key={dayIndex} style={styles.dayGroupContainer}>
            <View style={styles.dayGroupHeader}>
              <LinearGradient
                colors={isToday ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
                style={[styles.dayGroupBadge, isToday && styles.todayDayGroupBadge]}
              >
                <Text style={[styles.dayGroupTitle, isToday && { color: theme.primary }]}>
                  {dayGroup.dayName}
                </Text>
                <Text style={[styles.dayGroupDate, isToday && { color: theme.primary }]}>
                  {dayGroup.displayDate}
                </Text>
              </LinearGradient>
            </View>
            
            {dayGroup.assignments.map((assignment: any, idx: number) => {
              const isCurrentUser = assignment.userId === currentUserId;
              const status = getVerificationStatus(assignment);
              const userAvatarUrl = assignment.user?.avatarUrl;
              const userName = assignment.user?.fullName || 'Unknown';
              const userInitial = userName.charAt(0).toUpperCase();
              
              return (
                <TouchableOpacity
                  key={assignment.id || idx}
                  style={[styles.weekAssignmentCard, isCurrentUser && styles.currentUserAssignmentCard]}
                  onPress={() => handleViewAssignmentDetails(assignment)}
                  activeOpacity={0.7}
                >
                  <View style={styles.weekAssignmentHeader}>
                    <View style={styles.weekAssignmentUser}>
                      {userAvatarUrl ? (
                        <Image 
                          source={{ uri: userAvatarUrl }} 
                          style={[styles.weekAssignmentAvatar, styles.weekAssignmentAvatarImage, isCurrentUser && styles.currentUserAvatar]}
                        />
                      ) : (
                        <LinearGradient
                          colors={[theme.bgSecondary, theme.bgTertiary]}
                          style={[styles.weekAssignmentAvatar, isCurrentUser && styles.currentUserAvatar]}
                        >
                          <Text style={styles.weekAssignmentAvatarText}>{userInitial}</Text>
                        </LinearGradient>
                      )}
                      <View>
                        <Text style={[styles.weekAssignmentUserName, { color: theme.text }]}>
                          {userName}
                          {isCurrentUser && <Text style={[styles.currentUserLabel, { color: theme.primary }]}> (You)</Text>}
                        </Text>
                        <Text style={[styles.weekAssignmentTime, { color: theme.textMuted }]}>
                          {formatTimeTo12Hour(assignment.timeSlot?.startTime)} - {formatTimeTo12Hour(assignment.timeSlot?.endTime)}
                        </Text>
                      </View>
                    </View>
                    
                    <LinearGradient
                      colors={[status.color + '20', status.color + '10']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.weekAssignmentStatus, { borderWidth: 1, borderColor: status.color + '40' }]}
                    >
                      <MaterialCommunityIcons name={status.icon as any} size={12} color={status.color} />
                      <Text style={[styles.weekAssignmentStatusText, { color: status.color }]}>{status.text}</Text>
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.weekAssignmentFooter}>
                    <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.weekAssignmentPoints}>
                      <MaterialCommunityIcons name="star" size={10} color={theme.primary} />
                      <Text style={[styles.weekAssignmentPointsText, { color: theme.primary }]}>{assignment.points} pts</Text>
                    </LinearGradient>
                    {assignment.completed && assignment.completedAt && (
                      <Text style={[styles.weekAssignmentCompleted, { color: theme.textMuted }]}>
                        Completed: {formatUTCDate(assignment.completedAt)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

  // ===== MY SUBMISSIONS SECTION =====
  const renderMySubmissionsSection = () => {
    if (currentWeekSubmissions.length === 0) return null;
    
    const sortedSubmissions = [...currentWeekSubmissions].sort((a: any, b: any) => {
      const isAToday = isDueTodayUTC(a.dueDate);
      const isBToday = isDueTodayUTC(b.dueDate);
      if (isAToday && !isBToday) return -1;
      if (!isAToday && isBToday) return 1;
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });

    return ( 
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.sectionIcon}>
            <MaterialCommunityIcons name="clipboard-text" size={16} color={theme.textSecondary} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>My Submissions This Week</Text>
        </View>
        {sortedSubmissions.map((submission: any, index: number) => {
          const status = getVerificationStatus(submission);
          const dueToday = isDueTodayUTC(submission.dueDate);
          
          return (
            <TouchableOpacity
              key={submission.id || index}
              style={[styles.submissionHistoryCard, dueToday && styles.todaySubmissionCard]}
              onPress={() => handleViewAssignmentDetails(submission)}
              activeOpacity={0.7}
            >
              {dueToday && (
                <LinearGradient colors={[theme.error, theme.error]} style={styles.todayBadge}>
                  <MaterialCommunityIcons name="clock-alert" size={12} color="#fff" />
                  <Text style={styles.todayBadgeText}>Due Today</Text>
                </LinearGradient>
              )}
              
              <View style={styles.submissionHistoryHeader}>
                <LinearGradient colors={[status.color + '20', status.color + '10']} style={styles.statusIconSmall}>
                  <MaterialCommunityIcons name={status.icon as any} size={16} color={status.color} />
                </LinearGradient>
                <View style={styles.submissionHistoryInfo}>
                  <Text style={[styles.submissionHistoryStatus, { color: status.color }]}>{status.text}</Text>
                  <Text style={styles.submissionHistoryDate}>
                    {formatUTCDate(submission.dueDate)}
                    {submission.timeSlot && ` • ${formatTimeTo12Hour(submission.timeSlot.startTime)} - ${formatTimeTo12Hour(submission.timeSlot.endTime)}`}
                    {dueToday && <Text style={styles.todayText}> (Today)</Text>}
                  </Text>
                </View>
              </View>

              {submission.completedAt && (
                <Text style={styles.submittedDate}>Submitted: {formatUTCDate(submission.completedAt)}</Text>
              )}

              <View style={styles.submissionHistoryMeta}>
                {submission.photoUrl && (
                  <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.hasPhotoBadgeSmall}>
                    <MaterialCommunityIcons name="image" size={12} color={theme.primary} />
                    <Text style={styles.hasPhotoTextSmall}>Photo</Text>
                  </LinearGradient>
                )}
                {submission.notes && (
                  <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.hasNotesBadgeSmall}>
                    <MaterialCommunityIcons name="note-text" size={12} color={theme.primary} />
                    <Text style={styles.hasNotesTextSmall}>Notes</Text>
                  </LinearGradient>
                )}
                <Text style={styles.pointsEarned}>+{submission.points} pts</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ===== ADMIN VIEW - SORT: TODAY FIRST, THEN FUTURE, THEN PAST =====
const renderAdminView = () => {
  const currentWeek = task?.group?.currentRotationWeek || 1;
  
  let allAdminAssignments = task?.assignments?.filter((a: any) => 
    a.rotationWeek === currentWeek
  ) || [];
  
  if (allAdminAssignments.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.sectionIcon}>
            <MaterialCommunityIcons name="shield-account" size={16} color={theme.textSecondary} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>Admin View</Text>
        </View>
        <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.adminInfoBox}>
          <MaterialCommunityIcons name="shield-account" size={18} color={theme.primary} />
          <View style={styles.adminInfoContent}>
            <Text style={styles.adminInfoTitle}>Admin Information</Text>
            <Text style={styles.adminInfoText}>
              You have full control over this task. Click on assignments to verify/reject submissions.
            </Text>
          </View>
        </LinearGradient>
        <Text style={styles.noAssignments}>No assignments yet this week</Text>
      </View>
    );
  }
  
  // Get current UTC date for prioritization
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayDateKey = new Date(todayUTC).toISOString().split('T')[0];
  
  // ✅ Sort assignments: TODAY first, then FUTURE days, then PAST days at bottom
  const sortedAssignments = [...allAdminAssignments].sort((a, b) => {
    const dueDateA = new Date(a.dueDate);
    const dueDateB = new Date(b.dueDate);
    const dueUTC_A = Date.UTC(dueDateA.getUTCFullYear(), dueDateA.getUTCMonth(), dueDateA.getUTCDate());
    const dueUTC_B = Date.UTC(dueDateB.getUTCFullYear(), dueDateB.getUTCMonth(), dueDateB.getUTCDate());
    
    const isTodayA = dueUTC_A === todayUTC;
    const isTodayB = dueUTC_B === todayUTC;
    const isFutureA = dueUTC_A > todayUTC;
    const isFutureB = dueUTC_B > todayUTC;
    const isPastA = dueUTC_A < todayUTC;
    const isPastB = dueUTC_B < todayUTC;
    
    // TODAY comes first
    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;
    
    // Then FUTURE days (earliest first)
    if (isFutureA && isFutureB) return dueUTC_A - dueUTC_B;
    if (isFutureA && !isFutureB) return -1;
    if (!isFutureA && isFutureB) return 1;
    
    // Then PAST days at the bottom (latest first, so recent past shows before older)
    if (isPastA && isPastB) return dueUTC_B - dueUTC_A;
    
    return 0;
  });
  
  // Group by day
  const groupedByDay = new Map();
  
  sortedAssignments.forEach((assignment: any) => {
    const dueDate = new Date(assignment.dueDate);
    const dateKey = dueDate.toISOString().split('T')[0];
    const dayName = dueDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const displayDate = formatUTCDate(assignment.dueDate);
    
    if (!groupedByDay.has(dateKey)) {
      groupedByDay.set(dateKey, {
        dateKey: dateKey,
        displayDate: displayDate,
        dayName: dayName,
        assignments: []
      });
    }
    groupedByDay.get(dateKey).assignments.push(assignment);
  });
  
  // Sort days: TODAY first, then FUTURE days, then PAST days at bottom
  const groupedDays = Array.from(groupedByDay.values()).sort((a, b) => {
    const isTodayA = a.dateKey === todayDateKey;
    const isTodayB = b.dateKey === todayDateKey;
    const isFutureA = a.dateKey > todayDateKey;
    const isFutureB = b.dateKey > todayDateKey;
    const isPastA = a.dateKey < todayDateKey;
    const isPastB = b.dateKey < todayDateKey;
    
    // TODAY first
    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;
    
    // Then FUTURE days (ascending - earliest future first)
    if (isFutureA && isFutureB) return a.dateKey.localeCompare(b.dateKey);
    if (isFutureA && !isFutureB) return -1;
    if (!isFutureA && isFutureB) return 1;
    
    // Then PAST days at the bottom (descending - most recent past first)
    if (isPastA && isPastB) return b.dateKey.localeCompare(a.dateKey);
    
    return 0;
  });
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.sectionIcon}>
          <MaterialCommunityIcons name="shield-account" size={16} color={theme.textSecondary} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Admin View - All Assignments</Text>
      </View>
      
      <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.adminInfoBox}>
        <MaterialCommunityIcons name="shield-account" size={18} color={theme.primary} />
        <View style={styles.adminInfoContent}>
          <Text style={styles.adminInfoTitle}>Admin Information</Text>
          <Text style={styles.adminInfoText}>
            You have full control over this task. Click on assignments to verify/reject submissions.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.assignmentsContainer}>
        {groupedDays.map((dayGroup: any, dayIndex: number) => {
          const isToday = dayGroup.dateKey === todayDateKey;
          
          return (
            <View key={dayIndex} style={styles.dayGroupContainer}>
              <View style={styles.dayGroupHeader}>
                <LinearGradient
                  colors={isToday ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
                  style={[styles.dayGroupBadge, isToday && styles.todayDayGroupBadge]}
                >
                  <Text style={[styles.dayGroupTitle, isToday && { color: theme.primary }]}>
                    {dayGroup.dayName}
                  </Text>
                  <Text style={[styles.dayGroupDate, isToday && { color: theme.primary }]}>
                    {dayGroup.displayDate}
                  </Text>
                </LinearGradient>
              </View>
              
              {dayGroup.assignments.map((assignment: any, idx: number) => {
                const status = getVerificationStatus(assignment);
                const dueToday = isDueTodayUTC(assignment.dueDate);
                const userName = assignment.user?.fullName || 'Unknown';
                const userInitial = userName.charAt(0).toUpperCase();
                const userAvatarUrl = assignment.user?.avatarUrl;
                
                return (
                  <TouchableOpacity
                    key={assignment.id || idx}
                    style={[styles.adminAssignmentCard, dueToday && styles.todayAdminCard]}
                    onPress={() => handleViewAssignmentDetails(assignment)}
                    activeOpacity={0.7}
                  >
                    {dueToday && (
                      <LinearGradient colors={[theme.error, theme.error]} style={styles.todayAdminBadge}>
                        <MaterialCommunityIcons name="clock-alert" size={10} color="#fff" />
                        <Text style={styles.todayAdminBadgeText}>Due Today</Text>
                      </LinearGradient>
                    )}
                    
                    <View style={styles.adminAssignmentHeader}>
                      <View style={styles.userInfo}>
                        {userAvatarUrl ? (
                          <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} />
                        ) : (
                          <LinearGradient
                            colors={[theme.bgSecondary, theme.bgTertiary]}
                            style={styles.userAvatar}
                          >
                            <Text style={styles.userAvatarText}>{userInitial}</Text>
                          </LinearGradient>
                        )}
                        <View style={styles.userDetails}>
                          <Text style={styles.userName}>{userName}</Text>
                          <Text style={styles.assignmentDateSmall}>
                            Due: {formatUTCDate(assignment.dueDate)}
                            {assignment.timeSlot && ` • ${formatTimeTo12Hour(assignment.timeSlot.startTime)}`}
                            {dueToday && <Text style={styles.todaySmallText}> (Today)</Text>}
                          </Text>
                        </View>
                      </View>
                      <LinearGradient
                        colors={[status.color + '20', status.color + '10']}
                        style={[styles.statusBadge, { borderColor: status.color + '40' }]}
                      >
                        <MaterialCommunityIcons name={status.icon as any} size={10} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                      </LinearGradient>
                    </View>
                    
                    {assignment.completed && (
                      <View style={styles.adminAssignmentDetails}>
                        <Text style={styles.completedText}>
                          Submitted: {formatUTCDate(assignment.completedAt)}
                        </Text>
                        {assignment.photoUrl && (
                          <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.hasPhotoBadge}>
                            <MaterialCommunityIcons name="image" size={8} color={theme.primary} />
                            <Text style={styles.hasPhotoText}>Photo</Text>
                          </LinearGradient>
                        )}
                        {assignment.notes && (
                          <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.hasNotesBadge}>
                            <MaterialCommunityIcons name="note-text" size={8} color={theme.primary} />
                            <Text style={styles.hasNotesText}>Notes</Text>
                          </LinearGradient>
                        )}
                      </View>
                    )}
                    
                    {assignment.adminNotes && (
                      <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.adminNotesPreview}>
                        <Text style={styles.adminNotesPreviewText} numberOfLines={1}>{assignment.adminNotes}</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
};

  // ===== LOADING AND ERROR STATES =====
  if (loading) {
    return (
      <ScreenWrapper style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTaskDetails}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (!task) {
    return (
      <ScreenWrapper style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-question" size={64} color={theme.border} />
          <Text style={styles.emptyText}>Task not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      {renderHeader()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isAdmin && isTaskAssigned() && (
          <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.warningBanner}>
            <MaterialCommunityIcons name="alert" size={20} color={theme.primary} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Task is Assigned</Text>
              <Text style={styles.warningText}>This task is currently assigned to members. Edit is disabled to prevent rotation issues.</Text>
            </View>
          </LinearGradient>
        )}
        
        <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.card}>
          {/* Task Header */}
          <View style={styles.taskHeader}>
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.taskIcon}>
              <MaterialCommunityIcons name="format-list-checks" size={24} color={theme.primary} />
            </LinearGradient>
            <View style={styles.taskTitleContainer}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
                <Text style={styles.pointsText}>{task.points} points</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Description */}
          {task.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          )}

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Frequency</Text>
              <Text style={styles.detailValue}>{task.executionFrequency}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{task.category || 'None'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Recurring</Text>
              <Text style={styles.detailValue}>{task.isRecurring ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          {/* Week Info */}
          {renderWeekInfo()}
          
          {/* Today's Assignment Card */}
          {!isAdmin && renderTodayAssignmentCard()}
          
          {/* My Assignments (Current Week) */}
          {!isAdmin && renderAllWeekAssignments()}
          
          {/* My Submissions */}
          {!isAdmin && renderMySubmissionsSection()}
          
          {/* Admin View */}
          {isAdmin && renderAdminView()}

          {/* Time Slots */}
          {task.timeSlots?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Time Slots</Text>
              <View style={styles.timeSlotsContainer}>
                {task.timeSlots.map((slot: any, index: number) => {
                  const isCurrent = currentTimeSlot && slot.startTime === currentTimeSlot.startTime && slot.endTime === currentTimeSlot.endTime;
                  return (
                    <LinearGradient key={index} colors={isCurrent ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]} style={[styles.timeSlotCard, isCurrent && styles.currentTimeSlotCard]}>
                      <View style={styles.timeSlotHeader}>
                        <MaterialCommunityIcons name={isCurrent ? "clock-check" : "clock"} size={18} color={isCurrent ? theme.primary : theme.textSecondary} />
                        <Text style={[styles.timeSlotTime, isCurrent && styles.currentTimeSlotTime]}>{formatTimeTo12Hour(slot.startTime)} - {formatTimeTo12Hour(slot.endTime)}</Text>
                        {slot.points !== undefined && slot.points > 0 && (
                          <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.slotPointsBadge}>
                            <Text style={styles.slotPointsText}>{slot.points} pts</Text>
                          </LinearGradient>
                        )}
                      </View>
                      {slot.label && <Text style={styles.timeSlotLabel}>{slot.label}</Text>}
                      {isCurrent && isSubmittable && (
                        <View style={styles.activeSlotIndicator}>
                          <MaterialCommunityIcons name="check-circle" size={12} color={theme.primary} />
                          <Text style={styles.activeSlotText}>Active - Can Submit</Text>
                        </View>
                      )}
                    </LinearGradient>
                  );
                })}
              </View>
              <Text style={styles.timeSlotNote}>ⓘ Submit within 30 minutes after time slot end</Text>
            </View>
          )}

          {/* Delete Button (Admin only) */}
          {isAdmin && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <LinearGradient colors={[theme.errorBg, theme.errorBg]} style={styles.deleteButtonGradient}>
                <MaterialCommunityIcons name="delete" size={18} color={theme.error} />
                <Text style={styles.deleteButtonText}>Delete Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {/* Member Info Box */}
          {!isAdmin && (
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.memberInfoBox}>
              <MaterialCommunityIcons name="information" size={18} color={theme.textMuted} />
              <Text style={styles.memberInfoText}>Only group administrators can edit or delete tasks.</Text>
            </LinearGradient>
          )}
        </LinearGradient>
      </ScrollView>
    </ScreenWrapper>
  );
}