// src/screens/TaskCompletionHistoryScreen.tsx - FULLY FIXED

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
  Alert,
  FlatList,
  Modal,
  Dimensions,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GroupActivityService } from '../services/GroupActivityService';
import { TaskService } from '../services/TaskService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

const { height: screenHeight } = Dimensions.get('window');

export default function TaskCompletionHistoryScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authError, setAuthError] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => { setAuthError(false); navigation.navigate('Login'); } }
      ]);
    }
  }, [authError, navigation]);

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
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await GroupActivityService.getTaskCompletionHistory(groupId, {
        taskId: selectedTaskId || undefined,
        week: selectedWeek || undefined
      });

      if (result.success) {
        // ✅ FILTER OUT REJECTED ASSIGNMENTS (only show verified)
        const filteredTasks = (result.data?.tasks || [])
          .map((taskGroup: any) => ({
            ...taskGroup,
            completions: taskGroup.completions.filter(
              (completion: any) => completion.verified === true  // Only show verified
            )
          }))
          .filter((taskGroup: any) => taskGroup.completions.length > 0); // Remove empty groups
        
        setHistoryData({ ...result.data, tasks: filteredTasks });
        
        const newExpanded = new Set<string>();
        filteredTasks.forEach((taskGroup: any) => {
          if (taskGroup.completions.length <= 3) {
            newExpanded.add(taskGroup.taskId);
          }
        });
        setExpandedTasks(newExpanded);
      } else {
        setError(result.message || 'Failed to load completion history');
        if (result.message?.toLowerCase().includes('token') ||
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleTaskExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
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

  const filteredTasksList = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = () => (
    <LinearGradient
      colors={[theme.card, theme.bgSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { borderBottomColor: theme.border }]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
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
          color={theme.textMuted}
          style={refreshing && styles.rotating}
        />
      </TouchableOpacity>
    </LinearGradient>
  );

  // ✅ SIMPLER DROPDOWN - Bottom Sheet Modal (like TeamOverviewScreen)
  const renderTaskSelector = () => (
    <>
      <TouchableOpacity
        style={[
          styles.filterDropdown,
          { backgroundColor: theme.bgSecondary, borderColor: theme.border },
        ]}
        onPress={() => setShowTaskSelector(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.filterDropdownText,
            { color: selectedTaskId ? theme.text : theme.textPlaceholder },
          ]}
          numberOfLines={1}
        >
          {selectedTaskId
            ? tasks.find(t => t.id === selectedTaskId)?.title || 'Select Task'
            : 'All Tasks'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={showTaskSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTaskSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTaskSelector(false)}
        >
          <View
            style={[
              styles.taskSelectorModal,
              {
                backgroundColor: theme.card,
                borderTopColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={[styles.taskSelectorHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.taskSelectorTitle, { color: theme.text }]}>Select Task</Text>
              <TouchableOpacity onPress={() => setShowTaskSelector(false)}>
                <MaterialCommunityIcons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search tasks..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.textPlaceholder}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredTasksList}
              keyExtractor={item => item.id}
              style={styles.taskSelectorList}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <TouchableOpacity
                  style={[styles.taskSelectorItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setSelectedTaskId(null);
                    setShowTaskSelector(false);
                  }}
                >
                  <Text style={[styles.taskSelectorItemText, { color: theme.text, fontWeight: '600' }]}>
                    All Tasks
                  </Text>
                </TouchableOpacity>
              }
              renderItem={({ item: task }) => (
                <TouchableOpacity
                  style={[styles.taskSelectorItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setSelectedTaskId(task.id);
                    setShowTaskSelector(false);
                  }}
                >
                  <Text style={[styles.taskSelectorItemText, { color: theme.text }]} numberOfLines={2}>
                    {task.title}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyDropdown}>
                  <Text style={[styles.emptyDropdownText, { color: theme.textPlaceholder }]}>
                    No tasks found
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  const renderFilters = () => (
    <LinearGradient
      colors={[theme.card, theme.bgSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.filtersContainer, { shadowColor: theme.shadow }]}
    >
      {/* Task Filter */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Filter by Task:</Text>
        {renderTaskSelector()}
      </View>

      {/* Week Filter */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Filter by Week:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScrollView}>
          <View style={styles.weekButtons}>
            <TouchableOpacity style={styles.weekButton} onPress={() => setSelectedWeek(null)}>
              <LinearGradient
                colors={!selectedWeek ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.weekButtonGradient}
              >
                <Text style={[styles.weekButtonText, { color: !selectedWeek ? '#fff' : theme.textSecondary }]}>
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
                  colors={selectedWeek === week ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.weekButtonGradient}
                >
                  <Text style={[styles.weekButtonText, { color: selectedWeek === week ? '#fff' : theme.textSecondary }]}>
                    W{week}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );

  const renderCompletionItem = (completion: any, taskTitle: string) => (
    <TouchableOpacity
      key={completion.assignmentId}
      onPress={() =>
        navigation.navigate('AssignmentDetails', {
          assignmentId: completion.assignmentId,
          isAdmin: userRole === 'ADMIN',
          onVerified: () => fetchHistory(true),
        })
      }
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[theme.bgSecondary, theme.bgTertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.completionCard, { borderColor: theme.border }]}
      >
        <View style={styles.completionHeader}>
          <View style={styles.userInfo}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.userAvatar}
            >
              {completion.userAvatar ? (
                <Image source={{ uri: completion.userAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.userInitial, { color: theme.textSecondary }]}>
                  {completion.userName?.charAt(0) || '?'}
                </Text>
              )}
            </LinearGradient>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {completion.userName}
              </Text>
              <Text style={[styles.completionDate, { color: theme.textMuted }]}>
                {formatDate(completion.completedAt)}
              </Text>
            </View>
          </View>
          <View style={styles.completionMeta}>
            <LinearGradient
              colors={completion.week === selectedWeek ? [theme.primary, theme.primaryDark] : [theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.weekBadge}
            >
              <Text style={[styles.weekBadgeText, { color: completion.week === selectedWeek ? '#fff' : theme.primary }]}>
                Week {completion.week}
              </Text>
            </LinearGradient>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifiedBadge}
            >
              <MaterialCommunityIcons name="check-circle" size={12} color={theme.primary} />
              <Text style={[styles.verifiedText, { color: theme.primary }]}>Verified</Text>
            </LinearGradient>
          </View>
        </View>
        <View style={styles.completionDetails}>
          <View style={styles.detailRow}>
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.detailIcon}>
              <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
            </LinearGradient>
            <Text style={[styles.detailText, { color: theme.textMuted }]}>{completion.points} pts</Text>
          </View>
          {completion.isPartial && (
            <View style={styles.detailRow}>
              <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.detailIcon}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={theme.primary} />
              </LinearGradient>
              <Text style={[styles.detailText, { color: theme.primary }]}>Partial</Text>
            </View>
          )}
          {completion.timeSlot && (
            <View style={styles.detailRow}>
              <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.detailIcon}>
                <MaterialCommunityIcons name="clock" size={12} color={theme.textMuted} />
              </LinearGradient>
              <Text style={[styles.detailText, { color: theme.textMuted }]}>
                {completion.timeSlot.startTime} - {completion.timeSlot.endTime}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderTaskGroup = ({ item: taskGroup }: { item: any }) => {
    const isExpanded = expandedTasks.has(taskGroup.taskId);
    const completionCount = taskGroup.completions.length;
    const hasMore = completionCount > 3;

    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.taskGroup, { shadowColor: theme.shadow }]}
      >
        <TouchableOpacity onPress={() => toggleTaskExpanded(taskGroup.taskId)} activeOpacity={0.7}>
          <View style={[styles.taskGroupHeader, { borderBottomColor: theme.border }]}>
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.taskGroupIcon}>
              <MaterialCommunityIcons name="format-list-checks" size={16} color={theme.textSecondary} />
            </LinearGradient>
            <Text style={[styles.taskGroupTitle, { color: theme.text }]} numberOfLines={1}>
              {taskGroup.taskTitle}
            </Text>
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.taskGroupBadge}>
              <Text style={[styles.taskGroupBadgeText, { color: theme.primary }]}>{completionCount}</Text>
            </LinearGradient>
            <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textMuted} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.completionsList}>
            {taskGroup.completions.map((completion: any) => renderCompletionItem(completion, taskGroup.taskTitle))}
          </View>
        )}

        {!isExpanded && taskGroup.completions.slice(0, 3).map((completion: any) => renderCompletionItem(completion, taskGroup.taskTitle))}

        {!isExpanded && hasMore && (
          <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleTaskExpanded(taskGroup.taskId)}>
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={[styles.showMoreGradient, { borderColor: theme.border }]}>
              <MaterialCommunityIcons name="chevron-down" size={16} color={theme.primary} />
              <Text style={[styles.showMoreText, { color: theme.primary }]}>Show {completionCount - 3} more</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading completion history...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (authError) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="lock-alert" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>Authentication Error</Text>
          <Text style={[styles.errorSubtext, { color: theme.textMuted }]}>Please log in again</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.navigate('Login')}>
            <LinearGradient colors={[theme.error, theme.error]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />
      {renderHeader()}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory()}>
              <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.retryButtonGradient}>
                <Text style={[styles.retryButtonText, { color: theme.textSecondary }]}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderFilters()}
            {historyData?.tasks && historyData.tasks.length > 0 ? (
              <FlatList
                data={historyData.tasks}
                renderItem={renderTaskGroup}
                keyExtractor={item => item.taskId}
                scrollEnabled={false}
                contentContainerStyle={styles.taskList}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="history" size={64} color={theme.border} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No completion history found</Text>
                <Text style={[styles.emptySubtext, { color: theme.textPlaceholder }]}>Try adjusting your filters or check back later</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titleContainer: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
  refreshButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  rotating: { transform: [{ rotate: '45deg' }] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12 },
  errorContainer: { alignItems: 'center', padding: 20, marginTop: 40 },
  errorText: { textAlign: 'center', marginVertical: 12, fontSize: 16, fontWeight: '600' },
  errorSubtext: { textAlign: 'center', marginBottom: 20 },
  retryButton: { borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  retryButtonGradient: { paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { fontWeight: '600', fontSize: 16 },
  content: { flex: 1, padding: 16 },
  filtersContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterSection: { marginBottom: 16 },
  filterLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterDropdownText: { fontSize: 14, flex: 1, marginRight: 4 },

  // Task Selector Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  taskSelectorModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: screenHeight * 0.7,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  taskSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  taskSelectorTitle: { fontSize: 18, fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, padding: 4 },
  taskSelectorList: { maxHeight: screenHeight * 0.5 },
  taskSelectorItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  taskSelectorItemText: { fontSize: 15 },
  emptyDropdown: { padding: 40, alignItems: 'center' },
  emptyDropdownText: { fontSize: 14 },

  weekScrollView: { flexGrow: 0 },
  weekButtons: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  weekButton: { borderRadius: 16, overflow: 'hidden' },
  weekButtonGradient: { paddingHorizontal: 12, paddingVertical: 6 },
  weekButtonText: { fontSize: 12, fontWeight: '500' },

  taskList: { paddingBottom: 20 },
  taskGroup: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  taskGroupIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  taskGroupTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  taskGroupBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  taskGroupBadgeText: { fontSize: 11, fontWeight: '600' },
  completionsList: { marginTop: 12 },
  completionCard: { borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1 },
  completionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  userInitial: { fontSize: 14, fontWeight: 'bold' },
  userDetails: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  completionDate: { fontSize: 11 },
  completionMeta: { alignItems: 'flex-end', gap: 4 },
  weekBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  weekBadgeText: { fontSize: 9, fontWeight: '600' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 3 },
  verifiedText: { fontSize: 9, fontWeight: '600' },
  completionDetails: { flexDirection: 'row', gap: 12, paddingLeft: 44, flexWrap: 'wrap' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIcon: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailText: { fontSize: 11 },
  showMoreButton: { marginTop: 8, alignItems: 'center' },
  showMoreGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  showMoreText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 18, marginBottom: 8, marginTop: 16 },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});