import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GroupActivityService } from '../services/GroupActivityService';
import { TaskService } from '../services/TaskService';

export default function TaskCompletionHistoryScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchHistory();
  }, [groupId]);

  useEffect(() => {
    if (selectedTaskId !== null || selectedWeek !== null) {
      fetchHistory();
    }
  }, [selectedTaskId, selectedWeek]);

  const fetchTasks = async () => {
    try {
      const result = await TaskService.getGroupTasks(groupId);
      if (result.success) {
        setTasks(result.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchHistory = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await GroupActivityService.getTaskCompletionHistory(groupId, {
        taskId: selectedTaskId || undefined,
        week: selectedWeek || undefined
      });
      
      if (result.success) {
        setHistoryData(result.data);
      } else {
        setError(result.message || 'Failed to load completion history');
      }
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getWeekOptions = () => {
    const weeks = [];
    const currentWeek = historyData?.tasks?.[0]?.completions?.[0]?.week || 1;
    for (let i = currentWeek; i >= Math.max(1, currentWeek - 10); i--) {
      weeks.push(i);
    }
    return weeks;
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Completion History
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => fetchHistory(true)} 
        style={styles.refreshButton}
        disabled={refreshing}
      >
        <MaterialCommunityIcons 
          name="refresh" 
          size={24} 
          color="#007AFF" 
          style={refreshing && styles.rotating} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Task Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Task:</Text>
        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={() => setShowTaskDropdown(!showTaskDropdown)}
        >
          <Text style={[
            styles.filterDropdownText,
            !selectedTaskId && styles.placeholderText
          ]}>
            {selectedTaskId 
              ? tasks.find(t => t.id === selectedTaskId)?.title || 'Select Task'
              : 'All Tasks'}
          </Text>
          <MaterialCommunityIcons 
            name={showTaskDropdown ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#6c757d" 
          />
        </TouchableOpacity>

        {showTaskDropdown && (
          <View style={styles.dropdownMenu}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={18} color="#6c757d" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tasks..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#adb5bd"
              />
            </View>
            <ScrollView style={styles.dropdownList} nestedScrollEnabled>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedTaskId(null);
                  setShowTaskDropdown(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.dropdownItemText}>All Tasks</Text>
              </TouchableOpacity>
              {filteredTasks.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedTaskId(task.id);
                    setShowTaskDropdown(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.dropdownItemText} numberOfLines={1}>
                    {task.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Week Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Week:</Text>
        <View style={styles.weekButtons}>
          <TouchableOpacity
            style={[styles.weekButton, !selectedWeek && styles.activeWeekButton]}
            onPress={() => setSelectedWeek(null)}
          >
            <Text style={[styles.weekButtonText, !selectedWeek && styles.activeWeekText]}>
              All
            </Text>
          </TouchableOpacity>
          {getWeekOptions().map(week => (
            <TouchableOpacity
              key={week}
              style={[styles.weekButton, selectedWeek === week && styles.activeWeekButton]}
              onPress={() => setSelectedWeek(week)}
            >
              <Text style={[styles.weekButtonText, selectedWeek === week && styles.activeWeekText]}>
                W{week}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderTaskCompletions = () => {
    if (!historyData?.tasks || historyData.tasks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="history" size={64} color="#dee2e6" />
          <Text style={styles.emptyText}>No completion history found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or check back later
          </Text>
        </View>
      );
    }

    return historyData.tasks.map((taskGroup: any) => (
      <View key={taskGroup.taskId} style={styles.taskGroup}>
        <View style={styles.taskGroupHeader}>
          <MaterialCommunityIcons name="format-list-checks" size={20} color="#007AFF" />
          <Text style={styles.taskGroupTitle}>{taskGroup.taskTitle}</Text>
          <View style={styles.taskGroupBadge}>
            <Text style={styles.taskGroupBadgeText}>
              {taskGroup.completions.length} completion{taskGroup.completions.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {taskGroup.completions.map((completion: any, index: number) => (
          <TouchableOpacity
            key={index}
            style={styles.completionCard}
            onPress={() => navigation.navigate('AssignmentDetails', {
              assignmentId: completion.assignmentId,
              isAdmin: userRole === 'ADMIN'
            })}
            activeOpacity={0.7}
          >
            <View style={styles.completionHeader}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  {completion.userAvatar ? (
                    <Image source={{ uri: completion.userAvatar }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.userInitial}>
                      {completion.userName?.charAt(0) || '?'}
                    </Text>
                  )} 
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{completion.userName}</Text>
                  <Text style={styles.completionDate}>
                    {formatDate(completion.completedAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.completionMeta}>
                <View style={[
                  styles.weekBadge,
                  completion.week === selectedWeek && styles.activeWeekBadge
                ]}>
                  <Text style={styles.weekBadgeText}>Week {completion.week}</Text>
                </View>

                <View style={[
                  styles.verifiedBadge,
                  completion.verified ? styles.verifiedTrue : styles.verifiedFalse
                ]}>
                  <MaterialCommunityIcons 
                    name={completion.verified ? "check-circle" : "clock-outline"} 
                    size={12} 
                    color={completion.verified ? "#2b8a3e" : "#e67700"} 
                  />
                  <Text style={[
                    styles.verifiedText,
                    completion.verified ? styles.verifiedTrueText : styles.verifiedFalseText
                  ]}>
                    {completion.verified ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.completionDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="star" size={14} color="#e67700" />
                <Text style={styles.detailText}>Points: {completion.points}</Text>
              </View>
              
              {completion.completedAt && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock-check" size={14} color="#6c757d" />
                  <Text style={styles.detailText}>
                    Completed: {new Date(completion.completedAt).toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.completionFooter}>
              <Text style={styles.viewDetails}>Tap to view full details</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#007AFF" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading completion history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderFilters()}
            {renderTaskCompletions()}
          </>
        )}
      </ScrollView>
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
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF'
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rotating: {
    transform: [{ rotate: '45deg' }]
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
  content: {
    flex: 1,
    padding: 16
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 12
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
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  filterSection: {
    marginBottom: 16
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  filterDropdownText: {
    fontSize: 14,
    color: '#212529',
    flex: 1
  },
  placeholderText: {
    color: '#adb5bd'
  },
  dropdownMenu: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 300
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa'
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#212529',
    padding: 4
  },
  dropdownList: {
    maxHeight: 200
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#212529'
  },
  weekButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  weekButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  activeWeekButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  weekButtonText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500'
  },
  activeWeekText: {
    color: 'white'
  },
  taskGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  taskGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  taskGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1
  },
  taskGroupBadge: {
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  taskGroupBadgeText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600'
  },
  completionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  userInitial: {
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
    color: '#212529',
    marginBottom: 2
  },
  completionDate: {
    fontSize: 11,
    color: '#6c757d'
  },
  completionMeta: {
    alignItems: 'flex-end',
    gap: 4
  },
  weekBadge: {
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  activeWeekBadge: {
    backgroundColor: '#007AFF'
  },
  weekBadgeText: {
    fontSize: 9,
    color: '#007AFF',
    fontWeight: '600'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3
  },
  verifiedTrue: {
    backgroundColor: '#d3f9d8'
  },
  verifiedFalse: {
    backgroundColor: '#fff3bf'
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '600'
  },
  verifiedTrueText: {
    color: '#2b8a3e'
  },
  verifiedFalseText: {
    color: '#e67700'
  },
  completionDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    paddingLeft: 44
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  detailText: {
    fontSize: 11,
    color: '#6c757d'
  },
  completionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    marginTop: 4
  },
  viewDetails: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20
  }
});