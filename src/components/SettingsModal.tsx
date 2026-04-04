// src/components/SettingsModal.tsx - COMPLETE FIXED VERSION

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
import { TokenUtils } from '../utils/tokenUtils';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  
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
  const [recurringTasks, setRecurringTasks] = useState<any[]>([]);
  
  const { createSwapRequest, loading: swapLoading } = useSwapRequests();

  const isAdmin = userRole === 'ADMIN';

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  useEffect(() => {
    if (authError && visible) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
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
  }, [authError, visible, navigation, onClose]);

  // ===== FIXED: Get the earliest recurring task's creation date =====
  const getEarliestRecurringTaskDate = async (): Promise<Date | null> => {
    try {
      // Fetch all tasks for the group
      const response = await TaskService.getGroupTasks(groupId);
      
      if (response.success && response.tasks) {
        // Filter to only recurring tasks (not deleted)
        const recurringTasksList = response.tasks.filter((task: any) => task.isRecurring === true);
        setRecurringTasks(recurringTasksList);
        
        if (recurringTasksList.length === 0) {
          console.log('📅 No recurring tasks found - week swap not available');
          return null;
        }
        
        // Sort by creation date (oldest first)
        const sortedTasks = [...recurringTasksList].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        const earliestTask = sortedTasks[0];
        const earliestDate = new Date(earliestTask.createdAt);
        
        console.log(`📅 Earliest recurring task: "${earliestTask.title}" created on ${earliestDate.toLocaleDateString()}`);
        console.log(`   All recurring tasks count: ${recurringTasksList.length}`);
        
        return earliestDate;
      }
      return null;
    } catch (error) {
      console.error('Error getting earliest recurring task date:', error);
      return null;
    }
  };

  // ===== FIXED: Check week swap availability based on earliest recurring task =====
  const checkWeekSwapAvailability = (firstTaskDate: Date) => {
    const now = new Date();
    const taskCreatedDate = new Date(firstTaskDate);
    
    // Calculate hours since the FIRST recurring task was created
    const hoursSinceTaskCreated = (now.getTime() - taskCreatedDate.getTime()) / (1000 * 60 * 60);
    const isWithinFirst24Hours = hoursSinceTaskCreated >= 0 && hoursSinceTaskCreated <= 24;
    
    const taskCreatedDayName = taskCreatedDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (!isWithinFirst24Hours) { 
      setCanSwapWeek(false);
      if (hoursSinceTaskCreated < 0) {
        setWeekSwapReason(`Week starts on ${taskCreatedDayName} (task not created yet)`);
      } else {
        const daysSince = Math.floor(hoursSinceTaskCreated / 24);
        setWeekSwapReason(`Week swap window closed. Only available within first 24 hours after the first recurring task was created on ${taskCreatedDayName} (${daysSince} day${daysSince > 1 ? 's' : ''} ago)`);
      }
    } else {
      setCanSwapWeek(true);
      const hoursLeft = Math.ceil(24 - hoursSinceTaskCreated);
      const minutesLeft = Math.ceil((24 - hoursSinceTaskCreated) * 60);
      
      if (hoursLeft < 1) {
        setWeekSwapReason(`${minutesLeft} minutes left to swap this week (based on first task created ${taskCreatedDayName})`);
      } else {
        setWeekSwapReason(`${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} left to swap this week (based on first task created ${taskCreatedDayName})`);
      }
    }
  };

  // ===== FIXED: Load group data with proper week reset =====
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
      
      // Get group stats
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

      // Get group info for rotation week
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setRotationWeek(groupResult.group?.currentRotationWeek || 1);
      }

      // Get members
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setMembers(membersResult.members || []);
      }

      // ===== KEY FIX: Get earliest recurring task date for week swap =====
      const earliestTaskDate = await getEarliestRecurringTaskDate();
      setFirstTaskDate(earliestTaskDate);
      
      if (earliestTaskDate) {
        // Calculate week boundaries based on earliest task creation date
        const weekStart = new Date(earliestTaskDate);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        setWeekStartDate(weekStart);
        setWeekEndDate(weekEnd);
        
        // Check if week swap is available
        checkWeekSwapAvailability(earliestTaskDate);
      } else {
        // No recurring tasks - cannot swap week
        setCanSwapWeek(false);
        setWeekSwapReason('No recurring tasks found. Create a task first to enable week swaps.');
        setWeekStartDate(null);
        setWeekEndDate(null);
      }

      // Load user's tasks
      setLoadingMyTasks(true);
      const myTasksResult = await TaskService.getMyTasks(groupId);
      if (myTasksResult.success && myTasksResult.tasks) {
        setMyAssignments(myTasksResult.tasks);
      }
      setLoadingMyTasks(false);

    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setLoadingStats(false);
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadGroupData();
    }
  }, [visible, groupId]);

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
      taskCreatedAt: firstTask.createdAt || new Date().toISOString()
    });
    onClose();
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
    navigation.navigate('DetailedStatistics', { groupId, groupName, userRole });
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

  const handleTeamOverview = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('TeamOverview', { groupId, groupName, userRole });
    onClose();
  };

  const handleTaskCompletionHistory = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('TaskCompletionHistory', { groupId, groupName, userRole });
    onClose();
  };

  const handleGroupSwapHistory = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    navigation.navigate('GroupSwapHistory', { groupId, groupName });
    onClose();
  };

  const getLeaderboardGradientColors = (index: number): [string, string] => {
    if (index === 0) return [theme.primaryLight, theme.primaryLight];
    if (index === 1) return [theme.bgSecondary, theme.bgTertiary];
    if (index === 2) return [theme.bgSecondary, theme.bgTertiary];
    return [theme.bgSecondary, theme.bgTertiary];
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
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {item.userName}
            </Text>
            <Text style={[styles.userStats, { color: theme.textMuted }]}>
              {item.assignments?.length || 0} tasks • {item.totalPoints} pts
            </Text>
          </View>
        </View>
        
        <LinearGradient
          colors={[theme.primaryLight, theme.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pointsBadge}
        >
          <Text style={[styles.pointsText, { color: theme.primary }]}>{item.totalPoints}</Text>
        </LinearGradient>
      </LinearGradient>
    );
  };

  const incompleteCount = myAssignments.filter((t: any) => 
    t.assignment && !t.assignment.completed
  ).length;

  const getHoursLeftText = () => {
    if (!weekStartDate || !canSwapWeek) return '';
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
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.modalContent, { backgroundColor: theme.card }]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <MaterialCommunityIcons name="cog" size={20} color="white" />
              </LinearGradient>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{groupName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.bgTertiary }]}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Rotation Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="calendar-sync" size={16} color={theme.primary} />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Rotation</Text>
              </View>
              
              <View style={[styles.rotationCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                <View>
                  <Text style={[styles.rotationLabel, { color: theme.textMuted }]}>Current Week</Text>
                  <Text style={[styles.rotationValue, { color: theme.text }]}>Week {rotationWeek}</Text>
                  {weekStartDate && weekEndDate && (
                    <Text style={[styles.rotationDate, { color: theme.textMuted }]}>
                      {weekStartDate.toLocaleDateString()} - {weekEndDate.toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity onPress={handleViewRotationSchedule} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="calendar-clock" size={18} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Rotation Schedule</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Swap Section - Only for members */}
            {!isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <LinearGradient
                    colors={[theme.bgSecondary, theme.bgTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sectionIcon}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={16} color={theme.primary} />
                  </LinearGradient>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Week Swap</Text>
                </View>

                {loadingMyTasks ? (
                  <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
                ) : (
                  <View style={[
                    styles.swapCard, 
                    { backgroundColor: theme.bgSecondary, borderColor: canSwapWeek ? theme.primary : theme.border },
                    !canSwapWeek && styles.swapCardDisabled
                  ]}>
                    <View style={styles.swapInfo}>
                      <Text style={[styles.swapDescription, { color: theme.text }]}>
                        Swap your week {rotationWeek} tasks
                      </Text>
                      
                      <View style={styles.weekAvailability}>
                        <MaterialCommunityIcons 
                          name={canSwapWeek ? "check-circle" : "clock-alert"} 
                          size={14} 
                          color={canSwapWeek ? theme.primary : theme.error} 
                        />
                        <Text style={[
                          styles.weekAvailabilityText,
                          { color: canSwapWeek ? theme.primary : theme.error }
                        ]}>
                          {canSwapWeek ? getHoursLeftText() : weekSwapReason}
                        </Text>
                      </View>

                      {canSwapWeek && (
                        <View style={[styles.taskCountBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                          <MaterialCommunityIcons name="clipboard-text" size={12} color={theme.primary} />
                          <Text style={[styles.taskCountText, { color: theme.primary }]}>
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

            {/* Swap History Section - For admins only */}
            {isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <LinearGradient
                    colors={[theme.bgSecondary, theme.bgTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sectionIcon}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={16} color={theme.primary} />
                  </LinearGradient>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Swap History</Text>
                </View>

                <TouchableOpacity 
                  onPress={handleGroupSwapHistory} 
                  style={styles.menuItem}
                >
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="history" size={18} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>View All Swaps</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                <Text style={[styles.swapHistoryNote, { color: theme.textMuted }]}>
                  See all swap requests in this group, including pending, accepted, and rejected swaps.
                </Text>
              </View>
            )}

            {/* History Section - All Members */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="history" size={16} color={theme.primary} />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
              </View>

              <TouchableOpacity onPress={handleTaskCompletionHistory} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="clipboard-list" size={18} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Task Completion History</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Admin Actions */}
            {isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <LinearGradient
                    colors={[theme.bgSecondary, theme.bgTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sectionIcon}
                  >
                    <MaterialCommunityIcons name="shield-account" size={16} color={theme.primary} />
                  </LinearGradient>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin</Text>
                </View>

                <TouchableOpacity onPress={handleViewAssignment} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="account-switch" size={18} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Manage Assignments</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleGroupSettings} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="cog" size={18} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Group Settings</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleGroupActivity} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="chart-timeline-variant" size={18} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Group Activity</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleTeamOverview} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="account-group" size={18} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Team Overview</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleReviewSubmissions} style={[styles.menuItem, styles.reviewItem]}>
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="clipboard-check" size={18} color={theme.error} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Review Submissions</Text>
                  </View>
                  <LinearGradient
                    colors={[theme.error, theme.error]}
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
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="chart-bar" size={16} color={theme.primary} />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Stats</Text>
              </View>

              {loadingStats ? (
                <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
              ) : groupStats ? (
                <View style={styles.statsGrid}>
                  <View style={[styles.statItem, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{groupStats.totalTasks || 0}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>Tasks</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{groupStats.currentWeek?.totalAssignments || 0}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>This Week</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{groupStats.recurringTasks || 0}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>Recurring</Text>
                  </View>
                  <View style={[styles.statItem, styles.pointsStat, { backgroundColor: theme.primaryLight, borderColor: theme.primaryBorder }]}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{groupStats.currentWeek?.completedPoints || 0}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>Points</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.noDataText, { color: theme.textPlaceholder }]}>No stats available</Text>
              )}

              <TouchableOpacity onPress={handleTaskStatistics} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="chart-box" size={18} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Detailed Statistics</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Leaderboard */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="podium" size={16} color={theme.primary} />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Leaderboard</Text>
              </View>

              {loadingLeaderboard ? (
                <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
              ) : leaderboard.length > 0 ? (
                <View style={styles.leaderboardContainer}>
                  {leaderboard.slice(0, 5).map(renderLeaderboardItem)}
                </View>
              ) : (
                <Text style={[styles.noDataText, { color: theme.textPlaceholder }]}>No data yet</Text>
              )}

              <TouchableOpacity onPress={handleViewFullLeaderboard} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="trophy" size={18} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Full Leaderboard</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.modalFooter, { borderTopColor: theme.border }]}
          >
            <Text style={[styles.footerText, { color: theme.textMuted }]}>ID: {groupId.substring(0, 8)}...</Text>
            <LinearGradient
              colors={isAdmin ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roleBadge}
            >
              <Text style={[styles.footerRole, { color: isAdmin ? theme.primary : theme.textSecondary }]}>
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
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
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  },
  footerText: {
    fontSize: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  footerRole: {
    fontSize: 12,
    fontWeight: '500',
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
    fontWeight: '500',
  },
  reviewItem: {
    borderBottomWidth: 0,
  },
  rotationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  rotationLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  rotationValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  rotationDate: {
    fontSize: 11,
    marginTop: 4,
  },
  swapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  swapCardDisabled: {
    opacity: 0.7,
  },
  swapInfo: {
    flex: 1,
    marginRight: 12,
  },
  swapDescription: {
    fontSize: 14,
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
  taskCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
  },
  taskCountText: {
    fontSize: 11,
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  pointsStat: {
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  noDataText: {
    fontSize: 13,
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
    marginBottom: 1,
  },
  userStats: {
    fontSize: 11,
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsText: {
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
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
});