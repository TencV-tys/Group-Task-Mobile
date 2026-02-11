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
import { TaskService } from '../taskServices/TaskService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TaskDetailsScreen({ navigation, route }: any) {
  const { taskId, groupId, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmittable, setIsSubmittable] = useState(false);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<any>(null);
  
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (taskId) fetchTaskDetails();
  }, [taskId]);

  useEffect(() => {
    if (task?.userAssignment && !task.userAssignment.completed) {
      startCountdownTimer();
    }
  }, [task]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await TaskService.getTaskDetails(taskId);
      if (result.success) {
        const processedTask = processTaskData(result.task);
        setTask(processedTask);
        checkTimeValidity(processedTask);
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

  const processTaskData = (taskData: any) => {
    // Sort time slots by start time
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
    
    // Sort assignments by due date (newest first)
    if (taskData.assignments && taskData.assignments.length > 0) {
      taskData.assignments.sort((a: any, b: any) => 
        new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      );
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
      return;
    }

    const now = new Date();
    const assignmentDate = new Date(taskData.userAssignment.dueDate);
    const today = now.toDateString();
    const assignmentDay = assignmentDate.toDateString();
    
    if (today !== assignmentDay) {
      setIsSubmittable(false);
      setCurrentTimeSlot(null);
      return;
    }

    if (taskData.userAssignment.timeSlot) {
      const [startHour, startMinute] = taskData.userAssignment.timeSlot.startTime.split(':').map(Number);
      const [endHour, endMinute] = taskData.userAssignment.timeSlot.endTime.split(':').map(Number);
      
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentInMinutes = currentHour * 60 + currentMinute;
      const startInMinutes = startHour * 60 + startMinute;
      const endInMinutes = endHour * 60 + endMinute;
      
      // Check current time against all time slots
      let activeSlot = null;
      if (taskData.timeSlots) {
        for (const slot of taskData.timeSlots) {
          const slotStart = convertTimeToMinutes(slot.startTime);
          const slotEnd = convertTimeToMinutes(slot.endTime);
          const graceEnd = slotEnd + 30; // 30 minutes grace period
          
          if (currentInMinutes >= slotStart && currentInMinutes <= graceEnd) {
            activeSlot = slot;
            const timeLeftMs = (graceEnd - currentInMinutes) * 60000;
            setTimeLeft(Math.max(0, Math.floor(timeLeftMs / 1000)));
            
            // Can submit from 30 minutes before end time until grace period ends
            const canSubmitStart = slotEnd - 30;
            setIsSubmittable(currentInMinutes >= canSubmitStart && currentInMinutes <= graceEnd);
            break;
          }
        }
      }
      
      setCurrentTimeSlot(activeSlot || taskData.userAssignment.timeSlot);
      
      if (!activeSlot) {
        setIsSubmittable(false);
        // Check if we're before first slot or after last slot
        if (taskData.timeSlots && taskData.timeSlots.length > 0) {
          const firstSlotStart = convertTimeToMinutes(taskData.timeSlots[0].startTime);
          const lastSlotEnd = convertTimeToMinutes(taskData.timeSlots[taskData.timeSlots.length - 1].endTime) + 30;
          
          if (currentInMinutes < firstSlotStart) {
            const timeUntilFirstSlot = (firstSlotStart - currentInMinutes) * 60000;
            setTimeLeft(Math.floor(timeUntilFirstSlot / 1000));
          } else if (currentInMinutes > lastSlotEnd) {
            setTimeLeft(0);
          }
        }
      }
    } else {
      setIsSubmittable(true);
      setCurrentTimeSlot(null);
    }
  };

  const startCountdownTimer = () => {
    const timer = setInterval(() => {
      if (timeLeft !== null && timeLeft > 0) {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      } else if (timeLeft === 0) {
        setIsSubmittable(false);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  };

  const formatTimeLeft = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      return `${mins}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTimeStatus = () => {
    if (timeLeft === null) return null;
    
    if (timeLeft === 0) return { text: 'Time expired', color: '#fa5252', icon: 'timer-off' };
    if (timeLeft < 300) return { text: `${formatTimeLeft(timeLeft)} left`, color: '#fa5252', icon: 'timer-alert' };
    if (timeLeft < 1800) return { text: `${formatTimeLeft(timeLeft)} left`, color: '#e67700', icon: 'timer' };
    return { text: `${formatTimeLeft(timeLeft)} left`, color: '#2b8a3e', icon: 'timer' };
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
    if (!task?.userAssignment || !isSubmittable) return;
    
    navigation.navigate('CompleteAssignment', {
      assignmentId: task.userAssignment.id,
      taskTitle: task.title,
      dueDate: task.userAssignment.dueDate,
      timeSlot: currentTimeSlot || task.userAssignment.timeSlot,
      onCompleted: fetchTaskDetails
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
    if (!assignment?.completed) return { 
      status: 'pending', 
      color: '#e67700', 
      icon: 'clock-outline',
      text: 'Pending'
    };
    
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
      text: 'Awaiting Verification'
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
  );

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

    const status = getVerificationStatus(task.userAssignment);

    if (!task.userAssignment.completed) {
      const timeStatus = getTimeStatus();
      const isToday = new Date().toDateString() === new Date(task.userAssignment.dueDate).toDateString();
      const hasTimeSlot = task.userAssignment.timeSlot || (task.timeSlots && task.timeSlots.length > 0);
      
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <MaterialCommunityIcons name="account-clock" size={24} color="#e67700" />
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentTitle}>Assigned to You</Text>
                <Text style={styles.assignmentDate}>
                  Due: {new Date(task.userAssignment.dueDate).toLocaleDateString()}
                  {task.userAssignment.timeSlot && ` • ${task.userAssignment.timeSlot.startTime} - ${task.userAssignment.timeSlot.endTime}`}
                </Text>
              </View>
            </View>
            
            {/* Time Information */}
            {isToday && hasTimeSlot && (
              <View style={styles.timeInfoSection}>
                <View style={styles.timeInfoHeader}>
                  <MaterialCommunityIcons name="clock-alert" size={16} color="#e67700" />
                  <Text style={styles.timeInfoTitle}>Submission Window</Text>
                </View>
                <Text style={styles.timeInfoText}>
                  Submit within 30 minutes of time slot end
                </Text>
                
                {timeStatus && (
                  <View style={[
                    styles.timerContainer,
                    { backgroundColor: `${timeStatus.color}15` }
                  ]}>
                    <MaterialCommunityIcons 
                      name={timeStatus.icon as any} 
                      size={14} 
                      color={timeStatus.color} 
                    />
                    <Text style={[styles.timerText, { color: timeStatus.color }]}>
                      {timeStatus.text}
                    </Text>
                  </View>
                )}
                
                {currentTimeSlot && (
                  <View style={styles.currentSlotInfo}>
                    <Text style={styles.currentSlotLabel}>Current Slot:</Text>
                    <Text style={styles.currentSlotTime}>
                      {currentTimeSlot.startTime} - {currentTimeSlot.endTime}
                      {currentTimeSlot.label && ` (${currentTimeSlot.label})`}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Complete Button */}
            {isSubmittable ? (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={handleCompleteAssignment}
                activeOpacity={0.8}
              >
                <View style={styles.completeButtonContent}>
                  <MaterialCommunityIcons name="check-circle" size={22} color="white" />
                  <Text style={styles.completeButtonText}>Mark as Complete</Text>
                </View>
                {timeStatus && timeLeft && timeLeft < 600 && (
                  <Text style={styles.completeButtonSubtext}>
                    Submit before time runs out!
                  </Text>
                )}
              </TouchableOpacity>
            ) : isToday ? (
              <View style={styles.disabledCard}>
                <MaterialCommunityIcons name="clock-alert" size={24} color="#868e96" />
                <View style={styles.disabledInfo}>
                  <Text style={styles.disabledTitle}>Submission Closed</Text>
                  <Text style={styles.disabledText}>
                    {hasTimeSlot 
                      ? 'Submit during allowed time window (30 min before/after slot)'
                      : 'Cannot submit at this time'
                    }
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.futureCard}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color="#1864ab" />
                <View style={styles.futureInfo}>
                  <Text style={styles.futureTitle}>Available Soon</Text>
                  <Text style={styles.futureText}>
                    This assignment will be available on the due date
                  </Text>
                </View>
              </View>
            )}
            
            {isAdmin && (
              <View style={styles.adminNote}>
                <MaterialCommunityIcons name="shield-account" size={16} color="#007AFF" />
                <Text style={styles.adminNoteText}>
                  You're completing this as an admin
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Submission</Text>
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <MaterialCommunityIcons 
              name={status.icon as any} 
              size={24} 
              color={status.color} 
            />
            <View style={styles.completionInfo}>
              <Text style={[styles.completionTitle, { color: status.color }]}>
                {status.text}
              </Text>
              <Text style={styles.completionDate}>
                Completed: {new Date(task.userAssignment.completedAt).toLocaleDateString()}
                {getCompletionTimeText(task.userAssignment) && ` • ${getCompletionTimeText(task.userAssignment)}`}
              </Text>
            </View>
          </View>
          
          {task.userAssignment.photoUrl && (
            <TouchableOpacity
              style={styles.photoPreview}
              onPress={() => handleViewPhoto(task.userAssignment.photoUrl)}
            >
              <View style={styles.photoPreviewContent}>
                <MaterialCommunityIcons name="image" size={20} color="#007AFF" />
                <Text style={styles.viewPhotoText}>View Submitted Photo</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {task.userAssignment.notes && (
            <View style={styles.userNotesCard}>
              <Text style={styles.notesTitle}>Your Notes:</Text>
              <Text style={styles.notesText}>{task.userAssignment.notes}</Text>
            </View>
          )}
          
          {task.userAssignment.adminNotes && status.status === 'rejected' && (
            <View style={styles.adminFeedbackCard}>
              <Text style={styles.adminFeedbackTitle}>Admin Feedback:</Text>
              <Text style={styles.adminFeedbackText}>{task.userAssignment.adminNotes}</Text>
            </View>
          )}
          
          {status.status === 'pending_verification' && (
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information" size={16} color="#6c757d" />
              <Text style={styles.infoText}>
                Your submission is pending admin verification. Points will be awarded once verified.
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => handleViewAssignmentDetails(task.userAssignment)}
          >
            <MaterialCommunityIcons name="eye" size={16} color="#007AFF" />
            <Text style={styles.viewDetailsText}>View Submission Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAdminAssignmentView = (assignment: any) => {
    const status = getVerificationStatus(assignment);
    
    return (
      <TouchableOpacity
        key={assignment.id}
        style={styles.adminAssignmentCard}
        onPress={() => handleViewAssignmentDetails(assignment)}
        activeOpacity={0.7}
      >
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
                <Text style={styles.hasPhotoText}>Has Photo</Text>
              </View>
            )}
            {assignment.notes && (
              <View style={styles.hasNotesBadge}>
                <MaterialCommunityIcons name="note-text" size={8} color="#e67700" />
                <Text style={styles.hasNotesText}>Has Notes</Text>
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
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[
                styles.taskStatusBadge,
                task.userAssignment?.completed ? styles.completedStatus : styles.pendingStatus
              ]}>
                <Text style={styles.taskStatusText}>
                  {task.userAssignment?.completed ? 'Completed' : 'Active'}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Recurring</Text>
              <Text style={styles.detailValue}>{task.isRecurring ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          {renderMemberAssignmentSection()}

          {task.executionFrequency === 'WEEKLY' && task.selectedDays?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scheduled Days</Text>
              <View style={styles.daysContainer}>
                {task.selectedDays.map((day: string, index: number) => (
                  <View key={index} style={styles.dayChip}>
                    <MaterialCommunityIcons name="calendar" size={14} color="#1864ab" />
                    <Text style={styles.dayText}>{day}</Text>
                  </View>
                ))}
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
                  <Text style={styles.assignmentsSubtitle}>Recent Assignments:</Text>
                  {task.assignments.slice(0, 5).map((assignment: any, index: number) => 
                    renderAdminAssignmentView(assignment)
                  )}
                  {task.assignments.length > 5 && (
                    <Text style={styles.moreAssignments}>
                      +{task.assignments.length - 5} more assignments
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
  taskStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  completedStatus: {
    backgroundColor: '#d3f9d8'
  },
  pendingStatus: {
    backgroundColor: '#fff3bf'
  },
  taskStatusText: {
    fontSize: 14,
    fontWeight: '600',
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
  dayText: {
    fontSize: 14,
    color: '#1864ab',
    fontWeight: '500'
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
  timeInfoSection: {
    backgroundColor: '#fff3bf',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffd43b'
  },
  timeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  timeInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e67700'
  },
  timeInfoText: {
    fontSize: 13,
    color: '#e67700',
    marginBottom: 8,
    lineHeight: 18
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600'
  },
  currentSlotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  currentSlotLabel: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500'
  },
  currentSlotTime: {
    fontSize: 13,
    color: '#1864ab',
    fontWeight: '600'
  },
  completeButton: {
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
    overflow: 'hidden'
  },
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  completeButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 8,
    fontStyle: 'italic'
  },
  disabledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    gap: 12
  },
  disabledInfo: {
    flex: 1
  },
  disabledTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#868e96',
    marginBottom: 4
  },
  disabledText: {
    fontSize: 14,
    color: '#868e96',
    lineHeight: 18
  },
  futureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a5d8ff',
    gap: 12
  },
  futureInfo: {
    flex: 1
  },
  futureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1864ab',
    marginBottom: 4
  },
  futureText: {
    fontSize: 14,
    color: '#1864ab',
    lineHeight: 18
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
  // Completion Card
  completionCard: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  completionInfo: {
    flex: 1
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  completionDate: {
    fontSize: 14,
    color: '#495057'
  },
  photoPreview: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  photoPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  viewPhotoText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500'
  },
  userNotesCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4
  },
  notesText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20
  },
  adminFeedbackCard: {
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  adminFeedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fa5252',
    marginBottom: 4
  },
  adminFeedbackText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    marginTop: 12
  },
  viewDetailsText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500'
  },
  // Admin View
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
    marginBottom: 8
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
  }
});