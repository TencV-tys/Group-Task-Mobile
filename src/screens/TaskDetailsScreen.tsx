// src/screens/TaskDetailsScreen.tsx - UPDATED with clean UI and dark gray primary
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Image,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TaskService } from '../services/TaskService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (taskId) fetchTaskDetails();
  }, [taskId]);

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
        
        // Get upcoming assignments (other people's tasks this week)
        if (processedTask.assignments) {
          const upcoming = processedTask.assignments.filter(
            (a: any) => 
              a.rotationWeek === currentWeek &&
              a.userId !== processedTask.userId
          );
          setUpcomingAssignments(upcoming);
        }
        
        // Get current week submissions for the current user
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
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
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
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentInMinutes = currentHour * 60 + currentMinute;
      
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

  const handleViewPhoto = (photoUrl: string) => {
    if (photoUrl) {
      Linking.openURL(photoUrl).catch(err => {
        Alert.alert('Error', 'Could not open image');
      });
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

  const getCompletionTimeText = (assignment: any) => {
    if (!assignment?.completed || !assignment?.completedAt) return '';
    
    const dueDate = new Date(assignment.dueDate);
    const completedAt = new Date(assignment.completedAt);
    const diffMs = completedAt.getTime() - dueDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return `${Math.abs(diffHours)} hours early`;
    } else if (diffHours === 0) {
      return "on time";
    } else {
      return `${diffHours} hours late`;
    }
  };

  const isAdminAssignedToTask = () => isAdmin && task?.userAssignment;
  const isDueToday = (dueDate: string) => {
    const today = new Date().toDateString();
    const due = new Date(dueDate).toDateString();
    return today === due;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={handleBack} 
        style={styles.backButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Task Details
        </Text>
      </View>
      
      {isAdmin && task && !isAdminAssignedToTask() ? (
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEdit}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#495057" />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );

  const renderMemberAssignmentSection = () => {
    if (!task?.userAssignment) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.notAssignedCard}
          >
            <MaterialCommunityIcons name="account-question" size={24} color="#868e96" />
            <Text style={styles.notAssignedText}>
              Not assigned to you this week
            </Text>
          </LinearGradient>
        </View>
      );
    }

    // Find today's assignment
    if (!todayAssignment) {
      // Find the next future assignment
      const futureAssignments = task?.assignments?.filter((a: any) => 
        a.userId === task?.userId && 
        new Date(a.dueDate) > new Date()
      ).sort((a: any, b: any) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      const nextAssignment = futureAssignments?.[0];

      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.notAssignedCard}
          >
            <MaterialCommunityIcons name="calendar" size={24} color="#868e96" />
            <Text style={styles.notAssignedText}>
              No assignment due today
            </Text>
            {nextAssignment ? (
              <Text style={styles.notAssignedSubtext}>
                Next: {new Date(nextAssignment.dueDate).toLocaleDateString()}
              </Text>
            ) : (
              <Text style={styles.notAssignedSubtext}>
                No upcoming assignments
              </Text>
            )}
          </LinearGradient>
        </View>
      );
    }

    // Check if today's assignment is neglected (overdue and not completed)
    const now = new Date();
    const dueDate = new Date(todayAssignment.dueDate);
    const isOverdue = now > dueDate && !todayAssignment.completed;
    
    // Check if it's within submission window
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
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.todayAssignmentBadge,
              isOverdue && styles.overdueBadge,
              todayAssignment.completed && styles.completedBadge
            ]}
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
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
              <Text style={[
                styles.todayAssignmentTitle,
                todayAssignment.completed && styles.completedTitle,
                isOverdue && styles.overdueTitle
              ]}>
                {task.title}
              </Text>
              <Text style={styles.assignmentDate}>
                Due: {new Date(todayAssignment.dueDate).toLocaleDateString()}
                {todayAssignment.timeSlot && ` • ${todayAssignment.timeSlot.startTime} - ${todayAssignment.timeSlot.endTime}`}
              </Text>
            </View>
          </View>
          
          {!todayAssignment.completed && !isOverdue && (
            <LinearGradient
              colors={[submissionStatusInfo.bgColor, submissionStatusInfo.bgColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.submissionStatusCard, { borderColor: submissionStatusInfo.borderColor }]}
            >
              <View style={styles.submissionStatusHeader}>
                <View style={[styles.statusIconContainer, { backgroundColor: submissionStatusInfo.color + '20' }]}>
                  <MaterialCommunityIcons 
                    name={submissionStatusInfo.icon as any} 
                    size={22} 
                    color={submissionStatusInfo.color} 
                  />
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
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.timerBadge, timeLeft < 300 && styles.urgentTimerBadge]}
                  >
                    <MaterialCommunityIcons 
                      name={timeLeft < 300 ? "timer-alert" : "timer"} 
                      size={16} 
                      color={timeLeft < 300 ? "#fa5252" : "#2b8a3e"} 
                    />
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
                  <LinearGradient
                    colors={['#fff3bf', '#ffec99']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.waitingBadge}
                  >
                    <MaterialCommunityIcons name="clock-start" size={16} color="#e67700" />
                    <Text style={styles.waitingText}>
                      Opens in {formatTimeLeft(timeLeft)}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </LinearGradient>
          )}

          {isOverdue && !todayAssignment.completed && (
            <LinearGradient
              colors={['#fff5f5', '#ffe3e3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.overdueInfoCard}
            >
              <MaterialCommunityIcons name="alert-circle" size={20} color="#fa5252" />
              <View style={styles.overdueInfoText}>
                <Text style={styles.overdueTitle}>Overdue</Text>
                <Text style={styles.overdueDate}>
                  Was due on {new Date(todayAssignment.dueDate).toLocaleDateString()}
                </Text>
                {todayAssignment.notes?.includes('NEGLECTED') && (
                  <Text style={styles.neglectedText}>
                    ⚠️ Point deduction applied
                  </Text>
                )}
              </View>
            </LinearGradient>
          )}
          
          {todayAssignment.completed && (
            <LinearGradient
              colors={['#d3f9d8', '#b2f2bb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.completedInfoCard}
            >
              <MaterialCommunityIcons name="check-circle" size={20} color="#2b8a3e" />
              <View style={styles.completedInfoText}>
                <Text style={styles.completedTitle}>Already Completed</Text>
                <Text style={styles.completedDate}>
                  Submitted: {new Date(todayAssignment.completedAt).toLocaleDateString()}
                </Text>
                {todayAssignment.notes?.includes('LATE') && (
                  <Text style={styles.lateText}>
                    ⚠️ Late submission (points reduced)
                  </Text>
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
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.notAssignedCard}
          >
            <MaterialCommunityIcons name="clipboard-text" size={24} color="#868e96" />
            <Text style={styles.notAssignedText}>
              No submissions yet this week
            </Text>
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
              style={[
                styles.submissionHistoryCard,
                dueToday && styles.todaySubmissionCard
              ]}
              onPress={() => handleViewAssignmentDetails(submission)}
              activeOpacity={0.7}
            >
              {dueToday && (
                <LinearGradient
                  colors={['#fa5252', '#e03131']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.todayBadge}
                >
                  <MaterialCommunityIcons name="clock-alert" size={12} color="#fff" />
                  <Text style={styles.todayBadgeText}>Due Today</Text>
                </LinearGradient>
              )}
              
              <View style={styles.submissionHistoryHeader}>
                <LinearGradient
                  colors={[status.color + '20', status.color + '10']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.statusIconSmall]}
                >
                  <MaterialCommunityIcons 
                    name={status.icon as any} 
                    size={16} 
                    color={status.color} 
                  />
                </LinearGradient>
                <View style={styles.submissionHistoryInfo}>
                  <Text style={[styles.submissionHistoryStatus, { color: status.color }]}>
                    {status.text}
                  </Text>
                  <Text style={styles.submissionHistoryDate}>
                    {new Date(submission.dueDate).toLocaleDateString()}
                    {submission.timeSlot && ` • ${submission.timeSlot.startTime} - ${submission.timeSlot.endTime}`}
                    {dueToday && <Text style={styles.todayText}> (Today)</Text>}
                  </Text>
                </View>
              </View>

              {submission.completedAt && (
                <Text style={styles.submittedDate}>
                  Submitted: {new Date(submission.completedAt).toLocaleDateString()} • {getCompletionTimeText(submission)}
                </Text>
              )}

              <View style={styles.submissionHistoryMeta}>
                {submission.photoUrl && (
                  <LinearGradient
                    colors={['#e7f5ff', '#d0ebff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.hasPhotoBadgeSmall}
                  >
                    <MaterialCommunityIcons name="image" size={12} color="#2b8a3e" />
                    <Text style={styles.hasPhotoTextSmall}>Photo</Text>
                  </LinearGradient>
                )}
                {submission.notes && (
                  <LinearGradient
                    colors={['#fff3bf', '#ffec99']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.hasNotesBadgeSmall}
                  >
                    <MaterialCommunityIcons name="note-text" size={12} color="#e67700" />
                    <Text style={styles.hasNotesTextSmall}>Notes</Text>
                  </LinearGradient>
                )}
                <Text style={styles.pointsEarned}>
                  +{submission.points} pts
                </Text>
              </View>

              {submission.adminNotes && status.status === 'rejected' && (
                <LinearGradient
                  colors={['#fff5f5', '#ffe3e3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminFeedbackPreview}
                >
                  <MaterialCommunityIcons name="message-alert" size={12} color="#fa5252" />
                  <Text style={styles.adminFeedbackPreviewText} numberOfLines={1}>
                    {submission.adminNotes}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ========== Current Week Info - Visible to ALL USERS ==========
  const renderWeekInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionIcon}
        >
          <MaterialCommunityIcons name="calendar-week" size={16} color="#495057" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Current Week</Text>
      </View>
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.weekInfoCard}
      >
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

  // ========== Upcoming Assignments - Visible to ALL USERS ==========
  const renderUpcomingAssignments = () => {
    if (upcomingAssignments.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <LinearGradient
            colors={['#fff3bf', '#ffec99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sectionIcon}
          >
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
              style={[
                styles.upcomingCard,
                dueToday && styles.todayUpcomingCard
              ]}
              onPress={() => handleViewAssignmentDetails(assignment)}
              activeOpacity={0.7}
            >
              {dueToday && (
                <LinearGradient
                  colors={['#e67700', '#cc5f00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.upcomingTodayBadge}
                >
                  <Text style={styles.upcomingTodayBadgeText}>Today</Text>
                </LinearGradient>
              )}
              <View style={styles.upcomingCardHeader}>
                <View style={styles.upcomingUserInfo}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.upcomingAvatar}
                  >
                    <Text style={styles.upcomingAvatarText}>
                      {assignment.user?.fullName?.charAt(0) || '?'}
                    </Text>
                  </LinearGradient>
                  <View style={styles.upcomingUserDetails}>
                    <Text style={styles.upcomingUserName}>
                      {assignment.user?.fullName || 'Unknown'}
                    </Text>
                    <Text style={styles.upcomingTaskName}>
                      {task.title}
                    </Text>
                  </View>
                </View>
                <LinearGradient
                  colors={[status.color + '20', status.color + '10']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.upcomingStatusBadge}
                >
                  <MaterialCommunityIcons name={status.icon as any} size={12} color={status.color} />
                  <Text style={[styles.upcomingStatusText, { color: status.color }]}>
                    {status.text}
                  </Text>
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
                  <Text style={styles.upcomingDetailText}>
                    {assignment.points} points
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderAdminAssignmentView = (assignment: any) => {
    const status = getVerificationStatus(assignment);
    const dueToday = isDueToday(assignment.dueDate);
    
    return (
      <TouchableOpacity
        key={assignment.id}
        style={[
          styles.adminAssignmentCard,
          dueToday && styles.todayAdminCard
        ]}
        onPress={() => handleViewAssignmentDetails(assignment)}
        activeOpacity={0.7}
      >
        {dueToday && (
          <LinearGradient
            colors={['#fa5252', '#e03131']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.todayAdminBadge}
          >
            <MaterialCommunityIcons name="clock-alert" size={10} color="#fff" />
            <Text style={styles.todayAdminBadgeText}>Due Today</Text>
          </LinearGradient>
        )}
        
        <View style={styles.adminAssignmentHeader}>
          <View style={styles.userInfo}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.userAvatar}
            >
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
          <LinearGradient
            colors={[status.color + '20', status.color + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statusBadge]}
          >
            <MaterialCommunityIcons name={status.icon as any} size={10} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </LinearGradient>
        </View>
        
        {assignment.completed && (
          <View style={styles.adminAssignmentDetails}>
            <Text style={styles.completedText}>
              Submitted: {new Date(assignment.completedAt).toLocaleDateString()}
            </Text>
            {assignment.photoUrl && (
              <LinearGradient
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hasPhotoBadge}
              >
                <MaterialCommunityIcons name="image" size={8} color="#2b8a3e" />
                <Text style={styles.hasPhotoText}>Photo</Text>
              </LinearGradient>
            )}
            {assignment.notes && (
              <LinearGradient
                colors={['#fff3bf', '#ffec99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hasNotesBadge}
              >
                <MaterialCommunityIcons name="note-text" size={8} color="#e67700" />
                <Text style={styles.hasNotesText}>Notes</Text>
              </LinearGradient>
            )}
          </View>
        )}
        
        {assignment.adminNotes && (
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.adminNotesPreview}
          >
            <Text style={styles.adminNotesPreviewText} numberOfLines={1}>
              {assignment.adminNotes}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchTaskDetails}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (!task) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-question" size={64} color="#dee2e6" />
          <Text style={styles.emptyText}>Task not found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.taskHeader}>
            <LinearGradient
              colors={['#e7f5ff', '#d0ebff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskIcon}
            >
              <MaterialCommunityIcons 
                name="format-list-checks" 
                size={24} 
                color="#2b8a3e" 
              />
            </LinearGradient>
            <View style={styles.taskTitleContainer}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <LinearGradient
                colors={['#fff3bf', '#ffec99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pointsBadge}
              >
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

          {/* WEEK INFO - VISIBLE TO EVERYONE */}
          {renderWeekInfo()}

          {renderMemberAssignmentSection()}
          
          {!isAdmin && renderMySubmissionsSection()}

          {/* UPCOMING ASSIGNMENTS - VISIBLE TO EVERYONE */}
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
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.dayChip,
                        isToday && styles.todayDayChip
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={isToday ? "clock-alert" : "calendar"} 
                        size={12} 
                        color={isToday ? "#2b8a3e" : "#495057"} 
                      />
                      <Text style={[
                        styles.dayText,
                        isToday && styles.todayDayText
                      ]}>
                        {day}
                      </Text>
                      {isToday && (
                        <Text style={styles.todayDayLabel}>Today</Text>
                      )}
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
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.timeSlotCard,
                        isCurrent && styles.currentTimeSlotCard
                      ]}
                    >
                      <View style={styles.timeSlotHeader}>
                        <MaterialCommunityIcons 
                          name={isCurrent ? "clock-check" : "clock"} 
                          size={18} 
                          color={isCurrent ? "#2b8a3e" : "#495057"} 
                        />
                        <Text style={[
                          styles.timeSlotTime,
                          isCurrent && styles.currentTimeSlotTime
                        ]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                        {slot.points !== undefined && slot.points > 0 && (
                          <LinearGradient
                            colors={['#fff3bf', '#ffec99']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.slotPointsBadge}
                          >
                            <Text style={styles.slotPointsText}>{slot.points} pts</Text>
                          </LinearGradient>
                        )}
                      </View>
                      {slot.label && (
                        <Text style={styles.timeSlotLabel}>{slot.label}</Text>
                      )}
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
              <Text style={styles.timeSlotNote}>
                ⓘ Submit within 30 minutes before/after time slot end
              </Text>
            </View>
          )}

          {/* ADMIN SECTION - ONLY FOR ADMINS */}
          {isAdmin && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="shield-account" size={16} color="#495057" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Admin View</Text>
              </View>
              
              <LinearGradient
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.adminInfoBox}
              >
                <MaterialCommunityIcons name="shield-account" size={18} color="#2b8a3e" />
                <View style={styles.adminInfoContent}>
                  <Text style={styles.adminInfoTitle}>Admin Information</Text>
                  <Text style={styles.adminInfoText}>
                    You have full control over this task. Click on assignments to verify/reject submissions.
                  </Text>
                </View>
              </LinearGradient>

              {task.currentAssignee && (
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.assigneeInfo}
                >
                  <Text style={styles.assigneeLabel}>Current Assignee:</Text>
                  <Text style={styles.assigneeValue}>
                    {task.assignments?.[0]?.user?.fullName || 'Unknown'} (Week {task.group?.currentRotationWeek || 1})
                  </Text>
                </LinearGradient>
              )}

              {task.rotationMembers && Array.isArray(task.rotationMembers) && (
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rotationInfo}
                >
                  <Text style={styles.rotationLabel}>Rotation Members:</Text>
                  <View style={styles.rotationMembersList}>
                    {task.rotationMembers.map((member: any, index: number) => (
                      <View key={member.userId} style={styles.rotationMemberItem}>
                        <LinearGradient
                          colors={member.userId === task.currentAssignee ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
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
                    .map((assignment: any, index: number) => 
                      renderAdminAssignmentView(assignment)
                    )}
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
          )}

          {isAdmin && !isAdminAssignedToTask() && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.deleteButtonGradient}
              >
                <MaterialCommunityIcons name="delete" size={18} color="#fa5252" />
                <Text style={styles.deleteButtonText}>Delete Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {!isAdmin && (
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.memberInfoBox}
            >
              <MaterialCommunityIcons name="information" size={18} color="#868e96" />
              <Text style={styles.memberInfoText}>
                Only group administrators can edit or delete tasks.
              </Text>
            </LinearGradient>
          )}
        </LinearGradient>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      {renderContent()}
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  editButton: {
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
  headerSpacer: {
    width: 36
  }, 
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80
  },
  loadingText: {
    marginTop: 12,
    color: '#868e96',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#fa5252',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 16,
    color: '#868e96',
    marginTop: 16,
    textAlign: 'center'
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  taskTitleContainer: {
    flex: 1
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 6
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 4
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529'
  },
  description: {
    fontSize: 14,
    color: '#868e96',
    lineHeight: 20
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  detailItem: {
    width: '48%'
  },
  detailLabel: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529'
  },
  // Week Info Styles
  weekInfoCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8
  },
  weekInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  weekInfoLabel: {
    fontSize: 13,
    color: '#868e96',
    width: 45
  },
  weekInfoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#212529',
    flex: 1
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  todayDayChip: {
    borderColor: '#2b8a3e',
  },
  dayText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500'
  },
  todayDayText: {
    color: '#2b8a3e',
    fontWeight: '700'
  },
  todayDayLabel: {
    fontSize: 9,
    color: '#2b8a3e',
    fontWeight: '600',
    backgroundColor: '#fff',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 2
  },
  timeSlotsContainer: {
    gap: 8
  },
  timeSlotCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currentTimeSlotCard: {
    borderColor: '#b2f2bb',
    borderWidth: 2,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  timeSlotTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    flex: 1
  },
  currentTimeSlotTime: {
    color: '#2b8a3e',
    fontWeight: '600'
  },
  slotPointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  slotPointsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e67700'
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#868e96',
    marginLeft: 26,
    marginBottom: 2
  },
  activeSlotIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d3f9d8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4
  },
  activeSlotText: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '500'
  },
  timeSlotNote: {
    fontSize: 11,
    color: '#868e96',
    fontStyle: 'italic',
    marginTop: 6
  },
  assignmentCard: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  assignmentInfo: {
    flex: 1
  },
  assignmentDate: {
    fontSize: 13,
    color: '#495057'
  },
  submissionStatusCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
  },
  submissionStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextContainer: {
    flex: 1,
  },
  submissionStatusLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  submissionStatusDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  timerContainer: {
    marginTop: 10,
    marginLeft: 50,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  normalTimerBadge: {},
  urgentTimerBadge: {},
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentMessage: {
    fontSize: 11,
    color: '#fa5252',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  waitingContainer: {
    marginTop: 10,
    marginLeft: 50,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  waitingText: {
    fontSize: 12,
    color: '#e67700',
    fontWeight: '600',
  },
  notAssignedCard: {
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    gap: 10
  },
  notAssignedText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center'
  },
  notAssignedSubtext: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 4
  },
  submissionHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative'
  },
  todaySubmissionCard: {
    borderColor: '#2b8a3e',
    borderWidth: 2,
  },
  todayBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
    zIndex: 1
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600'
  },
  submissionHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6
  },
  statusIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  submissionHistoryInfo: {
    flex: 1
  },
  submissionHistoryStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  submissionHistoryDate: {
    fontSize: 11,
    color: '#868e96'
  },
  todayText: {
    color: '#fa5252',
    fontWeight: '600'
  },
  submittedDate: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 6,
    marginLeft: 38
  },
  submissionHistoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 38,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  hasPhotoBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4
  },
  hasPhotoTextSmall: {
    fontSize: 10,
    color: '#2b8a3e'
  },
  hasNotesBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4
  },
  hasNotesTextSmall: {
    fontSize: 10,
    color: '#e67700'
  },
  pointsEarned: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 'auto'
  },
  adminFeedbackPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    marginLeft: 38,
    gap: 4
  },
  adminFeedbackPreviewText: {
    fontSize: 10,
    color: '#fa5252',
    flex: 1,
    fontStyle: 'italic'
  },
  // Upcoming Assignments Styles (for regular users)
  upcomingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative'
  },
  todayUpcomingCard: {
    borderColor: '#e67700',
    borderWidth: 2,
  },
  upcomingTodayBadge: {
    position: 'absolute',
    top: -6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1
  },
  upcomingTodayBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600'
  },
  upcomingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  upcomingUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1
  },
  upcomingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  upcomingAvatarText: {
    color: '#495057',
    fontSize: 12,
    fontWeight: 'bold'
  },
  upcomingUserDetails: {
    flex: 1
  },
  upcomingUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 1
  },
  upcomingTaskName: {
    fontSize: 11,
    color: '#868e96'
  },
  upcomingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4
  },
  upcomingStatusText: {
    fontSize: 9,
    fontWeight: '600'
  },
  upcomingDetails: {
    gap: 4,
    marginLeft: 34
  },
  upcomingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  upcomingDetailText: {
    fontSize: 11,
    color: '#868e96'
  },
  adminInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  adminInfoContent: {
    flex: 1
  },
  adminInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 2
  },
  adminInfoText: {
    fontSize: 12,
    color: '#2b8a3e',
    lineHeight: 16
  },
  assigneeInfo: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assigneeLabel: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 2
  },
  assigneeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529'
  },
  rotationInfo: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  rotationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  rotationMembersList: {
    gap: 6
  },
  rotationMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  rotationMemberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currentAssigneeAvatar: {
    borderColor: '#2b8a3e',
  },
  rotationMemberInitial: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  rotationMemberName: {
    fontSize: 13,
    color: '#495057'
  },
  currentAssigneeName: {
    fontWeight: '600',
    color: '#2b8a3e'
  },
  assignmentsContainer: {
    gap: 8
  },
  assignmentsSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4
  },
  adminAssignmentCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 6,
    position: 'relative'
  },
  todayAdminCard: {
    borderColor: '#2b8a3e',
    borderWidth: 2,
  },
  todayAdminBadge: {
    position: 'absolute',
    top: -6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    zIndex: 1
  },
  todayAdminBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600'
  },
  adminAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  userAvatarText: {
    color: '#495057',
    fontSize: 12,
    fontWeight: 'bold'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529'
  },
  assignmentDateSmall: {
    fontSize: 11,
    color: '#868e96'
  },
  todaySmallText: {
    color: '#fa5252',
    fontWeight: '600'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    maxWidth: 80,
    flexShrink: 1
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    flexShrink: 1
  },
  adminAssignmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap'
  },
  completedText: {
    fontSize: 11,
    color: '#868e96'
  },
  hasPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2
  },
  hasPhotoText: {
    fontSize: 8,
    color: '#2b8a3e'
  },
  hasNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2
  },
  hasNotesText: {
    fontSize: 8,
    color: '#e67700'
  },
  adminNotesPreview: {
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  adminNotesPreviewText: {
    fontSize: 10,
    color: '#868e96',
    fontStyle: 'italic'
  },
  moreAssignments: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic'
  },
  noAssignments: {
    fontSize: 12,
    color: '#868e96',
    fontStyle: 'italic'
  },
  memberInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  memberInfoText: {
    fontSize: 12,
    color: '#868e96',
    flex: 1
  },
  deleteButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 16,
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fa5252'
  },
  todayAssignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4
  },
  todayAssignmentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  todayAssignmentTitle: {
    color: '#fa5252',
    fontSize: 15,
    fontWeight: '600'
  },
  completedInfoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  completedInfoText: {
    flex: 1
  },
  completedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 1
  },
  completedDate: {
    fontSize: 11,
    color: '#2b8a3e'
  },
  viewDetailsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 4
  },
  viewDetailsText: {
    fontSize: 11,
    color: '#495057'
  },
  todayAssignmentCard: {
    borderWidth: 2,
    borderColor: '#fa5252',
  },
  overdueBadge: {
    backgroundColor: '#fa5252',
  },
  completedBadge: {
    backgroundColor: '#2b8a3e',
  },
  overdueCard: {
    borderWidth: 2,
    borderColor: '#fa5252',
  },
  completedCard: {
    borderWidth: 2,
    borderColor: '#2b8a3e',
  },
  overdueInfoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  overdueInfoText: {
    flex: 1,
  },
  overdueTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fa5252',
    marginBottom: 1,
  },
  overdueDate: {
    fontSize: 11,
    color: '#fa5252',
  },
  neglectedText: {
    fontSize: 10,
    color: '#fa5252',
    fontStyle: 'italic',
    marginTop: 2,
  },
  lateText: {
    fontSize: 10,
    color: '#e67700',
    fontStyle: 'italic',
    marginTop: 2,
  },
});