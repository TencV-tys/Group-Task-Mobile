// src/screens/TodayAssignmentsScreen.tsx - WITH PROPER STATUS BADGES

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AssignmentService, TodayAssignment } from '../services/AssignmentService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

// ✅ Status helper functions (copied from TaskDetailsScreen)
const isDueTodayUTC = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate);
  
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUTC = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  
  return todayUTC === dueUTC;
};

const getAssignmentStatus = (assignment: any, theme: any) => {
  // 1. Verified
  if (assignment.verified === true) {
    return { 
      status: 'verified', 
      color: theme.primary, 
      icon: 'check-circle',
      text: 'Verified'
    };
  }
  
  // 2. Rejected
  if (assignment.verified === false) {
    return { 
      status: 'rejected', 
      color: theme.error, 
      icon: 'close-circle',
      text: 'Rejected'
    };
  }
  
  // 3. Expired
  if (assignment.expired === true) {
    return { 
      status: 'expired', 
      color: theme.error, 
      icon: 'timer-off',
      text: 'Expired'
    };
  }
  
  // 4. Missed
  const missedSlotIds = assignment.missedTimeSlotIds || [];
  const currentTimeSlotId = assignment.timeSlot?.id;
  if (currentTimeSlotId && missedSlotIds.includes(currentTimeSlotId)) {
    return { 
      status: 'missed', 
      color: theme.error, 
      icon: 'close-circle',
      text: 'Missed'
    };
  }
  
  // 5. Pending Verification (submitted but not verified)
  if (assignment.completed === true && assignment.verified === null) {
    return { 
      status: 'pending_verification', 
      color: theme.primary, 
      icon: 'clock-check',
      text: 'Pending'
    };
  }
  
  // 6. Completed (fully done)
  if (assignment.completed === true) {
    return { 
      status: 'completed', 
      color: theme.primary, 
      icon: 'check-circle',
      text: 'Completed'
    };
  }
  
  // 7. Overdue
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  
  if (isOverdue) {
    return { 
      status: 'overdue', 
      color: theme.error, 
      icon: 'alert-circle',
      text: 'Overdue'
    };
  }
  
  // 8. Due Today
  const dueToday = isDueTodayUTC(assignment.dueDate);
  if (dueToday) {
    return { 
      status: 'due_today', 
      color: theme.primary, 
      icon: 'clock-alert',
      text: 'Due Today'
    };
  }
  
  // 9. Default - Pending
  return { 
    status: 'pending', 
    color: theme.textSecondary, 
    icon: 'clock-outline',
    text: 'Pending'
  };
};

