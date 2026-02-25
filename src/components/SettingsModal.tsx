// components/SettingsModal.tsx - UPDATED with token checking
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

    // Check token first
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
      } else if (statsResult.message?.toLowerCase().includes('token') || 
                 statsResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }

      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setRotationWeek(groupResult.group?.currentRotationWeek || 1);
      } else if (groupResult.message?.toLowerCase().includes('token') || 
                 groupResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }

      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setMembers(membersResult.members || []);
      } else if (membersResult.message?.toLowerCase().includes('token') || 
                 membersResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
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
      } else if (myTasksResult.message?.toLowerCase().includes('token') || 
                 myTasksResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
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

  // Show auth error if needed
  useEffect(() => {
    if (authError && visible) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
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

  const handleRotateTasks = async () => {
    // Check token before action
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }

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
                if (result.message?.toLowerCase().includes('token') || 
                    result.message?.toLowerCase().includes('auth')) {
                  setAuthError(true);
                } else {
                  Alert.alert('Error', result.message || 'Failed to rotate tasks');
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to rotate tasks');
            }
          }
        }
      ]
    );
  };

  const handleSwapEntireWeek = async () => {
    // Check token before action
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }

    if (myAssignments.length === 0) {
      Alert.alert('No Tasks', 'You have no assigned tasks this week to swap.');
      return;
    }

    const incompleteAssignments = myAssignments.filter((t: any) => 
      t.assignment && !t.assignment.completed
    );

    if (incompleteAssignments.length === 0) {
      Alert.alert('All Completed', 'You have already completed all your tasks this week.');
      return;
    }

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
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    navigation.navigate('PendingVerifications', {
      groupId,
      groupName,
      userRole
    });
    onClose();
  };

  const handleViewRotationSchedule = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    navigation.navigate('RotationSchedule', { groupId, groupName, userRole });
    onClose();
  };

  const handleViewAssignment = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    onNavigateToAssignment?.();
    onClose();
  };

  const handleGroupSettings = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    navigation.navigate('GroupMembers', { groupId, groupName, userRole });
    onClose();
  };

  const handleTaskStatistics = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    navigation.navigate('DetailedStatistics', { 
      groupId, 
      groupName
    });
    onClose();
  };

  const handleViewFullLeaderboard = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    navigation.navigate('FullLeaderboard', { 
      groupId, 
      groupName
    });
    onClose();
  };

  // Group Activity - Admin only
  const handleGroupActivity = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    navigation.navigate('GroupActivity', {
      groupId,
      groupName,
      userRole
    });
    onClose();
  };

  // Member Contributions - Admin only
  const handleMemberContributions = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    navigation.navigate('MemberContributions', {
      groupId,
      groupName,
      userRole
    });
    onClose();
  };

  // Task Completion History - ALL MEMBERS can see
  const handleTaskCompletionHistory = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }
    navigation.navigate('TaskCompletionHistory', {
      groupId,
      groupName,
      userRole
    });
    onClose();
  };

  // Fixed: Properly typed gradient colors function
  const getLeaderboardGradientColors = (index: number): [string, string] => {
    const isFirst = index === 0;
    const isSecond = index === 1;
    const isThird = index === 2;
    
    if (isFirst) return ['#fff3bf', '#ffec99']; // Gold gradient
    if (isSecond) return ['#f1f3f5', '#e9ecef']; // Silver gradient
    if (isThird) return ['#f8f9fa', '#dee2e6']; // Bronze gradient
    return ['#f8f9fa', '#e9ecef']; // Default light gray
  };

  const renderLeaderboardItem = (item: any, index: number) => {
    const isFirst = index === 0;
    const isSecond = index === 1;
    const isThird = index === 2;

    // Fixed: Properly typed conditional styles
    const getBorderStyle = () => {
      if (isFirst) return styles.firstPlace;
      if (isSecond) return styles.secondPlace;
      if (isThird) return styles.thirdPlace;
      return null;
    };

    return (
      <LinearGradient
        key={item.userId}
        colors={getLeaderboardGradientColors(index)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.leaderboardItem,
          getBorderStyle()
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
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']} // Light gray gradient for avatar background
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userAvatar}
          >
            <Text style={styles.userInitial}>
              {item.userName?.charAt(0) || '?'}
            </Text>
          </LinearGradient>
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
          colors={['#d3f9d8', '#b2f2bb']} // Light green for points badge
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
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalContent}
        >
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
                <MaterialCommunityIcons name="calendar-sync" size={20} color="#495057" />
                <Text style={styles.sectionTitle}>Rotation</Text>
              </View>
              
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']} // Light gray gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rotationCard}
              >
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
                  <TouchableOpacity onPress={handleRotateTasks}>
                    <LinearGradient
                      colors={['#d3f9d8', '#b2f2bb']} // Light green gradient
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.rotateButton}
                    >
                      <MaterialCommunityIcons name="rotate-right" size={16} color="#2b8a3e" />
                      <Text style={styles.rotateButtonText}>Rotate Tasks</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>

              <TouchableOpacity onPress={handleViewRotationSchedule}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButton}
                >
                  <MaterialCommunityIcons name="calendar-clock" size={18} color="#495057" />
                  <Text style={styles.actionButtonText}>View Rotation Schedule</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                </LinearGradient>
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
                <LinearGradient
                  colors={canSwapWeek ? ['#EEF2FF', '#dbe4ff'] : ['#F3F4F6', '#e5e7eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.swapCard,
                    !canSwapWeek && styles.swapCardDisabled
                  ]}
                >
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
                      <LinearGradient
                        colors={['#ffffff', '#f8f9fa']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.taskCountBadge}
                      >
                        <MaterialCommunityIcons name="clipboard-text" size={14} color="#4F46E5" />
                        <Text style={styles.taskCountText}>
                          {incompleteCount} incomplete task(s) this week
                        </Text>
                      </LinearGradient>
                    )}

                    {weekStartDate && (
                      <Text style={styles.weekInfo}>
                        Week started: {weekStartDate.toLocaleDateString()} at 00:00
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={handleSwapEntireWeek}
                    disabled={!canSwapWeek || incompleteCount === 0 || swapLoading}
                  >
                    <LinearGradient
                      colors={canSwapWeek && incompleteCount > 0 ? ['#4F46E5', '#3730a3'] : ['#9CA3AF', '#6B7280']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.swapActionButton,
                        (!canSwapWeek || incompleteCount === 0 || swapLoading) && styles.swapActionDisabled
                      ]}
                    >
                      {swapLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="swap-horizontal" size={18} color="#fff" />
                          <Text style={styles.swapActionText}>Swap Week</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              )}

              {!canSwapWeek && !loadingMyTasks && weekStartDate && (
                <LinearGradient
                  colors={['#fff5f5', '#ffe3e3']} // Light red gradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.infoBox}
                >
                  <MaterialCommunityIcons name="information" size={20} color="#fa5252" />
                  <Text style={styles.infoUnavailableText}>
                    Week swaps are only available within the first 24 hours after the week starts.
                    {'\n\n'}
                    Week started: {weekStartDate.toLocaleDateString()} at 00:00
                  </Text>
                </LinearGradient>
              )}

              {canSwapWeek && incompleteCount === 0 && !loadingMyTasks && (
                <LinearGradient
                  colors={['#d3f9d8', '#b2f2bb']} // Light green gradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.successBox}
                >
                  <MaterialCommunityIcons name="check-circle" size={20} color="#2b8a3e" />
                  <Text style={styles.successText}>
                    ✓ All tasks completed! No pending tasks to swap.
                  </Text>
                </LinearGradient>
              )}
            </View>

            {/* TASK COMPLETION HISTORY - ALL MEMBERS CAN SEE */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="history" size={20} color="#2b8a3e" />
                <Text style={styles.sectionTitle}>History</Text>
              </View>

              <TouchableOpacity onPress={handleTaskCompletionHistory}>
                <LinearGradient
                  colors={['#d3f9d8', '#b2f2bb']} // Light green gradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionButton, styles.historyButton]}
                >
                  <MaterialCommunityIcons name="clipboard-list" size={18} color="#2b8a3e" />
                  <View style={styles.reviewButtonContent}>
                    <Text style={styles.actionButtonText}>Task Completion History</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#2b8a3e" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Admin Actions - Only visible to admins */}
            {isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="shield-account" size={20} color="#495057" />
                  <Text style={styles.sectionTitle}>Admin Actions</Text>
                </View>

                <TouchableOpacity onPress={handleViewAssignment}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons name="account-switch" size={18} color="#495057" />
                    <Text style={styles.actionButtonText}>Manage Assignments</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleGroupSettings}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons name="cog" size={18} color="#495057" />
                    <Text style={styles.actionButtonText}>Group Settings</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Group Activity - Admin only */}
                <TouchableOpacity onPress={handleGroupActivity}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons name="chart-timeline-variant" size={18} color="#495057" />
                    <Text style={styles.actionButtonText}>Group Activity</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Member Contributions - Admin only */}
                <TouchableOpacity onPress={handleMemberContributions}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons name="account-details" size={18} color="#495057" />
                    <Text style={styles.actionButtonText}>Member Contributions</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                  </LinearGradient>
                </TouchableOpacity>
                   
                <TouchableOpacity onPress={handleReviewSubmissions}>
                  <LinearGradient
                    colors={['#fff5f5', '#ffe3e3']} // Light red gradient for review
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionButton, styles.reviewButton]}
                  >
                    <MaterialCommunityIcons name="clipboard-check" size={18} color="#fa5252" />
                    <View style={styles.reviewButtonContent}>
                      <Text style={styles.actionButtonText}>Review Submissions</Text>
                      <LinearGradient
                        colors={['#fa5252', '#e03131']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.pendingBadge}
                      >
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </LinearGradient>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#fa5252" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Statistics Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="chart-bar" size={20} color="#495057" />
                <Text style={styles.sectionTitle}>Statistics</Text>
              </View>

              {loadingStats ? (
                <ActivityIndicator size="small" color="#495057" />
              ) : groupStats ? (
                <View style={styles.statsGrid}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCard}
                  >
                    <Text style={styles.statNumber}>
                      {groupStats.totalTasks || 0}
                    </Text>
                    <Text style={styles.statLabel}>Total Tasks</Text>
                  </LinearGradient>
                  
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCard}
                  >
                    <Text style={styles.statNumber}>
                      {groupStats.currentWeek?.totalAssignments || 0}
                    </Text>
                    <Text style={styles.statLabel}>This Week</Text>
                  </LinearGradient>
                  
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCard}
                  >
                    <Text style={styles.statNumber}>
                      {groupStats.recurringTasks || 0}
                    </Text>
                    <Text style={styles.statLabel}>Recurring</Text>
                  </LinearGradient>
                  
                  <LinearGradient
                    colors={['#d3f9d8', '#b2f2bb']} // Light green for points earned
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCard}
                  >
                    <Text style={styles.statNumber}>
                      {groupStats.currentWeek?.completedPoints || 0}
                    </Text>
                    <Text style={styles.statLabel}>Points Earned</Text>
                  </LinearGradient>
                </View>
              ) : (
                <Text style={styles.noDataText}>No statistics available</Text>
              )}

              <TouchableOpacity onPress={handleTaskStatistics}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButton}
                >
                  <MaterialCommunityIcons name="chart-box" size={18} color="#495057" />
                  <Text style={styles.actionButtonText}>View Detailed Statistics</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Leaderboard Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="podium" size={20} color="#495057" />
                <Text style={styles.sectionTitle}>Leaderboard</Text>
              </View>

              {loadingLeaderboard ? (
                <ActivityIndicator size="small" color="#495057" />
              ) : leaderboard.length > 0 ? (
                <View style={styles.leaderboardContainer}>
                  {leaderboard.slice(0, 5).map((item, index) => 
                    renderLeaderboardItem(item, index)
                  )}
                </View>
              ) : (
                <Text style={styles.noDataText}>No leaderboard data yet</Text>
              )}

              <TouchableOpacity onPress={handleViewFullLeaderboard}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.viewAllButton}
                >
                  <Text style={styles.viewAllText}>View Full Leaderboard</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalFooter}
          >
            <Text style={styles.footerText}>
              Group ID: {groupId.substring(0, 8)}...
            </Text>
            <Text style={styles.footerRole}>
              {isAdmin ? 'Group Admin' : 'Member'}
            </Text>
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
    borderBottomColor: '#e9ecef'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
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
    borderTopColor: '#e9ecef'
  },
  footerText: {
    fontSize: 12,
    color: '#868e96'
  },
  footerRole: {
    fontSize: 12,
    color: '#2b8a3e',
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
    color: '#212529'
  },
  rotationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#868e96',
    marginBottom: 4
  },
  rotationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
  },
  rotationDate: {
    fontSize: 12,
    color: '#868e96',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  rotateButtonText: {
    color: '#2b8a3e',
    fontWeight: '600',
    fontSize: 14
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  actionButtonText: {
    fontSize: 15,
    color: '#212529',
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center'
  },
  noDataText: {
    fontSize: 14,
    color: '#adb5bd',
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  firstPlace: {
    borderColor: '#ffd43b',
    borderWidth: 2
  },
  secondPlace: {
    borderColor: '#ced4da',
    borderWidth: 2
  },
  thirdPlace: {
    borderColor: '#e9ecef',
    borderWidth: 2
  },
  leaderboardRank: {
    width: 32,
    alignItems: 'center'
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#868e96'
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
    justifyContent: 'center',
    alignItems: 'center'
  },
  userInitial: {
    color: '#212529',
    fontWeight: 'bold',
    fontSize: 14
  },
  userInfo: {
    flex: 1 
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2
  },
  userStats: {
    fontSize: 12,
    color: '#868e96'
  },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  pointsText: {
    color: '#2b8a3e',
    fontWeight: 'bold',
    fontSize: 12
  },
  viewAllButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  viewAllText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 14
  },
  reviewButton: {
    borderColor: '#ffc9c9'
  },
  reviewButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12
  },
  pendingBadge: {
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
  historyButton: {
    borderColor: '#b2f2bb'
  },
  swapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
    marginBottom: 8
  },
  swapCardDisabled: {
    borderColor: '#ced4da',
    opacity: 0.7
  },
  swapInfo: {
    flex: 1,
    marginRight: 12
  },
  swapDescription: {
    fontSize: 14,
    color: '#212529',
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
    color: '#868e96',
    marginTop: 6,
    fontStyle: 'italic'
  },
  swapActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  swapActionDisabled: {
    opacity: 0.5
  },
  swapActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  infoBox: {
    flexDirection: 'row',
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