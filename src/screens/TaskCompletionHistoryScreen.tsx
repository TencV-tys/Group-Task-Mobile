import React, { useState, useEffect, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { GroupActivityService } from '../services/GroupActivityService';
import { TaskService } from '../services/TaskService';
import * as SecureStore from 'expo-secure-store';

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
  const [authError, setAuthError] = useState(false);

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 TaskCompletionHistoryScreen: No auth token available');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      console.log('✅ TaskCompletionHistoryScreen: Auth token found');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ TaskCompletionHistoryScreen: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const hasToken = await checkToken();
      if (hasToken) {
        await fetchTasks();
        await fetchHistory();
      }
    };
    initialize();
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
    // Check token first
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setAuthError(false);

    try {
      const result = await GroupActivityService.getTaskCompletionHistory(groupId, {
        taskId: selectedTaskId || undefined,
        week: selectedWeek || undefined
      });
      
      if (result.success) {
        setHistoryData(result.data);
      } else {
        setError(result.message || 'Failed to load completion history');
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
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

  // Helper function for status badge gradient
  const getVerifiedGradient = (verified: boolean | null): [string, string] => {
    if (verified === true) return ['#d3f9d8', '#b2f2bb']; // Light green
    if (verified === false) return ['#fff5f5', '#ffe3e3']; // Light red
    return ['#fff3bf', '#ffec99']; // Light orange for pending
  };

  // Helper function for status icon color
  const getVerifiedIconColor = (verified: boolean | null): string => {
    if (verified === true) return '#2b8a3e';
    if (verified === false) return '#fa5252';
    return '#e67700';
  };

  // Helper function for status icon name
  const getVerifiedIcon = (verified: boolean | null): string => {
    if (verified === true) return 'check-circle';
    if (verified === false) return 'close-circle';
    return 'clock-outline';
  };

  // Helper function for status text
  const getVerifiedText = (verified: boolean | null): string => {
    if (verified === true) return 'Verified';
    if (verified === false) return 'Rejected';
    return 'Pending';
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
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
          color="#495057" 
          style={refreshing && styles.rotating} 
        />
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderFilters = () => (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.filtersContainer}
    >
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
            color="#868e96" 
          />
        </TouchableOpacity>

        {showTaskDropdown && (
          <View style={styles.dropdownMenu}>
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchContainer}
            >
              <MaterialCommunityIcons name="magnify" size={18} color="#868e96" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tasks..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#adb5bd"
              />
            </LinearGradient>
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
     {/* Week Filter */}
<View style={styles.filterSection}>
  <Text style={styles.filterLabel}>Filter by Week:</Text>
  <View style={styles.weekButtons}>
    <TouchableOpacity
      style={styles.weekButton}
      onPress={() => setSelectedWeek(null)}
    >
      <LinearGradient
        colors={!selectedWeek ? ['#495057', '#212529'] : ['#f8f9fa', '#e9ecef']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.weekButtonGradient}
      >
        <Text style={[
          styles.weekButtonText,
          !selectedWeek && styles.activeWeekText
        ]}>
          All
        </Text>
      </LinearGradient>
    </TouchableOpacity>
    
    {getWeekOptions().map(week => (
      <TouchableOpacity
        key={week}
        style={styles.weekButton}
        onPress={() => setSelectedWeek(week)}
      >
        <LinearGradient
          colors={selectedWeek === week ? ['#495057', '#212529'] : ['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weekButtonGradient}
        >
          <Text style={[
            styles.weekButtonText,
            selectedWeek === week && styles.activeWeekText
          ]}>
            W{week}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    ))}
  </View>
</View>
    </LinearGradient>
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
      <LinearGradient
        key={taskGroup.taskId}
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.taskGroup}
      >
        <View style={styles.taskGroupHeader}>
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.taskGroupIcon}
          >
            <MaterialCommunityIcons name="format-list-checks" size={16} color="#495057" />
          </LinearGradient>
          <Text style={styles.taskGroupTitle}>{taskGroup.taskTitle}</Text>
          <LinearGradient
            colors={['#e7f5ff', '#d0ebff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.taskGroupBadge}
          >
            <Text style={styles.taskGroupBadgeText}>
              {taskGroup.completions.length} completion{taskGroup.completions.length !== 1 ? 's' : ''}
            </Text>
          </LinearGradient>
        </View>

        {taskGroup.completions.map((completion: any, index: number) => (
          <TouchableOpacity
            key={index}
            onPress={() => navigation.navigate('AssignmentDetails', {
              assignmentId: completion.assignmentId,
              isAdmin: userRole === 'ADMIN'
            })}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.completionCard}
            >
              <View style={styles.completionHeader}>
                <View style={styles.userInfo}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.userAvatar}
                  >
                    {completion.userAvatar ? (
                      <Image source={{ uri: completion.userAvatar }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.userInitial}>
                        {completion.userName?.charAt(0) || '?'}
                      </Text>
                    )} 
                  </LinearGradient>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{completion.userName}</Text>
                    <Text style={styles.completionDate}>
                      {formatDate(completion.completedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.completionMeta}>
                  <LinearGradient
                    colors={completion.week === selectedWeek 
                      ? ['#495057', '#212529'] 
                      : ['#e7f5ff', '#d0ebff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.weekBadge}
                  >
                    <Text style={[
                      styles.weekBadgeText,
                      completion.week === selectedWeek && styles.activeWeekBadgeText
                    ]}>
                      Week {completion.week}
                    </Text>
                  </LinearGradient>

                  <LinearGradient
                    colors={getVerifiedGradient(completion.verified)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.verifiedBadge}
                  >
                    <MaterialCommunityIcons 
                      name={getVerifiedIcon(completion.verified) as any}
                      size={12} 
                      color={getVerifiedIconColor(completion.verified)} 
                    />
                    <Text style={[styles.verifiedText, { color: getVerifiedIconColor(completion.verified) }]}>
                      {getVerifiedText(completion.verified)}
                    </Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.completionDetails}>
                <View style={styles.detailRow}>
                  <LinearGradient
                    colors={['#fff3bf', '#ffec99']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.detailIcon}
                  >
                    <MaterialCommunityIcons name="star" size={12} color="#e67700" />
                  </LinearGradient>
                  <Text style={styles.detailText}>Points: {completion.points}</Text>
                </View>
                
                {completion.completedAt && (
                  <View style={styles.detailRow}>
                    <LinearGradient
                      colors={['#f8f9fa', '#e9ecef']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.detailIcon}
                    >
                      <MaterialCommunityIcons name="clock-check" size={12} color="#868e96" />
                    </LinearGradient>
                    <Text style={styles.detailText}>
                      {new Date(completion.completedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.completionFooter}>
                <Text style={styles.viewDetails}>Tap to view full details</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#495057" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </LinearGradient>
    ));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#495057" />
          <Text style={styles.loadingText}>Loading completion history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (authError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="lock-alert" size={64} color="#fa5252" />
          <Text style={styles.errorText}>Authentication Error</Text>
          <Text style={styles.errorSubtext}>Please log in again</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={['#fa5252', '#e03131']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
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
            <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory()}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.retryButtonGradient}
              >
                <Text style={[styles.retryButtonText, { color: '#495057' }]}>Retry</Text>
              </LinearGradient>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
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
    color: '#868e96'
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 40
  },
  errorText: {
    color: '#fa5252',
    textAlign: 'center',
    marginVertical: 12,
    fontSize: 16,
    fontWeight: '600'
  },
  errorSubtext: {
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  retryButtonText: {
    fontWeight: '600',
    fontSize: 16
  },
  content: {
    flex: 1,
    padding: 16
  },
  filtersContainer: {
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
    borderBottomColor: '#e9ecef'
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
    borderRadius: 16,
    overflow: 'hidden'
  },
  weekButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  weekButtonText: {
    fontSize: 12,
    color: '#868e96',
    fontWeight: '500'
  },
  activeWeekText: {
    color: 'white'
  },
  taskGroup: {
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
  taskGroupIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  taskGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1
  },
  taskGroupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  taskGroupBadgeText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '600'
  },
  completionCard: {
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
    color: '#495057',
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
    color: '#868e96'
  },
  completionMeta: {
    alignItems: 'flex-end',
    gap: 4
  },
  weekBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  weekBadgeText: {
    fontSize: 9,
    color: '#495057',
    fontWeight: '600'
  },
  activeWeekBadgeText: {
    color: 'white'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '600'
  },
  completionDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    paddingLeft: 44,
    flexWrap: 'wrap'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  detailIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  detailText: {
    fontSize: 11,
    color: '#868e96'
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
    color: '#495057',
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyText: {
    fontSize: 18,
    color: '#868e96',
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