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
  RefreshControl
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
      const result = await TaskService.getGroupTasks(groupId);
      
      if (result.success) {
        setTasks(result.tasks || []);
      } else {
        setError(result.message || 'Failed to load tasks');
      }
    } catch (err: any) {
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

  const renderTask = ({ item }: any) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetails', { taskId: item.id })}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskIcon}>
          <Text style={styles.taskIconText}>✓</Text>
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.taskMeta}>
            <Text style={styles.taskPoints}>{item.points} pts</Text>
            <Text style={styles.taskFrequency}>• {item.frequency}</Text>
            {item.category && (
              <Text style={styles.taskCategory}>• {item.category}</Text>
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
        <View style={styles.assignmentBadge}>
          <Text style={styles.assignmentText}>
            {item.userAssignment.completed ? '✅ Completed' : '📝 Assigned'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16
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
  taskHeader: {
    flexDirection: 'row',
    marginBottom: 12
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e7f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  taskIconText: {
    fontSize: 20,
    color: '#007AFF'
  },
  taskInfo: {
    flex: 1
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4
  },
  taskDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    lineHeight: 20
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  taskPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fab005',
    marginRight: 8
  },
  taskFrequency: {
    fontSize: 12,
    color: '#868e96',
    marginRight: 8
  },
  taskCategory: {
    fontSize: 12,
    color: '#868e96'
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
    right: 16,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assignmentText: {
    fontSize: 11,
    color: '#495057'
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
    maxWidth: 300
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