// src/screens/TodayAssignmentsScreen.tsx - FULLY FIXED with submission status check

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ✅ Convert 24hr to 12hr format with AM/PM
const formatTo12Hour = (time24: string): string => {
  if (!time24) return '';
  const [hourStr, minuteStr] = time24.split(':');
  let hour = parseInt(hourStr || '0', 10);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

// ✅ Format time slot for display
const formatTimeSlotDisplay = (timeSlot: any): string => {
  if (!timeSlot) return 'Anytime today';
  const start12 = formatTo12Hour(timeSlot.startTime);
  const end12 = formatTo12Hour(timeSlot.endTime);
  return `${start12} - ${end12}`;
};

// ✅ Check if due today using UTC
const isDueTodayUTC = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate);
  
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUTC = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  
  return todayUTC === dueUTC;
};

// ✅ REAL-TIME time validation function - MATCHES useCompleteAssignment
const getRealTimeValidation = (assignment: TodayAssignment) => {
  const now = new Date();
  const dueDate = new Date(assignment.dueDate);
  
  // Check if due today using UTC
  const dueDateUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  
  if (dueDateUTC !== todayUTC) {
    return {
      canSubmit: false,
      status: 'wrong_day',
      reason: 'Not due today',
      willBePenalized: false,
      finalPoints: assignment.taskPoints,
      timeLeft: null,
      opensIn: null
    };
  }
  
  // If no time slot, always available
  if (!assignment.timeSlot) {
    return {
      canSubmit: true,
      status: 'available',
      reason: 'Available anytime today',
      willBePenalized: false,
      finalPoints: assignment.taskPoints,
      timeLeft: null,
      opensIn: null
    };
  }
  
  // Parse time slot times (PHT)
  const [endHour, endMinute] = assignment.timeSlot.endTime.split(':').map(Number);
  
  // Convert PHT to UTC (subtract 8 hours)
  const endTimeUTC = new Date(Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
    endHour - 8, endMinute, 0, 0
  ));
  
  // Late threshold: 25 minutes after end time (5 minutes before grace ends)
  const lateThreshold = new Date(endTimeUTC.getTime() + 25 * 60000);
  
  // Grace period ends 30 minutes after end time
  const gracePeriodEnd = new Date(endTimeUTC.getTime() + 30 * 60000);
  
  const nowMs = now.getTime();
  const endTimeMs = endTimeUTC.getTime();
  const graceEndMs = gracePeriodEnd.getTime();
  const lateThresholdMs = lateThreshold.getTime();
  
  // Before end time - waiting
  if (nowMs < endTimeMs) {
    const opensIn = Math.floor((endTimeMs - nowMs) / 1000);
    return {
      canSubmit: false,
      status: 'waiting',
      reason: `Opens at ${formatTo12Hour(assignment.timeSlot.endTime)}`,
      willBePenalized: false,
      finalPoints: assignment.taskPoints,
      timeLeft: opensIn,
      opensIn
    };
  }
  
  // During grace period - available
  if (nowMs >= endTimeMs && nowMs <= graceEndMs) {
    const isLate = nowMs > lateThresholdMs;
    const timeLeft = Math.floor((graceEndMs - nowMs) / 1000);
    const penaltyAmount = isLate ? Math.floor(assignment.taskPoints * 0.5) : 0;
    const finalPoints = assignment.taskPoints - penaltyAmount;
    
    return {
      canSubmit: true,
      status: 'available',
      reason: isLate ? 'Late submission (points reduced)' : 'Available to submit',
      willBePenalized: isLate,
      finalPoints,
      timeLeft,
      opensIn: null
    };
  }
  
  // After grace period - expired
  return {
    canSubmit: false,
    status: 'expired',
    reason: 'Submission window closed',
    willBePenalized: false,
    finalPoints: assignment.taskPoints,
    timeLeft: 0,
    opensIn: null
  };
};

