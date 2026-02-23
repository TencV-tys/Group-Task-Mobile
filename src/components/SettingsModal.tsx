// components/SettingsModal.tsx - FIXED swap week availability
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView, 
  ActivityIndicator, 
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string; 
  groupName: string;
  userRole: string;
  navigation: any;
  onNavigateToAssignment?: () => void;
  onRefreshTasks?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  groupId,
  groupName,
  userRole,
  navigation,
  onNavigateToAssignment,
  onRefreshTasks,
}) => {
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [groupStats, setGroupStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rotationWeek, setRotationWeek] = useState<number>(1);
  const [members, setMembers] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [loadingMyTasks, setLoadingMyTasks] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState<Date | null>(null);
  const [weekEndDate, setWeekEndDate] = useState<Date | null>(null);
  const [canSwapWeek, setCanSwapWeek] = useState(false);
  const [weekSwapReason, setWeekSwapReason] = useState<string>('');
  const [firstTaskDate, setFirstTaskDate] = useState<Date | null>(null);
  
  const { createSwapRequest, loading: swapLoading } = useSwapRequests();

  const isAdmin = userRole === 'ADMIN';

  const loadGroupData = async () => {
    if (!visible) return;

    try {
      // Load stats from TaskService
      setLoadingStats(true);
      const statsResult = await TaskService.getTaskStatistics(groupId);
      if (statsResult.success) {
        setGroupStats(statsResult.statistics);
        
        // Create leaderboard from pointsByUser if available
        if (statsResult.statistics?.pointsByUser) {
          const sortedUsers = Object.values(statsResult.statistics.pointsByUser)
            .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
            .slice(0, 5);
          setLeaderboard(sortedUsers);
        }
      }

      // Load group info from GroupMembersService
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setRotationWeek(groupResult.group?.currentRotationWeek || 1);
      }

      // Load members for potential leaderboard data
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setMembers(membersResult.members || []);
      }

      // Load my tasks to check assignments and find first task date
      setLoadingMyTasks(true);
      const myTasksResult = await TaskService.getMyTasks(groupId);
      if (myTasksResult.success && myTasksResult.tasks) {
        setMyAssignments(myTasksResult.tasks);
        
        // Find the earliest task date to determine week start
        if (myTasksResult.tasks.length > 0) {
          const tasks = myTasksResult.tasks;
          let earliestDate: Date | null = null;
          
          tasks.forEach((task: any) => {
            if (task.assignment?.dueDate) {
              const dueDate = new Date(task.assignment.dueDate);
              if (!earliestDate || dueDate < earliestDate) {
                earliestDate = dueDate;
              }
            }
          });
          
          if (earliestDate) {
            setFirstTaskDate(earliestDate);
            
            // ✅ FIXED: Now TypeScript knows earliestDate is Date
            const firstTaskDate = earliestDate as Date;
            
            // Calculate week start (Monday of the week containing the first task)
            const dayOfWeek = firstTaskDate.getDay(); // 0 = Sunday, 1 = Monday
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            
            const weekStart = new Date(firstTaskDate);
            weekStart.setDate(firstTaskDate.getDate() - daysToMonday);
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            setWeekStartDate(weekStart);
            setWeekEndDate(weekEnd);
            
            // Check if we can swap the entire week
            checkWeekSwapAvailability(weekStart, weekEnd);
          }
        }
      }
      setLoadingMyTasks(false);

    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setLoadingStats(false);
      setLoadingLeaderboard(false);
    }
  };

  // ✅ FIXED: Check if week swap is available (first 24 hours of the week)
  const checkWeekSwapAvailability = (weekStart: Date, weekEnd: Date) => {
    const now = new Date();
    
    // Week start is Monday at 00:00
    const weekStartDay = new Date(weekStart);
    weekStartDay.setHours(0, 0, 0, 0);
    
    // Calculate hours since week started
    const hoursSinceWeekStart = (now.getTime() - weekStartDay.getTime()) / (1000 * 60 * 60);
    
    // Week swap is available within the first 24 hours of the week
    const isWithinFirst24Hours = hoursSinceWeekStart >= 0 && hoursSinceWeekStart <= 24;
    
    console.log('📅 Week swap check:', {
      weekStart: weekStartDay.toISOString(),
      now: now.toISOString(),
      hoursSinceWeekStart,
      isWithinFirst24Hours
    });
    
    if (!isWithinFirst24Hours) {
      setCanSwapWeek(false);
      if (hoursSinceWeekStart < 0) {
        setWeekSwapReason('Week hasn\'t started yet');
      } else {
        setWeekSwapReason('Week swap window has closed (only available within first 24 hours of the week)');
      }
    } else {
      setCanSwapWeek(true);
      const hoursLeft = Math.ceil(24 - hoursSinceWeekStart);
      setWeekSwapReason(`${hoursLeft} hour(s) left to swap the entire week`);
    }
  };

  useEffect(() => {
    if (visible) {
      loadGroupData();
    }
  }, [visible]);

  const handleRotateTasks = async () => {
    Alert.alert(
      'Rotate Tasks',
      'Are you sure you want to rotate tasks to the next week? This will reassign all recurring tasks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await TaskService.rotateTasks(groupId);
              if (result.success) {
                Alert.alert('Success', `Tasks rotated to week ${result.newWeek}`);
                onRefreshTasks?.();
                loadGroupData();
              } else { 
                Alert.alert('Error', result.message || 'Failed to rotate tasks');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to rotate tasks');
            }
          }
        }
      ]
    );
  };

  // Handle Swap Entire Week
  const handleSwapEntireWeek = () => {
    if (myAssignments.length === 0) {
      Alert.alert('No Tasks', 'You have no assigned tasks this week to swap.');
      return;
    }

    // Count incomplete assignments
    const incompleteAssignments = myAssignments.filter(t => 
      t.assignment && !t.assignment.completed
    );

    if (incompleteAssignments.length === 0) {
      Alert.alert('All Completed', 'You have already completed all your tasks this week.');
      return;
    }

    // Use the first incomplete assignment as the base for the swap request
    const firstTask = incompleteAssignments[0];
    
    if (!firstTask.assignment) {
      Alert.alert('Error', 'Cannot find assignment to swap');
      return;
    }

    Alert.alert(
      'Swap Entire Week',
      `Are you sure you want to swap ALL your tasks for week ${rotationWeek}?\n\n` +
      `You have ${incompleteAssignments.length} incomplete task(s) this week.\n\n` +
      `⚠️ This action is only available within the first 24 hours of the week (Monday 00:00 - Tuesday 00:00).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'default',
          onPress: () => {
            navigation.navigate('CreateSwapRequest', {
              assignmentId: firstTask.assignment.id,
              groupId,
              taskTitle: firstTask.title,
              dueDate: firstTask.assignment.dueDate,
              taskPoints: firstTask.assignment.points,
              timeSlot: firstTask.assignment.timeSlot?.startTime || 'Scheduled time',
              executionFrequency: firstTask.executionFrequency,
              timeSlots: firstTask.timeSlots || [],
              // Force week scope
              scope: 'week',
            });
            onClose();
          }
        }
      ]
    );
  };

  const handleReviewSubmissions = () => {
    navigation.navigate('PendingVerifications', {
      groupId,
      groupName,
      userRole
    });
    onClose();
  };

  const handleViewRotationSchedule = () => {
    navigation.navigate('RotationSchedule', { groupId, groupName, userRole });
    onClose();
  };

  const handleViewAssignment = () => {
    onNavigateToAssignment?.();
    onClose();
  };

  const handleGroupSettings = () => {
    navigation.navigate('GroupMembers', { groupId, groupName, userRole });
    onClose();
  };

  const handleTaskStatistics = () => {
    navigation.navigate('DetailedStatistics', { 
      groupId, 
      groupName
    });
    onClose();
  };

  const handleViewFullLeaderboard = () => {
    navigation.navigate('FullLeaderboard', { 
      groupId, 
      groupName
    });
    onClose();
  };

  const renderLeaderboardItem = (item: any, index: number) => {
    const isFirst = index === 0;
    const isSecond = index === 1;
    const isThird = index === 2;

    return (
      <View key={item.userId} style={[
        styles.leaderboardItem,
        isFirst && styles.firstPlace,
        isSecond && styles.secondPlace,
        isThird && styles.thirdPlace
      ]}>
        <View style={styles.leaderboardRank}>
          {isFirst ? (
            <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
          ) : isSecond ? (
            <MaterialCommunityIcons name="trophy" size={18} color="#C0C0C0" />
          ) : isThird ? (
            <MaterialCommunityIcons name="trophy" size={16} color="#CD7F32" />
          ) : (
            <Text style={styles.rankNumber}>{index + 1}</Text>
          )}
        </View>
        
        <View style={styles.leaderboardUser}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>
              {item.userName?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.userName}
            </Text>
            <Text style={styles.userStats}>
              {item.assignments?.length || 0} tasks • {item.totalPoints} pts
            </Text>
          </View>
        </View>
        
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{item.totalPoints}</Text>
        </View>
      </View>
    );
  };

  // Count incomplete assignments for display
  const incompleteCount = myAssignments.filter(t => 
    t.assignment && !t.assignment.completed
  ).length;

  // Get week day name for display
  const getWeekDayName = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Format hours left
  const getHoursLeftText = () => {
    if (!weekStartDate) return '';
    
    const now = new Date();
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    
    const hoursSinceWeekStart = (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60);
    const hoursLeft = Math.max(0, 24 - hoursSinceWeekStart);
    
    if (hoursLeft <= 0) return '';
    if (hoursLeft < 1) return `${Math.round(hoursLeft * 60)} minutes left`;
    return `${Math.ceil(hoursLeft)} hour(s) left`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {groupName} Settings
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Rotation Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="calendar-sync" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Rotation</Text>
              </View>
              
              <View style={styles.rotationCard}>
                <View style={styles.rotationInfo}>
                  <Text style={styles.rotationLabel}>Current Week</Text>
                  <Text style={styles.rotationValue}>Week {rotationWeek}</Text>
                  {weekStartDate && weekEndDate && (
                    <Text style={styles.rotationDate}>
                      {weekStartDate.toLocaleDateString()} - {weekEndDate.toLocaleDateString()}
                    </Text>
                  )}
                  {weekStartDate && (
                    <Text style={styles.weekStartDay}>
                      Week starts: {getWeekDayName(weekStartDate)}
                    </Text>
                  )}
                </View>
                
                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.rotateButton}
                    onPress={handleRotateTasks}
                  >
                    <MaterialCommunityIcons name="rotate-right" size={16} color="#fff" />
                    <Text style={styles.rotateButtonText}>Rotate Tasks</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleViewRotationSchedule}
              >
                <MaterialCommunityIcons name="calendar-clock" size={18} color="#007AFF" />
                <Text style={styles.actionButtonText}>View Rotation Schedule</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Swap Entire Week Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="swap-horizontal" size={20} color="#4F46E5" />
                <Text style={styles.sectionTitle}>Swap Entire Week</Text>
              </View>

              {loadingMyTasks ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <View style={[
                  styles.swapCard,
                  !canSwapWeek && styles.swapCardDisabled
                ]}>
                  <View style={styles.swapInfo}>
                    <Text style={styles.swapDescription}>
                      Swap all your tasks for week {rotationWeek} with another member
                    </Text>
                    
                    <View style={styles.weekAvailability}>
                      <MaterialCommunityIcons 
                        name={canSwapWeek ? "check-circle" : "clock-alert"} 
                        size={16} 
                        color={canSwapWeek ? "#2b8a3e" : "#fa5252"} 
                      />
                      <Text style={[
                        styles.weekAvailabilityText,
                        canSwapWeek ? styles.availableText : styles.unavailableText
                      ]}>
                        {canSwapWeek 
                          ? `✅ Available now - ${getHoursLeftText()}` 
                          : weekSwapReason || 'Week swap window is closed'}
                      </Text>
                    </View>

                    {canSwapWeek && (
                      <View style={styles.taskCountBadge}>
                        <MaterialCommunityIcons name="clipboard-text" size={14} color="#4F46E5" />
                        <Text style={styles.taskCountText}>
                          {incompleteCount} incomplete task(s) this week
                        </Text>
                      </View>
                    )}

                    {weekStartDate && (
                      <Text style={styles.weekInfo}>
                        Week started: {weekStartDate.toLocaleDateString()} at 00:00
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.swapActionButton,
                      (!canSwapWeek || incompleteCount === 0 || swapLoading) && styles.swapActionDisabled
                    ]}
                    onPress={handleSwapEntireWeek}
                    disabled={!canSwapWeek || incompleteCount === 0 || swapLoading}
                  >
                    {swapLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="swap-horizontal" size={18} color="#fff" />
                        <Text style={styles.swapActionText}>Swap Week</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {!canSwapWeek && !loadingMyTasks && weekStartDate && (
                <View style={styles.infoBox}>
                  <MaterialCommunityIcons name="information" size={20} color="#fa5252" />
                  <Text style={styles.infoUnavailableText}>
                    Week swaps are only available within the first 24 hours after the week starts.
                    {'\n\n'}
                    Week started: {weekStartDate.toLocaleDateString()} at 00:00
                  </Text>
                </View>
              )}

              {canSwapWeek && incompleteCount === 0 && !loadingMyTasks && (
                <View style={styles.successBox}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#2b8a3e" />
                  <Text style={styles.successText}>
                    ✓ All tasks completed! No pending tasks to swap.
                  </Text>
                </View>
              )}
            </View>

            {/* Admin Actions - Only visible to admins */}
            {isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="shield-account" size={20} color="#007AFF" />
                  <Text style={styles.sectionTitle}>Admin Actions</Text>
                </View>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleViewAssignment}
                >
                  <MaterialCommunityIcons name="account-switch" size={18} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Manage Assignments</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleGroupSettings}
                >
                  <MaterialCommunityIcons name="cog" size={18} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Group Settings</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
                </TouchableOpacity>
                   
                <TouchableOpacity 
                  style={[styles.actionButton, styles.reviewButton]}
                  onPress={handleReviewSubmissions}
                >
                  <MaterialCommunityIcons name="clipboard-check" size={18} color="#007AFF" />
                  <View style={styles.reviewButtonContent}>
                    <Text style={styles.actionButtonText}>Review Submissions</Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending</Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            )}

            {/* Statistics Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="chart-bar" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Statistics</Text>
              </View>

              {loadingStats ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : groupStats ? (
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {groupStats.totalTasks || 0}
                    </Text>
                    <Text style={styles.statLabel}>Total Tasks</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {groupStats.currentWeek?.totalAssignments || 0}
                    </Text>
                    <Text style={styles.statLabel}>This Week</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {groupStats.recurringTasks || 0}
                    </Text>
                    <Text style={styles.statLabel}>Recurring</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {groupStats.currentWeek?.completedPoints || 0}
                    </Text>
                    <Text style={styles.statLabel}>Points Earned</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noDataText}>No statistics available</Text>
              )}

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleTaskStatistics}
              >
                <MaterialCommunityIcons name="chart-box" size={18} color="#007AFF" />
                <Text style={styles.actionButtonText}>View Detailed Statistics</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Leaderboard Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="podium" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Leaderboard</Text>
              </View>

              {loadingLeaderboard ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : leaderboard.length > 0 ? (
                <View style={styles.leaderboardContainer}>
                  {leaderboard.slice(0, 5).map((item, index) => 
                    renderLeaderboardItem(item, index)
                  )}
                </View>
              ) : (
                <Text style={styles.noDataText}>No leaderboard data yet</Text>
              )}

              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={handleViewFullLeaderboard}
              >
                <Text style={styles.viewAllText}>View Full Leaderboard</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              Group ID: {groupId.substring(0, 8)}...
            </Text>
            <Text style={styles.footerRole}>
              {isAdmin ? 'Group Admin' : 'Member'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000'
  },
  modalBody: {
    padding: 20
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f8f9fa'
  },
  footerText: {
    fontSize: 12,
    color: '#666'
  },
  footerRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600'
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000'
  },
  rotationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  rotationInfo: {
    flex: 1
  },
  rotationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  rotationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000'
  },
  rotationDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  weekStartDay: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 4,
    fontWeight: '500'
  },
  rotateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  rotateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  actionButtonText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    marginHorizontal: 12
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic'
  },
  leaderboardContainer: {
    marginBottom: 16
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  firstPlace: {
    backgroundColor: '#fff3bf',
    borderColor: '#ffd43b'
  },
  secondPlace: {
    backgroundColor: '#f1f3f5',
    borderColor: '#dee2e6'
  },
  thirdPlace: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef'
  },
  leaderboardRank: {
    width: 32,
    alignItems: 'center'
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666'
  },
  leaderboardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  userInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  userInfo: {
    flex: 1 
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2
  },
  userStats: {
    fontSize: 12,
    color: '#666'
  },
  pointsBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  pointsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },
  viewAllButton: {
    backgroundColor: '#e7f5ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  viewAllText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14
  },
  reviewButton: {
    backgroundColor: '#e7f5ff',
    borderColor: '#a5d8ff'
  },
  reviewButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12
  },
  pendingBadge: {
    backgroundColor: '#e67700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8
  },
  pendingBadgeText: {
    color: 'white',
    fontSize: 11, 
    fontWeight: '600'
  },
  swapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
    marginBottom: 8
  },
  swapCardDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF',
    opacity: 0.7
  },
  swapInfo: {
    flex: 1,
    marginRight: 12
  },
  swapDescription: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
    fontWeight: '500'
  },
  weekAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6
  },
  weekAvailabilityText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500'
  },
  availableText: {
    color: '#2b8a3e'
  },
  unavailableText: {
    color: '#fa5252'
  },
  taskCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6
  },
  taskCountText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600'
  },
  weekInfo: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic'
  },
  swapActionButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  swapActionDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5
  },
  swapActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  infoUnavailableText: {
    flex: 1,
    fontSize: 13,
    color: '#fa5252',
    lineHeight: 18
  },
  successBox: {
    flexDirection: 'row',
    backgroundColor: '#d3f9d8',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#b2f2bb'
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: '500'
  }
});