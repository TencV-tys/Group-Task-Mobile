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
  Alert,
  Image
} from 'react-native'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import { GroupActivityService } from '../services/GroupActivityService';
import { AssignmentService } from '../services/AssignmentService';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { TokenUtils } from '../utils/tokenUtils';
import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';

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
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // ✅ MOVED HERE
  
  const { createSwapRequest, loading: swapLoading } = useSwapRequests();

  const isAdmin = userRole === 'ADMIN';

  // ✅ MOVED HERE - Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await TokenUtils.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  const fetchPendingVerificationsCount = useCallback(async () => {
    if (!isAdmin) return;
    
    const hasToken = await checkToken();
    if (!hasToken) return;
    
    try {
      const result = await AssignmentService.getPendingVerifications(groupId, {
        limit: 1,
        offset: 0
      });
      
      if (result.success && result.data) {
        const count = result.data.total || 0;
        setPendingVerificationsCount(count);
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  }, [groupId, checkToken, isAdmin]);

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

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: performLogout 
        }
      ]
    );
  }, []);

  const handleMySubmissions = async () => {
  const hasToken = await checkToken();
  if (!hasToken) return;
  navigation.navigate('MySubmissions', { groupId, groupName, userRole });
  onClose();
};

  const performLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      const result = await AuthService.logout();
      if (result.success) {
        onClose();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        onClose();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (error) {
      console.error('Logout error:', error);
      onClose();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } finally {
      setLoggingOut(false);
    }
  }, [navigation, onClose]);

  const getEarliestRecurringTaskDate = async (): Promise<Date | null> => {
    try {
      const response = await TaskService.getGroupTasks(groupId);
      
      if (response.success && response.tasks) {
        const recurringTasksList = response.tasks.filter((task: any) => task.isRecurring === true);
        setRecurringTasks(recurringTasksList);
        
        if (recurringTasksList.length === 0) {
          return null;
        }
        
        const sortedTasks = [...recurringTasksList].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        const earliestTask = sortedTasks[0];
        const earliestDate = new Date(earliestTask.createdAt);
        
        return earliestDate;
      }
      return null;
    } catch (error) {
      console.error('Error getting earliest recurring task date:', error);
      return null;
    }
  };

const checkWeekSwapAvailability = (firstTaskDate: Date) => {
  const now = new Date();
  const taskCreatedDate = new Date(firstTaskDate);
  
  const hoursSinceTaskCreated = (now.getTime() - taskCreatedDate.getTime()) / (1000 * 60 * 60);
  const isWithinFirst24Hours = hoursSinceTaskCreated >= 0 && hoursSinceTaskCreated <= 24;
  
  // ✅ Check if user has already submitted/completed any tasks
  const hasSubmittedTask = myAssignments.some((task: any) => 
    task.assignment?.completed === true || 
    task.assignment?.verified !== null ||
    task.assignment?.photoUrl !== null
  );
  
  // ✅ Check if user has any incomplete tasks to swap
  const hasIncompleteTasks = myAssignments.some((task: any) => 
    task.assignment && !task.assignment.completed && task.assignment.verified === null && task.assignment.photoUrl === null
  );
  
  const taskCreatedDayName = taskCreatedDate.toLocaleDateString('en-US', { weekday: 'long' });
  
  // ✅ Determine if swap is available
  if (hasSubmittedTask) {
    setCanSwapWeek(false);
    setWeekSwapReason(`Cannot swap week because you have already submitted or completed a task this week.`);
  } else if (!hasIncompleteTasks) {
    setCanSwapWeek(false);
    setWeekSwapReason(`No incomplete tasks to swap. All tasks are completed.`);
  } else if (!isWithinFirst24Hours) {
    setCanSwapWeek(false);
    if (hoursSinceTaskCreated < 0) {
      setWeekSwapReason(`Week starts on ${taskCreatedDayName} (task not created yet)`);
    } else {
      const daysSince = Math.floor(hoursSinceTaskCreated / 24);
      setWeekSwapReason(`Week swap window closed. Only available within first 24 hours after the week starts (${daysSince} day${daysSince > 1 ? 's' : ''} ago)`);
    }
  } else {
    setCanSwapWeek(true);
    const hoursLeft = Math.ceil(24 - hoursSinceTaskCreated);
    const minutesLeft = Math.ceil((24 - hoursSinceTaskCreated) * 60);
    
    if (hoursLeft < 1) {
      setWeekSwapReason(`${minutesLeft} minutes left to swap this week`);
    } else {
      setWeekSwapReason(`${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} left to swap this week`);
    }
  }
};

