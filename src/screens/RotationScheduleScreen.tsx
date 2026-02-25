// src/screens/RotationScheduleScreen.tsx - UPDATED with clean UI and consistent colors
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
import { LinearGradient } from 'expo-linear-gradient';
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
    navigation.navigate('TaskDetails', { taskId, groupId, userRole });
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
        ]}
        onPress={() => setSelectedWeek(week.weekNumber)}
      >
        <LinearGradient
          colors={isSelected ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weekTabGradient}
        >
          <Text style={[
            styles.weekTabText,
            isSelected && styles.weekTabTextSelected
          ]}>
            W{week.weekNumber}
          </Text>
          {isCurrentWeek && (
            <View style={styles.currentIndicator}>
              <MaterialCommunityIcons name="circle-small" size={8} color="#2b8a3e" />
            </View>
          )}
          {hasTasks && (
            <LinearGradient
              colors={['#fa5252', '#e03131']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskIndicator}
            >
              <Text style={styles.taskIndicatorText}>{week.tasks.length}</Text>
            </LinearGradient>
          )}
        </LinearGradient>
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
        <LinearGradient
          colors={isCurrentWeek ? ['#e7f5ff', '#d0ebff'] : ['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.taskGradient}
        >
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleContainer}>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {item.taskTitle}
              </Text>
            </View>
            <LinearGradient
              colors={['#fff3bf', '#ffec99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsBadge}
            >
              <Text style={styles.pointsText}>{item.points} pts</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.taskDetails}>
            <View style={styles.assigneeContainer}>
              <MaterialCommunityIcons name="account" size={14} color="#868e96" />
              <Text style={styles.assigneeText} numberOfLines={1}>
                {item.assigneeName || 'Unassigned'}
              </Text>
            </View>
            
            <View style={styles.timeContainer}>
              {item.dayOfWeek && (
                <>
                  <MaterialCommunityIcons name="calendar" size={12} color="#868e96" />
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
              <MaterialCommunityIcons name="tag" size={10} color="#868e96" />
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderDayDistribution = () => {
    const distribution = getTaskDistributionByDay();
    const days = Object.keys(distribution);
    const maxTasks = Math.max(...Object.values(distribution), 1);
    
    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.distributionCard}
      >
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
                      height: (distribution[day] / maxTasks) * 40,
                      backgroundColor: distribution[day] > 0 ? '#2b8a3e' : '#e9ecef'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.dayCount}>{distribution[day]}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    );
  };

  const renderStatistics = () => {
    if (!selectedWeekData || selectedWeekData.tasks.length === 0) return null;
    
    const fairnessScore = calculateFairnessScore();
    const weekPoints = selectedWeekData.tasks.reduce((sum: number, task: any) => sum + (task.points || 0), 0);
    
    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
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
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading rotation schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="calendar-remove" size={64} color="#fa5252" />
          <Text style={styles.errorText}>Failed to Load Schedule</Text>
          <Text style={styles.errorSubText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadRotationSchedule}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
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
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
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
            <ActivityIndicator size="small" color="#2b8a3e" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refresh}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
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
          <LinearGradient
            colors={['#e7f5ff', '#d0ebff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.currentWeekBanner}
          >
            <MaterialCommunityIcons name="information" size={18} color="#2b8a3e" />
            <Text style={styles.currentWeekText}>
              Current week • Tasks are active and can be completed
            </Text>
          </LinearGradient>
        )}

        {/* Statistics */}
        {renderStatistics()}

        {/* Day Distribution */}
        {selectedWeekData && selectedWeekData.tasks.length > 0 && renderDayDistribution()}

        {/* Tasks List */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Week {selectedWeek} Tasks
            </Text>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskCountBadge}
            >
              <Text style={styles.taskCount}>
                {getSelectedWeekTasks().length}
              </Text>
            </LinearGradient>
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
              <Text style={styles.emptyTasksText}>No tasks scheduled</Text>
              <Text style={styles.emptyTasksSubtext}>
                {selectedWeek === currentWeek 
                  ? "Tasks will appear here once they're assigned"
                  : "No tasks were scheduled for this week"}
              </Text>
            </View>
          )}
        </View>

        {/* Admin Actions - Only visible to admins */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.adminTitle}>Admin Actions</Text>
            <TouchableOpacity 
              style={styles.adminButton}
              onPress={handleRotateTasks}
            >
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.adminButtonGradient}
              >
                <MaterialCommunityIcons name="rotate-right" size={18} color="#fa5252" />
                <Text style={styles.adminButtonText}>Rotate to Next Week</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 2,
    textAlign: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 14,
    color: '#868e96',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#fa5252',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
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
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 60,
  },
  weekTabGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  weekTabSelected: {
    borderColor: '#2b8a3e',
  },
  weekTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
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
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIndicatorText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  // Current Week Banner
  currentWeekBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b2f2bb',
    gap: 8,
  },
  currentWeekText: {
    flex: 1,
    fontSize: 13,
    color: '#2b8a3e',
  },
  // Statistics Card
  statsCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2b8a3e',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#868e96',
  },
  // Distribution Card
  distributionCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  distributionTitle: {
    fontSize: 15,
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
    fontSize: 10,
    color: '#868e96',
    marginBottom: 8,
  },
  dayBarContainer: {
    height: 40,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  dayBar: {
    width: 6,
    borderRadius: 3,
  },
  dayCount: {
    fontSize: 9,
    fontWeight: '600',
    color: '#495057',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  taskCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  taskCount: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
  },
  tasksList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  taskCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  taskGradient: {
    padding: 14,
  },
  currentWeekTask: {
    borderColor: '#b2f2bb',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e67700',
  },
  taskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  assigneeText: {
    fontSize: 13,
    color: '#868e96',
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#868e96',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#868e96',
  },
  // Empty Tasks
  emptyTasks: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  emptyTasksText: {
    fontSize: 15,
    color: '#868e96',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  emptyTasksSubtext: {
    fontSize: 13,
    color: '#adb5bd',
    textAlign: 'center',
  },
  // Admin Section
  adminSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  adminButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  adminButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fa5252',
  },
});