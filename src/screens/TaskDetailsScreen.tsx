// src/screens/TaskDetailsScreen.tsx - COMPLETE REFACTORED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TaskService } from '../services/TaskService';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { taskDetailsStyles as styles } from '../styles/taskDetails.styles';

export default function TaskDetailsScreen({ navigation, route }: any) {
  const { taskId, groupId, userRole } = route.params || {};
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

  // ===== LOAD USER ID USING TOKENUTILS =====
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
    if (taskId) fetchTaskDetails();
  }, [taskId]);

  // ===== REAL-TIME HOOKS =====
  const {
    events: taskEvents,
    clearTaskUpdated,
    clearTaskDeleted
  } = useRealtimeTasks(groupId);

  const {
    events: assignmentEvents,
    clearAssignmentCompleted,
    clearAssignmentVerified
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
    if (assignmentEvents.assignmentCompleted) {
      fetchTaskDetails();
      clearAssignmentCompleted();
    }
  }, [assignmentEvents.assignmentCompleted]);

  useEffect(() => {
    if (assignmentEvents.assignmentVerified) {
      fetchTaskDetails();
      clearAssignmentVerified();
    }
  }, [assignmentEvents.assignmentVerified]);

  useEffect(() => {
    if (task?.userAssignment && !task.userAssignment.completed) {
      const timer = startCountdownTimer();
      return () => clearInterval(timer);
    }
  }, [task, timeLeft]);

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
        
        if (processedTask.assignments) {
          const upcoming = processedTask.assignments.filter(
            (a: any) => 
              a.rotationWeek === currentWeek &&
              a.userId !== processedTask.userId
          );
          setUpcomingAssignments(upcoming);
        }
        
        if (processedTask.assignments && processedTask.userId) {
          const myCurrentWeekSubmissions = processedTask.assignments.filter(
            (a: any) => 
              a.userId === processedTask.userId && 
              a.rotationWeek === currentWeek &&
              a.completed === true
          );
          setCurrentWeekSubmissions(myCurrentWeekSubmissions);
        }
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

  const findTodayAssignment = (taskData: any) => {
    if (!taskData.assignments || !taskData.userId) {
      setTodayAssignment(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAssignments = taskData.assignments.filter((a: any) => {
      if (a.userId !== taskData.userId) return false;
      
      const dueDate = new Date(a.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate.getTime() === today.getTime();
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

  const processTaskData = (taskData: any) => {
    if (taskData.timeSlots && taskData.timeSlots.length > 0) {
      taskData.timeSlots.sort((a: any, b: any) => {
        const timeA = convertTimeToMinutes(a.startTime);
        const timeB = convertTimeToMinutes(b.startTime);
        return timeA - timeB;
      });
    }
    
    if (taskData.selectedDays && taskData.selectedDays.length > 0) {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      taskData.selectedDays.sort((a: string, b: string) => 
        dayOrder.indexOf(a) - dayOrder.indexOf(b)
      );
    }
    
    if (taskData.assignments && taskData.assignments.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      taskData.assignments.sort((a: any, b: any) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        
        const dayA = new Date(dateA);
        dayA.setHours(0, 0, 0, 0);
        
        const dayB = new Date(dateB);
        dayB.setHours(0, 0, 0, 0);
        
        const isAToday = dayA.getTime() === today.getTime();
        const isBToday = dayB.getTime() === today.getTime();
        
        if (isAToday && !isBToday) return -1;
        if (!isAToday && isBToday) return 1;
        
        if (isAToday && isBToday) {
          return dateA.getTime() - dateB.getTime();
        }
        
        const isAFuture = dayA.getTime() >= today.getTime();
        const isBFuture = dayB.getTime() >= today.getTime();
        
        if (isAFuture && !isBFuture) return -1;
        if (!isAFuture && isBFuture) return 1;
        
        if (isAFuture && isBFuture) {
          return dateA.getTime() - dateB.getTime();
        }
        
        return dateB.getTime() - dateA.getTime();
      });
    }
    
    return taskData;
  };

  const convertTimeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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
    const today = now.toDateString();
    const assignmentDay = assignmentDate.toDateString();
    
    if (today !== assignmentDay) {
      setIsSubmittable(false);
      setCurrentTimeSlot(null);
      setSubmissionStatus('wrong_day');
      return;
    }

    if (taskData.userAssignment.timeSlot || (taskData.timeSlots && taskData.timeSlots.length > 0)) {
      const currentInMinutes = now.getHours() * 60 + now.getMinutes();
      
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
          
          const canSubmitStart = slotEnd - 30;
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

  const getSubmissionStatusInfo = () => {
    switch (submissionStatus) {
      case 'available':
        return {
          label: '✓ AVAILABLE',
          color: '#2b8a3e',
          bgColor: '#d3f9d8',
          borderColor: '#b2f2bb',
          icon: 'check-circle',
          description: 'You can submit your completion now',
          buttonText: 'Complete Assignment',
          canSubmit: true
        };
      case 'waiting':
        return {
          label: '⏳ WAITING',
          color: '#e67700',
          bgColor: '#fff3bf',
          borderColor: '#ffec99',
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
          color: '#fa5252',
          bgColor: '#fff5f5',
          borderColor: '#ffc9c9',
          icon: 'timer-off',
          description: 'The 30-minute submission window has expired',
          buttonText: 'Expired',
          canSubmit: false
        };
      case 'wrong_day':
        return {
          label: '📅 NOT DUE',
          color: '#868e96',
          bgColor: '#f8f9fa',
          borderColor: '#e9ecef',
          icon: 'calendar',
          description: task?.userAssignment 
            ? `Due on ${new Date(task.userAssignment.dueDate).toLocaleDateString()}`
            : 'Not due today',
          buttonText: 'Not Due',
          canSubmit: false
        };
      case 'completed':
        return {
          label: '✓ COMPLETED',
          color: '#2b8a3e',
          bgColor: '#d3f9d8',
          borderColor: '#b2f2bb',
          icon: 'check-circle',
          description: 'Already submitted',
          buttonText: 'Completed',
          canSubmit: false
        };
      default:
        return {
          label: '⏳ CHECKING',
          color: '#868e96',
          bgColor: '#f8f9fa',
          borderColor: '#e9ecef',
          icon: 'clock',
          description: 'Checking status...',
          buttonText: 'Checking',
          canSubmit: false
        };
    }
  };

  const getVerificationStatus = (assignment: any) => {
    if (!assignment?.completed) {
      const today = new Date().toDateString();
      const dueDate = new Date(assignment.dueDate).toDateString();
      
      if (today === dueDate) {
        return { 
          status: 'not_completed',
          color: '#fa5252',
          icon: 'alert-circle',
          text: 'Not Completed'
        };
      } else {
        return { 
          status: 'pending',
          color: '#e67700',
          icon: 'clock-outline',
          text: 'Pending'
        };
      }
    }
    
    if (assignment.verified === true) return { 
      status: 'verified', 
      color: '#2b8a3e', 
      icon: 'check-circle',
      text: 'Verified'
    };
    
    if (assignment.verified === false) return { 
      status: 'rejected', 
      color: '#fa5252', 
      icon: 'close-circle',
      text: 'Rejected'
    };
    
    return { 
      status: 'pending_verification', 
      color: '#e67700', 
      icon: 'clock-check',
      text: 'Pending Verification'
    };
  };

  const isDueToday = (dueDate: string) => {
    const today = new Date().toDateString();
    const due = new Date(dueDate).toDateString();
    return today === due;
  };

  const handleBack = () => navigation.goBack();
  
  const handleEdit = () => {
    if (task) {
      navigation.navigate('UpdateTask', {
        task,
        groupId: task.groupId || groupId,
        groupName: task.group?.name,
        onTaskUpdated: fetchTaskDetails
      });
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await TaskService.deleteTask(task.id);
              if (result.success) {
                Alert.alert('Success', 'Task deleted successfully');
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
        Alert.alert('Success', 'Assignment submitted successfully!');
      }
    });
  };

  const handleViewAssignmentDetails = (assignment?: any) => {
    const assignmentId = assignment?.id || task?.userAssignment?.id;
    if (!assignmentId) return;
    
    navigation.navigate('AssignmentDetails', {
      assignmentId,
      isAdmin: isAdmin,
      onVerified: fetchTaskDetails
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>Task Details</Text>
      </View>
      {isAdmin && task && (
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <MaterialCommunityIcons name="pencil" size={20} color="#495057" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderWeekInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.sectionIcon}>
          <MaterialCommunityIcons name="calendar-week" size={16} color="#495057" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Current Week</Text>
      </View>
      <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.weekInfoCard}>
        <View style={styles.weekInfoRow}>
          <MaterialCommunityIcons name="counter" size={16} color="#868e96" />
          <Text style={styles.weekInfoLabel}>Week:</Text>
          <Text style={styles.weekInfoValue}>{task.group?.currentRotationWeek || 1}</Text>
        </View>
        {task.group?.weekStart && task.group?.weekEnd && (
          <View style={styles.weekInfoRow}>
            <MaterialCommunityIcons name="calendar-range" size={16} color="#868e96" />
            <Text style={styles.weekInfoLabel}>Dates:</Text>
            <Text style={styles.weekInfoValue}>
              {new Date(task.group.weekStart).toLocaleDateString()} - {new Date(task.group.weekEnd).toLocaleDateString()}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const renderMemberAssignmentSection = () => {
    if (!task?.userAssignment) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.notAssignedCard}>
            <MaterialCommunityIcons name="account-question" size={24} color="#868e96" />
            <Text style={styles.notAssignedText}>Not assigned to you this week</Text>
          </LinearGradient>
        </View>
      );
    }

    if (!todayAssignment) {
      const futureAssignments = task?.assignments?.filter((a: any) => 
        a.userId === task?.userId && new Date(a.dueDate) > new Date()
      ).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      const nextAssignment = futureAssignments?.[0];

      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.notAssignedCard}>
            <MaterialCommunityIcons name="calendar" size={24} color="#868e96" />
            <Text style={styles.notAssignedText}>No assignment due today</Text>
            {nextAssignment ? (
              <Text style={styles.notAssignedSubtext}>
                Next: {new Date(nextAssignment.dueDate).toLocaleDateString()}
              </Text>
            ) : (
              <Text style={styles.notAssignedSubtext}>No upcoming assignments</Text>
            )}
          </LinearGradient>
        </View>
      );
    }

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
              todayAssignment.completed ? ['#2b8a3e', '#1e6b2c'] :
              isOverdue ? ['#fa5252', '#e03131'] : ['#fa5252', '#e03131']
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
            todayAssignment.completed ? ['#f0f9f0', '#e8f5e9'] :
            isOverdue ? ['#fff5f5', '#ffe3e3'] : ['#fff5f5', '#ffe3e3']
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
                todayAssignment.completed ? "#2b8a3e" :
                isOverdue ? "#fa5252" : "#fa5252"
              } 
            />
            <View style={styles.assignmentInfo}>
              <Text style={styles.todayAssignmentTitle}>{task.title}</Text>
              <Text style={styles.assignmentDate}>
                Due: {new Date(todayAssignment.dueDate).toLocaleDateString()}
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
                    colors={timeLeft < 300 ? ['#ffc9c9', '#ffb3b3'] : ['#d3f9d8', '#b2f2bb']}
                    style={[styles.timerBadge, timeLeft < 300 && styles.urgentTimerBadge]}
                  >
                    <MaterialCommunityIcons name={timeLeft < 300 ? "timer-alert" : "timer"} size={16} 
                      color={timeLeft < 300 ? "#fa5252" : "#2b8a3e"} />
                    <Text style={[styles.timerText, { color: timeLeft < 300 ? "#fa5252" : "#2b8a3e" }]}>
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
                  <LinearGradient colors={['#fff3bf', '#ffec99']} style={styles.waitingBadge}>
                    <MaterialCommunityIcons name="clock-start" size={16} color="#e67700" />
                    <Text style={styles.waitingText}>Opens in {formatTimeLeft(timeLeft)}</Text>
                  </LinearGradient>
                </View>
              )}
            </LinearGradient>
          )}

          {isOverdue && !todayAssignment.completed && (
            <LinearGradient colors={['#fff5f5', '#ffe3e3']} style={styles.overdueInfoCard}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#fa5252" />
              <View style={styles.overdueInfoText}>
                <Text style={styles.overdueTitle}>Overdue</Text>
                <Text style={styles.overdueDate}>
                  Was due on {new Date(todayAssignment.dueDate).toLocaleDateString()}
                </Text>
                {todayAssignment.notes?.includes('NEGLECTED') && (
                  <Text style={styles.neglectedText}>⚠️ Point deduction applied</Text>
                )}
              </View>
            </LinearGradient>
          )}
          
          {todayAssignment.completed && (
            <LinearGradient colors={['#d3f9d8', '#b2f2bb']} style={styles.completedInfoCard}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#2b8a3e" />
              <View style={styles.completedInfoText}>
                <Text style={styles.completedTitle}>Already Completed</Text>
                <Text style={styles.completedDate}>
                  Submitted: {new Date(todayAssignment.completedAt).toLocaleDateString()}
                </Text>
                {todayAssignment.notes?.includes('LATE') && (
                  <Text style={styles.lateText}>⚠️ Late submission (points reduced)</Text>
                )}
              </View>
            </LinearGradient>
          )}
          
          <View style={styles.viewDetailsIndicator}>
            <Text style={styles.viewDetailsText}>Tap to view full details</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#495057" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderMySubmissionsSection = () => {
    if (currentWeekSubmissions.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Submissions This Week</Text>
          <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.notAssignedCard}>
            <MaterialCommunityIcons name="clipboard-text" size={24} color="#868e96" />
            <Text style={styles.notAssignedText}>No submissions yet this week</Text>
          </LinearGradient>
        </View>
      );
    }

    const sortedSubmissions = [...currentWeekSubmissions].sort((a: any, b: any) => {
      const isAToday = isDueToday(a.dueDate);
      const isBToday = isDueToday(b.dueDate);
      
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
          const dueToday = isDueToday(submission.dueDate);
          
          return (
            <TouchableOpacity
              key={submission.id || index}
              style={[styles.submissionHistoryCard, dueToday && styles.todaySubmissionCard]}
              onPress={() => handleViewAssignmentDetails(submission)}
              activeOpacity={0.7}
            >
              {dueToday && (
                <LinearGradient colors={['#fa5252', '#e03131']} style={styles.todayBadge}>
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
                    {new Date(submission.dueDate).toLocaleDateString()}
                    {submission.timeSlot && ` • ${submission.timeSlot.startTime} - ${submission.timeSlot.endTime}`}
                    {dueToday && <Text style={styles.todayText}> (Today)</Text>}
                  </Text>
                </View>
              </View>

              {submission.completedAt && (
                <Text style={styles.submittedDate}>
                  Submitted: {new Date(submission.completedAt).toLocaleDateString()}
                </Text>
              )}

              <View style={styles.submissionHistoryMeta}>
                {submission.photoUrl && (
                  <LinearGradient colors={['#e7f5ff', '#d0ebff']} style={styles.hasPhotoBadgeSmall}>
                    <MaterialCommunityIcons name="image" size={12} color="#2b8a3e" />
                    <Text style={styles.hasPhotoTextSmall}>Photo</Text>
                  </LinearGradient>
                )}
                {submission.notes && (
                  <LinearGradient colors={['#fff3bf', '#ffec99']} style={styles.hasNotesBadgeSmall}>
                    <MaterialCommunityIcons name="note-text" size={12} color="#e67700" />
                    <Text style={styles.hasNotesTextSmall}>Notes</Text>
                  </LinearGradient>
                )}
                <Text style={styles.pointsEarned}>+{submission.points} pts</Text>
              </View>

              {submission.adminNotes && status.status === 'rejected' && (
                <LinearGradient colors={['#fff5f5', '#ffe3e3']} style={styles.adminFeedbackPreview}>
                  <MaterialCommunityIcons name="message-alert" size={12} color="#fa5252" />
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
    if (upcomingAssignments.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <LinearGradient colors={['#fff3bf', '#ffec99']} style={styles.sectionIcon}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#e67700" />
          </LinearGradient>
          <Text style={styles.sectionTitle}>Others' Tasks This Week</Text>
        </View>
        {upcomingAssignments.slice(0, 5).map((assignment: any) => {
          const dueToday = isDueToday(assignment.dueDate);
          const status = getVerificationStatus(assignment);
          
          return (
            <TouchableOpacity
              key={assignment.id}
              style={[styles.upcomingCard, dueToday && styles.todayUpcomingCard]}
              onPress={() => handleViewAssignmentDetails(assignment)}
              activeOpacity={0.7}
            >
              {dueToday && (
                <LinearGradient colors={['#e67700', '#cc5f00']} style={styles.upcomingTodayBadge}>
                  <Text style={styles.upcomingTodayBadgeText}>Today</Text>
                </LinearGradient>
              )}
              <View style={styles.upcomingCardHeader}>
                <View style={styles.upcomingUserInfo}>
                  <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.upcomingAvatar}>
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
                  <MaterialCommunityIcons name="calendar" size={12} color="#868e96" />
                  <Text style={styles.upcomingDetailText}>
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    {assignment.timeSlot && ` at ${assignment.timeSlot.startTime}`}
                  </Text>
                </View>
                <View style={styles.upcomingDetailRow}>
                  <MaterialCommunityIcons name="star" size={12} color="#e67700" />
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
        <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.sectionIcon}>
          <MaterialCommunityIcons name="shield-account" size={16} color="#495057" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Admin View</Text>
      </View>
      
      <LinearGradient colors={['#e7f5ff', '#d0ebff']} style={styles.adminInfoBox}>
        <MaterialCommunityIcons name="shield-account" size={18} color="#2b8a3e" />
        <View style={styles.adminInfoContent}>
          <Text style={styles.adminInfoTitle}>Admin Information</Text>
          <Text style={styles.adminInfoText}>
            You have full control over this task. Click on assignments to verify/reject submissions.
          </Text>
        </View>
      </LinearGradient>

      {task.currentAssignee && (
        <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.assigneeInfo}>
          <Text style={styles.assigneeLabel}>Current Assignee:</Text>
          <Text style={styles.assigneeValue}>
            {task.assignments?.[0]?.user?.fullName || 'Unknown'} (Week {task.group?.currentRotationWeek || 1})
          </Text>
        </LinearGradient>
      )}

      {task.rotationMembers && Array.isArray(task.rotationMembers) && (
        <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.rotationInfo}>
          <Text style={styles.rotationLabel}>Rotation Members:</Text>
          <View style={styles.rotationMembersList}>
            {task.rotationMembers.map((member: any, index: number) => (
              <View key={member.userId} style={styles.rotationMemberItem}>
                <LinearGradient
                  colors={member.userId === task.currentAssignee ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                  style={[
                    styles.rotationMemberAvatar,
                    member.userId === task.currentAssignee && styles.currentAssigneeAvatar
                  ]}
                >
                  <Text style={[
                    styles.rotationMemberInitial,
                    { color: member.userId === task.currentAssignee ? 'white' : '#495057' }
                  ]}>
                    {member.fullName?.charAt(0) || '?'}
                  </Text>
                </LinearGradient>
                <Text style={[
                  styles.rotationMemberName,
                  member.userId === task.currentAssignee && styles.currentAssigneeName
                ]}>
                  {member.fullName}
                  {member.userId === task.currentAssignee && ' (Current)'}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      )}

      {task.assignments?.length > 0 ? (
        <View style={styles.assignmentsContainer}>
          <Text style={styles.assignmentsSubtitle}>All Assignments (Current Week):</Text>
          {task.assignments
            .filter((a: any) => a.rotationWeek === (task.group?.currentRotationWeek || 1))
            .slice(0, 5)
            .map((assignment: any, index: number) => {
              const status = getVerificationStatus(assignment);
              const dueToday = isDueToday(assignment.dueDate);
              
              return (
                <TouchableOpacity
                  key={assignment.id || index}
                  style={[styles.adminAssignmentCard, dueToday && styles.todayAdminCard]}
                  onPress={() => handleViewAssignmentDetails(assignment)}
                  activeOpacity={0.7}
                >
                  {dueToday && (
                    <LinearGradient colors={['#fa5252', '#e03131']} style={styles.todayAdminBadge}>
                      <MaterialCommunityIcons name="clock-alert" size={10} color="#fff" />
                      <Text style={styles.todayAdminBadgeText}>Due Today</Text>
                    </LinearGradient>
                  )}
                  
                  <View style={styles.adminAssignmentHeader}>
                    <View style={styles.userInfo}>
                      <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.userAvatar}>
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
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
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
                        Submitted: {new Date(assignment.completedAt).toLocaleDateString()}
                      </Text>
                      {assignment.photoUrl && (
                        <LinearGradient colors={['#e7f5ff', '#d0ebff']} style={styles.hasPhotoBadge}>
                          <MaterialCommunityIcons name="image" size={8} color="#2b8a3e" />
                          <Text style={styles.hasPhotoText}>Photo</Text>
                        </LinearGradient>
                      )}
                      {assignment.notes && (
                        <LinearGradient colors={['#fff3bf', '#ffec99']} style={styles.hasNotesBadge}>
                          <MaterialCommunityIcons name="note-text" size={8} color="#e67700" />
                          <Text style={styles.hasNotesText}>Notes</Text>
                        </LinearGradient>
                      )}
                    </View>
                  )}
                  
                  {assignment.adminNotes && (
                    <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.adminNotesPreview}>
                      <Text style={styles.adminNotesPreviewText} numberOfLines={1}>{assignment.adminNotes}</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              );
            })}
          {task.assignments.filter((a: any) => a.rotationWeek === (task.group?.currentRotationWeek || 1)).length > 5 && (
            <Text style={styles.moreAssignments}>
              +{task.assignments.filter((a: any) => a.rotationWeek === (task.group?.currentRotationWeek || 1)).length - 5} more
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.noAssignments}>No assignments yet</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
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
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTaskDetails}>
            <LinearGradient colors={['#2b8a3e', '#1e6b2c']} style={styles.retryButtonGradient}>
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
          <MaterialCommunityIcons name="file-question" size={64} color="#dee2e6" />
          <Text style={styles.emptyText}>Task not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.card}>
          <View style={styles.taskHeader}>
            <LinearGradient colors={['#e7f5ff', '#d0ebff']} style={styles.taskIcon}>
              <MaterialCommunityIcons name="format-list-checks" size={24} color="#2b8a3e" />
            </LinearGradient>
            <View style={styles.taskTitleContainer}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <LinearGradient colors={['#fff3bf', '#ffec99']} style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star" size={14} color="#e67700" />
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

          {task.executionFrequency === 'WEEKLY' && task.selectedDays?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scheduled Days</Text>
              <View style={styles.daysContainer}>
                {task.selectedDays.map((day: string, index: number) => {
                  const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  return (
                    <LinearGradient
                      key={index}
                      colors={isToday ? ['#d3f9d8', '#b2f2bb'] : ['#e7f5ff', '#d0ebff']}
                      style={[styles.dayChip, isToday && styles.todayDayChip]}
                    >
                      <MaterialCommunityIcons name={isToday ? "clock-alert" : "calendar"} size={12} 
                        color={isToday ? "#2b8a3e" : "#495057"} />
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
                      colors={isCurrent ? ['#e7f5ff', '#d0ebff'] : ['#f8f9fa', '#e9ecef']}
                      style={[styles.timeSlotCard, isCurrent && styles.currentTimeSlotCard]}
                    >
                      <View style={styles.timeSlotHeader}>
                        <MaterialCommunityIcons name={isCurrent ? "clock-check" : "clock"} size={18} 
                          color={isCurrent ? "#2b8a3e" : "#495057"} />
                        <Text style={[styles.timeSlotTime, isCurrent && styles.currentTimeSlotTime]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                        {slot.points !== undefined && slot.points > 0 && (
                          <LinearGradient colors={['#fff3bf', '#ffec99']} style={styles.slotPointsBadge}>
                            <Text style={styles.slotPointsText}>{slot.points} pts</Text>
                          </LinearGradient>
                        )}
                      </View>
                      {slot.label && <Text style={styles.timeSlotLabel}>{slot.label}</Text>}
                      {isCurrent && isSubmittable && (
                        <View style={styles.activeSlotIndicator}>
                          <MaterialCommunityIcons name="check-circle" size={12} color="#2b8a3e" />
                          <Text style={styles.activeSlotText}>Active - Can Submit</Text>
                        </View>
                      )}
                    </LinearGradient>
                  );
                })}
              </View>
              <Text style={styles.timeSlotNote}>ⓘ Submit within 30 minutes before/after time slot end</Text>
            </View>
          )}

          {isAdmin && renderAdminView()}

          {isAdmin && !isAdmin && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <LinearGradient colors={['#fff5f5', '#ffe3e3']} style={styles.deleteButtonGradient}>
                <MaterialCommunityIcons name="delete" size={18} color="#fa5252" />
                <Text style={styles.deleteButtonText}>Delete Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {!isAdmin && (
            <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.memberInfoBox}>
              <MaterialCommunityIcons name="information" size={18} color="#868e96" />
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