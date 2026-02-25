import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import { TaskService } from '../services/TaskService';
import { AssignmentService } from '../services/AssignmentService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SettingsModal } from '../components/SettingsModal';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import * as SecureStore from 'expo-secure-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GroupTasksScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);  
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'all' | 'my'>('all');
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // State for today's assignments
  const [todayAssignments, setTodayAssignments] = useState<any[]>([]);
  const [showTodaySection, setShowTodaySection] = useState(false);
  
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        } else {
          const userDataStr = await SecureStore.getItemAsync('userData');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            setCurrentUserId(userData.id || userData._id);
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (groupId) {
      fetchTasks();
      loadPendingForMe(groupId);
    }
  }, [groupId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTasks();
      loadPendingForMe(groupId);
    });
    return unsubscribe;
  }, [navigation, groupId]);

  // Helper function to find today's assignments
  const findTodayAssignments = (tasks: any[]) => {
    const today = new Date().toDateString();
    return tasks.filter(task => {
      if (!task.userAssignment?.dueDate) return false;
      const dueDate = new Date(task.userAssignment.dueDate).toDateString();
      return today === dueDate && !task.userAssignment.completed;
    });
  };

  const fetchTasks = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      console.log('Fetching tasks for group:', groupId);
      
      const allTasksResult = await TaskService.getGroupTasks(groupId);
      
      if (allTasksResult.success) {
        const processedTasks = (allTasksResult.tasks || []).map((task: any) => {
          const userAssignment = task.assignments?.find(
            (a: any) => a.user && a.user.id
          );
          
          return {
            ...task,
            isAssignedToUser: !!userAssignment || !!task.userAssignment,
            userAssignment: userAssignment || task.userAssignment
          };
        });
        
        setTasks(processedTasks);
      } else {
        setError(allTasksResult.message || 'Failed to load tasks');
      }
      
      const myTasksResult = await TaskService.getMyTasks(groupId);
      
      if (myTasksResult.success && myTasksResult.tasks) {
        const taskMap = new Map();
        
        myTasksResult.tasks.forEach((task: any) => {
          if (task && task.id) {
            const timeValidation = checkTaskTimeValidity(task);
            
            const enhancedTask = {
              ...task,
              isAssignedToUser: true,
              userAssignment: task.assignment || task.userAssignment,
              ...timeValidation
            };
            
            if (!taskMap.has(task.id)) {
              taskMap.set(task.id, enhancedTask);
            }
          }
        });
        
        const uniqueMyTasks = Array.from(taskMap.values());
        setMyTasks(uniqueMyTasks);
        
        // Find and set today's assignments
        const todayTasks = findTodayAssignments(uniqueMyTasks);
        setTodayAssignments(todayTasks);
        setShowTodaySection(todayTasks.length > 0);
      } else {
        setMyTasks([]);
        setTodayAssignments([]);
        setShowTodaySection(false);
      }  
      
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkTaskTimeValidity = (task: any) => {
    const result = {
      isSubmittableNow: false,
      timeLeft: null as number | null,
      submissionStatus: 'waiting' as 'available' | 'waiting' | 'expired' | 'wrong_day' | 'completed',
      willBePenalized: false,
      activeTimeSlot: null as any
    };

    if (!task.userAssignment || task.userAssignment.completed) {
      result.submissionStatus = 'completed';
      return result;
    }

    const now = new Date();
    const dueDate = new Date(task.userAssignment.dueDate);
    const today = now.toDateString();
    const assignmentDay = dueDate.toDateString();
    
    if (today !== assignmentDay) {
      result.submissionStatus = 'wrong_day';
      return result;
    }

    const timeSlots = task.timeSlots || (task.userAssignment.timeSlot ? [task.userAssignment.timeSlot] : []);
    
    if (timeSlots.length === 0) {
      result.isSubmittableNow = true;
      result.submissionStatus = 'available';
      return result;
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentInMinutes = currentHour * 60 + currentMinute;

    for (const slot of timeSlots) {
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);
      const endInMinutes = endHour * 60 + endMinute;
      
      const canSubmitStart = endInMinutes - 30;
      const canSubmitEnd = endInMinutes + 30;
      
      if (currentInMinutes >= canSubmitStart && currentInMinutes <= canSubmitEnd) {
        result.isSubmittableNow = true;
        result.activeTimeSlot = slot;
        result.submissionStatus = 'available';
        result.willBePenalized = currentInMinutes > endInMinutes;
        
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);
        const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000);
        const timeLeftMs = gracePeriodEnd.getTime() - now.getTime();
        result.timeLeft = Math.max(0, Math.floor(timeLeftMs / 1000));
        
        break;
      } else if (currentInMinutes < canSubmitStart) {
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);
        const submissionStart = new Date(endTime.getTime() - 30 * 60000);
        const timeUntilMs = submissionStart.getTime() - now.getTime();
        
        if (timeUntilMs > 0) {
          result.timeLeft = Math.ceil(timeUntilMs / 1000);
          result.submissionStatus = 'waiting';
        }
      }
    }

    if (!result.isSubmittableNow && result.submissionStatus === 'waiting') {
      const latestSlot = [...timeSlots].sort((a, b) => {
        const aEnd = parseInt(a.endTime.split(':')[0]) * 60 + parseInt(a.endTime.split(':')[1]);
        const bEnd = parseInt(b.endTime.split(':')[0]) * 60 + parseInt(b.endTime.split(':')[1]);
        return bEnd - aEnd;
      })[0];
      
      if (latestSlot) {
        const [endHour, endMinute] = latestSlot.endTime.split(':').map(Number);
        const graceEnd = endHour * 60 + endMinute + 30;
        
        if (currentInMinutes > graceEnd) {
          result.submissionStatus = 'expired';
          result.timeLeft = 0;
        }
      }
    }

    return result;
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

  const handleCreateTask = () => {
    if (userRole !== 'ADMIN') {
      Alert.alert('Restricted', 'Only admins can create tasks');
      return;
    }
    navigation.navigate('CreateTask', {
      groupId,
      groupName,
      onTaskCreated: () => {
        fetchTasks();
      }
    });
  };

  const handleEditTask = (task: any) => {
    if (selectedTab === 'my') {
      return;
    }
    
    if (userRole !== 'ADMIN') {
      Alert.alert('Restricted', 'Only admins can edit tasks');
      return;
    }
    
    navigation.navigate('UpdateTask', {
      task,
      groupId,
      groupName,
      onTaskUpdated: () => {
        fetchTasks();
      }
    });
  };

  const handleViewTaskDetails = (taskId: string) => {
    navigation.navigate('TaskDetails', { 
      taskId,
      groupId,
      userRole
    });
  };

  const handleCompleteNow = (task: any) => {
    if (!task.userAssignment) {
      Alert.alert('Error', 'No assignment found for this task');
      return;
    }

    if (task.isSubmittableNow) {
      navigation.navigate('AssignmentDetails', {
        assignmentId: task.userAssignment.id,
        isAdmin: false,
        onVerified: () => {
          fetchTasks();
        }
      });
    } else {
      let message = 'Cannot submit this task now.';
      
      switch (task.submissionStatus) {
        case 'wrong_day':
          message = `This task is due on ${new Date(task.userAssignment.dueDate).toLocaleDateString()}. Please come back on that day.`;
          break;
        case 'waiting':
          if (task.timeLeft) {
            message = `Submission window opens in ${formatTimeLeft(task.timeLeft)}.`;
          } else {
            message = 'Submission window not yet open. Please wait until the scheduled time.';
          }
          break;
        case 'expired':
          message = 'The submission window for this task has expired.';
          break;
        case 'completed':
          message = 'You have already completed this task.';
          break;
      }
      
      Alert.alert('Cannot Submit', message, [{ text: 'OK' }]);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (selectedTab === 'my') {
      Alert.alert('Not Allowed', 'Cannot delete tasks from My Task view. Go to All Tasks tab.');
      return;
    }
    
    if (userRole !== 'ADMIN') {
      Alert.alert('Restricted', 'Only admins can delete tasks');
      return;
    }
    
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${taskTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await TaskService.deleteTask(taskId);
              
              if (result.success) {
                setTasks(prev => prev.filter(t => t.id !== taskId));
                setMyTasks(prev => prev.filter(t => t.id !== taskId));
                Alert.alert('Success', 'Task deleted successfully');
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

  const showTaskOptions = (task: any) => {
    if (selectedTab === 'my') {
      handleViewTaskDetails(task.id);
      return;
    }
    
    const isAdmin = userRole === 'ADMIN';
    
    if (isAdmin) {
      Alert.alert(
        'Task Options',
        `"${task.title}"`,
        [
          {
            text: 'Edit Task',
            onPress: () => handleEditTask(task)
          },
          {
            text: 'Delete Task',
            style: 'destructive',
            onPress: () => handleDeleteTask(task.id, task.title)
          },
          {
            text: 'View Details',
            onPress: () => handleViewTaskDetails(task.id)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else {
      handleViewTaskDetails(task.id);
    }
  };

  const handleNavigateToSwapRequests = () => {
    navigation.navigate('PendingSwapRequests');
  };

  const handleNavigateToAssignment = () => {
    navigation.navigate('TaskAssignment', {
      groupId,
      groupName,
      userRole
    });
  };

  // Handle viewing all today's tasks
  const handleViewAllTodayTasks = () => {
    if (todayAssignments.length === 0) return;
    
    if (todayAssignments.length === 1) {
      // If only one, go directly to AssignmentDetails
      navigation.navigate('AssignmentDetails', {
        assignmentId: todayAssignments[0].userAssignment.id,
        isAdmin: false,
        onVerified: () => {
          fetchTasks();
        }
      });
    } else {
      // Navigate to TodayAssignments screen
      navigation.navigate('TodayAssignments', {
        groupId,
        groupName
      });
    }
  };

  const renderAssignmentInfo = (task: any) => {
    const hasAssignment = task.userAssignment || task.assignments?.length > 0;
    
    if (!hasAssignment) {
      return (
        <View style={styles.unassignedInfo}>
          <MaterialCommunityIcons name="account-question" size={16} color="#868e96" />
          <Text style={styles.unassignedText}>
            Not assigned to anyone
          </Text>
        </View>
      );
    }

    let currentAssignment = null;
    let assigneeName = 'Unknown';
    let isAssignedToMe = false;
    let isCompleted = false;
    
    if (selectedTab === 'my') {
      if (task.userAssignment) {
        currentAssignment = task.userAssignment;
        isAssignedToMe = true;
        assigneeName = 'You';
        isCompleted = currentAssignment?.completed || false;
      } else if (task.assignment) {
        currentAssignment = task.assignment;
        isAssignedToMe = true;
        assigneeName = 'You';
        isCompleted = currentAssignment?.completed || false;
      }
    } else {
      if (task.assignments && task.assignments.length > 0) {
        if (task.currentAssignee) {
          currentAssignment = task.assignments.find(
            (a: any) => a.userId === task.currentAssignee
          );
        }
        
        if (!currentAssignment) {
          currentAssignment = task.assignments[0];
        }
        
        if (currentAssignment) {
          assigneeName = currentAssignment.user?.fullName || 'Unknown';
          isAssignedToMe = currentAssignment.userId === currentUserId;
          isCompleted = currentAssignment.completed || false;
        }
      } else if (task.userAssignment) {
        currentAssignment = task.userAssignment;
        assigneeName = task.userAssignment.user?.fullName || 'Unknown';
        isAssignedToMe = task.userAssignment.userId === currentUserId;
        isCompleted = task.userAssignment.completed || false;
      }
    }
    
    if (!currentAssignment) {
      return (
        <View style={styles.unassignedInfo}>
          <MaterialCommunityIcons name="account-question" size={16} color="#868e96" />
          <Text style={styles.unassignedText}>
            Not assigned to anyone
          </Text>
        </View>
      );
    }

    const dueDate = currentAssignment?.dueDate ? new Date(currentAssignment.dueDate) : null;
    
    const getAssignmentText = () => {
      if (selectedTab === 'my') {
        return isCompleted ? 'Completed' : 'Assigned to you';
      } else {
        return isCompleted ? 'Completed' : `Assigned to ${assigneeName}`;
      }
    };

    const getIcon = () => {
      if (isCompleted) return "check-circle";
      if (selectedTab === 'my') return "account";
      return isAssignedToMe ? "account" : "account-clock";
    };

    const getColor = () => {
      if (isCompleted) return "#2b8a3e";
      if (selectedTab === 'my') return "#007AFF";
      return isAssignedToMe ? "#007AFF" : "#e67700";
    };

    const assignmentText = getAssignmentText();
    const iconName = getIcon();
    const iconColor = getColor();

    return (
      <View style={[
        styles.assignmentInfo,
        isCompleted ? styles.completedAssignment : styles.pendingAssignment,
        !isCompleted && isAssignedToMe && selectedTab === 'all' && styles.myAssignment
      ]}>
        <View style={styles.assignmentHeader}>
          <MaterialCommunityIcons 
            name={iconName} 
            size={16} 
            color={iconColor} 
          />
          <Text style={[
            styles.assignmentStatus,
            { color: iconColor }
          ]}>
            {assignmentText}
          </Text>
        </View>
        
        <View style={styles.assignmentDetails}>
          {dueDate && (
            <Text style={styles.assignmentDetail}>
              <Text style={styles.detailLabel}>Due:</Text> {dueDate.toLocaleDateString()}
            </Text>
          )}
          {task.executionFrequency && (
            <Text style={styles.assignmentDetail}>
              <Text style={styles.detailLabel}>Frequency:</Text> {task.executionFrequency.toLowerCase()}
            </Text>
          )}
          {task.selectedDays?.length > 0 && (
            <Text style={styles.assignmentDetail}>
              <Text style={styles.detailLabel}>Days:</Text> {task.selectedDays.join(', ')}
            </Text>
          )}
          {task.timeSlots?.length > 0 && (
            <Text style={styles.assignmentDetail}>
              <Text style={styles.detailLabel}>Time:</Text> {
                task.timeSlots.slice(0, 2).map((slot: any) => 
                  `${slot.startTime}-${slot.endTime}${slot.label ? ` (${slot.label})` : ''}`
                ).join(', ')
              }
              {task.timeSlots.length > 2 && `... +${task.timeSlots.length - 2} more`}
            </Text>
          )}
          {currentAssignment?.points !== undefined && currentAssignment.points > 0 && (
            <Text style={styles.assignmentDetail}>
              <Text style={styles.detailLabel}>Points:</Text> {currentAssignment.points}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#f8f9fa', '#e9ecef']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={styles.backButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {groupName || 'Tasks'}
        </Text>
        <Text style={styles.subtitle}>
          {selectedTab === 'all' ? 'All Tasks' : 'My Tasks'}
        </Text>
      </View>
      
      <View style={styles.headerRight}>
        <TouchableOpacity 
          style={styles.swapButton}
          onPress={handleNavigateToSwapRequests}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialCommunityIcons name="swap-horizontal" size={24} color="#4F46E5" />
          {totalPendingForMe > 0 && (
            <View style={styles.swapBadge}>
              <Text style={styles.swapBadgeText}>{totalPendingForMe}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialCommunityIcons name="cog" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // Render today's assignments section at the top
  const renderTodaySection = () => {
    if (!showTodaySection || selectedTab !== 'my') return null;
    
    return (
      <LinearGradient
        colors={['#fff5f5', '#ffe3e3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.todaySection}
      >
        <View style={styles.todaySectionHeader}>
          <View style={styles.todaySectionTitleContainer}>
            <MaterialCommunityIcons name="clock-alert" size={20} color="#fa5252" />
            <Text style={styles.todaySectionTitle}>
              Due Today ({todayAssignments.length})
            </Text>
          </View>
          <TouchableOpacity onPress={handleViewAllTodayTasks}>
            <Text style={styles.todaySectionViewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {todayAssignments.slice(0, 2).map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.todayTaskItem}
            onPress={() => {
              navigation.navigate('AssignmentDetails', {
                assignmentId: task.userAssignment.id,
                isAdmin: false,
                onVerified: () => {
                  fetchTasks();
                }
              });
            }}
            activeOpacity={0.7}
          >
            <View style={styles.todayTaskItemContent}>
              <View style={styles.todayTaskItemIcon}>
                <MaterialCommunityIcons name="calendar-check" size={18} color="#fa5252" />
              </View>
              <View style={styles.todayTaskItemInfo}>
                <Text style={styles.todayTaskItemTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                <Text style={styles.todayTaskItemTime}>
                  {task.userAssignment?.timeSlot 
                    ? `${task.userAssignment.timeSlot.startTime} - ${task.userAssignment.timeSlot.endTime}`
                    : 'Due today'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </View>
          </TouchableOpacity>
        ))}
        
        {todayAssignments.length > 2 && (
          <TouchableOpacity 
            style={styles.todayMoreButton}
            onPress={handleViewAllTodayTasks}
          >
            <Text style={styles.todayMoreButtonText}>
              +{todayAssignments.length - 2} more
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  };

  // Render floating action button for today's tasks
  const renderTodayFAB = () => {
    if (!showTodaySection || selectedTab !== 'my') return null;
    
    return (
      <TouchableOpacity
        style={styles.todayFAB}
        onPress={handleViewAllTodayTasks}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#fa5252', '#e03131']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.todayFABContent}
        >
          <MaterialCommunityIcons name="calendar-clock" size={24} color="white" />
          <View style={styles.todayFABTextContainer}>
            <Text style={styles.todayFABTitle}>Today's Tasks</Text>
            <Text style={styles.todayFABCount}>{todayAssignments.length} due</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderTask = ({ item }: any) => {
    const isAdmin = userRole === 'ADMIN';
    const isCompleted = item.assignment?.completed || item.userAssignment?.completed;
    const isMyTasksView = selectedTab === 'my';
    const isSubmittableNow = item.isSubmittableNow;
    const timeLeft = item.timeLeft;
    const submissionStatus = item.submissionStatus;
    const willBePenalized = item.willBePenalized;
    
    // Check if this task is due today
    const isDueToday = () => {
      if (!item.userAssignment?.dueDate) return false;
      const today = new Date().toDateString();
      const dueDate = new Date(item.userAssignment.dueDate).toDateString();
      return today === dueDate;
    };

    const handleViewTodayAssignment = () => {
      if (item.userAssignment) {
        navigation.navigate('AssignmentDetails', {
          assignmentId: item.userAssignment.id,
          isAdmin: false,
          onVerified: () => {
            fetchTasks();
          }
        });
      }
    };

    // Determine gradient colors based on task status
    const getGradientColors = () => {
      if (isCompleted) {
        return ['#f8f9fa', '#e9ecef'];
      }
      if (isMyTasksView && isDueToday() && !isCompleted) {
        return ['#fff5f5', '#ffe3e3'];
      }
      if (isMyTasksView && isSubmittableNow) {
        return willBePenalized ? ['#fff3bf', '#ffec99'] : ['#d3f9d8', '#b2f2bb'];
      }
      return ['#ffffff', '#f8f9fa'];
    };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleViewTaskDetails(item.id)}
        onLongPress={() => !isMyTasksView && isAdmin && showTaskOptions(item)}
      >
     <LinearGradient
  colors={getGradientColors() as [string, string, ...string[]]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={[
    styles.taskCard,
    isMyTasksView && isDueToday() && !isCompleted && styles.todayTaskCard
  ]}
>
          {/* Today's Assignment Badge */}
          {isMyTasksView && isDueToday() && !isCompleted && (
            <View style={styles.todayBadge}>
              <MaterialCommunityIcons name="clock-alert" size={14} color="#fff" />
              <Text style={styles.todayBadgeText}>DUE TODAY</Text>
            </View>
          )}

          <View style={styles.taskHeader}>
            <LinearGradient
              colors={
                isCompleted 
                  ? ['#34c759', '#2b8a3e']
                  : isDueToday() && isMyTasksView
                    ? ['#fa5252', '#e03131']
                    : ['#e7f5ff', '#d0ebff']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskIcon}
            >
              <MaterialCommunityIcons 
                name={isCompleted ? "check" : "format-list-checks"} 
                size={20} 
                color="white" 
              />
            </LinearGradient>
            <View style={styles.taskInfo}>
              <View style={styles.taskTitleRow}>
                <Text style={[
                  styles.taskTitle,
                  isCompleted && styles.completedTaskTitle,
                  isMyTasksView && isDueToday() && !isCompleted && styles.todayTaskTitle
                ]} numberOfLines={2}>
                  {item.title}
                </Text>
                
                {!isMyTasksView && isAdmin && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEditTask(item);
                    }}
                  >
                    <MaterialCommunityIcons name="pencil" size={18} color="#6c757d" />
                  </TouchableOpacity>
                )}
              </View>
              
              {item.description && (
                <Text style={[
                  styles.taskDescription,
                  isCompleted && styles.completedTaskDescription
                ]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              
              <View style={styles.taskMeta}>
                <LinearGradient
                  colors={['#fff3bf', '#ffec99']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pointsBadge}
                >
                  <MaterialCommunityIcons name="star" size={12} color="#e67700" />
                  <Text style={styles.taskPoints}>{item.points} pts</Text>
                </LinearGradient>
                
                {item.category && (
                  <LinearGradient
                    colors={['#e7f5ff', '#d0ebff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryBadge}
                  >
                    <Text style={styles.taskCategory}>{item.category}</Text>
                  </LinearGradient>
                )}

                {/* Due Today Indicator */}
                {isMyTasksView && isDueToday() && !isCompleted && (
                  <LinearGradient
                    colors={['#fff5f5', '#ffe3e3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dueTodayBadge}
                  >
                    <MaterialCommunityIcons name="alert" size={12} color="#fa5252" />
                    <Text style={styles.dueTodayText}>Today</Text>
                  </LinearGradient>
                )}
              </View>
            </View>
          </View>
          
          {renderAssignmentInfo(item)}
          
          {isMyTasksView && !isCompleted && (
            <>
              {/* TODAY'S ASSIGNMENT BUTTON */}
              {isDueToday() && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleViewTodayAssignment();
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#fa5252', '#e03131']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.todayAssignmentButton}
                  >
                    <View style={styles.todayAssignmentContent}>
                      <MaterialCommunityIcons name="calendar-check" size={20} color="white" />
                      <Text style={styles.todayAssignmentText}>View Today's Assignment</Text>
                      <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Complete Now button */}
              {isSubmittableNow ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCompleteNow(item);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={willBePenalized ? ['#e67700', '#cc5f00'] : ['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.completeNowButton}
                  >
                    <View style={styles.completeNowContent}>
                      <MaterialCommunityIcons 
                        name={willBePenalized ? "timer-alert" : "check-circle"} 
                        size={20} 
                        color="white" 
                      />
                      <Text style={styles.completeNowText}>
                        {willBePenalized ? 'Submit Late' : 'Complete Now'}
                      </Text>
                      {timeLeft && timeLeft < 600 && (
                        <View style={styles.timeLeftBadge}>
                          <Text style={styles.timeLeftText}>
                            {formatTimeLeft(timeLeft)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                submissionStatus === 'waiting' && timeLeft && timeLeft > 0 && (
                  <LinearGradient
                    colors={['#fff3bf', '#ffec99']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.timeLeftContainer}
                  >
                    <MaterialCommunityIcons name="timer" size={14} color="#e67700" />
                    <Text style={styles.timeLeftLabel}>
                      Opens in {formatTimeLeft(timeLeft)}
                    </Text>
                  </LinearGradient>
                )
              )}
              
              {submissionStatus === 'expired' && (
                <LinearGradient
                  colors={['#ffc9c9', '#ffb3b3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.timeLeftContainer, styles.expiredContainer]}
                >
                  <MaterialCommunityIcons name="timer-off" size={14} color="#fa5252" />
                  <Text style={[styles.timeLeftLabel, styles.expiredText]}>
                    Submission window closed
                  </Text>
                </LinearGradient>
              )}
            </>
          )}
          
          <View style={styles.taskFooter}>
            <Text style={styles.taskCreator}>
              <MaterialCommunityIcons name="account" size={12} color="#868e96" /> {item.creator?.fullName || 'Admin'}
            </Text>
            <Text style={styles.taskDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          
          {!isMyTasksView && isAdmin && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteTask(item.id, item.title);
              }}
            >
              <MaterialCommunityIcons name="delete" size={18} color="#fa5252" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    const currentTasks = selectedTab === 'my' ? myTasks : tasks;
    const showEmpty = !loading && currentTasks.length === 0;
    
    return (
      <FlatList
        data={currentTasks}
        renderItem={renderTask}
        keyExtractor={(item, index) => {
          return item?.id || `task-${index}`;
        }}
        ListHeaderComponent={renderTodaySection()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTasks(true)}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={
          showEmpty ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name={selectedTab === 'my' ? "clipboard-text" : "clipboard-list"} 
                size={64} 
                color="#dee2e6" 
              />
              <Text style={styles.emptyText}>
                {selectedTab === 'my' ? 'No tasks assigned to you' : 'No tasks yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {selectedTab === 'my' 
                  ? 'You have no assigned tasks for this week'
                  : userRole === 'ADMIN'
                    ? 'Create the first task for your group'
                    : 'No tasks have been created yet'}
              </Text>
              {userRole === 'ADMIN' && selectedTab === 'all' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleCreateTask}
                >
                  <LinearGradient
                    colors={['#007AFF', '#0056b3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyButtonGradient}
                  >
                    <Text style={styles.emptyButtonText}>Create First Task</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {renderHeader()}

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchTasks()}
          >
            <LinearGradient
              colors={['#007AFF', '#0056b3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        renderContent()
      )}

      {/* Today's Tasks FAB */}
      {renderTodayFAB()}

      {userRole === 'ADMIN' && selectedTab === 'all' && (
        <View style={styles.floatingButtonsContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PendingVerifications', {
              groupId,
              groupName,
              userRole
            })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#e67700', '#cc5f00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.floatingButton, styles.reviewButton]}
            >
              <View style={styles.floatingButtonInner}>
                <MaterialCommunityIcons name="clipboard-check" size={22} color="white" />
                <Text style={styles.floatingButtonText}>Review</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleNavigateToAssignment}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#28a745', '#1e7b34']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.floatingButton, styles.assignButton]}
            >
              <View style={styles.floatingButtonInner}>
                <MaterialCommunityIcons name="account-switch" size={22} color="white" />
                <Text style={styles.floatingButtonText}>Assign</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleCreateTask}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#007AFF', '#0056b3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.floatingButton, styles.createButton]}
            >
              <MaterialCommunityIcons name="plus" size={28} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomTab}
      >
        <TouchableOpacity 
          style={[styles.tabButton, selectedTab === 'all' && styles.activeTabButton]}
          onPress={() => setSelectedTab('all')}
          activeOpacity={0.7}
        >
          <View style={styles.tabIconContainer}>
            <MaterialCommunityIcons 
              name="format-list-bulleted" 
              size={24} 
              color={selectedTab === 'all' ? '#007AFF' : '#8e8e93'} 
            />
          </View>
          <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>
            All Tasks
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, selectedTab === 'my' && styles.activeTabButton]}
          onPress={() => setSelectedTab('my')}
          activeOpacity={0.7}
        >
          <View style={styles.tabIconContainer}>
            <MaterialCommunityIcons 
              name="clipboard-check" 
              size={24} 
              color={selectedTab === 'my' ? '#007AFF' : '#8e8e93'} 
            />
          </View>
          <Text style={[styles.tabText, selectedTab === 'my' && styles.activeTabText]}>
            My Tasks
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        groupId={groupId}
        groupName={groupName}
        userRole={userRole}
        navigation={navigation}
        onNavigateToAssignment={handleNavigateToAssignment}
        onRefreshTasks={() => fetchTasks(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20
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
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 80,
    justifyContent: 'flex-end'
  },
  swapButton: {
    position: 'relative',
    padding: 8,
  },
  swapBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  swapBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden'
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
  listContainer: {
    padding: 16,
    paddingBottom: 100
  },
  taskCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative'
  },
  completedTaskCard: {
    opacity: 0.9
  },
  submittableTaskCard: {
    borderWidth: 2,
    borderColor: '#2b8a3e'
  },
  penaltyTaskCard: {
    borderWidth: 2,
    borderColor: '#e67700'
  },
  todayTaskCard: {
    borderWidth: 2,
    borderColor: '#fa5252'
  },
  taskHeader: {
    flexDirection: 'row',
    marginBottom: 12
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  taskInfo: {
    flex: 1,
    marginRight: 40
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginRight: 8,
    lineHeight: 22
  },
  completedTaskTitle: {
    color: '#6c757d',
    textDecorationLine: 'line-through'
  },
  todayTaskTitle: {
    color: '#fa5252',
    fontWeight: '700'
  },
  editButton: {
    padding: 4
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  taskDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 10,
    lineHeight: 20
  },
  completedTaskDescription: {
    color: '#adb5bd'
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  taskPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e67700'
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  taskCategory: {
    fontSize: 12,
    color: '#1864ab'
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
    marginTop: 12
  },
  taskCreator: {
    fontSize: 12,
    color: '#868e96',
    flexDirection: 'row',
    alignItems: 'center'
  },
  taskDate: {
    fontSize: 12,
    color: '#868e96'
  },
  assignmentInfo: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  myAssignment: {
    backgroundColor: 'rgba(231, 245, 255, 0.8)',
    borderColor: '#a5d8ff'
  },
  unassignedInfo: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  unassignedText: {
    fontSize: 13,
    color: '#868e96',
    fontStyle: 'italic'
  },
  completedAssignment: {
    backgroundColor: 'rgba(211, 249, 216, 0.8)',
    borderColor: '#b2f2bb'
  },
  pendingAssignment: {
    backgroundColor: 'rgba(255, 243, 191, 0.8)',
    borderColor: '#ffd43b'
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  assignmentStatus: {
    fontSize: 14,
    fontWeight: '600'
  },
  assignmentDetails: {
    gap: 4
  },
  assignmentDetail: {
    fontSize: 12,
    color: '#495057'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#212529'
  },
  completeNowButton: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden'
  },
  lateButton: {
    backgroundColor: '#e67700',
  },
  completeNowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8
  },
  completeNowText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  timeLeftBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  timeLeftText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6
  },
  timeLeftLabel: {
    fontSize: 13,
    color: '#e67700',
    fontWeight: '500'
  },
  expiredContainer: {
    borderWidth: 1,
    borderColor: '#fa5252'
  },
  expiredText: {
    color: '#fa5252'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    marginTop: 40
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  emptyButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 100
  },
  floatingButton: {
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  assignButton: {
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28
  },
  reviewButton: {
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  floatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  bottomTab: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    height: 70,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 50
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 80,
    flex: 1,
    height: '100%'
  },
  activeTabButton: {},
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  tabText: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#007AFF', 
    fontWeight: '600' 
  },
  // Today's section styles
  todaySection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fa5252',
  },
  todaySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todaySectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todaySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fa5252',
  },
  todaySectionViewAll: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  todayTaskItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  todayTaskItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayTaskItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayTaskItemInfo: {
    flex: 1,
  },
  todayTaskItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  todayTaskItemTime: {
    fontSize: 12,
    color: '#868e96',
  },
  todayMoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  todayMoreButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  todayFAB: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    overflow: 'hidden'
  },
  todayFABContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  todayFABTextContainer: {
    flex: 1,
  },
  todayFABTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  todayFABCount: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  todayBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#fa5252',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  dueTodayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  dueTodayText: {
    fontSize: 10,
    color: '#fa5252',
    fontWeight: '600'
  },
  todayAssignmentButton: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  todayAssignmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16
  },
  todayAssignmentText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center'
  }
});