// Update swap availability when myAssignments changes
useEffect(() => {
  if (visible && firstTaskDate && myAssignments.length > 0) {
    checkWeekSwapAvailability(firstTaskDate);
  }
}, [myAssignments, firstTaskDate, visible]);


 
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
    
    const leaderboardResult = await GroupActivityService.getLeaderboard(groupId);
    
    let totalVerifiedPoints = 0;
    if (leaderboardResult.success && leaderboardResult.data?.leaderboard) {
      totalVerifiedPoints = leaderboardResult.data.leaderboard.reduce(
        (sum: number, member: any) => sum + (member.points || 0), 0
      );
      const top5 = leaderboardResult.data.leaderboard.slice(0, 5);
      setLeaderboard(top5);
    }
    
    if (statsResult.success) {
      const mergedStats = {
        ...statsResult.statistics,
        currentWeek: {
          ...statsResult.statistics?.currentWeek,
          earnedPoints: totalVerifiedPoints,
          verifiedPoints: totalVerifiedPoints
        }
      };
      setGroupStats(mergedStats);
    }

    const groupResult = await GroupMembersService.getGroupInfo(groupId);
    if (groupResult.success) {
      setRotationWeek(groupResult.group?.currentRotationWeek || 1);
    }

    const membersResult = await GroupMembersService.getGroupMembers(groupId);
    if (membersResult.success) {
      setMembers(membersResult.members || []);
    }

    const earliestTaskDate = await getEarliestRecurringTaskDate();
    setFirstTaskDate(earliestTaskDate);
    
    if (earliestTaskDate) {
      const weekStart = new Date(earliestTaskDate);
      weekStart.setUTCHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);
      
      setWeekStartDate(weekStart);
      setWeekEndDate(weekEnd);
      
      // Don't call checkWeekSwapAvailability here yet - wait for myAssignments
    } else {
      setCanSwapWeek(false);
      setWeekSwapReason('No recurring tasks found. Create a task first to enable week swaps.');
      setWeekStartDate(null);
      setWeekEndDate(null);
    }

    setLoadingMyTasks(true);
    const myTasksResult = await TaskService.getMyTasks(groupId);
    if (myTasksResult.success && myTasksResult.tasks) {
      setMyAssignments(myTasksResult.tasks);
    }
    setLoadingMyTasks(false);

    await fetchPendingVerificationsCount();

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
    navigation.navigate('FullLeaderboard', { groupId, groupName,userRole });
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

  // ✅ FIXED: No hooks inside render function!
 