// ✅ Get assignment status for display
const getAssignmentStatus = (assignment: TodayAssignment, theme: any, realTimeValidation: any) => {
  // ✅ PRIORITY 1: Check if assignment has been submitted (has photo or verified)
  // This comes from the API response - assignment.photoUrl and assignment.verified
  if (assignment.photoUrl !== null && assignment.photoUrl !== undefined) {
    if (assignment.verified === true) {
      return { 
        status: 'verified', 
        color: '#2b8a3e',
        icon: 'check-circle',
        text: 'Verified',
        isSubmitted: true
      };
    }
    if (assignment.verified === false) {
      return { 
        status: 'rejected', 
        color: theme.error, 
        icon: 'close-circle',
        text: 'Rejected',
        isSubmitted: true
      };
    }
    // Has photo but not verified yet
    return { 
      status: 'pending_verification', 
      color: theme.primary, 
      icon: 'clock-check',
      text: 'Pending Review',
      isSubmitted: true
    };
  }
  
  // ✅ Check real-time validation status for non-submitted assignments
  if (realTimeValidation.status === 'expired') {
    return { 
      status: 'expired', 
      color: theme.error, 
      icon: 'timer-off',
      text: 'Expired',
      isSubmitted: false
    };
  }
  
  if (realTimeValidation.status === 'waiting') {
    return { 
      status: 'waiting', 
      color: theme.textMuted, 
      icon: 'clock-outline',
      text: 'Waiting',
      isSubmitted: false
    };
  }
  
  if (realTimeValidation.status === 'available') {
    if (realTimeValidation.willBePenalized) {
      return { 
        status: 'late_available', 
        color: theme.primary, 
        icon: 'timer-alert',
        text: 'Submit Late',
        isSubmitted: false
      };
    }
    return { 
      status: 'available', 
      color: '#2b8a3e', 
      icon: 'check-circle',
      text: 'Ready',
      isSubmitted: false
    };
  }
  
  if (realTimeValidation.status === 'wrong_day') {
    return { 
      status: 'pending', 
      color: theme.textSecondary, 
      icon: 'calendar',
      text: 'Not Today',
      isSubmitted: false
    };
  }
  
  // Default - Pending
  return { 
    status: 'pending', 
    color: theme.textSecondary, 
    icon: 'clock-outline',
    text: 'Pending',
    isSubmitted: false
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
  
  // Store real-time validation for each assignment
  const [realTimeData, setRealTimeData] = useState<Record<string, any>>({});
  
  // Timer interval ref
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Update real-time validation for all assignments
  const updateRealTimeData = useCallback(() => {
    setRealTimeData(prev => {
      const newData = { ...prev };
      let hasChanges = false;
      
      assignments.forEach(assignment => {
        // Skip real-time validation for already submitted assignments
        if (assignment.photoUrl !== null && assignment.photoUrl !== undefined) {
          return;
        }
        
        const validation = getRealTimeValidation(assignment);
        const oldValidation = prev[assignment.id];
        
        // Check if validation changed
        if (!oldValidation || 
            oldValidation.canSubmit !== validation.canSubmit ||
            oldValidation.status !== validation.status ||
            oldValidation.timeLeft !== validation.timeLeft) {
          newData[assignment.id] = validation;
          hasChanges = true;
        }
      });
      
      return hasChanges ? newData : prev;
    });
  }, [assignments]);

  // Start timer for real-time updates (only for non-submitted assignments)
  useEffect(() => {
    const hasUnsubmittedAssignments = assignments.some(a => !a.photoUrl);
    
    if (assignments.length > 0 && hasUnsubmittedAssignments) {
      updateRealTimeData();
      
      timerInterval.current = setInterval(() => {
        updateRealTimeData();
      }, 1000);
    }
    
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    };
  }, [assignments, updateRealTimeData]);

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
        setRealTimeData({});
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
    // Get real-time validation (only for non-submitted assignments)
    const realTimeValidation = (item.photoUrl ? null : realTimeData[item.id]) || getRealTimeValidation(item);
    const status = getAssignmentStatus(item, theme, realTimeValidation || {});
    
    const timeLeft = realTimeValidation?.timeLeft;
    const isUrgent = timeLeft && timeLeft < 300 && realTimeValidation?.status === 'available';
    const isLate = realTimeValidation?.willBePenalized ?? false;
    
    const getGradientColors = (): [string, string] => {
      if (status.status === 'verified') {
        return [theme.primaryLight, theme.primaryLight];
      }
      if (status.status === 'rejected') {
        return [theme.errorBg, theme.errorBg];
      }
      if (status.status === 'pending_verification') {
        return [theme.primaryLight, theme.primaryLight];
      }
      if (status.status === 'expired') {
        return [theme.errorBg, theme.errorBg];
      }
      if (isLate && realTimeValidation?.canSubmit) {
        return [theme.primaryLight, theme.primaryLight];
      }
      if (isUrgent) {
        return [theme.errorBg, theme.errorBg];
      }
      if (realTimeValidation?.canSubmit) {
        return [theme.primaryLight, theme.primaryLight];
      }
      return [theme.card, theme.bgSecondary];
    };

    // ✅ Determine if submit button should be shown
    // Button is disabled if:
    // 1. Assignment has been submitted (has photoUrl)
    // 2. Assignment is verified or rejected
    // 3. Not in available status
    const isSubmitted = status.isSubmitted === true;
    const isVerifiedOrRejected = status.status === 'verified' || status.status === 'rejected';
    const isPendingVerification = status.status === 'pending_verification';
    const canSubmitRealTime = realTimeValidation?.canSubmit === true && realTimeValidation?.status === 'available';
    
    const showSubmitButton = !isSubmitted && !isVerifiedOrRejected && !isPendingVerification && canSubmitRealTime;

    return ( 
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleViewAssignment(item.id)}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.assignmentCard, { borderColor: theme.border }]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
                {item.taskTitle}
              </Text>
              <Text style={[styles.groupName, { color: theme.textMuted }]}>{item.group?.name || 'Unknown Group'}</Text>
            </View>
            
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
                {formatTimeSlotDisplay(item.timeSlot)}
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
                {realTimeValidation?.finalPoints || item.taskPoints} pts
                {realTimeValidation?.willBePenalized && realTimeValidation?.finalPoints && (
                  <Text style={[styles.penaltyText, { color: theme.error }]}> (-{item.taskPoints - realTimeValidation.finalPoints})</Text>
                )}
              </Text>
            </LinearGradient>
          </View>

          {/* Show timer for waiting period - only if not submitted */}
          {!isSubmitted && !isVerifiedOrRejected && !isPendingVerification && realTimeValidation?.status === 'waiting' && realTimeValidation.opensIn && realTimeValidation.opensIn > 0 && (
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.timerContainer, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="clock-start" size={16} color={theme.primary} />
              <Text style={[styles.timerText, { color: theme.primary }]}>
                Opens in {formatTimeLeft(realTimeValidation.opensIn)}
              </Text>
            </LinearGradient>
          )}

          {/* Show timer for available period - only if not submitted */}
          {!isSubmitted && !isVerifiedOrRejected && !isPendingVerification && realTimeValidation?.status === 'available' && timeLeft && timeLeft > 0 && (
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
                {formatTimeLeft(timeLeft)} left
              </Text>
            </LinearGradient>
          )}

          {/* Show "Submit Now" button when available AND not submitted */}
          {showSubmitButton && (
            <TouchableOpacity
              style={[styles.submitNowButton, isLate && styles.lateSubmitButton]}
              onPress={() => {
                if (isLate) {
                  Alert.alert(
                    'Late Submission',
                    `You are submitting late. You will receive ${realTimeValidation?.finalPoints} points instead of ${item.taskPoints}.\n\nDo you want to continue?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Submit Anyway', onPress: () => handleViewAssignment(item.id) }
                    ]
                  );
                } else {
                  handleViewAssignment(item.id);
                }
              }}
            >
              <LinearGradient
                colors={isLate ? [theme.primary, theme.primaryDark] : [theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <MaterialCommunityIcons name={isLate ? "timer-alert" : "check-circle"} size={18} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {isLate ? 'Submit Late' : 'Submit Now'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Show "Submitted" badge for already submitted assignments */}
          {isSubmitted && (
            <View style={styles.submittedBadgeContainer}>
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.submittedBadge, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="check-circle" size={14} color={status.status === 'verified' ? '#2b8a3e' : (status.status === 'rejected' ? theme.error : theme.primary)} />
                <Text style={[styles.submittedText, { color: status.color }]}>
                  {status.status === 'pending_verification' ? 'Awaiting Verification' : status.text}
                </Text>
              </LinearGradient>
            </View>
          )}

          {realTimeValidation?.reason && !realTimeValidation.canSubmit && status.status !== 'expired' && status.status !== 'waiting' && !isSubmitted && (
            <Text style={[styles.reasonText, { color: theme.textMuted }]}>{realTimeValidation.reason}</Text>
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
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
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
          <MaterialCommunityIcons name="refresh" size={20} color={theme.primary} />
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
  timeSlot: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  timeSlotText: { fontSize: 13, flex: 1 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4, borderWidth: 1 },
  pointsText: { fontSize: 13, fontWeight: '600' },
  penaltyText: { fontSize: 11, fontWeight: '400' },
  timerContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, gap: 6, borderWidth: 1, marginTop: 8 },
  timerText: { fontSize: 13, fontWeight: '500' },
  urgentTimerText: {},
  reasonText: { fontSize: 13, fontStyle: 'italic', marginTop: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIconContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  submitNowButton: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  lateSubmitButton: {
    marginTop: 12,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  submittedBadgeContainer: {
    marginTop: 12,
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  submittedText: {
    fontSize: 13,
    fontWeight: '500',
  },
});