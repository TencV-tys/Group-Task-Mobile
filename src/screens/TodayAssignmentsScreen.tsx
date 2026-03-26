// src/screens/TodayAssignmentsScreen.tsx - ADDED detailed console logs

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

export default function TodayAssignmentsScreen({ navigation, route }: any) {
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
      return ['#fff3bf', '#ffec99']; // Light orange gradient for late (warning)
    }
    if (isUrgent) {
      return ['#fff5f5', '#ffe3e3']; // Light red gradient for urgent (danger)
    }
    if (item.canSubmit) {
      return ['#d3f9d8', '#b2f2bb']; // Light green gradient for available (success)
    }
    return ['#ffffff', '#f8f9fa']; // Default white/light gray gradient
  };

  // Get status badge colors
  const getStatusBadgeColors = (item: TodayAssignment): [string, string] => {
    const isLate = item.willBePenalized;
    if (isLate) return ['#fff3bf', '#ffec99']; // Orange for late
    if (item.canSubmit) return ['#d3f9d8', '#b2f2bb']; // Green for available
    return ['#f1f3f5', '#e9ecef']; // Light gray for waiting
  };

  // Get timer gradient colors
  const getTimerGradientColors = (isUrgent: boolean): [string, string] => {
    return isUrgent ? ['#ffc9c9', '#ffb3b3'] : ['#d3f9d8', '#b2f2bb'];
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
            isUrgent ? styles.urgentCard : null
          ].filter(Boolean)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {item.taskTitle}
              </Text>
              <Text style={styles.groupName}>{item.group?.name || 'Unknown Group'}</Text>
            </View>
            
            <LinearGradient
              colors={getStatusBadgeColors(item)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statusBadge}
            >
              <MaterialCommunityIcons 
                name={
                  isLate ? "timer-alert" :
                  item.canSubmit ? "check-circle" : "clock-outline"
                } 
                size={14} 
                color={
                  isLate ? "#e67700" :
                  item.canSubmit ? "#2b8a3e" : "#6c757d"
                } 
              />
              <Text style={[
                styles.statusText,
                isLate ? styles.lateText :
                item.canSubmit ? styles.availableText : styles.waitingText
              ]}>
                {isLate ? 'Late' : item.canSubmit ? 'Available' : 'Waiting'}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.timeSlot}>
              <MaterialCommunityIcons name="clock" size={16} color="#868e96" />
              <Text style={styles.timeSlotText}>
                {item.timeSlot 
                  ? `${item.timeSlot.startTime} - ${item.timeSlot.endTime}`
                  : 'Anytime today'}
              </Text>
            </View>

            <LinearGradient
              colors={['#fff3bf', '#ffec99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsBadge}
            >
              <MaterialCommunityIcons name="star" size={14} color="#e67700" />
              <Text style={styles.pointsText}>
                {item.finalPoints || item.taskPoints} pts
                {item.willBePenalized && item.finalPoints && (
                  <Text style={styles.penaltyText}> (-{item.taskPoints - item.finalPoints})</Text>
                )}
              </Text>
            </LinearGradient>
          </View>

          {item.timeLeft !== undefined && item.timeLeft > 0 && (
            <LinearGradient
              colors={getTimerGradientColors(isUrgent)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.timerContainer}
            >
              <MaterialCommunityIcons 
                name={isUrgent ? "timer-alert" : "timer"} 
                size={16} 
                color={isUrgent ? "#fa5252" : "#2b8a3e"} 
              />
              <Text style={[styles.timerText, isUrgent && styles.urgentTimerText]}>
                {formatTimeLeft(item.timeLeft)} {item.canSubmit ? 'left to submit' : 'until submission opens'}
              </Text>
            </LinearGradient>
          )}

          {item.reason && !item.canSubmit && (
            <Text style={styles.reasonText}>{item.reason}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Today's Assignments
        </Text>
        {groupName && (
          <Text style={styles.subtitle}>{groupName}</Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={() => fetchTodayAssignments(true)}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color="#2b8a3e" />
        ) : (
          <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
        )}
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading && !refreshing) {
    console.log('⏳ [TodayAssignments] Showing loading indicator');
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading today's assignments...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (authError) {
    console.log('⚠️ [TodayAssignments] Showing auth error screen');
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="lock-alert" size={64} color="#fa5252" />
          <Text style={styles.errorText}>Authentication Error</Text>
          <Text style={styles.errorSubtext}>Please log in again</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={['#fa5252', '#e03131']}
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
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      <FlatList
        data={assignments}
        renderItem={renderAssignment}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchTodayAssignments(true)}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconContainer}
              >
                <MaterialCommunityIcons name="calendar-check" size={40} color="#2b8a3e" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No assignments due today!</Text>
              <Text style={styles.emptySubtext}>
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

// Styles remain the same as before...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#868e96',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fa5252',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#868e96',
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
    color: 'white',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  lateCard: {
    borderColor: '#ffd43b',
    borderWidth: 2,
  },
  urgentCard: {
    borderColor: '#fa5252',
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
    color: '#212529',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 13,
    color: '#868e96',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  availableText: {
    color: '#2b8a3e',
  },
  waitingText: {
    color: '#868e96',
  },
  lateText: {
    color: '#e67700',
  },
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
    color: '#495057',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e67700',
  },
  penaltyText: {
    fontSize: 11,
    color: '#fa5252',
    fontWeight: '400',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timerText: {
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: '500',
  },
  urgentTimerText: {
    color: '#fa5252',
  },
  reasonText: {
    fontSize: 13,
    color: '#868e96',
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
    borderColor: '#e9ecef',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});