const renderLeaderboardItem = (item: any, index: number) => {
  const isFirst = index === 0;
  const isSecond = index === 1;
  const isThird = index === 2;

  const handleLeaderboardPress = () => {
    const memberId = item.userId;
    if (!memberId) {
      Alert.alert('Error', 'Cannot view member details - missing ID');
      return;
    }
    
    if (memberId === currentUserId) {
      navigation.navigate('MemberContributions', { 
        groupId, 
        groupName, 
        memberId,
        userRole: userRole
      });
      onClose();
    } else if (isAdmin) {
      navigation.navigate('MemberContributions', { 
        groupId, 
        groupName, 
        memberId,
        userRole: 'ADMIN'
      });
      onClose();
    } else {
      Alert.alert(
        'Access Denied',
        'You can only view your own contributions. Admins can view all members.',
        [{ text: 'OK' }]
      );
    }
  };

  const isCurrentUser = item.userId === currentUserId;

const getOptimizedAvatarUrl = (url: string) => {
  if (!url) return null;
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', '/upload/w_96,h_96,c_fill,q_auto,f_auto/');
  }
  return url;
};

  return (
    <TouchableOpacity
      key={item.userId}
      onPress={handleLeaderboardPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={getLeaderboardGradientColors(index)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.leaderboardItem,
          isFirst && styles.firstPlace,
          isSecond && styles.secondPlace,
          isThird && styles.thirdPlace,
          isCurrentUser && styles.currentUserItem
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
          {/* ✅ UPDATED: Cloudinary avatar with fallback */}
          {item.avatarUrl ? (
            <Image 
  source={{ uri: getOptimizedAvatarUrl(item.avatarUrl) } as any} 
  style={styles.userAvatarImage}
  resizeMode="cover"
    onError={(e) => {
                console.log('Failed to load avatar:', item.avatarUrl);
              }}
/>
          ) : (
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {item.fullName?.charAt(0) || '?'}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {item.fullName}
              {isCurrentUser && <Text style={[styles.youBadge, { color: theme.primary }]}> (You)</Text>}
            </Text>
            <Text style={[styles.userStats, { color: theme.textMuted }]}>
              {item.points} points
            </Text>
          </View>
        </View>
        
        <LinearGradient
          colors={[theme.primaryLight, theme.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pointsBadge}
        >
          <Text style={[styles.pointsText, { color: theme.primary }]}>{item.points}</Text>
        </LinearGradient>
      </LinearGradient>
    </TouchableOpacity>
  );
};

  const incompleteCount = myAssignments.filter((t: any) => 
    t.assignment && !t.assignment.completed
  ).length;

  const getHoursLeftText = () => {
    if (!weekStartDate || !canSwapWeek) return '';
    const now = new Date();
    const weekStart = new Date(weekStartDate);
    weekStart.setUTCHours(0, 0, 0, 0);
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
              <MaterialCommunityIcons name="close" size={20} color={theme.primary} />
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
               {!isAdmin &&
              <TouchableOpacity onPress={handleMySubmissions} style={styles.menuItem}>
    <View style={styles.menuItemLeft}>
      <MaterialCommunityIcons name="clipboard-list" size={18} color={theme.primary} />
      <Text style={[styles.menuItemText, { color: theme.text }]}>My Submissions</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
  </TouchableOpacity>
}
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
                    <Text style={styles.pendingBadgeText}>
                      {pendingVerificationsCount > 0 ? pendingVerificationsCount : 'Pending'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Statistics Section */}
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
                    <Text style={[styles.statNumber, { color: theme.primary }]}>{groupStats.currentWeek?.earnedPoints || groupStats.currentWeek?.completedPoints || 0}</Text>
                    <Text style={[styles.statLabel, { color: theme.primary }]}>Verified Pts</Text>
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

            {/* Logout Button - For ALL Users */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sectionIcon}
                >
                  <MaterialCommunityIcons name="logout" size={16} color={theme.error} />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
              </View>

              <TouchableOpacity 
                onPress={handleLogout} 
                disabled={loggingOut}
                style={styles.logoutMenuItem}
              >
                <LinearGradient
                  colors={[theme.errorBg, theme.errorBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoutGradient}
                >
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons name="logout" size={20} color={theme.error} />
                    <Text style={[styles.logoutText, { color: theme.error }]}>
                      {loggingOut ? 'Logging out...' : 'Logout'}
                    </Text>
                  </View>
                  {loggingOut ? (
                    <ActivityIndicator size="small" color={theme.error} />
                  ) : (
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.error} />
                  )}
                </LinearGradient>
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
  logoutMenuItem: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentUserItem: {
    borderWidth: 2,
    borderColor: '#2b8a3e',
    backgroundColor: '#ebfbee',
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  userAvatarImage: {
  width: 32,
  height: 32,
  borderRadius: 16,
},
});