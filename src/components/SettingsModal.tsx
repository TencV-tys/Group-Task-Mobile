// components/SettingsModal.tsx - UPDATED with Swap History for admins
import React, { useEffect, useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import * as SecureStore from 'expo-secure-store';

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
  const [authError, setAuthError] = useState(false);
  
  const { createSwapRequest, loading: swapLoading } = useSwapRequests();

  const isAdmin = userRole === 'ADMIN';

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 SettingsModal: No auth token available');
        setAuthError(true);
        return false;
      }
      console.log('✅ SettingsModal: Auth token found');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ SettingsModal: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  const loadGroupData = async () => {
    if (!visible) return;

    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert(
        'Authentication Error',
        'Please log in again',
        [{ text: 'OK', onPress: onClose }]
      );
      return;
    }

    try {
      setLoadingStats(true);
      const statsResult = await TaskService.getTaskStatistics(groupId);
      if (statsResult.success) {
        setGroupStats(statsResult.statistics);
        
        if (statsResult.statistics?.pointsByUser) {
          const sortedUsers = Object.values(statsResult.statistics.pointsByUser)
            .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
            .slice(0, 5);
          setLeaderboard(sortedUsers);
        }
      }

      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setRotationWeek(groupResult.group?.currentRotationWeek || 1);
      }

      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setMembers(membersResult.members || []);
      }

      setLoadingMyTasks(true);
      const myTasksResult = await TaskService.getMyTasks(groupId);
      if (myTasksResult.success && myTasksResult.tasks) {
        setMyAssignments(myTasksResult.tasks);
        
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
            
            const firstTaskDate = earliestDate as Date;
            const dayOfWeek = firstTaskDate.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            
            const weekStart = new Date(firstTaskDate);
            weekStart.setDate(firstTaskDate.getDate() - daysToMonday);
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            setWeekStartDate(weekStart);
            setWeekEndDate(weekEnd);
            
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

  const checkWeekSwapAvailability = (weekStart: Date, weekEnd: Date) => {
    const now = new Date();
    const weekStartDay = new Date(weekStart);
    weekStartDay.setHours(0, 0, 0, 0);
    
    const hoursSinceWeekStart = (now.getTime() - weekStartDay.getTime()) / (1000 * 60 * 60);
    const isWithinFirst24Hours = hoursSinceWeekStart >= 0 && hoursSinceWeekStart <= 24;
    
    if (!isWithinFirst24Hours) {
      setCanSwapWeek(false);
      if (hoursSinceWeekStart < 0) {
        setWeekSwapReason('Week hasn\'t started yet');
      } else {
        setWeekSwapReason('Week swap window has closed');
      }
    } else {
      setCanSwapWeek(true);
      const hoursLeft = Math.ceil(24 - hoursSinceWeekStart);
      setWeekSwapReason(`${hoursLeft} hour(s) left to swap`);
    }
  };

  useEffect(() => {
    if (visible) {
      loadGroupData();
    }
  }, [visible]);

  useEffect(() => {
    if (authError && visible) {
      Alert.alert(
        'Session Expired',
        'Please log in again.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              onClose();
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, visible]);

  const handleSwapEntireWeek = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;

    if (myAssignments.length === 0) {
      Alert.alert('No Tasks', 'You have no assigned tasks this week.');
      return;
    }

    const incompleteAssignments = myAssignments.filter((t: any) => 
      t.assignment && !t.assignment.completed
    );

    if (incompleteAssignments.length === 0) {
      Alert.alert('All Completed', 'You have completed all your tasks this week.');
      return;
    }

    const firstTask = incompleteAssignments[0];
    
    if (!firstTask.assignment) {
      Alert.alert('Error', 'Cannot find assignment to swap');
      return;
    }

    Alert.alert(
      'Swap Entire Week',
      `Swap all ${incompleteAssignments.length} incomplete task(s) for week ${rotationWeek}?`,
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
              scope: 'week',
            });
            onClose();
          }
        }
      ]
    );
  };

  const handleReviewSubmissions = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('PendingVerifications', { groupId, groupName, userRole });
    onClose();
  };

  const handleViewRotationSchedule = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('RotationSchedule', { groupId, groupName, userRole });
    onClose();
  };

  const handleViewAssignment = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    onNavigateToAssignment?.();
    onClose();
  };

  const handleGroupSettings = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('GroupMembers', { groupId, groupName, userRole });
    onClose();
  };

  const handleTaskStatistics = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('DetailedStatistics', { groupId, groupName });
    onClose();
  };

  const handleViewFullLeaderboard = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('FullLeaderboard', { groupId, groupName });
    onClose();
  };

  const handleGroupActivity = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('GroupActivity', { groupId, groupName, userRole });
    onClose();
  };

  const handleMemberContributions = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('MemberContributions', { groupId, groupName, userRole });
    onClose();
  };

  const handleTaskCompletionHistory = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('TaskCompletionHistory', { groupId, groupName, userRole });
    onClose();
  };

  // ===== NEW: Handle Group Swap History =====
  const handleGroupSwapHistory = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('GroupSwapHistory', { groupId, groupName });
    onClose();
  };

  const getLeaderboardGradientColors = (index: number): [string, string] => {
    if (index === 0) return ['#fff3bf', '#ffec99']; // Gold
    if (index === 1) return ['#f1f3f5', '#e9ecef']; // Silver
    if (index === 2) return ['#f8f9fa', '#dee2e6']; // Bronze
    return ['#f8f9fa', '#e9ecef']; // Default
  };

  const renderLeaderboardItem = (item: any, index: number) => {
    const isFirst = index === 0;
    const isSecond = index === 1;
    const isThird = index === 2;

    return (
      <LinearGradient
        key={item.userId}
        colors={getLeaderboardGradientColors(index)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.leaderboardItem,
          isFirst && styles.firstPlace,
          isSecond && styles.secondPlace,
          isThird && styles.thirdPlace
        ].filter(Boolean)}
      >
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
        
        <LinearGradient
          colors={['#d3f9d8', '#b2f2bb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pointsBadge}
        >
          <Text style={styles.pointsText}>{item.totalPoints}</Text>
        </LinearGradient>
      </LinearGradient>
    );
  };

  const incompleteCount = myAssignments.filter((t: any) => 
    t.assignment && !t.assignment.completed
  ).length;

  const getWeekDayName = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getHoursLeftText = () => {
    if (!weekStartDate) return '';
    const now = new Date();
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    const hoursSinceWeekStart = (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60);
    const hoursLeft = Math.max(0, 24 - hoursSinceWeekStart);
    
    if (hoursLeft <= 0) return '';
    if (hoursLeft < 1) return `${Math.round(hoursLeft * 60)}m left`;
    return `${Math.ceil(hoursLeft)}h left`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <MaterialCommunityIcons name="cog" size={20} color="white" />
              </LinearGradient>
              <Text style={styles.modalTitle}>{groupName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color="#868e96" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Rotation Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="calendar-sync" size={16} color="#2b8a3e" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Rotation</Text>
              </View>
              
              <View style={styles.rotationCard}>
                <View>
                  <Text style={styles.rotationLabel}>Current Week</Text>
                  <Text style={styles.rotationValue}>Week {rotationWeek}</Text>
                  {weekStartDate && weekEndDate && (
                    <Text style={styles.rotationDate}>
                      {weekStartDate.toLocaleDateString()} - {weekEndDate.toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity onPress={handleViewRotationSchedule} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="calendar-clock" size={18} color="#2b8a3e" />
                  <Text style={styles.menuItemText}>Rotation Schedule</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
              </TouchableOpacity>
            </View>

            {/* ===== UPDATED: Swap Section - Only for members ===== */}
            {!isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sectionIcon}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={16} color="#2b8a3e" />
                  </LinearGradient>
                  <Text style={styles.sectionTitle}>Week Swap</Text>
                </View>

                {loadingMyTasks ? (
                  <ActivityIndicator size="small" color="#2b8a3e" style={styles.loader} />
                ) : (
                  <View style={[styles.swapCard, !canSwapWeek && styles.swapCardDisabled]}>
                    <View style={styles.swapInfo}>
                      <Text style={styles.swapDescription}>
                        Swap your week {rotationWeek} tasks
                      </Text>
                      
                      <View style={styles.weekAvailability}>
                        <MaterialCommunityIcons 
                          name={canSwapWeek ? "check-circle" : "clock-alert"} 
                          size={14} 
                          color={canSwapWeek ? "#2b8a3e" : "#fa5252"} 
                        />
                        <Text style={[
                          styles.weekAvailabilityText,
                          canSwapWeek ? styles.availableText : styles.unavailableText
                        ]}>
                          {canSwapWeek ? getHoursLeftText() : weekSwapReason}
                        </Text>
                      </View>

                      {canSwapWeek && (
                        <View style={styles.taskCountBadge}>
                          <MaterialCommunityIcons name="clipboard-text" size={12} color="#2b8a3e" />
                          <Text style={styles.taskCountText}>
                            {incompleteCount} incomplete
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={handleSwapEntireWeek}
                      disabled={!canSwapWeek || incompleteCount === 0 || swapLoading}
                      style={[
                        styles.swapActionButton,
                        (!canSwapWeek || incompleteCount === 0) && styles.swapActionDisabled
                      ]}
                    >
                      {swapLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="swap-horizontal" size={16} color="#fff" />
                          <Text style={styles.swapActionText}>Swap</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ===== NEW: Swap History Section - For admins only ===== */}
            {isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sectionIcon}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={16} color="#2b8a3e" />
                  </LinearGradient>
                  <Text style={styles.sectionTitle}>Swap History</Text>
                </View>

                <TouchableOpacity 
                  onPress={handleGroupSwapHistory} 
                  style={styles.menuItem}
                >
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="history" size={18} color="#2b8a3e" />
                    <Text style={styles.menuItemText}>View All Swaps</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                </TouchableOpacity>

                <Text style={styles.swapHistoryNote}>
                  See all swap requests in this group, including pending, accepted, and rejected swaps.
                </Text>
              </View>
            )}

            {/* History Section - All Members */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="history" size={16} color="#2b8a3e" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>History</Text>
              </View>

              <TouchableOpacity onPress={handleTaskCompletionHistory} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="clipboard-list" size={18} color="#2b8a3e" />
                  <Text style={styles.menuItemText}>Task Completion History</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
              </TouchableOpacity>
            </View>

            {/* Admin Actions */}
            {isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sectionIcon}
                  >
                    <MaterialCommunityIcons name="shield-account" size={16} color="#2b8a3e" />
                  </LinearGradient>
                  <Text style={styles.sectionTitle}>Admin</Text>
                </View>

                <TouchableOpacity onPress={handleViewAssignment} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="account-switch" size={18} color="#2b8a3e" />
                    <Text style={styles.menuItemText}>Manage Assignments</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleGroupSettings} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="cog" size={18} color="#2b8a3e" />
                    <Text style={styles.menuItemText}>Group Settings</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleGroupActivity} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="chart-timeline-variant" size={18} color="#2b8a3e" />
                    <Text style={styles.menuItemText}>Group Activity</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleMemberContributions} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="account-details" size={18} color="#2b8a3e" />
                    <Text style={styles.menuItemText}>Member Contributions</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleReviewSubmissions} style={[styles.menuItem, styles.reviewItem]}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="clipboard-check" size={18} color="#fa5252" />
                    <Text style={styles.menuItemText}>Review Submissions</Text>
                  </View>
                  <LinearGradient
                    colors={['#fa5252', '#e03131']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pendingBadge}
                  >
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Statistics */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="chart-bar" size={16} color="#2b8a3e" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Stats</Text>
              </View>

              {loadingStats ? (
                <ActivityIndicator size="small" color="#2b8a3e" style={styles.loader} />
              ) : groupStats ? (
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{groupStats.totalTasks || 0}</Text>
                    <Text style={styles.statLabel}>Tasks</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{groupStats.currentWeek?.totalAssignments || 0}</Text>
                    <Text style={styles.statLabel}>This Week</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{groupStats.recurringTasks || 0}</Text>
                    <Text style={styles.statLabel}>Recurring</Text>
                  </View>
                  <View style={[styles.statItem, styles.pointsStat]}>
                    <Text style={styles.statNumber}>{groupStats.currentWeek?.completedPoints || 0}</Text>
                    <Text style={styles.statLabel}>Points</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noDataText}>No stats available</Text>
              )}

              <TouchableOpacity onPress={handleTaskStatistics} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="chart-box" size={18} color="#2b8a3e" />
                  <Text style={styles.menuItemText}>Detailed Statistics</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
              </TouchableOpacity>
            </View>

            {/* Leaderboard */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="podium" size={16} color="#2b8a3e" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Leaderboard</Text>
              </View>

              {loadingLeaderboard ? (
                <ActivityIndicator size="small" color="#2b8a3e" style={styles.loader} />
              ) : leaderboard.length > 0 ? (
                <View style={styles.leaderboardContainer}>
                  {leaderboard.slice(0, 5).map(renderLeaderboardItem)}
                </View>
              ) : (
                <Text style={styles.noDataText}>No data yet</Text>
              )}

              <TouchableOpacity onPress={handleViewFullLeaderboard} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="trophy" size={18} color="#2b8a3e" />
                  <Text style={styles.menuItemText}>Full Leaderboard</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalFooter}
          >
            <Text style={styles.footerText}>ID: {groupId.substring(0, 8)}...</Text>
            <LinearGradient
              colors={isAdmin ? ['#d3f9d8', '#b2f2bb'] : ['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roleBadge}
            >
              <Text style={[styles.footerRole, isAdmin && styles.adminRole]}>
                {isAdmin ? 'Admin' : 'Member'}
              </Text>
            </LinearGradient>
          </LinearGradient>
        </LinearGradient>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  footerText: {
    fontSize: 12,
    color: '#868e96',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  footerRole: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  adminRole: {
    color: '#2b8a3e',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '500',
  },
  reviewItem: {
    borderBottomWidth: 0,
  },
  rotationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rotationLabel: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 2,
  },
  rotationValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  rotationDate: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 4,
  },
  swapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b8a3e',
  },
  swapCardDisabled: {
    borderColor: '#e9ecef',
    opacity: 0.7,
  },
  swapInfo: {
    flex: 1,
    marginRight: 12,
  },
  swapDescription: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 8,
    fontWeight: '500',
  },
  weekAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  weekAvailabilityText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  availableText: {
    color: '#2b8a3e',
  },
  unavailableText: {
    color: '#fa5252',
  },
  taskCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  taskCountText: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '600',
  },
  swapActionButton: {
    backgroundColor: '#2b8a3e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swapActionDisabled: {
    backgroundColor: '#ced4da',
    opacity: 0.5,
  },
  swapActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pointsStat: {
    backgroundColor: '#d3f9d8',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#868e96',
  },
  noDataText: {
    fontSize: 13,
    color: '#adb5bd',
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  loader: {
    paddingVertical: 20,
  },
  leaderboardContainer: {
    marginBottom: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  firstPlace: {
    borderColor: '#ffd43b',
    borderWidth: 2,
  },
  secondPlace: {
    borderColor: '#ced4da',
    borderWidth: 2,
  },
  thirdPlace: {
    borderColor: '#e9ecef',
    borderWidth: 2,
  },
  leaderboardRank: {
    width: 28,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#868e96',
  },
  leaderboardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    color: '#495057',
    fontWeight: 'bold',
    fontSize: 13,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 1,
  },
  userStats: {
    fontSize: 11,
    color: '#868e96',
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsText: {
    color: '#2b8a3e',
    fontWeight: 'bold',
    fontSize: 11,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
    swapHistoryNote: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
});