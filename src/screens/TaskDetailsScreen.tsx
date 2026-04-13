// src/screens/TaskDetailsScreen.tsx - FULLY UPDATED WITH GROUPED BY DAY

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

 
  // ===== FIXED UTC DATE HELPER - Shows the actual UTC date without timezone conversion =====
const formatUTCDate = (dateString: string) => {
  const date = new Date(dateString);
  // Extract UTC components directly to avoid timezone conversion
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${monthNames[month]} ${day}, ${year}`;
};

const formatUTCDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  return `${monthNames[month]} ${day}, ${year} at ${hour12}:${minutes.toString().padStart(2, '0')} ${ampm} UTC`;
};

const isDueTodayUTC = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate); 
  
  // Compare UTC dates directly
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
        console.log('✅ Current user ID loaded:', user.id);
      }
    };
    loadUserId();
  }, []);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  useEffect(() => {
    if (taskId && currentUserId) {
      fetchTaskDetails();
    }
  }, [taskId, currentUserId]);

  // ===== REAL-TIME HOOKS =====
  const {
    events: taskEvents,
    clearTaskUpdated,
    clearTaskDeleted
  } = useRealtimeTasks(groupId);

  const {
    events: assignmentEvents,
    clearAssignmentCompleted,
    clearAssignmentVerified,
    clearAssignmentUpdated
  } = useRealtimeAssignments(groupId, currentUserId || '');

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
  }, [assignmentEvents.assignmentCompleted, assignmentEvents.assignmentVerified, assignmentEvents.assignmentUpdated]);

  useEffect(() => {
    if (task?.userAssignment && !task.userAssignment.completed) {
      const timer = startCountdownTimer();
      return () => clearInterval(timer);
    }
  }, [task, timeLeft]);

  // ===== HELPER FUNCTIONS =====
  const convertTimeToMinutes = (time: string) => {
    if (!time) return 0;
    
    const timeLower = time.toLowerCase();
    let hours = 0;
    let minutes = 0;
    
    if (timeLower.includes('am') || timeLower.includes('pm')) {
      const isPM = timeLower.includes('pm');
      const timeWithoutSuffix = time.replace(/[ap]m/gi, '').trim();
      const [hourStr, minuteStr] = timeWithoutSuffix.split(':');
      hours = parseInt(hourStr || '0', 10);
      minutes = parseInt(minuteStr || '0', 10);
      
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else {
      const [hourStr, minuteStr] = time.split(':');
      hours = parseInt(hourStr || '0', 10);
      minutes = parseInt(minuteStr || '0', 10);
    }
    
    return hours * 60 + minutes;
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

  const startCountdownTimer = () => {
    const timer = setInterval(() => {
      if (timeLeft !== null && timeLeft > 0) {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      } else if (timeLeft === 0) {
        setIsSubmittable(false);
        setSubmissionStatus('expired');
        clearInterval(timer);
      }
    }, 1000);
    return timer;
  };

  // ===== PROCESS TASK DATA =====
  const processTaskData = (taskData: any) => {
    // Sort time slots
    if (taskData.timeSlots && taskData.timeSlots.length > 0) {
      taskData.timeSlots.sort((a: any, b: any) => {
        const timeA = convertTimeToMinutes(a.startTime);
        const timeB = convertTimeToMinutes(b.startTime);
        return timeA - timeB;
      });
    }
    
    // Sort selected days
    if (taskData.selectedDays && taskData.selectedDays.length > 0) {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      taskData.selectedDays.sort((a: string, b: string) => 
        dayOrder.indexOf(a) - dayOrder.indexOf(b)
      );
    }
    
    // Sort assignments by date then time
    if (taskData.assignments && taskData.assignments.length > 0) {
      const today = new Date();
      const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      
      taskData.assignments.sort((a: any, b: any) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        
        const dayA = Date.UTC(dateA.getUTCFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
        const dayB = Date.UTC(dateB.getUTCFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
        
        const isAToday = dayA === todayUTC;
        const isBToday = dayB === todayUTC;
        
        if (isAToday && !isBToday) return -1;
        if (!isAToday && isBToday) return 1;
        
        if (dayA === dayB) {
          const timeA = dateA.getUTCHours() * 60 + dateA.getUTCMinutes();
          const timeB = dateB.getUTCHours() * 60 + dateB.getUTCMinutes();
          return timeA - timeB;
        }
        
        return dayA - dayB;
      });
    }
    
    // Find assignment for CURRENT logged-in user
    if (taskData.assignments && currentUserId) {
      const currentWeek = taskData.group?.currentRotationWeek || 1;
      
      const userAssignmentForCurrentUser = taskData.assignments.find(
        (a: any) => a.userId === currentUserId && a.rotationWeek === currentWeek
      );
      
      taskData.userAssignment = userAssignmentForCurrentUser || null;
    }
    
    return taskData;
  };

  // ===== FIND TODAY'S ASSIGNMENT USING UTC =====
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

    if (todayAssignments.length > 0) {
      todayAssignments.sort((a: any, b: any) => {
        const timeA = new Date(a.dueDate).getTime();
        const timeB = new Date(b.dueDate).getTime();
        return timeA - timeB;
      });
      
      setTodayAssignment(todayAssignments[0]);
    } else {
      setTodayAssignment(null);
    }
  };

 const checkTimeValidity = (taskData: any) => {
  if (!taskData?.userAssignment || taskData.userAssignment.completed) {
    setIsSubmittable(false);
    setCurrentTimeSlot(null);
    setSubmissionStatus('completed');
    return;
  }

  const now = new Date();
  const assignmentDate = new Date(taskData.userAssignment.dueDate);
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const assignmentUTC = Date.UTC(assignmentDate.getUTCFullYear(), assignmentDate.getUTCMonth(), assignmentDate.getUTCDate());
  
  if (todayUTC !== assignmentUTC) {
    setIsSubmittable(false);
    setCurrentTimeSlot(null);
    setSubmissionStatus('wrong_day');
    return;
  }

  if (taskData.userAssignment.timeSlot || (taskData.timeSlots && taskData.timeSlots.length > 0)) {
    // ✅ Convert UTC now to PHT (UTC+8) minutes for comparison against slot times
    const phtHours = (now.getUTCHours() + 8) % 24;
    const currentInMinutes = phtHours * 60 + now.getUTCMinutes();
    
    let activeSlot = null;
    let slotFound = false;
    
    const slotsToCheck = taskData.timeSlots || [taskData.userAssignment.timeSlot].filter(Boolean);
    
    for (const slot of slotsToCheck) {
      if (!slot) continue;
      
      const slotStart = convertTimeToMinutes(slot.startTime);
      const slotEnd = convertTimeToMinutes(slot.endTime);
      const graceEnd = slotEnd + 30;
      
      if (currentInMinutes >= slotStart && currentInMinutes <= graceEnd) {
        activeSlot = slot;
        slotFound = true;
        
        const canSubmitStart = slotEnd;  // ✅ opens AT end time (not 30 mins before)
        const canSubmit = currentInMinutes >= canSubmitStart && currentInMinutes <= graceEnd;
        
        setIsSubmittable(canSubmit);
        setSubmissionStatus(canSubmit ? 'available' : 'waiting');
        
        const timeLeftMs = (graceEnd - currentInMinutes) * 60000;
        setTimeLeft(Math.max(0, Math.floor(timeLeftMs / 1000)));
        break;
      }
    }
    
    setCurrentTimeSlot(activeSlot || taskData.userAssignment.timeSlot);
    
    if (!slotFound) {
      setIsSubmittable(false);
      setSubmissionStatus('expired');
      setTimeLeft(0);
      
      if (slotsToCheck.length > 0) {
        const firstSlotStart = convertTimeToMinutes(slotsToCheck[0].startTime);
        if (currentInMinutes < firstSlotStart) {
          setSubmissionStatus('waiting');
          const timeUntilFirstSlot = (firstSlotStart - currentInMinutes) * 60000;
          setTimeLeft(Math.floor(timeUntilFirstSlot / 1000));
        }
      }
    }
  } else {
    setIsSubmittable(true);
    setSubmissionStatus('available');
    setCurrentTimeSlot(null);
    setTimeLeft(null);
  }
};


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
        checkTimeValidity(processedTask);
        
        const currentWeek = processedTask.group?.currentRotationWeek || 1;
        
        const myAllAssignments = processedTask.assignments?.filter((a: any) => 
          a.userId === currentUserId && a.rotationWeek === currentWeek
        ) || [];
        
        const completedAssignments = myAllAssignments.filter((a: any) => a.completed === true);
        
        setCurrentWeekSubmissions(completedAssignments);
        
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
      Alert.alert(
        'Cannot Edit Task',
        'This task is already assigned to members. Editing assigned tasks could break the rotation system.\n\n' +
        'Consider creating a new task instead, or wait until the rotation week ends.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('UpdateTask', {
      task,
      groupId: task.groupId || groupId,
      groupName: task.group?.name,
      onTaskUpdated: fetchTaskDetails
    });
  };

  const handleDelete = async () => {
  if (!task) return;

  // Check if there are assignments for this task
  const hasAssignments = task.assignments && task.assignments.length > 0;
  const currentWeekAssignments = task.assignments?.filter(
    (a: any) => a.rotationWeek === (task.group?.currentRotationWeek || 1)
  ) || [];
  
  let warningMessage = '';
  
  if (hasAssignments) {
    warningMessage = 
      `⚠️ TASK HAS ${task.assignments.length} ASSIGNMENT(S)!\n\n` +
      `What will happen:\n` +
      `✅ Assignment records will be PRESERVED in the database\n` +
      `✅ All submission data (photos, notes, completion status) will be kept\n` +
      `✅ Points earned by members will NOT be lost\n` +
      `✅ Verification statuses will remain intact\n\n` +
      `❌ The task will be soft-deleted (marked as deleted)\n` +
      `❌ Assignments will no longer be linked to this task (taskId set to NULL)\n` +
      `❌ Members will see this task as "Task Deleted" in their history\n` +
      `❌ New assignments cannot be created for this task\n\n` +
      `Current week assignments: ${currentWeekAssignments.length}\n` +
      `Total assignments: ${task.assignments.length}\n\n` +
      `Are you sure you want to delete "${task.title}"?`;
  } else {
    warningMessage = 
      `Are you sure you want to delete "${task.title}"?\n\n` +
      `This task has no assignments yet, so deletion is safe.\n\n` +
      `This action cannot be undone.`;
  }

  Alert.alert(
    'Delete Task',
    warningMessage,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await TaskService.deleteTask(task.id);
            if (result.success) {
              Alert.alert(
                'Success', 
                hasAssignments 
                  ? `Task "${task.title}" has been deleted.\n\nAssignment history has been preserved for records.`
                  : 'Task deleted successfully'
              );
              // Refresh previous screen if needed
              if (onRefresh) onRefresh();
              navigation.goBack();
            } else {
              Alert.alert('Error', result.message || 'Failed to delete task');
            }
          } catch (err: any) {
            console.error('Error deleting task:', err);
            Alert.alert('Error', err.message || 'Failed to delete task');
          }
        }
      }
    ]
  );
};

  const handleCompleteAssignment = () => {
    if (!task?.userAssignment || !isSubmittable) {
      const statusInfo = getSubmissionStatusInfo();
      Alert.alert(
        'Cannot Submit',
        statusInfo.description,
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('CompleteAssignment', {
      assignmentId: task.userAssignment.id,
      taskTitle: task.title,
      dueDate: task.userAssignment.dueDate,
      timeSlot: currentTimeSlot || task.userAssignment.timeSlot,
      onCompleted: () => {
        fetchTaskDetails();
        if (onRefresh) onRefresh();
        Alert.alert('Success', 'Assignment submitted successfully!');
      }
    });
  };

  const handleViewAssignmentDetails = (assignment?: any) => {
    const assignmentId = assignment?.id || task?.userAssignment?.id;
    if (!assignmentId) {
      Alert.alert('Error', 'No assignment found');
      return;
    }

    navigation.navigate('AssignmentDetails', {
      assignmentId,
      isAdmin: isAdmin,
      onVerified: () => {
        fetchTaskDetails();
        if (onRefresh) onRefresh();
      }
    });
  };

  // ===== UI HELPER FUNCTIONS =====
  const getSubmissionStatusInfo = () => {
    switch (submissionStatus) {
      case 'available':
        return {
          label: '✓ AVAILABLE',
          color: theme.primary,
          bgColor: theme.primaryLight,
          borderColor: theme.primaryBorder,
          icon: 'check-circle',
          description: 'You can submit your completion now',
          buttonText: 'Complete Assignment',
          canSubmit: true
        };
      case 'waiting':
        return {
          label: '⏳ WAITING',
          color: theme.primary,
          bgColor: theme.primaryLight,
          borderColor: theme.primaryBorder,
          icon: 'clock',
          description: timeLeft && timeLeft > 0 
            ? `Opens in ${formatTimeLeft(timeLeft)}` 
            : 'Submit within 30 minutes of time slot',
          buttonText: 'Waiting',
          canSubmit: false
        };
      case 'expired':
        return {
          label: '❌ EXPIRED',
          color: theme.error,
          bgColor: theme.errorBg,
          borderColor: theme.errorBorder,
          icon: 'timer-off',
          description: 'The 30-minute submission window has expired',
          buttonText: 'Expired',
          canSubmit: false
        };
      case 'wrong_day':
        return {
          label: '📅 NOT DUE',
          color: theme.textMuted,
          bgColor: theme.bgSecondary,
          borderColor: theme.border,
          icon: 'calendar',
          description: task?.userAssignment 
            ? `Due on ${formatUTCDate(task.userAssignment.dueDate)}`
            : 'Not due today',
          buttonText: 'Not Due',
          canSubmit: false
        };
      case 'completed':
        return {
          label: '✓ COMPLETED',
          color: theme.primary,
          bgColor: theme.primaryLight,
          borderColor: theme.primaryBorder,
          icon: 'check-circle',
          description: 'Already submitted',
          buttonText: 'Completed',
          canSubmit: false
        };
      default:
        return {
          label: '⏳ CHECKING',
          color: theme.textMuted,
          bgColor: theme.bgSecondary,
          borderColor: theme.border,
          icon: 'clock',
          description: 'Checking status...',
          buttonText: 'Checking',
          canSubmit: false
        };
    }
  };

// In TaskDetailsScreen.tsx - COMPLETE getVerificationStatus function

const getVerificationStatus = (assignment: any) => {
  // ✅ 1. Check if VERIFIED (admin approved)
  if (assignment.verified === true) {
    return { 
      status: 'verified', 
      color: theme.primary, 
      icon: 'check-circle',
      text: 'Verified'
    };
  }
  
  // ✅ 2. Check if REJECTED (admin rejected)
  if (assignment.verified === false) {
    return { 
      status: 'rejected', 
      color: theme.error, 
      icon: 'close-circle',
      text: 'Rejected'
    };
  }
  
  // ✅ 3. Check if EXPIRED (submission window closed, never submitted)
  if (assignment.expired === true) {
    return { 
      status: 'expired', 
      color: theme.error, 
      icon: 'timer-off',
      text: 'Expired'
    };
  }
  
  // ✅ 4. Check if MISSED (specific time slot was missed)
  const missedSlotIds = assignment.missedTimeSlotIds || [];
  const currentTimeSlotId = assignment.timeSlot?.id;
  if (currentTimeSlotId && missedSlotIds.includes(currentTimeSlotId)) {
    return { 
      status: 'missed', 
      color: theme.error, 
      icon: 'close-circle',
      text: 'Missed'
    };
  }
  
  // ✅ 5. Check if SUBMITTED but not yet verified (PENDING VERIFICATION)
  if (assignment.completed === true && assignment.verified === null) {
    return { 
      status: 'pending_verification', 
      color: theme.primary, 
      icon: 'clock-check',
      text: 'Pending Verification'
    };
  }
  
  // ✅ 6. Check if COMPLETED (fully done - for single slot tasks)
  if (assignment.completed === true) {
    return { 
      status: 'completed', 
      color: theme.primary, 
      icon: 'check-circle',
      text: 'Completed'
    };
  }
  
  // ✅ 7. Check if OVERDUE (due date passed but not completed)
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  
  if (isOverdue) {
    return { 
      status: 'overdue', 
      color: theme.error, 
      icon: 'alert-circle',
      text: 'Overdue'
    };
  }
  
  // ✅ 8. Check if DUE TODAY
  const dueToday = isDueTodayUTC(assignment.dueDate);
  if (dueToday) {
    return { 
      status: 'due_today', 
      color: theme.primary, 
      icon: 'clock-alert',
      text: 'Due Today'
    };
  }
  
  // ✅ 9. Default - PENDING (future assignment)
  return { 
    status: 'pending',  
    color: theme.textSecondary, 
    icon: 'clock-outline',
    text: 'Pending'
  };
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
          <TouchableOpacity 
            style={[styles.editButton, assigned && styles.editButtonDisabled]} 
            onPress={handleEdit}
            disabled={assigned}
          >
            <MaterialCommunityIcons 
              name="pencil" 
              size={20} 
              color={assigned ? theme.textPlaceholder : theme.textMuted} 
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAssignedWarning = () => {
    if (!isAdmin) return null;
    if (!isTaskAssigned()) return null;
    
    return (
      <LinearGradient
        colors={[theme.primaryLight, theme.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.warningBanner}
      >
        <MaterialCommunityIcons name="alert" size={20} color={theme.primary} />
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Task is Assigned</Text>
          <Text style={styles.warningText}>
            This task is currently assigned to members. Edit is disabled to prevent rotation issues.
          </Text>
        </View>
      </LinearGradient>
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

  // ===== RENDER ALL ASSIGNMENTS FOR CURRENT WEEK - GROUPED BY DAY =====
  const renderAllWeekAssignments = () => {
    const currentWeek = task?.group?.currentRotationWeek || 1;
    
    const allWeekAssignments = task?.assignments?.filter((a: any) => 
      a.rotationWeek === currentWeek
    ) || [];
    
    if (allWeekAssignments.length === 0) return null;
    
    // Group assignments by day
    const groupedByDay = new Map();
    
    allWeekAssignments.forEach((assignment: any) => {
      const dueDate = new Date(assignment.dueDate);
      const dayKey = formatUTCDate(assignment.dueDate);
      const dayName = dueDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, {
          date: dayKey,
          dayName: dayName,
          assignments: []
        });
      }
      
      groupedByDay.get(dayKey).assignments.push(assignment);
    });
    
    // Convert to array and sort by date
    const groupedDays = Array.from(groupedByDay.values()).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.sectionIcon}>
            <MaterialCommunityIcons name="format-list-checks" size={16} color={theme.textSecondary} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>All Assignments (Current Week)</Text>
        </View>
        
        {groupedDays.map((dayGroup: any, dayIndex: number) => {
          const isToday = isDueTodayUTC(dayGroup.assignments[0].dueDate);
          
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
                    {dayGroup.date}
                  </Text>
                </LinearGradient>
              </View>
              
              {dayGroup.assignments.map((assignment: any, idx: number) => {
                const isCurrentUser = assignment.userId === currentUserId;
                const status = getVerificationStatus(assignment);
                
                return (
                  <TouchableOpacity
                    key={assignment.id || idx}
                    style={[
                      styles.weekAssignmentCard,
                      isCurrentUser && styles.currentUserAssignmentCard
                    ]}
                    onPress={() => handleViewAssignmentDetails(assignment)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.weekAssignmentHeader}>
                      <View style={styles.weekAssignmentUser}>
                        <LinearGradient
                          colors={[theme.bgSecondary, theme.bgTertiary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.weekAssignmentAvatar, isCurrentUser && styles.currentUserAvatar]}
                        >
                          <Text style={[styles.weekAssignmentAvatarText, { color: theme.textSecondary }]}>
                            {assignment.user?.fullName?.charAt(0) || '?'}
                          </Text>
                        </LinearGradient>
                        <View>
                          <Text style={[styles.weekAssignmentUserName, { color: theme.text }]}>
                            {assignment.user?.fullName || 'Unknown'}
                            {isCurrentUser && <Text style={[styles.currentUserLabel, { color: theme.primary }]}> (You)</Text>}
                          </Text>
                          <Text style={[styles.weekAssignmentTime, { color: theme.textMuted }]}>
                            {assignment.timeSlot?.startTime} - {assignment.timeSlot?.endTime}
                          </Text>
                        </View>
                      </View>
                      <LinearGradient
                        colors={[status.color + '20', status.color + '10']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.weekAssignmentStatus}
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

  const renderMemberAssignmentSection = () => {
    const currentWeek = task?.group?.currentRotationWeek || 1;
    
    const myAllAssignments = task?.assignments?.filter((a: any) => 
      a.userId === currentUserId && a.rotationWeek === currentWeek
    ) || [];
    
    const completedAssignments = myAllAssignments.filter((a: any) => a.completed === true);
    const pendingAssignments = myAllAssignments.filter((a: any) => a.completed !== true);
    
    if (myAllAssignments.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.notAssignedCard}>
            <MaterialCommunityIcons name="account-question" size={24} color={theme.textMuted} />
            <Text style={styles.notAssignedText}>Not assigned to you this week</Text>
          </LinearGradient>
        </View>
      );
    }
    
    if (todayAssignment) {
      const now = new Date();
      const dueDate = new Date(todayAssignment.dueDate);
      const isOverdue = now > dueDate && !todayAssignment.completed;
      const submissionStatusInfo = getSubmissionStatusInfo();

      return (
        <TouchableOpacity 
          style={styles.section}
          onPress={() => handleViewAssignmentDetails(todayAssignment)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Assignment</Text>
            <LinearGradient
              colors={
                todayAssignment.completed ? [theme.primary, theme.primaryDark] :
                isOverdue ? [theme.error, theme.error] : [theme.error, theme.error]
              }
              style={styles.todayAssignmentBadge}
            >
              <MaterialCommunityIcons 
                name={
                  todayAssignment.completed ? "check-circle" :
                  isOverdue ? "alert-circle" : "clock-alert"
                } 
                size={12} 
                color="#fff" 
              />
              <Text style={styles.todayAssignmentBadgeText}>
                {todayAssignment.completed ? 'Completed' : 
                 isOverdue ? 'Overdue' : 'Due Today'}
              </Text>
            </LinearGradient>
          </View>
          
          <LinearGradient
            colors={
              todayAssignment.completed ? [theme.primaryLight, theme.primaryLight] :
              isOverdue ? [theme.errorBg, theme.errorBg] : [theme.errorBg, theme.errorBg]
            }
            style={[
              styles.assignmentCard, 
              styles.todayAssignmentCard,
              isOverdue && styles.overdueCard,
              todayAssignment.completed && styles.completedCard
            ]}
          >
            <View style={styles.assignmentHeader}>
              <MaterialCommunityIcons 
                name={
                  todayAssignment.completed ? "check-circle" :
                  isOverdue ? "alert-circle" : "clock-alert"
                } 
                size={24} 
                color={
                  todayAssignment.completed ? theme.primary :
                  isOverdue ? theme.error : theme.error
                } 
              />
              <View style={styles.assignmentInfo}>
                <Text style={styles.todayAssignmentTitle}>{task.title}</Text>
                <Text style={styles.assignmentDate}>
                  Due: {formatUTCDate(todayAssignment.dueDate)}
                  {todayAssignment.timeSlot && ` • ${todayAssignment.timeSlot.startTime} - ${todayAssignment.timeSlot.endTime}`}
                </Text>
              </View>
            </View>
            
            {!todayAssignment.completed && !isOverdue && (
              <LinearGradient
                colors={[submissionStatusInfo.bgColor, submissionStatusInfo.bgColor]}
                style={[styles.submissionStatusCard, { borderColor: submissionStatusInfo.borderColor }]}
              >
                <View style={styles.submissionStatusHeader}>
                  <View style={[styles.statusIconContainer, { backgroundColor: submissionStatusInfo.color + '20' }]}>
                    <MaterialCommunityIcons name={submissionStatusInfo.icon as any} size={22} color={submissionStatusInfo.color} />
                  </View>
                  <View style={styles.statusTextContainer}>
                    <Text style={[styles.submissionStatusLabel, { color: submissionStatusInfo.color }]}>
                      {submissionStatusInfo.label}
                    </Text>
                    <Text style={[styles.submissionStatusDescription, { color: submissionStatusInfo.color }]}>
                      {submissionStatusInfo.description}
                    </Text>
                  </View>
                </View>
                
                {submissionStatus === 'available' && timeLeft !== null && (
                  <View style={styles.timerContainer}>
                    <LinearGradient
                      colors={timeLeft < 300 ? [theme.errorBg, theme.errorBg] : [theme.primaryLight, theme.primaryLight]}
                      style={[styles.timerBadge, timeLeft < 300 && styles.urgentTimerBadge]}
                    >
                      <MaterialCommunityIcons name={timeLeft < 300 ? "timer-alert" : "timer"} size={16} 
                        color={timeLeft < 300 ? theme.error : theme.primary} />
                      <Text style={[styles.timerText, { color: timeLeft < 300 ? theme.error : theme.primary }]}>
                        {formatTimeLeft(timeLeft)} remaining
                      </Text>
                    </LinearGradient>
                    {timeLeft < 300 && (
                      <Text style={styles.urgentMessage}>Submit now! Grace period ending soon.</Text>
                    )}
                  </View>
                )}
                
                {submissionStatus === 'waiting' && timeLeft !== null && timeLeft > 0 && (
                  <View style={styles.waitingContainer}>
                    <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.waitingBadge}>
                      <MaterialCommunityIcons name="clock-start" size={16} color={theme.primary} />
                      <Text style={styles.waitingText}>Opens in {formatTimeLeft(timeLeft)}</Text>
                    </LinearGradient>
                  </View>
                )}
              </LinearGradient>
            )}

            {isOverdue && !todayAssignment.completed && (
              <LinearGradient colors={[theme.errorBg, theme.errorBg]} style={styles.overdueInfoCard}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={theme.error} />
                <View style={styles.overdueInfoText}>
                  <Text style={styles.overdueTitle}>Overdue</Text>
                  <Text style={styles.overdueDate}>
                    Was due on {formatUTCDate(todayAssignment.dueDate)}
                  </Text>
                  {todayAssignment.notes?.includes('NEGLECTED') && (
                    <Text style={styles.neglectedText}>⚠️ Point deduction applied</Text>
                  )}
                </View>
              </LinearGradient>
            )}
            
            {todayAssignment.completed && (
              <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.completedInfoCard}>
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.primary} />
                <View style={styles.completedInfoText}>
                  <Text style={styles.completedTitle}>Already Completed</Text>
                  <Text style={styles.completedDate}>
                    Submitted: {formatUTCDate(todayAssignment.completedAt)}
                  </Text>
                  {todayAssignment.notes?.includes('LATE') && (
                    <Text style={styles.lateText}>⚠️ Late submission (points reduced)</Text>
                  )}
                </View>
              </LinearGradient>
            )}
            
            <View style={styles.viewDetailsIndicator}>
              <Text style={styles.viewDetailsText}>Tap to view full details</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textMuted} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    
    if (pendingAssignments.length > 0) {
      const sortedPending = [...pendingAssignments].sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pending Assignments</Text>
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{sortedPending.length} pending</Text>
            </LinearGradient>
          </View>
          
          {sortedPending.map((assignment, index) => {
            const dueDate = new Date(assignment.dueDate);
            const isToday = isDueTodayUTC(assignment.dueDate);
            const isPast = dueDate < new Date() && !assignment.completed;
            
            return (
              <TouchableOpacity
                key={assignment.id || index}
                style={[
                  styles.pendingAssignmentCard,
                  isToday && styles.todayPendingCard,
                  isPast && styles.overduePendingCard
                ]}
                onPress={() => handleViewAssignmentDetails(assignment)}
                activeOpacity={0.7}
              >
                <View style={styles.pendingCardHeader}>
                  <LinearGradient
                    colors={isToday ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
                    style={styles.pendingIcon}
                  >
                    <MaterialCommunityIcons 
                      name={isToday ? "clock-alert" : "calendar-clock"} 
                      size={16} 
                      color={isToday ? "#fff" : theme.textSecondary} 
                    />
                  </LinearGradient>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingTitle}>
                      {assignment.timeSlot 
                        ? `${assignment.timeSlot.startTime} - ${assignment.timeSlot.endTime}`
                        : 'Time slot assignment'}
                    </Text>
                    <Text style={[
                      styles.pendingDate,
                      isToday && styles.todayPendingText,
                      isPast && styles.overduePendingText
                    ]}>
                      {isToday ? 'Due Today' : formatUTCDate(assignment.dueDate)}
                      {assignment.timeSlot && ` at ${assignment.timeSlot.startTime}`}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
                </View>
                
                {assignment.points && (
                  <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.pendingPointsBadge}>
                    <Text style={styles.pendingPointsText}>{assignment.points} pts</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    
    if (completedAssignments.length > 0 && pendingAssignments.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.notAssignedCard}>
            <MaterialCommunityIcons name="check-circle" size={24} color={theme.primary} />
            <Text style={styles.notAssignedText}>All assignments completed for this week!</Text>
            <Text style={styles.notAssignedSubtext}>Great job! 🎉</Text>
          </LinearGradient>
        </View>
      );
    }
    
    const futureAssignments = myAllAssignments.filter((a: any) => 
      new Date(a.dueDate) > new Date()
    ).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const nextAssignment = futureAssignments?.[0];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Assignment</Text>
        <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.notAssignedCard}>
          <MaterialCommunityIcons name="calendar" size={24} color={theme.textMuted} />
          <Text style={styles.notAssignedText}>No assignment due today</Text>
          {nextAssignment ? (
            <TouchableOpacity onPress={() => handleViewAssignmentDetails(nextAssignment)}>
              <Text style={styles.notAssignedSubtext}>
                Next: {formatUTCDate(nextAssignment.dueDate)} →
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.notAssignedSubtext}>No upcoming assignments</Text>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderMySubmissionsSection = () => {
    if (currentWeekSubmissions.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Submissions This Week</Text>
          <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.notAssignedCard}>
            <MaterialCommunityIcons name="clipboard-text" size={24} color={theme.textMuted} />
            <Text style={styles.notAssignedText}>No submissions yet this week</Text>
          </LinearGradient>
        </View>
      );
    }

    const sortedSubmissions = [...currentWeekSubmissions].sort((a: any, b: any) => {
      const isAToday = isDueTodayUTC(a.dueDate);
      const isBToday = isDueTodayUTC(b.dueDate);
      
      if (isAToday && !isBToday) return -1;
      if (!isAToday && isBToday) return 1;
      
      if (isAToday && isBToday) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });

    return ( 
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Submissions This Week</Text>
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
                    {submission.timeSlot && ` • ${submission.timeSlot.startTime} - ${submission.timeSlot.endTime}`}
                    {dueToday && <Text style={styles.todayText}> (Today)</Text>}
                  </Text>
                </View>
              </View>

              {submission.completedAt && (
                <Text style={styles.submittedDate}>
                  Submitted: {formatUTCDate(submission.completedAt)}
                </Text>
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

              {submission.adminNotes && status.status === 'rejected' && (
                <LinearGradient colors={[theme.errorBg, theme.errorBg]} style={styles.adminFeedbackPreview}>
                  <MaterialCommunityIcons name="message-alert" size={12} color={theme.error} />
                  <Text style={styles.adminFeedbackPreviewText} numberOfLines={1}>{submission.adminNotes}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderUpcomingAssignments = () => {
    const othersAssignments = upcomingAssignments.filter(
      (a: any) => a.userId !== currentUserId
    );
    
    if (othersAssignments.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.sectionIcon}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.primary} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>Others' Tasks This Week</Text>
        </View>
        {othersAssignments.slice(0, 5).map((assignment: any) => {
          const dueToday = isDueTodayUTC(assignment.dueDate);
          const status = getVerificationStatus(assignment);
          
          return (
            <TouchableOpacity
              key={assignment.id}
              style={[styles.upcomingCard, dueToday && styles.todayUpcomingCard]}
              onPress={() => handleViewAssignmentDetails(assignment)}
              activeOpacity={0.7}
            >
              {dueToday && (
                <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.upcomingTodayBadge}>
                  <Text style={styles.upcomingTodayBadgeText}>Today</Text>
                </LinearGradient>
              )}
              <View style={styles.upcomingCardHeader}>
                <View style={styles.upcomingUserInfo}>
                  <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.upcomingAvatar}>
                    <Text style={styles.upcomingAvatarText}>
                      {assignment.user?.fullName?.charAt(0) || '?'}
                    </Text>
                  </LinearGradient>
                  <View style={styles.upcomingUserDetails}>
                    <Text style={styles.upcomingUserName}>{assignment.user?.fullName || 'Unknown'}</Text>
                    <Text style={styles.upcomingTaskName}>{task.title}</Text>
                  </View>
                </View>
                <LinearGradient colors={[status.color + '20', status.color + '10']} style={styles.upcomingStatusBadge}>
                  <MaterialCommunityIcons name={status.icon as any} size={12} color={status.color} />
                  <Text style={[styles.upcomingStatusText, { color: status.color }]}>{status.text}</Text>
                </LinearGradient>
              </View>
              <View style={styles.upcomingDetails}>
                <View style={styles.upcomingDetailRow}>
                  <MaterialCommunityIcons name="calendar" size={12} color={theme.textMuted} />
                  <Text style={styles.upcomingDetailText}>
                    Due: {formatUTCDate(assignment.dueDate)}
                    {assignment.timeSlot && ` at ${assignment.timeSlot.startTime}`}
                  </Text>
                </View>
                <View style={styles.upcomingDetailRow}>
                  <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
                  <Text style={styles.upcomingDetailText}>{assignment.points} points</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderAdminView = () => (
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

      {task.assignments?.length > 0 ? (
        <View style={styles.assignmentsContainer}>
          <Text style={styles.assignmentsSubtitle}>All Assignments (Current Week):</Text>
          {task.assignments
            .filter((a: any) => a.rotationWeek === (task.group?.currentRotationWeek || 1))
            .slice(0, 5)
            .map((assignment: any, index: number) => {
              const status = getVerificationStatus(assignment);
              const dueToday = isDueTodayUTC(assignment.dueDate);
              
              return (
                <TouchableOpacity
                  key={assignment.id || index}
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
                      <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.userAvatar}>
                        {assignment.user?.avatarUrl ? (
                          <Image source={{ uri: assignment.user.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.userAvatarText}>
                            {assignment.user?.fullName?.charAt(0) || 'U'}
                          </Text>
                        )}
                      </LinearGradient>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>{assignment.user?.fullName || 'Unknown User'}</Text>
                        <Text style={styles.assignmentDateSmall}>
                          Due: {formatUTCDate(assignment.dueDate)}
                          {assignment.rotationWeek && ` • Week ${assignment.rotationWeek}`}
                          {dueToday && <Text style={styles.todaySmallText}> (Today)</Text>}
                        </Text>
                      </View>
                    </View>
                    <LinearGradient colors={[status.color + '20', status.color + '10']} style={styles.statusBadge}>
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
      ) : (
        <Text style={styles.noAssignments}>No assignments yet</Text>
      )}
    </View>
  );

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
        {renderAssignedWarning()}
        
        <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.card}>
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

          {task.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          )}

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

          {renderWeekInfo()}
          {renderMemberAssignmentSection()}
          
          {!isAdmin && renderMySubmissionsSection()}
          {!isAdmin && renderUpcomingAssignments()}
          {!isAdmin && renderAllWeekAssignments()}
          
          {isAdmin && renderAdminView()}

          {task.executionFrequency === 'WEEKLY' && task.selectedDays?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scheduled Days</Text>
              <View style={styles.daysContainer}>
                {task.selectedDays.map((day: string, index: number) => {
                  const today = new Date();
                  const todayDay = today.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
                  const isToday = day === todayDay;
                  return (
                    <LinearGradient
                      key={index}
                      colors={isToday ? [theme.primaryLight, theme.primaryLight] : [theme.primaryLight, theme.primaryLight]}
                      style={[styles.dayChip, isToday && styles.todayDayChip]}
                    >
                      <MaterialCommunityIcons name={isToday ? "clock-alert" : "calendar"} size={12} 
                        color={isToday ? theme.primary : theme.textSecondary} />
                      <Text style={[styles.dayText, isToday && styles.todayDayText]}>{day}</Text>
                      {isToday && <Text style={styles.todayDayLabel}>Today</Text>}
                    </LinearGradient>
                  );
                })}
              </View>
            </View>
          )}

          {task.timeSlots?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Time Slots</Text>
              <View style={styles.timeSlotsContainer}>
                {task.timeSlots.map((slot: any, index: number) => {
                  const isCurrent = currentTimeSlot && 
                    slot.startTime === currentTimeSlot.startTime && 
                    slot.endTime === currentTimeSlot.endTime;
                  
                  return (
                    <LinearGradient
                      key={index}
                      colors={isCurrent ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
                      style={[styles.timeSlotCard, isCurrent && styles.currentTimeSlotCard]}
                    >
                      <View style={styles.timeSlotHeader}>
                        <MaterialCommunityIcons name={isCurrent ? "clock-check" : "clock"} size={18} 
                          color={isCurrent ? theme.primary : theme.textSecondary} />
                        <Text style={[styles.timeSlotTime, isCurrent && styles.currentTimeSlotTime]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
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


         
{isAdmin && (
  <TouchableOpacity 
    style={styles.deleteButton} 
    onPress={handleDelete}
  >
    <LinearGradient colors={[theme.errorBg, theme.errorBg]} style={styles.deleteButtonGradient}>
      <MaterialCommunityIcons name="delete" size={18} color={theme.error} />
      <Text style={styles.deleteButtonText}>
        Delete Task
      </Text>
    </LinearGradient>
  </TouchableOpacity>
)}
       
          {!isAdmin && (
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.memberInfoBox}>
              <MaterialCommunityIcons name="information" size={18} color={theme.textMuted} />
              <Text style={styles.memberInfoText}>
                Only group administrators can edit or delete tasks.
              </Text>
            </LinearGradient>
          )}
        </LinearGradient>
      </ScrollView>
    </ScreenWrapper>
  );
}