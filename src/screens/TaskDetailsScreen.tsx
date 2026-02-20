// src/screens/TaskDetailsScreen.tsx - UPDATED WITH CURRENT DAY PRIORITY
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
  const [todayAssignment, setTodayAssignment] = useState<any>(null); // NEW: Track today's assignment
  
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
        
        // Find today's assignment
        findTodayAssignment(processedTask);
        
        checkTimeValidity(processedTask);
        
        // Get current week number from group
        const currentWeek = processedTask.group?.currentRotationWeek || 1;
        
        // Filter ONLY current week submissions for the current user
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

  // NEW: Function to find today's assignment
  const findTodayAssignment = (taskData: any) => {
    if (!taskData.assignments || !taskData.userId) {
      setTodayAssignment(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find assignments due today for current user
    const todayAssignments = taskData.assignments.filter((a: any) => {
      if (a.userId !== taskData.userId) return false;
      
      const dueDate = new Date(a.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate.getTime() === today.getTime();
    });

    // If multiple today assignments, sort by time
    if (todayAssignments.length > 0) {
      todayAssignments.sort((a: any, b: any) => {
        const timeA = new Date(a.dueDate).getTime();
        const timeB = new Date(b.dueDate).getTime();
        return timeA - timeB;
      });
      
      setTodayAssignment(todayAssignments[0]); // Set the earliest one
    } else {
      setTodayAssignment(null);
    }
  };

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
    
    // SORT ASSIGNMENTS - Current day first, then future, then past
    if (taskData.assignments && taskData.assignments.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      taskData.assignments.sort((a: any, b: any) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        
        // Normalize to start of day for comparison
        const dayA = new Date(dateA);
        dayA.setHours(0, 0, 0, 0);
        
        const dayB = new Date(dateB);
        dayB.setHours(0, 0, 0, 0);
        
        // Check if each assignment is due today
        const isAToday = dayA.getTime() === today.getTime();
        const isBToday = dayB.getTime() === today.getTime();
        
        // Today's assignments come first
        if (isAToday && !isBToday) return -1;
        if (!isAToday && isBToday) return 1;
        
        // If both are today, sort by time (earlier first)
        if (isAToday && isBToday) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // Future assignments come next (sorted by date)
        const isAFuture = dayA.getTime() >= today.getTime();
        const isBFuture = dayB.getTime() >= today.getTime();
        
        if (isAFuture && !isBFuture) return -1;
        if (!isAFuture && isBFuture) return 1;
        
        // Both future - sort ascending
        if (isAFuture && isBFuture) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // Both past - sort descending (most recent first)
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
          label: '✓ AVAILABLE TO SUBMIT',
          color: '#2b8a3e',
          bgColor: '#d3f9d8',
          borderColor: '#8ce99a',
          icon: 'check-circle',
          description: 'You can submit your completion now',
          buttonText: 'Complete Assignment',
          canSubmit: true
        };
      case 'waiting':
        return {
          label: '⏳ WAITING FOR SUBMISSION WINDOW',
          color: '#e67700',
          bgColor: '#fff3bf',
          borderColor: '#ffd43b',
          icon: 'clock',
          description: timeLeft && timeLeft > 0 
            ? `Submission opens in ${formatTimeLeft(timeLeft)}` 
            : 'Submit within 30 minutes before/after time slot',
          buttonText: 'Waiting for Submission Window',
          canSubmit: false
        };
      case 'expired':
        return {
          label: '❌ SUBMISSION CLOSED',
          color: '#fa5252',
          bgColor: '#ffc9c9',
          borderColor: '#ff8787',
          icon: 'timer-off',
          description: 'The 30-minute submission window has expired',
          buttonText: 'Submission Closed',
          canSubmit: false
        };
      case 'wrong_day':
        return {
          label: '📅 NOT DUE TODAY',
          color: '#6c757d',
          bgColor: '#f1f3f5',
          borderColor: '#dee2e6',
          icon: 'calendar',
          description: task?.userAssignment 
            ? `Due on ${new Date(task.userAssignment.dueDate).toLocaleDateString()}`
            : 'This assignment is not due today',
          buttonText: 'Not Due Today',
          canSubmit: false
        };
      case 'completed':
        return {
          label: '✓ ALREADY COMPLETED',
          color: '#2b8a3e',
          bgColor: '#d3f9d8',
          borderColor: '#8ce99a',
          icon: 'check-circle',
          description: 'You have already submitted this assignment',
          buttonText: 'Already Completed',
          canSubmit: false
        };
      default:
        return {
          label: '⏳ CHECKING STATUS...',
          color: '#6c757d',
          bgColor: '#f1f3f5',
          borderColor: '#dee2e6',
          icon: 'clock',
          description: 'Verifying submission availability',
          buttonText: 'Checking...',
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

  // Helper to check if assignment is due today
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
        <Text style={styles.backButtonText}>←</Text>
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
          <MaterialCommunityIcons name="pencil" size={24} color="#007AFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );// src/screens/TaskDetailsScreen.tsx - FIXED to show ONLY today's assignment

const renderMemberAssignmentSection = () => {
  if (!task?.userAssignment) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Assignment</Text>
        <View style={styles.notAssignedCard}>
          <MaterialCommunityIcons name="account-question" size={24} color="#868e96" />
          <Text style={styles.notAssignedText}>
            Not assigned to you this week
          </Text>
        </View>
      </View>
    );
  }

  // Check if today's assignment exists
  if (!todayAssignment) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Assignment</Text>
        <View style={styles.notAssignedCard}>
          <MaterialCommunityIcons name="calendar" size={24} color="#868e96" />
          <Text style={styles.notAssignedText}>
            No assignment due today
          </Text>
          <Text style={styles.notAssignedSubtext}>
            Your next assignment is on {new Date(task.userAssignment.dueDate).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  }

  const submissionStatusInfo = getSubmissionStatusInfo();

  return (
    <TouchableOpacity 
      style={styles.section}
      onPress={() => handleViewAssignmentDetails(todayAssignment)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Assignment</Text>
        <View style={styles.todayAssignmentBadge}>
          <MaterialCommunityIcons name="clock-alert" size={12} color="#fff" />
          <Text style={styles.todayAssignmentBadgeText}>Due Today</Text>
        </View>
      </View>
      
      <View style={[styles.assignmentCard, styles.todayAssignmentCard]}>
        <View style={styles.assignmentHeader}>
          <MaterialCommunityIcons 
            name="clock-alert" 
            size={24} 
            color="#fa5252" 
          />
          <View style={styles.assignmentInfo}>
            <Text style={styles.todayAssignmentTitle}>
              {task.title}
            </Text>
            <Text style={styles.assignmentDate}>
              Due: {new Date(todayAssignment.dueDate).toLocaleDateString()}
              {todayAssignment.timeSlot && ` • ${todayAssignment.timeSlot.startTime} - ${todayAssignment.timeSlot.endTime}`}
            </Text>
          </View>
        </View>
        
        {!todayAssignment.completed && (
          <View style={[styles.submissionStatusCard, { 
            backgroundColor: submissionStatusInfo.bgColor,
            borderColor: submissionStatusInfo.borderColor 
          }]}>
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
                <View style={[styles.timerBadge, timeLeft < 300 ? styles.urgentTimerBadge : styles.normalTimerBadge]}>
                  <MaterialCommunityIcons 
                    name={timeLeft < 300 ? "timer-alert" : "timer"} 
                    size={16} 
                    color={timeLeft < 300 ? "#fa5252" : "#2b8a3e"} 
                  />
                  <Text style={[styles.timerText, { color: timeLeft < 300 ? "#fa5252" : "#2b8a3e" }]}>
                    {formatTimeLeft(timeLeft)} remaining
                  </Text>
                </View>
                {timeLeft < 300 && (
                  <Text style={styles.urgentMessage}>Submit now! Grace period ending soon.</Text>
                )}
              </View>
            )}
            
            {submissionStatus === 'waiting' && timeLeft !== null && timeLeft > 0 && (
              <View style={styles.waitingContainer}>
                <View style={styles.waitingBadge}>
                  <MaterialCommunityIcons name="clock-start" size={16} color="#e67700" />
                  <Text style={styles.waitingText}>
                    Opens in {formatTimeLeft(timeLeft)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {todayAssignment.completed && (
          <View style={styles.completedInfoCard}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#2b8a3e" />
            <View style={styles.completedInfoText}>
              <Text style={styles.completedTitle}>Already Completed</Text>
              <Text style={styles.completedDate}>
                Submitted on: {new Date(todayAssignment.completedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.viewDetailsIndicator}>
          <Text style={styles.viewDetailsText}>Tap to view full details</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#007AFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
};
  const renderMySubmissionsSection = () => {
    if (currentWeekSubmissions.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Submissions This Week</Text>
          <View style={styles.notAssignedCard}>
            <MaterialCommunityIcons name="clipboard-text" size={24} color="#868e96" />
            <Text style={styles.notAssignedText}>
              No submissions yet this week
            </Text>
          </View>
        </View>
      );
    }

    // Sort submissions: today's first, then recent
    const sortedSubmissions = [...currentWeekSubmissions].sort((a: any, b: any) => {
      const isAToday = isDueToday(a.dueDate);
      const isBToday = isDueToday(b.dueDate);
      
      if (isAToday && !isBToday) return -1;
      if (!isAToday && isBToday) return 1;
      
      // If both today, sort by time
      if (isAToday && isBToday) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      // Otherwise sort by most recent first
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
                <View style={styles.todayBadge}>
                  <MaterialCommunityIcons name="clock-alert" size={12} color="#fff" />
                  <Text style={styles.todayBadgeText}>Due Today</Text>
                </View>
              )}
              
              <View style={styles.submissionHistoryHeader}>
                <View style={[styles.statusIconSmall, { backgroundColor: status.color + '20' }]}>
                  <MaterialCommunityIcons 
                    name={status.icon as any} 
                    size={16} 
                    color={status.color} 
                  />
                </View>
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
                  <View style={styles.hasPhotoBadgeSmall}>
                    <MaterialCommunityIcons name="image" size={12} color="#007AFF" />
                    <Text style={styles.hasPhotoTextSmall}>Photo</Text>
                  </View>
                )}
                {submission.notes && (
                  <View style={styles.hasNotesBadgeSmall}>
                    <MaterialCommunityIcons name="note-text" size={12} color="#e67700" />
                    <Text style={styles.hasNotesTextSmall}>Notes</Text>
                  </View>
                )}
                <Text style={styles.pointsEarned}>
                  +{submission.points} pts
                </Text>
              </View>

              {submission.adminNotes && status.status === 'rejected' && (
                <View style={styles.adminFeedbackPreview}>
                  <MaterialCommunityIcons name="message-alert" size={12} color="#fa5252" />
                  <Text style={styles.adminFeedbackPreviewText} numberOfLines={1}>
                    {submission.adminNotes}
                  </Text>
                </View>
              )}
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
          <View style={styles.todayAdminBadge}>
            <MaterialCommunityIcons name="clock-alert" size={10} color="#fff" />
            <Text style={styles.todayAdminBadgeText}>Due Today</Text>
          </View>
        )}
        
        <View style={styles.adminAssignmentHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              {assignment.user?.avatarUrl ? (
                <Image source={{ uri: assignment.user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.userAvatarText}>
                  {assignment.user?.fullName?.charAt(0) || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{assignment.user?.fullName || 'Unknown User'}</Text>
              <Text style={styles.assignmentDateSmall}>
                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                {assignment.rotationWeek && ` • Week ${assignment.rotationWeek}`}
                {dueToday && <Text style={styles.todaySmallText}> (Today)</Text>}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <MaterialCommunityIcons name={status.icon as any} size={10} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>
        
        {assignment.completed && (
          <View style={styles.adminAssignmentDetails}>
            <Text style={styles.completedText}>
              Submitted: {new Date(assignment.completedAt).toLocaleDateString()}
            </Text>
            {assignment.photoUrl && (
              <View style={styles.hasPhotoBadge}>
                <MaterialCommunityIcons name="image" size={8} color="#007AFF" />
                <Text style={styles.hasPhotoText}>Photo</Text>
              </View>
            )}
            {assignment.notes && (
              <View style={styles.hasNotesBadge}>
                <MaterialCommunityIcons name="note-text" size={8} color="#e67700" />
                <Text style={styles.hasNotesText}>Notes</Text>
              </View>
            )}
          </View>
        )}
        
        {assignment.adminNotes && (
          <View style={styles.adminNotesPreview}>
            <Text style={styles.adminNotesPreviewText} numberOfLines={1}>
              {assignment.adminNotes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchTaskDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
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
        <View style={styles.card}>
          <View style={styles.taskHeader}>
            <View style={styles.taskIcon}>
              <MaterialCommunityIcons 
                name="format-list-checks" 
                size={24} 
                color="#007AFF" 
              />
            </View>
            <View style={styles.taskTitleContainer}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star" size={16} color="#e67700" />
                <Text style={styles.pointsText}>{task.points} points</Text>
              </View>
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
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Current Week</Text>
              <Text style={styles.detailValue}>Week {task.group?.currentRotationWeek || 1}</Text>
            </View>
          </View>

          {renderMemberAssignmentSection()}
          
          {!isAdmin && renderMySubmissionsSection()}

          {task.executionFrequency === 'WEEKLY' && task.selectedDays?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scheduled Days</Text>
              <View style={styles.daysContainer}>
                {task.selectedDays.map((day: string, index: number) => {
                  const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.dayChip,
                        isToday && styles.todayDayChip
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={isToday ? "clock-alert" : "calendar"} 
                        size={14} 
                        color={isToday ? "#2b8a3e" : "#1864ab"} 
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
                    </View>
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
                    <View 
                      key={index} 
                      style={[
                        styles.timeSlotCard,
                        isCurrent && styles.currentTimeSlotCard
                      ]}
                    >
                      <View style={styles.timeSlotHeader}>
                        <MaterialCommunityIcons 
                          name={isCurrent ? "clock-check" : "clock"} 
                          size={20} 
                          color={isCurrent ? "#2b8a3e" : "#007AFF"} 
                        />
                        <Text style={[
                          styles.timeSlotTime,
                          isCurrent && styles.currentTimeSlotTime
                        ]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                        {slot.points !== undefined && slot.points > 0 && (
                          <View style={styles.slotPointsBadge}>
                            <Text style={styles.slotPointsText}>{slot.points} pts</Text>
                          </View>
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
                    </View>
                  );
                })}
              </View>
              <Text style={styles.timeSlotNote}>
                ⓘ Submit within 30 minutes before/after time slot end
              </Text>
            </View>
          )}

          {isAdmin && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assignments & Rotation</Text>
              
              <View style={styles.adminInfoBox}>
                <MaterialCommunityIcons name="shield-account" size={20} color="#007AFF" />
                <View style={styles.adminInfoContent}>
                  <Text style={styles.adminInfoTitle}>Admin Information</Text>
                  <Text style={styles.adminInfoText}>
                    You have full control over this task. You can edit, delete, or reassign it. Click on assignments to verify/reject submissions.
                  </Text>
                </View>
              </View>

              {task.currentAssignee && (
                <View style={styles.assigneeInfo}>
                  <Text style={styles.assigneeLabel}>Current Assignee:</Text>
                  <Text style={styles.assigneeValue}>
                    {task.assignments?.[0]?.user?.fullName || 'Unknown'} (Week {task.group?.currentRotationWeek || 1})
                  </Text>
                </View>
              )}

              {task.rotationMembers && Array.isArray(task.rotationMembers) && (
                <View style={styles.rotationInfo}>
                  <Text style={styles.rotationLabel}>Rotation Members:</Text>
                  <View style={styles.rotationMembersList}>
                    {task.rotationMembers.map((member: any, index: number) => (
                      <View key={member.userId} style={styles.rotationMemberItem}>
                        <View style={[
                          styles.rotationMemberAvatar,
                          member.userId === task.currentAssignee && styles.currentAssigneeAvatar
                        ]}>
                          <Text style={styles.rotationMemberInitial}>
                            {member.fullName?.charAt(0) || '?'}
                          </Text>
                        </View>
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
                </View>
              )}

              {task.assignments?.length > 0 ? (
                <View style={styles.assignmentsContainer}>
                  <Text style={styles.assignmentsSubtitle}>Recent Assignments (Current Week):</Text>
                  {task.assignments
                    .filter((a: any) => a.rotationWeek === (task.group?.currentRotationWeek || 1))
                    .slice(0, 5)
                    .map((assignment: any, index: number) => 
                      renderAdminAssignmentView(assignment)
                    )}
                  {task.assignments.filter((a: any) => a.rotationWeek === (task.group?.currentRotationWeek || 1)).length > 5 && (
                    <Text style={styles.moreAssignments}>
                      +{task.assignments.filter((a: any) => a.rotationWeek === (task.group?.currentRotationWeek || 1)).length - 5} more assignments
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
              <MaterialCommunityIcons name="delete" size={20} color="#fa5252" />
              <Text style={styles.deleteButtonText}>Delete Task</Text>
            </TouchableOpacity>
          )}

          {!isAdmin && (
            <View style={styles.memberInfoBox}>
              <MaterialCommunityIcons name="information" size={20} color="#6c757d" />
              <Text style={styles.memberInfoText}>
                Only group administrators can edit or delete tasks.
              </Text>
            </View>
          )}
        </View>
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

// [ALL STYLES FROM YOUR ORIGINAL FILE PLUS THESE NEW STYLES]
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
    borderBottomColor: '#e9ecef',
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '400'
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f8f9fa'
  },
  headerSpacer: {
    width: 40
  }, 
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
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
    fontSize: 18,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center'
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
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
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  taskIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e7f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  taskTitleContainer: {
    flex: 1
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 6
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12
  },
  description: {
    fontSize: 15,
    color: '#6c757d',
    lineHeight: 22
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24
  },
  detailItem: {
    width: '48%'
  },
  detailLabel: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 4
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529'
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6
  },
  todayDayChip: {
    backgroundColor: '#d3f9d8',
    borderWidth: 1,
    borderColor: '#2b8a3e',
  },
  dayText: {
    fontSize: 14,
    color: '#1864ab',
    fontWeight: '500'
  },
  todayDayText: {
    color: '#2b8a3e',
    fontWeight: '700'
  },
  todayDayLabel: {
    fontSize: 10,
    color: '#2b8a3e',
    fontWeight: '600',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4
  },
  timeSlotsContainer: {
    gap: 12
  },
  timeSlotCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  currentTimeSlotCard: {
    backgroundColor: '#e7f5ff',
    borderColor: '#a5d8ff',
    borderWidth: 2
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  timeSlotTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    flex: 1
  },
  currentTimeSlotTime: {
    color: '#1864ab',
    fontWeight: '600'
  },
  slotPointsBadge: {
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  slotPointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e67700'
  },
  timeSlotLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 28,
    marginBottom: 4
  },
  activeSlotIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d3f9d8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4
  },
  activeSlotText: {
    fontSize: 12,
    color: '#2b8a3e',
    fontWeight: '500'
  },
  timeSlotNote: {
    fontSize: 12,
    color: '#868e96',
    fontStyle: 'italic',
    marginTop: 8
  },
  // Assignment Section
  assignmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  assignmentInfo: {
    flex: 1
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1864ab',
    marginBottom: 4
  },
  assignmentDate: {
    fontSize: 14,
    color: '#495057'
  },
  // Submission Status Styles
  submissionStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  submissionStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextContainer: {
    flex: 1,
  },
  submissionStatusLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  submissionStatusDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  timerContainer: {
    marginTop: 12,
    marginLeft: 56,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  normalTimerBadge: {
    backgroundColor: '#d3f9d8',
  },
  urgentTimerBadge: {
    backgroundColor: '#ffc9c9',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  urgentMessage: {
    fontSize: 13,
    color: '#fa5252',
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  waitingContainer: {
    marginTop: 12,
    marginLeft: 56,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  waitingText: {
    fontSize: 14,
    color: '#e67700',
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  completeButtonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  completeButtonSubtext: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButtonContainer: {
    marginTop: 8,
  },
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f1f3f5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  disabledButtonText: {
    color: '#868e96',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonHint: {
    fontSize: 13,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#d0ebff',
    borderRadius: 6
  },
  adminNoteText: {
    fontSize: 14,
    color: '#1864ab',
    fontWeight: '500'
  },
  notAssignedCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    gap: 12
  },
  notAssignedText: {
    fontSize: 16,
    color: '#868e96',
    textAlign: 'center'
  },
  // Submission History Styles
  submissionHistoryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative'
  },
  todaySubmissionCard: {
    backgroundColor: '#d3f9d8',
    borderColor: '#2b8a3e',
    borderWidth: 2
  },
  todayBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#fa5252',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    zIndex: 1
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  submissionHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2
  },
  submissionHistoryDate: {
    fontSize: 12,
    color: '#6c757d'
  },
  todayText: {
    color: '#fa5252',
    fontWeight: '700'
  },
  submittedDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
    marginLeft: 38
  },
  submissionHistoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 38,
    marginTop: 4
  },
  hasPhotoBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4
  },
  hasPhotoTextSmall: {
    fontSize: 11,
    color: '#007AFF'
  },
  hasNotesBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4
  },
  hasNotesTextSmall: {
    fontSize: 11,
    color: '#e67700'
  },
  pointsEarned: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 'auto'
  },
  adminFeedbackPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    marginLeft: 38,
    gap: 6
  },
  adminFeedbackPreviewText: {
    fontSize: 11,
    color: '#fa5252',
    flex: 1,
    fontStyle: 'italic'
  },
  // Admin View Styles
  adminInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12
  },
  adminInfoContent: {
    flex: 1
  },
  adminInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1864ab',
    marginBottom: 4
  },
  adminInfoText: {
    fontSize: 13,
    color: '#1864ab',
    lineHeight: 18
  },
  assigneeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assigneeLabel: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 4
  },
  assigneeValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529'
  },
  rotationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  rotationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  rotationMembersList: {
    gap: 8
  },
  rotationMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  rotationMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center'
  },
  currentAssigneeAvatar: {
    backgroundColor: '#007AFF'
  },
  rotationMemberInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  rotationMemberName: {
    fontSize: 14,
    color: '#495057'
  },
  currentAssigneeName: {
    fontWeight: '600',
    color: '#007AFF'
  },
  assignmentsContainer: {
    gap: 12
  },
  assignmentsSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  adminAssignmentCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
    position: 'relative'
  },
  todayAdminCard: {
    backgroundColor: '#d3f9d8',
    borderColor: '#2b8a3e',
    borderWidth: 2
  },
  todayAdminBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#fa5252',
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
    fontSize: 9,
    fontWeight: '600'
  },
  adminAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  userAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529'
  },
  assignmentDateSmall: {
    fontSize: 12,
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
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    maxWidth: 100,
    flexShrink: 1
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1
  },
  adminAssignmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap'
  },
  completedText: {
    fontSize: 12,
    color: '#6c757d'
  },
  hasPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4
  },
  hasPhotoText: {
    fontSize: 10,
    color: '#007AFF'
  },
  hasNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4
  },
  hasNotesText: {
    fontSize: 10,
    color: '#e67700'
  },
  adminNotesPreview: {
    backgroundColor: '#f8f9fa',
    padding: 6,
    borderRadius: 6,
    marginTop: 8
  },
  adminNotesPreviewText: {
    fontSize: 11,
    color: '#868e96',
    fontStyle: 'italic'
  },
  moreAssignments: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  },
  noAssignments: {
    fontSize: 14,
    color: '#868e96',
    fontStyle: 'italic'
  },
  memberInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 12
  },
  memberInfoText: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc9c9',
    marginTop: 16
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fa5252'
  },
   sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  todayAssignmentBadge: {
    backgroundColor: '#fa5252',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4
  },
  todayAssignmentBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },
  todayAssignmentTitle: {
    color: '#fa5252'
  },
  todayHighlight: {
    color: '#fa5252',
    fontWeight: '700'
  },
  completedInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#d3f9d8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 12,
    alignItems: 'center'
  },
  completedInfoText: {
    flex: 1
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 2
  },
  completedDate: {
    fontSize: 12,
    color: '#2b8a3e'
  },
  viewDetailsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 4
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#007AFF'
  },
  todayAssignmentCard: {
  borderWidth: 2,
  borderColor: '#fa5252',
  backgroundColor: '#fff5f5'
},
notAssignedSubtext: {
  fontSize: 13,
  color: '#adb5bd',
  textAlign: 'center',
  marginTop: 8
}
}); 