// src/screens/TodayAssignmentsScreen.tsx - Dark Mode Added
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
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
 
export default function TodayAssignmentsScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const { groupId, groupName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [assignments, setAssignments] = useState<TodayAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  console.log('📱 [TodayAssignments] Screen mounted with params:', { groupId, groupName });

  // ===== CHECK TOKEN =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    console.log('🔐 [TodayAssignments] Token check result:', hasToken);
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      console.log('⚠️ [TodayAssignments] Auth error detected');
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
    console.log('🔄 [TodayAssignments] useEffect triggered, fetching assignments...');
    fetchTodayAssignments();
  }, [groupId]);

  const fetchTodayAssignments = async (isRefreshing = false) => {
    console.log('📥 [TodayAssignments] fetchTodayAssignments called', { 
      isRefreshing, 
      groupId 
    });
    
    // Check token first
    const hasToken = await checkToken();
    if (!hasToken) {
      console.log('❌ [TodayAssignments] No valid token, stopping fetch');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setAuthError(false);

    try {
      console.log('📡 [TodayAssignments] Calling AssignmentService.getTodayAssignments...');
      const result = await AssignmentService.getTodayAssignments(groupId);
      
      console.log('📦 [TodayAssignments] API Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        const assignmentsData = result.data?.assignments || [];
        console.log(`✅ [TodayAssignments] Successfully loaded ${assignmentsData.length} assignments`);
        
        // Log each assignment for debugging
        if (assignmentsData.length > 0) {
          assignmentsData.forEach((assignment: TodayAssignment, index: number) => {
            console.log(`📋 [TodayAssignments] Assignment ${index + 1}:`, {
              id: assignment.id,
              title: assignment.taskTitle,
              dueDate: assignment.dueDate,
              canSubmit: assignment.canSubmit,
              timeLeft: assignment.timeLeft,
              willBePenalized: assignment.willBePenalized,
              groupName: assignment.group?.name
            });
          });
        } else {
          console.log('📭 [TodayAssignments] No assignments due today');
          console.log('🔍 [TodayAssignments] Check if there are any assignments in the system');
        }
        
        setAssignments(assignmentsData);
      } else {
        console.error('❌ [TodayAssignments] API returned error:', result.message);
        setError(result.message || 'Failed to load today\'s assignments');
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }
    } catch (err: any) {
      console.error('❌ [TodayAssignments] Error fetching today\'s assignments:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        groupId
      });
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 [TodayAssignments] fetch completed');
    }
  };

  const handleViewAssignment = (assignmentId: string) => {
    console.log('👆 [TodayAssignments] Viewing assignment:', assignmentId);
    navigation.navigate('AssignmentDetails', {
      assignmentId,
      isAdmin: false,
      onVerified: () => {
        console.log('🔄 [TodayAssignments] Assignment verified, refreshing...');
        fetchTodayAssignments(true);
      }
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

  // Get gradient colors based on status
  const getGradientColors = (item: TodayAssignment): [string, string] => {
    const isUrgent = item.timeLeft && item.timeLeft < 300;
    const isLate = item.willBePenalized;
    
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

  // Get status badge colors
  const getStatusBadgeColors = (item: TodayAssignment): [string, string] => {
    const isLate = item.willBePenalized;
    if (isLate) return [theme.primaryLight, theme.primaryLight];
    if (item.canSubmit) return [theme.primaryLight, theme.primaryLight];
    return [theme.bgSecondary, theme.bgTertiary];
  };

  // Get timer gradient colors
  const getTimerGradientColors = (isUrgent: boolean): [string, string] => {
    return isUrgent ? [theme.errorBg, theme.errorBg] : [theme.primaryLight, theme.primaryLight];
  };

  const renderAssignment = ({ item }: { item: TodayAssignment }) => {
    const timeLeft = item.timeLeft;
    const isUrgent = timeLeft ? timeLeft < 300 : false;
    const isLate = item.willBePenalized ?? false;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleViewAssignment(item.id)}
      >
        <LinearGradient
          colors={getGradientColors(item)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.assignmentCard,
            isLate ? styles.lateCard : null,
            isUrgent ? styles.urgentCard : null,
            { borderColor: theme.border }
          ].filter(Boolean)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
                {item.taskTitle}
              </Text>
              <Text style={[styles.groupName, { color: theme.textMuted }]}>{item.group?.name || 'Unknown Group'}</Text>
            </View>
            
            <LinearGradient
              colors={getStatusBadgeColors(item)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statusBadge, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons 
                name={
                  isLate ? "timer-alert" :
                  item.canSubmit ? "check-circle" : "clock-outline"
                } 
                size={14} 
                color={
                  isLate ? theme.primary :
                  item.canSubmit ? theme.primary : theme.textMuted
                } 
              />
              <Text style={[
                styles.statusText,
                isLate ? styles.lateText :
                item.canSubmit ? styles.availableText : styles.waitingText,
                { color: isLate ? theme.primary : item.canSubmit ? theme.primary : theme.textMuted }
              ]}>
                {isLate ? 'Late' : item.canSubmit ? 'Available' : 'Waiting'}
              </Text>
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
              style={[styles.pointsBadge, { borderColor: theme.border }]}
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

          {item.timeLeft !== undefined && item.timeLeft > 0 && (
            <LinearGradient
              colors={getTimerGradientColors(isUrgent)}
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
                {formatTimeLeft(item.timeLeft)} {item.canSubmit ? 'left to submit' : 'until submission opens'}
              </Text>
            </LinearGradient>
          )}

          {item.reason && !item.canSubmit && (
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
    console.log('⏳ [TodayAssignments] Showing loading indicator');
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
    console.log('⚠️ [TodayAssignments] Showing auth error screen');
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

  console.log(`🎨 [TodayAssignments] Rendering ${assignments.length} assignments`);

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
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>No assignments due today!</Text>
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
  container: {
    flex: 1,
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
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
  lateCard: {
    borderWidth: 2,
  },
  urgentCard: {
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  availableText: {},
  waitingText: {},
  lateText: {},
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSlotText: {
    fontSize: 14,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  penaltyText: {
    fontSize: 11,
    fontWeight: '400',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  urgentTimerText: {},
  reasonText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});