export default function TodayAssignmentsScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const { groupId, groupName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [assignments, setAssignments] = useState<TodayAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

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

  useEffect(() => {
    fetchTodayAssignments();
  }, [groupId]);

  const fetchTodayAssignments = async (isRefreshing = false) => {
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
      const result = await AssignmentService.getTodayAssignments(groupId);
      
      if (result.success) {
        const assignmentsData = result.data?.assignments || [];
        setAssignments(assignmentsData);
      } else {
        setError(result.message || 'Failed to load today\'s assignments');
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

  const handleViewAssignment = (assignmentId: string) => {
    navigation.navigate('AssignmentDetails', {
      assignmentId,
      isAdmin: false,
      onVerified: () => fetchTodayAssignments(true)
    });
  };

  const formatTimeLeft = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const renderAssignment = ({ item }: { item: TodayAssignment }) => {
    // Get status using the same function as TaskDetailsScreen
    const status = getAssignmentStatus(item, theme);
    const timeLeft = item.timeLeft;
    const isUrgent = timeLeft ? timeLeft < 300 : false;
    const isLate = item.willBePenalized ?? false;
    
    // Get gradient colors based on status
    const getGradientColors = (): [string, string] => {
      if (status.status === 'verified' || status.status === 'completed') {
        return [theme.primaryLight, theme.primaryLight];
      }
      if (status.status === 'expired' || status.status === 'missed' || status.status === 'rejected') {
        return [theme.errorBg, theme.errorBg];
      }
      if (isLate) {
        return [theme.primaryLight, theme.primaryLight];
      }
      if (isUrgent) {
        return [theme.errorBg, theme.errorBg];
      }
      if (item.canSubmit) {
        return [theme.primaryLight, theme.primaryLight];
      }
      return [theme.card, theme.bgSecondary];
    };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleViewAssignment(item.id)}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.assignmentCard,
            { borderColor: theme.border }
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
                {item.taskTitle}
              </Text>
              <Text style={[styles.groupName, { color: theme.textMuted }]}>{item.group?.name || 'Unknown Group'}</Text>
            </View>
            
            {/* ✅ Status Badge - matches TaskDetailsScreen */}
            <LinearGradient
              colors={[status.color + '20', status.color + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statusBadge}
            >
              <MaterialCommunityIcons name={status.icon as any} size={14} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
            </LinearGradient>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.timeSlot}>
              <MaterialCommunityIcons name="clock" size={16} color={theme.textMuted} />
              <Text style={[styles.timeSlotText, { color: theme.textSecondary }]}>
                {item.timeSlot 
                  ? `${item.timeSlot.startTime} - ${item.timeSlot.endTime}`
                  : 'Anytime today'}
              </Text>
            </View>

            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsBadge}
            >
              <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
              <Text style={[styles.pointsText, { color: theme.primary }]}>
                {item.finalPoints || item.taskPoints} pts
                {item.willBePenalized && item.finalPoints && (
                  <Text style={[styles.penaltyText, { color: theme.error }]}> (-{item.taskPoints - item.finalPoints})</Text>
                )}
              </Text>
            </LinearGradient>
          </View>

          {item.timeLeft !== undefined && item.timeLeft > 0 && status.status === 'due_today' && (
            <LinearGradient
              colors={isUrgent ? [theme.errorBg, theme.errorBg] : [theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.timerContainer, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons 
                name={isUrgent ? "timer-alert" : "timer"} 
                size={16} 
                color={isUrgent ? theme.error : theme.primary} 
              />
              <Text style={[styles.timerText, isUrgent && styles.urgentTimerText, { color: isUrgent ? theme.error : theme.primary }]}>
                {formatTimeLeft(item.timeLeft)} left
              </Text>
            </LinearGradient>
          )}

          {item.reason && !item.canSubmit && status.status !== 'expired' && status.status !== 'verified' && (
            <Text style={[styles.reasonText, { color: theme.textMuted }]}>{item.reason}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[theme.card, theme.bgSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, { borderBottomColor: theme.border }]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          Today's Assignments
        </Text>
        {groupName && (
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{groupName}</Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        onPress={() => fetchTodayAssignments(true)}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
        )}
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading today's assignments...</Text>
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
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={[theme.error, theme.error]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      {renderHeader()}

      <FlatList
        data={assignments}
        renderItem={renderAssignment}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchTodayAssignments(true)}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.emptyIconContainer, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="calendar-check" size={40} color={theme.primary} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>No active assignments due today!</Text>
              <Text style={[styles.emptySubtext, { color: theme.textPlaceholder }]}>
                You're all caught up for today
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContainer}
      />
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
  titleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 12, marginTop: 2, textAlign: 'center' },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  errorSubtext: { fontSize: 14, marginBottom: 24, textAlign: 'center' },
  retryButton: { borderRadius: 8, overflow: 'hidden' },
  retryButtonGradient: { paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  listContainer: { padding: 16, flexGrow: 1 },
  assignmentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  taskInfo: { flex: 1, marginRight: 12 },
  taskTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  groupName: { fontSize: 13 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  timeSlot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeSlotText: { fontSize: 14 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4, borderWidth: 1 },
  pointsText: { fontSize: 13, fontWeight: '600' },
  penaltyText: { fontSize: 11, fontWeight: '400' },
  timerContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, gap: 6, borderWidth: 1 },
  timerText: { fontSize: 13, fontWeight: '500' },
  urgentTimerText: {},
  reasonText: { fontSize: 13, fontStyle: 'italic', marginTop: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIconContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
});