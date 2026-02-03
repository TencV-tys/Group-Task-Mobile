// src/screens/GroupTasksScreen.tsx
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
  Alert
} from 'react-native';
import { TaskService } from '../taskServices/TaskService';

export default function GroupTasksScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  const fetchTasks = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      console.log('Fetching tasks for group:', groupId);
      const result = await TaskService.getGroupTasks(groupId);
      console.log('Tasks result:', result);
      
      if (result.success) {
        setTasks(result.tasks || []);
      } else {
        setError(result.message || 'Failed to load tasks');
      }
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchTasks();
    }
  }, [groupId]);

  const handleCreateTask = () => {
    if (userRole !== 'ADMIN') {
      alert('Only admins can create tasks');
      return;
    }
    navigation.navigate('CreateTask', {
      groupId,
      groupName,
      onTaskCreated: (newTask: any) => {
        // Add new task to list
        setTasks(prev => [newTask, ...prev]);
      }
    });
  };

  const handleEditTask = (task: any) => {
    // Navigate to UpdateTask screen
    navigation.navigate('UpdateTask', {
      task,
      groupId,
      groupName,
      onTaskUpdated: (updatedTask: any) => {
        // Update the task in the list
        setTasks(prev => prev.map(t => 
          t.id === updatedTask.id ? { ...t, ...updatedTask } : t
        ));
      }
    });
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
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
              console.log('Deleting task:', taskId);
              const result = await TaskService.deleteTask(taskId);
              
              if (result.success) {
                // Remove task from list
                setTasks(prev => prev.filter(t => t.id !== taskId));
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
            onPress: () => navigation.navigate('TaskDetails', { taskId: task.id })
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else {
      // For members, just navigate to details
      navigation.navigate('TaskDetails', { taskId: task.id });
    }
  };

  const renderTask = ({ item }: any) => {
    const isAdmin = userRole === 'ADMIN';
    const isCompleted = item.userAssignment?.completed;
    
    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          isCompleted && styles.completedTaskCard
        ]}
        onPress={() => showTaskOptions(item)}
        onLongPress={() => isAdmin && showTaskOptions(item)}
      >
        <View style={styles.taskHeader}>
          <View style={[
            styles.taskIcon,
            isCompleted 
              ? { backgroundColor: '#34c759' }
              : { backgroundColor: '#e7f5ff' }
          ]}>
            <Text style={[
              styles.taskIconText,
              isCompleted && { color: 'white' }
            ]}>
              {isCompleted ? '✓' : '✓'}
            </Text>
          </View>
          <View style={styles.taskInfo}>
            <View style={styles.taskTitleRow}>
              <Text style={[
                styles.taskTitle,
                isCompleted && styles.completedTaskTitle
              ]} numberOfLines={2}>
                {item.title}
              </Text>
              {isAdmin && (
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEditTask(item);
                  }}
                >
                  <Text style={styles.editButtonText}>✏️</Text>
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
                <Text style={styles.taskPoints}>{item.points} pts</Text>
              </View>
              
              <Text style={styles.taskFrequency}>{item.frequency}</Text>
              
              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.taskCategory}>{item.category}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.taskFooter}>
          <Text style={styles.taskCreator}>
            Created by {item.creator?.fullName || 'Admin'}
          </Text>
          <Text style={styles.taskDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        {item.userAssignment && (
          <View style={[
            styles.assignmentBadge,
            isCompleted 
              ? { backgroundColor: '#d3f9d8', borderColor: '#b2f2bb' }
              : { backgroundColor: '#fff3bf', borderColor: '#ffd43b' }
          ]}>
            <Text style={[
              styles.assignmentText,
              isCompleted && { color: '#2b8a3e' }
            ]}>
              {isCompleted ? '✅ Completed' : '📝 Assigned'}
            </Text>
          </View>
        )}
        
        {isAdmin && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteTask(item.id, item.title);
            }}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {groupName || 'Tasks'}
        </Text>
        {userRole === 'ADMIN' && (
          <TouchableOpacity onPress={handleCreateTask}>
            <Text style={styles.createButton}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchTasks()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTasks(true)}
              colors={['#007AFF']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>
                {userRole === 'ADMIN'
                  ? 'Create the first task for your group'
                  : 'No tasks have been created yet'}
              </Text>
              {userRole === 'ADMIN' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleCreateTask}
                >
                  <Text style={styles.emptyButtonText}>Create First Task</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
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
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    fontSize: 24,
    color: '#007AFF',
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginHorizontal: 12
  },
  createButton: {
    fontSize: 28,
    color: '#007AFF',
    padding: 4
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorIcon: {
    fontSize: 48,
    color: '#dc3545',
    marginBottom: 16
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  listContainer: {
    padding: 16
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
    opacity: 0.8
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
  taskIconText: {
    fontSize: 20,
    color: '#007AFF'
  },
  taskInfo: {
    flex: 1,
    marginRight: 30 // Space for delete button
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
    padding: 2,
    marginLeft: 4
  },
  editButtonText: {
    fontSize: 16
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#fa5252'
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
    borderRadius: 12
  },
  taskPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e67700'
  },
  taskFrequency: {
    fontSize: 12,
    color: '#868e96'
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
    paddingTop: 12
  },
  taskCreator: {
    fontSize: 12,
    color: '#868e96'
  },
  taskDate: {
    fontSize: 12,
    color: '#868e96'
  },
  assignmentBadge: {
    position: 'absolute',
    top: 16,
    right: 50, // Moved left to accommodate delete button
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1
  },
  assignmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e67700'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
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
    fontWeight: '600'
  }
});