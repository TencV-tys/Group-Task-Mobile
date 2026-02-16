import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRotationSchedule } from '../taskHook/useRotationSchedule';

const { width } = Dimensions.get('window');

export default function RotationScheduleScreen({ route, navigation }: any) {
  const { groupId, groupName, userRole } = route.params;
  
  const {
    loading, 
    refreshing,
    weeks,
    selectedWeek,
    currentWeek,
    error,
    selectedWeekData,
    setSelectedWeek,
    loadRotationSchedule,
    rotateTasks,
    refresh,
    getSelectedWeekTasks,
    getTaskDistributionByDay,
    calculateFairnessScore,
    isEmpty,
    hasSchedule
  } = useRotationSchedule({
    groupId,
    initialWeeks: 4
  });

  // Check if user is admin
  const isAdmin = userRole === 'ADMIN';

  // Ensure selectedWeek is set when weeks are loaded
  useEffect(() => {
    if (weeks.length > 0 && !selectedWeek) {
      setSelectedWeek(currentWeek);
    }
  }, [weeks, selectedWeek, currentWeek, setSelectedWeek]);

  const handleRotateTasks = () => {
    Alert.alert(
      'Rotate Tasks',
      'Are you sure you want to rotate tasks to the next week? This will reassign all recurring tasks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate',
          style: 'destructive',
          onPress: async () => {
            await rotateTasks();
          }
        }
      ]
    );
  };

  const handleTaskPress = (taskId: string) => {
    navigation.navigate('TaskDetails', { taskId, groupId });
  };

  const renderWeekTab = (week: any) => {
    if (!week) return null;
    
    const isSelected = selectedWeek === week.weekNumber;
    const isCurrentWeek = currentWeek === week.weekNumber;
    const hasTasks = week.tasks && week.tasks.length > 0;

    return (
      <TouchableOpacity
        key={week.weekNumber}
        style={[
          styles.weekTab,
          isSelected && styles.weekTabSelected,
          isCurrentWeek && styles.currentWeekTab
        ]}
        onPress={() => setSelectedWeek(week.weekNumber)}
      >
        <Text style={[
          styles.weekTabText,
          isSelected && styles.weekTabTextSelected
        ]}>
          W{week.weekNumber}
        </Text>
        {isCurrentWeek && (
          <View style={styles.currentIndicator}>
            <MaterialCommunityIcons name="circle-small" size={8} color="#007AFF" />
          </View>
        )}
        {hasTasks && (
          <View style={styles.taskIndicator}>
            <Text style={styles.taskIndicatorText}>{week.tasks.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTaskItem = ({ item }: { item: any }) => {
    const isCurrentWeek = currentWeek === item.week;
    
    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          isCurrentWeek && styles.currentWeekTask
        ]}
        onPress={() => handleTaskPress(item.taskId)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {item.taskTitle}
            </Text>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{item.points} pts</Text>
          </View>
        </View>
        
        <View style={styles.taskDetails}>
          <View style={styles.assigneeContainer}>
            <MaterialCommunityIcons name="account" size={16} color="#6c757d" />
            <Text style={styles.assigneeText} numberOfLines={1}>
              {item.assigneeName || 'Unassigned'}
            </Text>
          </View>
          
          <View style={styles.timeContainer}>
            {item.dayOfWeek && (
              <>
                <MaterialCommunityIcons name="calendar" size={14} color="#6c757d" />
                <Text style={styles.timeText}>
                  {item.dayOfWeek}
                  {item.scheduledTime ? ` • ${item.scheduledTime}` : ''}
                </Text>
              </>
            )}
          </View>
        </View>
        
        {item.category && (
          <View style={styles.categoryContainer}>
            <MaterialCommunityIcons name="tag" size={12} color="#868e96" />
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDayDistribution = () => {
    const distribution = getTaskDistributionByDay();
    const days = Object.keys(distribution);
    const maxTasks = Math.max(...Object.values(distribution));
    
    return (
      <View style={styles.distributionCard}>
        <Text style={styles.distributionTitle}>Tasks by Day</Text>
        <View style={styles.distributionGrid}>
          {days.map((day) => (
            <View key={day} style={styles.dayColumn}>
              <Text style={styles.dayLabel}>{day.substring(0, 3)}</Text>
              <View style={styles.dayBarContainer}>
                <View 
                  style={[
                    styles.dayBar,
                    { 
                      height: maxTasks > 0 
                        ? (distribution[day] / maxTasks) * 40 
                        : 0 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.dayCount}>{distribution[day]}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStatistics = () => {
    if (!selectedWeekData || selectedWeekData.tasks.length === 0) return null;
    
    const fairnessScore = calculateFairnessScore();
    const weekPoints = selectedWeekData.tasks.reduce((sum: number, task: any) => sum + (task.points || 0), 0);
    
    return (
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Week {selectedWeek} Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{selectedWeekData.tasks.length}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{weekPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {selectedWeekData.tasks.filter((t: any) => t.assigneeName && t.assigneeName !== 'Unassigned').length}
            </Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{fairnessScore}/100</Text>
            <Text style={styles.statLabel}>Fairness</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading rotation schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="calendar-remove" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to Load Schedule</Text>
          <Text style={styles.errorSubText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadRotationSchedule}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Rotation Schedule</Text>
          <Text style={styles.subtitle}>{groupName}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={refresh}
          disabled={refreshing}
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Week Tabs */}
        {weeks.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.weeksScroll}
            contentContainerStyle={styles.weeksContainer}
          >
            {weeks.map(renderWeekTab)}
          </ScrollView>
        )}

        {/* Current Week Info */}
        {currentWeek === selectedWeek && (
          <View style={styles.currentWeekBanner}>
            <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
            <Text style={styles.currentWeekText}>
              This is the current week. Tasks are active and can be completed.
            </Text>
          </View>
        )}

        {/* Statistics */}
        {renderStatistics()}

        {/* Day Distribution */}
        {selectedWeekData && selectedWeekData.tasks.length > 0 && renderDayDistribution()}

        {/* Tasks List */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Tasks for Week {selectedWeek}
            </Text>
            <Text style={styles.taskCount}>
              {getSelectedWeekTasks().length} tasks
            </Text>
          </View>

          {getSelectedWeekTasks().length > 0 ? (
            <FlatList
              data={getSelectedWeekTasks()}
              renderItem={renderTaskItem}
              keyExtractor={(item, index) => `${item.taskId}-${item.week}-${index}`}
              scrollEnabled={false}
              contentContainerStyle={styles.tasksList}
            />
          ) : (
            <View style={styles.emptyTasks}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#dee2e6" />
              <Text style={styles.emptyTasksText}>No tasks scheduled for this week</Text>
              <Text style={styles.emptyTasksSubtext}>
                {selectedWeek === currentWeek 
                  ? "Tasks will appear here once they're assigned to the current week"
                  : "No tasks were scheduled for this week"}
              </Text>
            </View>
          )}
        </View>

        {/* Admin Actions - Only visible to admins */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.adminTitle}>Admin Actions</Text>
            <View style={styles.adminActions}>
              <TouchableOpacity 
                style={styles.adminButton}
                onPress={handleRotateTasks}
              >
                <MaterialCommunityIcons name="rotate-right" size={20} color="#007AFF" />
                <Text style={styles.adminButtonText}>Rotate to Next Week</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Header
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
    alignItems: 'center',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '400',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
  },
  // Scroll Content
  scrollContent: {
    paddingBottom: 24,
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Week Tabs
  weeksScroll: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  weeksContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  weekTab: {
    minWidth: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  weekTabSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  currentWeekTab: {
    borderColor: '#007AFF',
  },
  weekTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  weekTabTextSelected: {
    color: 'white',
  },
  currentIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  taskIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIndicatorText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Current Week Banner
  currentWeekBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5d8ff',
    gap: 8,
  },
  currentWeekText: {
    flex: 1,
    fontSize: 14,
    color: '#1971c2',
  },
  // Statistics Card
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  // Distribution Card
  distributionCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  distributionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    width: (width - 64) / 7,
  },
  dayLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 8,
  },
  dayBarContainer: {
    height: 40,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  dayBar: {
    width: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  dayCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#212529',
  },
  // Tasks Section
  tasksSection: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  taskCount: {
    fontSize: 14,
    color: '#6c757d',
  },
  tasksList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  taskCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  currentWeekTask: {
    backgroundColor: '#e7f5ff',
    borderWidth: 1,
    borderColor: '#a5d8ff',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  pointsBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  assigneeText: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#6c757d',
  },
  // Empty Tasks
  emptyTasks: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  emptyTasksText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyTasksSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  // Admin Section
  adminSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  adminActions: {
    gap: 8,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e7f5ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5d8ff',
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#868e96',
  },
});