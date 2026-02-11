// src/screens/GroupTasksScreen.tsx - UPDATED WITH COMPLETE NOW BUTTON
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
import { TaskService } from '../taskServices/TaskService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsModal } from '../components/SettingsModal';

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

  const fetchTasks = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      console.log('Fetching tasks for group:', groupId);
      
      // Get ALL tasks
      const allTasksResult = await TaskService.getGroupTasks(groupId);
      
      if (allTasksResult.success) {
        // Process tasks to ensure assignment info is properly set
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
      
      // Get MY tasks using the dedicated endpoint
      const myTasksResult = await TaskService.getMyTasks(groupId);
      
      if (myTasksResult.success && myTasksResult.tasks) {
        // Create a map to deduplicate by task id
        const taskMap = new Map();
        
        myTasksResult.tasks.forEach((task: any) => {
          if (task && task.id) {
            // Check if this task is submittable now
            const isSubmittableNow = checkIfSubmittableNow(task);
            
            const enhancedTask = {
              ...task,
              isAssignedToUser: true,
              userAssignment: task.assignment || task.userAssignment,
              isSubmittableNow,
              timeLeft: calculateTimeLeft(task)
            };
            
            if (!taskMap.has(task.id)) {
              taskMap.set(task.id, enhancedTask);
            }
          }
        });
        
        // Convert map back to array
        const uniqueMyTasks = Array.from(taskMap.values());
        setMyTasks(uniqueMyTasks);
      } else {
        setMyTasks([]);
      }  
      
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to check if a task is submittable now
  const checkIfSubmittableNow = (task: any) => {
    if (!task.userAssignment || task.userAssignment.completed) {
      return false;
    }

    const now = new Date();
    const dueDate = new Date(task.userAssignment.dueDate);
    const today = now.toDateString();
    const assignmentDay = dueDate.toDateString();
    
    if (today !== assignmentDay) {
      return false;
    }

    if (task.userAssignment.timeSlot) {
      const [endHour, endMinute] = task.userAssignment.timeSlot.endTime.split(':').map(Number);
      
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentInMinutes = currentHour * 60 + currentMinute;
      const endInMinutes = endHour * 60 + endMinute;
      
      // Can submit 30 minutes before end time until 30 minutes after end time
      const canSubmitStart = endInMinutes - 30;
      const canSubmitEnd = endInMinutes + 30;
      
      return currentInMinutes >= canSubmitStart && currentInMinutes <= canSubmitEnd;
    }
    
    return true;
  };

  // Helper function to calculate time left for submission
  const calculateTimeLeft = (task: any) => {
    if (!task.userAssignment || task.userAssignment.completed || !task.userAssignment.timeSlot) {
      return null;
    }

    const now = new Date();
    const [endHour, endMinute] = task.userAssignment.timeSlot.endTime.split(':').map(Number);
    
    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);
    const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000);
    
    const timeLeftMs = gracePeriodEnd.getTime() - now.getTime();
    return Math.max(0, Math.floor(timeLeftMs / 1000));
  };

  // Format time left for display
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

  useEffect(() => {
    if (groupId) {
      fetchTasks();
    }
  }, [groupId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTasks();
    });

    return unsubscribe;
  }, [navigation]);

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

    navigation.navigate('CompleteAssignment', {
      assignmentId: task.userAssignment.id,
      taskTitle: task.title,
      dueDate: task.userAssignment.dueDate,
      timeSlot: task.userAssignment.timeSlot || task.timeSlots?.[0],
      onCompleted: () => {
        fetchTasks();
        Alert.alert('Success', 'Assignment submitted successfully!');
      }
    });
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
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
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
    
    if (task.userAssignment) {
      currentAssignment = task.userAssignment;
    } else if (task.assignments && task.assignments.length > 0) {
      if (selectedTab === 'my') {
        currentAssignment = task.assignment || task.assignments[0];
      } else {
        if (task.currentAssignee) {
          currentAssignment = task.assignments.find(
            (a: any) => a.userId === task.currentAssignee
          );
        }
        if (!currentAssignment && task.assignments.length > 0) {
          currentAssignment = task.assignments[0];
        }
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

    const isCompleted = currentAssignment?.completed;
    const assigneeName = currentAssignment?.user?.fullName || 'Unknown';
    const dueDate = currentAssignment?.dueDate ? new Date(currentAssignment.dueDate) : null;
    const isAssignedToMe = task.isAssignedToUser || task.userAssignment;
    
    return (
      <View style={[
        styles.assignmentInfo,
        isCompleted ? styles.completedAssignment : styles.pendingAssignment,
        isAssignedToMe && styles.myAssignment
      ]}>
        <View style={styles.assignmentHeader}>
          <MaterialCommunityIcons 
            name={isCompleted ? "check-circle" : isAssignedToMe ? "account" : "account-clock"} 
            size={16} 
            color={isCompleted ? "#2b8a3e" : isAssignedToMe ? "#007AFF" : "#e67700"} 
          />
          <Text style={[
            styles.assignmentStatus,
            isCompleted ? { color: "#2b8a3e" } : 
            isAssignedToMe ? { color: "#007AFF" } : 
            { color: "#e67700" }
          ]}>
            {isCompleted ? 'Completed' : 
             isAssignedToMe ? 'Assigned to you' : 
             `Assigned to ${assigneeName}`}
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

  const renderTask = ({ item }: any) => {
    const isAdmin = userRole === 'ADMIN';
    const isCompleted = item.assignment?.completed || item.userAssignment?.completed;
    const isMyTasksView = selectedTab === 'my';
    const isSubmittableNow = item.isSubmittableNow;
    const timeLeft = item.timeLeft;
    
    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          isCompleted && styles.completedTaskCard,
          isMyTasksView && isSubmittableNow && styles.submittableTaskCard
        ]}
        onPress={() => handleViewTaskDetails(item.id)}
        onLongPress={() => !isMyTasksView && isAdmin && showTaskOptions(item)}
      >
        <View style={styles.taskHeader}>
          <View style={[
            styles.taskIcon,
            isCompleted 
              ? { backgroundColor: '#34c759' }
              : { backgroundColor: '#e7f5ff' }
          ]}>
            <MaterialCommunityIcons 
              name={isCompleted ? "check" : "format-list-checks"} 
              size={20} 
              color={isCompleted ? 'white' : '#007AFF'} 
            />
          </View>
          <View style={styles.taskInfo}>
            <View style={styles.taskTitleRow}>
              <Text style={[
                styles.taskTitle,
                isCompleted && styles.completedTaskTitle
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
              <View style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star" size={12} color="#e67700" />
                <Text style={styles.taskPoints}>{item.points} pts</Text>
              </View>
              
              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.taskCategory}>{item.category}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {renderAssignmentInfo(item)}
        
        {/* COMPLETE NOW BUTTON - Only in My Task tab for submittable tasks */}
        {isMyTasksView && !isCompleted && isSubmittableNow && (
          <TouchableOpacity
            style={styles.completeNowButton}
            onPress={(e) => {
              e.stopPropagation();
              handleCompleteNow(item);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.completeNowContent}>
              <MaterialCommunityIcons name="check-circle" size={20} color="white" />
              <Text style={styles.completeNowText}>Complete Now</Text>
              {timeLeft && timeLeft < 600 && (
                <View style={styles.timeLeftBadge}>
                  <Text style={styles.timeLeftText}>
                    {formatTimeLeft(timeLeft)}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        
        {/* Time left indicator for tasks that are submittable soon */}
        {isMyTasksView && !isCompleted && !isSubmittableNow && timeLeft && timeLeft > 0 && (
          <View style={styles.timeLeftContainer}>
            <MaterialCommunityIcons name="timer" size={14} color="#e67700" />
            <Text style={styles.timeLeftLabel}>
              Submission opens in {formatTimeLeft(timeLeft)}
            </Text>
          </View>
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
      </TouchableOpacity>
    );
  };

  const handleNavigateToAssignment = () => {
    navigation.navigate('TaskAssignment', {
      groupId,
      groupName,
      userRole
    });
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
                  <Text style={styles.emptyButtonText}>Create First Task</Text>
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
      
      {/* Header with Burger Icon */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {groupName || 'Tasks'}
          </Text>
          <Text style={styles.subtitle}>
            {selectedTab === 'all' ? 'All Tasks' : 'My Task'}
          </Text>
        </View>
        
        {/* Settings/Burger Icon */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchTasks()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        renderContent()
      )}

      {/* Floating Action Buttons Container - Only show for ADMIN in All Tasks tab */}
      {userRole === 'ADMIN' && selectedTab === 'all' && (
        <View style={styles.floatingButtonsContainer}>
          {/* Quick Assignment Button */}
          <TouchableOpacity
            style={[styles.floatingButton, styles.assignButton]}
            onPress={handleNavigateToAssignment}
            activeOpacity={0.8}
          >
            <View style={styles.floatingButtonInner}>
              <MaterialCommunityIcons name="account-switch" size={22} color="white" />
              <Text style={styles.floatingButtonText}>Assign</Text>
            </View>
          </TouchableOpacity>
          
          {/* Create Task Button - Plus Icon Only */}
          <TouchableOpacity
            style={[styles.floatingButton, styles.createButton]}
            onPress={handleCreateTask}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={28} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Tab Navigation - Changed "My Tasks" to "My Task" */}
      <View style={styles.bottomTab}>
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
            My Task
          </Text>
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
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
  myAssignment: {
    backgroundColor: '#e7f5ff',
    borderColor: '#a5d8ff'
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20
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
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center'
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f8f9fa'
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
  listContainer: {
    padding: 16,
    paddingBottom: 100
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative'
  },
  completedTaskCard: {
    backgroundColor: '#f8f9fa',
    opacity: 0.9
  },
  submittableTaskCard: {
    borderWidth: 2,
    borderColor: '#2b8a3e',
    backgroundColor: '#f0f9f0'
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
    backgroundColor: '#fff3bf',
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
    backgroundColor: '#e7f5ff',
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
    borderTopColor: '#f1f3f5',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1
  },
  unassignedInfo: {
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#d3f9d8',
    borderColor: '#b2f2bb'
  },
  pendingAssignment: {
    backgroundColor: '#fff3bf',
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
  // Complete Now Button Styles
  completeNowButton: {
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden'
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
    backgroundColor: '#fff3bf',
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
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
    alignItems: 'center'
  },
  assignButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  createButton: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28
  },
  floatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  bottomTab: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
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
  }
});