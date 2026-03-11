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
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AssignmentService, TodayAssignment } from '../services/AssignmentService';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';
export default function TodayAssignmentsScreen({ navigation, route }: any) {
  const { groupId, groupName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<TodayAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 TodayAssignmentsScreen: No auth token available');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      console.log('✅ TodayAssignmentsScreen: Auth token found');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ TodayAssignmentsScreen: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchTodayAssignments();
  }, [groupId]);

  const fetchTodayAssignments = async (isRefreshing = false) => {
    // Check token first
    const hasToken = await checkToken();
    if (!hasToken) {
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
      const result = await AssignmentService.getTodayAssignments(groupId);
      
      if (result.success) {
        setAssignments(result.data?.assignments || []);
      } else {
        setError(result.message || 'Failed to load today\'s assignments');
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }
    } catch (err: any) {
      console.error('Error fetching today\'s assignments:', err);
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
      onVerified: () => {
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

  // Fix: Properly type the gradient colors
  const getGradientColors = (item: TodayAssignment): [string, string] => {
    const isUrgent = item.timeLeft && item.timeLeft < 300;
    const isLate = item.willBePenalized;
    
    if (isLate) {
      return ['#fff3bf', '#ffec99']; // Light orange gradient for late
    }
    if (isUrgent) {
      return ['#fff5f5', '#ffe3e3']; // Light red gradient for urgent
    }
    if (item.canSubmit) {
      return ['#d3f9d8', '#b2f2bb']; // Light green gradient for available
    }
    return ['#ffffff', '#f8f9fa']; // Default white gradient
  };

  // Fix: Add proper type for conditional styles
  const getStatusBadgeColors = (item: TodayAssignment): [string, string] => {
    const isLate = item.willBePenalized;
    if (isLate) return ['#fff3bf', '#ffec99'];
    if (item.canSubmit) return ['#d3f9d8', '#b2f2bb'];
    return ['#f1f3f5', '#e9ecef'];
  };

  // Fix: Get timer gradient colors
  const getTimerGradientColors = (isUrgent: boolean): [string, string] => {
    return isUrgent ? ['#ffc9c9', '#ffb3b3'] : ['#d3f9d8', '#b2f2bb'];
  };

  const renderAssignment = ({ item }: { item: TodayAssignment }) => {
   const timeLeft = item.timeLeft;
  const isUrgent = timeLeft ? timeLeft < 300 : false; // 👈 Ensures boolean
  const isLate = item.willBePenalized ?? false; // 👈 Ensures boolean

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
              <Text style={styles.groupName}>{item.group.name}</Text>
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
              <MaterialCommunityIcons name="clock" size={16} color="#6c757d" />
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
              <Text style={isUrgent ? [styles.timerText, styles.urgentTimerText] : styles.timerText}>
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
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Today's Assignments
        </Text>
        {groupName && <Text style={styles.subtitle}>{groupName}</Text>}
      </View>
      <View style={styles.headerSpacer} />
    </LinearGradient>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#495057" />
          <Text style={styles.loadingText}>Loading today's assignments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (authError) {
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

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      <FlatList
        data={assignments}
        renderItem={renderAssignment}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchTodayAssignments(true)} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-check" size={64} color="#dee2e6" />
              <Text style={styles.emptyText}>No assignments due today!</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  subtitle: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 2
  },
  headerSpacer: {
    width: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#868e96'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#fa5252',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8
  },
  errorSubtext: {
    color: '#868e96',
    fontSize: 14,
    marginBottom: 24
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  listContainer: {
    padding: 16
  },
  assignmentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  lateCard: {
    borderColor: '#e67700'
  },
  urgentCard: {
    borderColor: '#fa5252'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  taskInfo: {
    flex: 1,
    marginRight: 12
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4
  },
  groupName: {
    fontSize: 13,
    color: '#868e96'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  availableText: {
    color: '#2b8a3e'
  },
  waitingText: {
    color: '#868e96'
  },
  lateText: {
    color: '#e67700'
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  timeSlotText: {
    fontSize: 14,
    color: '#495057'
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e67700'
  },
  penaltyText: {
    fontSize: 11,
    color: '#fa5252'
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6
  },
  timerText: {
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: '500'
  },
  urgentTimerText: {
    color: '#fa5252'
  },
  reasonText: {
    fontSize: 13,
    color: '#868e96',
    fontStyle: 'italic',
    marginTop: 8
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyText: {
    fontSize: 18,
    color: '#868e96',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center'
  }
});