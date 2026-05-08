// src/screens/DetailedStatisticsScreen.tsx - COMPLETE FIXED FOR MEMBERS (Slot-Based)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TaskService } from '../services/TaskService';
import { GroupActivityService } from '../services/GroupActivityService';
import { GroupMembersService } from '../services/GroupMemberService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext'; 
import { AssignmentService } from '../services/AssignmentService';

const { width } = Dimensions.get('window');

export const DetailedStatisticsScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
  const { groupId, groupName, userRole } = route.params;
  const isAdmin = userRole === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [authError, setAuthError] = useState(false);
  
  const [memberDashboard, setMemberDashboard] = useState<any>(null);
  const [myNeglectedTasks, setMyNeglectedTasks] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
     
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [groupId]);

  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  // ✅ Helper function to calculate slot-based completion rate for members
  const calculateSlotCompletionRate = useCallback((dashboardData: any) => {
    const dueToday = dashboardData?.tasks?.dueToday || [];
    const upcoming = dashboardData?.tasks?.upcoming || [];
    const allTasks = [...dueToday, ...upcoming];
    
    if (allTasks.length === 0) return { rate: 0, verifiedSlots: 0, totalSlots: 0 };
    
    let totalSlots = 0;
    let verifiedSlots = 0;
    
    allTasks.forEach((task: any) => {
      // For multi-slot tasks, count each slot individually
      if (task.timeSlots && task.timeSlots.length > 1) {
        const completedSlotIds = task.completedTimeSlotIds || [];
        totalSlots += task.timeSlots.length;
        verifiedSlots += completedSlotIds.length;
      } else {
        // Single slot task
        totalSlots += 1;
        if (task.verified === true) {
          verifiedSlots += 1;
        }
      }
    });
    
    const rate = totalSlots > 0 ? Math.round((verifiedSlots / totalSlots) * 100) : 0;
    return { rate, verifiedSlots, totalSlots };
  }, []);

  const loadStatistics = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(false);
    
    try {
      const leaderboardResult = await GroupActivityService.getLeaderboard(groupId);
      
      // Load group members for rotation count
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setGroupMembers(membersResult.members || []);
      }
      
      if (isAdmin) {
        // ADMIN: Load admin-specific data
        const taskStatsResult = await TaskService.getTaskStatistics(groupId);
        const activityResult = await GroupActivityService.getGroupActivitySummary(groupId);
        
        if (taskStatsResult.success) {
          setStats(taskStatsResult.statistics); 
        }
        if (activityResult.success) {
          setActivityData(activityResult.data);
        }
      } else {
        // MEMBER: Load member dashboard data
        const memberResult = await GroupActivityService.getMemberDashboard(groupId);
        if (memberResult.success && memberResult.data) {
          setMemberDashboard(memberResult.data);
          console.log('📊 [DetailedStatistics] Member dashboard data loaded');
          
          try {
            const neglectedResult = await AssignmentService.getUserNeglectedTasks(groupId);
            if (neglectedResult.success && neglectedResult.data?.tasks) {
              setMyNeglectedTasks(neglectedResult.data.tasks);
            }
          } catch (err) {
            console.log('Error loading neglected tasks:', err);
          }
        }
      }
      
      if (leaderboardResult.success) {
        setLeaderboardData(leaderboardResult.data);
      }
      
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return theme.primary;
    if (rate >= 50) return theme.primary;
    return theme.error;
  };

  if (loading) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading statistics...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Calculate members in rotation
  const membersInRotationCount = groupMembers.filter(m => m.inRotation === true).length;
  const totalMembersCount = groupMembers.length;

  // Data extraction based on role
  let totalMembers = 0;
  let totalTasks = 0;
  let verifiedCount = 0;
  let neglectedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;
  let totalPointsPossible = 0;
  let earnedPoints = 0;
  let weeklyTotalAssignments = 0;
  let userPoints = 0;
  let userCompleted = 0;
  let userPending = 0;
  let userNeglected = 0;
  let userTotalAssignments = 0;
  
  // ✅ SLOT-BASED COMPLETION FOR MEMBERS
  let memberCompletionRate = 0;
  let memberVerifiedSlots = 0;
  let memberTotalSlots = 0;
  if (isAdmin && activityData) {
  // ADMIN: Use activity data
  const summary = activityData.summary || {};
  totalMembers = summary.totalMembers || 0;
  totalTasks = summary.totalTasks || 0;
  
  const assignments = summary.assignments || {};
  
  // ✅ Get the correct counts from assignments object
  const totalAssignments = assignments.total || 0;
  const verifiedAssignments = assignments.verified || 0;
  const neglectedAssignments = assignments.neglected || 0;
  const pendingReview = assignments.pendingVerification || 0;
  
  verifiedCount = verifiedAssignments;
  neglectedCount = neglectedAssignments;
  pendingCount = pendingReview;
  rejectedCount = assignments.rejected || 0;
  
  const points = summary.points || {};
  totalPointsPossible = points.total || 0;
  earnedPoints = points.earned || 0;
  weeklyTotalAssignments = totalAssignments;
  
  // ✅ CORRECT: Use assignment-based completion for Admin too
  memberTotalSlots = totalAssignments;
  memberVerifiedSlots = verifiedAssignments;
  memberCompletionRate = totalAssignments > 0 
    ? Math.round((verifiedAssignments / totalAssignments) * 100) 
    : 0;
  
  console.log('📊 [Admin] Stats:', {
    totalAssignments,
    verifiedAssignments,
    completionRate: memberCompletionRate,
    totalPointsPossible,
    earnedPoints
  });
  
  if (stats) {
    userPoints = stats.userStats?.userPoints || 0;
  }
}else if (!isAdmin && memberDashboard) {
  // MEMBER: Use member dashboard data
  const groupInfo = memberDashboard.group || {};
  const memberStats = memberDashboard.stats || {};
  
  totalMembers = groupInfo.memberCount || 0;
  
  // ✅ Get counts from stats (these are accurate from backend)
  const pendingTasks = memberStats.pendingTasks || 0;
  const completedTasks = memberStats.completedTasks || 0;
  const myNeglectedCount = memberStats.myNeglectedCount || 0;
  const totalAssignments = memberStats.totalAssignments || 0;
  const totalPoints = memberStats.totalPoints || 0;
  const totalPointsPossibleFromApi = memberStats.totalPointsPossible || 0;
  
  verifiedCount = completedTasks;
  neglectedCount = myNeglectedCount;
  pendingCount = pendingTasks;
  rejectedCount = 0;
  
  totalPointsPossible = totalPointsPossibleFromApi;
  earnedPoints = totalPoints;
  weeklyTotalAssignments = totalAssignments;
  
  // User performance stats
  userTotalAssignments = totalAssignments;
  userCompleted = completedTasks;
  userPending = pendingTasks;
  userNeglected = myNeglectedCount;
  userPoints = totalPoints;
  
  // ✅ CORRECT: Completion rate based on assignments, not points
  memberTotalSlots = totalAssignments;
  memberVerifiedSlots = completedTasks;
  memberCompletionRate = totalAssignments > 0 
    ? Math.round((completedTasks / totalAssignments) * 100) 
    : 0;
  
  console.log('📊 [DetailedStatistics] Member stats:', {
    totalAssignments,
    completedTasks,
    myNeglectedCount,
    totalPoints,
    totalPointsPossible,
    completionRate: memberCompletionRate
  });
}  else {
    // Fallback
    const currentWeek = stats?.currentWeek || {};
    verifiedCount = currentWeek.verifiedAssignments || 0;
    neglectedCount = currentWeek.neglectedAssignments || 0;
    totalPointsPossible = currentWeek.totalPoints || 0;
    earnedPoints = currentWeek.completedPoints || 0;
    weeklyTotalAssignments = currentWeek.totalAssignments || 0;
    totalMembers = stats?.totalMembers || 0;
    totalTasks = stats?.totalTasks || 0;
  }
  
  // For Admin: use points-based completion
  // For Member: use slot-based completion
  const completionRateForDisplay = isAdmin 
    ? (totalPointsPossible > 0 ? Math.round((earnedPoints / totalPointsPossible) * 100) : 0)
    : memberCompletionRate;
    
  const allTimePoints = leaderboardData?.totalPoints || 0;

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Statistics</Text>
        <TouchableOpacity 
          onPress={loadStatistics} 
          style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* ADMIN BANNER */}
      {isAdmin && (
        <LinearGradient
          colors={[theme.primaryLight, theme.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.adminBanner, { borderColor: theme.primaryBorder }]}
        >
          <MaterialCommunityIcons name="shield-account" size={16} color={theme.primary} />
          <Text style={[styles.adminBannerText, { color: theme.primary }]}>
            Admin View - Full group statistics
          </Text>
        </LinearGradient>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { borderColor: theme.border }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons name="account-group" size={22} color="#4F46E5" />
            </View>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>{totalMembers}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Members</Text>
          </LinearGradient>

          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { borderColor: theme.border }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="format-list-checks" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>
              {isAdmin ? totalTasks : userTotalAssignments}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
              {isAdmin ? 'Tasks' : 'Your Assignments'}
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { borderColor: theme.border }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="check-circle" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>
              {isAdmin ? verifiedCount : (memberVerifiedSlots > 0 ? memberVerifiedSlots : verifiedCount)}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
              {isAdmin ? 'Verified' : 'Verified Slots'}
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { borderColor: theme.border }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.errorBg }]}>
              <MaterialCommunityIcons name="alert-circle" size={22} color={theme.error} />
            </View>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>{neglectedCount}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Neglected</Text>
          </LinearGradient>
        </View>

        {/* Points Overview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Points Overview</Text>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.pointsCard, { borderColor: theme.border }]}
          >
            {/* Show Total Slots for Members, Total Points for Admin */}
            {!isAdmin && memberTotalSlots > 0 && (
              <View style={styles.pointsRow}>
                <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>Total Slots:</Text>
                <Text style={[styles.pointsValue, { color: theme.text }]}>{memberTotalSlots}</Text>
              </View>
            )}
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>
                {isAdmin ? 'Total Points Possible:' : 'Total Points Possible:'}
              </Text>
              <Text style={[styles.pointsValue, { color: theme.text }]}>{totalPointsPossible}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>
                {isAdmin ? 'Verified Points Earned:' : 'Your Points Earned:'}
              </Text>
              <Text style={[styles.pointsValue, { color: theme.primary }]}>{earnedPoints}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>All-Time Verified Points:</Text>
              <Text style={[styles.pointsValue, { color: theme.primary }]}>{allTimePoints}</Text>
            </View>
            
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>
                {isAdmin ? 'Pending Verification:' : 'Pending Tasks:'}
              </Text>
              <Text style={[styles.pointsValue, { color: theme.primary }]}>
                {pendingCount} {isAdmin ? 'tasks' : 'tasks'}
              </Text>
            </View>
            
            {rejectedCount > 0 && (
              <View style={styles.pointsRow}>
                <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>Rejected:</Text>
                <Text style={[styles.pointsValue, { color: theme.error }]}>
                  {rejectedCount} tasks
                </Text>
              </View>
            )}
            
            {/* Completion Rate Bar - SLOT-BASED FOR MEMBERS */}
            <View style={[styles.progressBar, { backgroundColor: theme.bgTertiary }]}>
              <LinearGradient
                colors={[
                  getCompletionRateColor(completionRateForDisplay),
                  getCompletionRateColor(completionRateForDisplay) + 'dd'
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${completionRateForDisplay}%` }]} 
              />
            </View>
            <Text style={[styles.completionRate, { color: theme.textMuted }]}>
              {completionRateForDisplay}% Completion Rate 
              {!isAdmin && memberTotalSlots > 0 
                ? ` (${memberVerifiedSlots}/${memberTotalSlots} slots verified)`
                : ` (${earnedPoints}/${totalPointsPossible} points)`}
            </Text>
          </LinearGradient>
        </View>

        {/* Weekly Assignment Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {isAdmin ? 'Weekly Assignment Status' : 'Your Weekly Status'}
          </Text>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.distributionCard, { borderColor: theme.border }]}
          >
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>
                  {isAdmin ? 'Total Assignments' : 'Your Assignments'}
                </Text>
              </View>
              <Text style={[styles.distributionNumber, { color: theme.text }]}>{weeklyTotalAssignments}</Text>
            </View>
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>
                  {isAdmin ? 'Verified' : 'Completed'}
                </Text>
              </View>
              <Text style={[styles.distributionNumber, { color: theme.primary }]}>{verifiedCount}</Text>
            </View>
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>
                  {isAdmin ? 'Pending Verification' : 'Pending Tasks'}
                </Text>
              </View>
              <Text style={[styles.distributionNumber, { color: theme.primary }]}>{pendingCount}</Text>
            </View>
            {rejectedCount > 0 && (
              <View style={styles.distributionRow}>
                <View style={styles.distributionLabel}>
                  <View style={[styles.dot, { backgroundColor: theme.error }]} />
                  <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>Rejected</Text>
                </View>
                <Text style={[styles.distributionNumber, { color: theme.error }]}>{rejectedCount}</Text>
              </View>
            )}
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: theme.error }]} />
                <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>Neglected/Missed</Text>
              </View>
              <Text style={[styles.distributionNumber, { color: theme.error }]}>{neglectedCount}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Task Distribution */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Task Distribution</Text>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.distributionCard, { borderColor: theme.border }]}
          >
            {isAdmin && (
              <>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionLabel}>
                    <View style={[styles.dot, { backgroundColor: '#4F46E5' }]} />
                    <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>Daily Tasks</Text>
                  </View>
                  <Text style={[styles.distributionNumber, { color: theme.text }]}>{stats?.dailyTasks || 0}</Text>
                </View>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionLabel}>
                    <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>Weekly Tasks</Text>
                  </View>
                  <Text style={[styles.distributionNumber, { color: theme.text }]}>{stats?.weeklyTasks || 0}</Text>
                </View>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionLabel}>
                    <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>Recurring Tasks</Text>
                  </View>
                  <Text style={[styles.distributionNumber, { color: theme.text }]}>{stats?.recurringTasks || 0}</Text>
                </View>
              </>
            )}

            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>Members in Rotation</Text>
              </View>
              <Text style={[styles.distributionNumber, { color: theme.text }]}>{membersInRotationCount}</Text>
            </View>
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.distributionLabelText, { color: theme.textSecondary }]}>Total Members</Text>
              </View>
              <Text style={[styles.distributionNumber, { color: theme.text }]}>{totalMembersCount}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Member's Performance - Only for members */}
        {!isAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Performance</Text>
            <LinearGradient
              colors={[theme.card, theme.bgSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.performanceCard, { borderColor: theme.border }]}
            >
              <View style={styles.performanceRow}>
                <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Your Assignments:</Text>
                <Text style={[styles.performanceNumber, { color: theme.text }]}>{userTotalAssignments}</Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Completed:</Text>
                <Text style={[styles.performanceNumber, { color: theme.primary }]}>
                  {userCompleted}
                </Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Pending:</Text>
                <Text style={[styles.performanceNumber, { color: theme.primary }]}>
                  {userPending}
                </Text>
              </View>
              {userNeglected > 0 && (
                <View style={styles.performanceRow}>
                  <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Neglected:</Text>
                  <Text style={[styles.performanceNumber, { color: theme.error }]}>
                    {userNeglected}
                  </Text>
                </View>
              )}
              <View style={styles.performanceRow}>
                <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Your Points:</Text>
                <Text style={[styles.performanceNumber, { color: theme.primary }]}>
                  {userPoints}
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Show member's neglected tasks if any */}
        {!isAdmin && myNeglectedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Missed Tasks</Text>
            <LinearGradient
              colors={[theme.card, theme.bgSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.performanceCard, { borderColor: theme.errorBorder }]}
            >
              {myNeglectedTasks.slice(0, 5).map((task) => (
                <View key={task.id} style={styles.neglectedRow}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={theme.error} />
                  <Text style={[styles.neglectedText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {task.taskTitle}
                  </Text>
                  <Text style={[styles.neglectedPoints, { color: theme.error }]}>
                    -{task.points} pts
                  </Text>
                </View>
              ))}
              {myNeglectedTasks.length > 5 && (
                <Text style={[styles.moreText, { color: theme.textMuted }]}>
                  +{myNeglectedTasks.length - 5} more
                </Text>
              )}
            </LinearGradient>
          </View>
        )}

      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  adminBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingLeft: 4,
  },
  pointsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pointsLabel: {
    fontSize: 14,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completionRate: {
    fontSize: 13,
    textAlign: 'center',
  },
  distributionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  distributionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionLabelText: {
    fontSize: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distributionNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  performanceCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 14,
  },
  performanceNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  neglectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 8,
  },
  neglectedText: {
    flex: 1,
    fontSize: 13,
  },
  neglectedPoints: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
}); 