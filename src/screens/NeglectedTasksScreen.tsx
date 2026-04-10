// src/screens/NeglectedTasksScreen.tsx - FIXED with direct navigation to AssignmentDetails

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AssignmentService } from '../services/AssignmentService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export const NeglectedTasksScreen = ({ navigation, route }: any) => {
  const { theme } = useTheme();
  const { groupId, groupName, userRole } = route.params;
  const isAdmin = userRole === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [neglectedTasks, setNeglectedTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

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
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadNeglectedTasks = useCallback(async (refresh = false) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let result;
      if (isAdmin) {
        result = await AssignmentService.getGroupNeglectedTasks(groupId);
        if (result.success && isMounted.current) {
          setNeglectedTasks(result.data.tasks || []);
          setStats({
            total: result.data.total || 0,
            pointsByUser: result.data.pointsByUser || {}
          });
        } else if (isMounted.current) {
          setError(result.message || 'Failed to load neglected tasks');
        }
      } else {
        result = await AssignmentService.getUserNeglectedTasks({ groupId });
        if (result.success && isMounted.current) {
          console.log('User Neglected data: ',result.data.tasks)
          setNeglectedTasks(result.data.tasks || []);
          const totalCount = result.data.summary?.total || result.data.total || 0;
          setStats({
            total: totalCount,
            summary: result.data.summary,
            pointsByUser: result.data.pointsByUser || {}
          });
        } else if (isMounted.current) {
          setError(result.message || 'Failed to load neglected tasks');
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'Failed to load neglected tasks');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        initialLoadDone.current = true;
      }
    }
  }, [groupId, isAdmin, checkToken]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      loadNeglectedTasks();
    }
  }, []);

  // ✅ FIXED: Navigate directly to AssignmentDetails
  const handleTaskPress = (task: any) => {
    console.log('📋 Navigating to AssignmentDetails for neglected task:', task.id);
    navigation.navigate('AssignmentDetails', {
      assignmentId: task.id,
      isAdmin: isAdmin,
      onVerified: () => loadNeglectedTasks(true)
    });
  };

  const renderTaskItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.taskCard, { borderColor: theme.errorBorder ?? '#ffc9c9' }]}
      onPress={() => handleTaskPress(item)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        style={styles.taskCardGradient}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <MaterialCommunityIcons name="timer-off" size={20} color={theme.error} />
            <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={1}>
              {item.taskTitle}
            </Text>
          </View>
          <Text style={[styles.pointsLost, { color: theme.error }]}>-{item.points} pts</Text>
        </View>

        {isAdmin && item.user && (
          <View style={[styles.userInfo, { backgroundColor: theme.bgSecondary }]}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={styles.userAvatar}
            >
              <Text style={styles.userAvatarText}>
                {item.user.fullName?.charAt(0) || 'U'}
              </Text>
            </LinearGradient>
            <Text style={[styles.userName, { color: theme.textSecondary }]}>
              {item.user.fullName}
            </Text>
          </View>
        )}

        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={14} color={theme.textMuted} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              Due: {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-alert" size={14} color={theme.error} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              Missed: {item.expiredAt ? new Date(item.expiredAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          {item.timeSlot && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.timeSlot.startTime} - {item.timeSlot.endTime}
                {item.timeSlot.label && ` (${item.timeSlot.label})`}
              </Text>
            </View>
          )}
        </View>

        {item.notes && item.notes.includes('[NEGLECTED]') && (
          <LinearGradient
            colors={[theme.errorBg ?? '#fff5f5', theme.errorBg ?? '#ffe3e3']}
            style={styles.notesContainer}
          >
            <MaterialCommunityIcons name="alert-circle" size={14} color={theme.error} />
            <Text style={[styles.notesText, { color: theme.error }]} numberOfLines={2}>
              {item.notes}
            </Text>
          </LinearGradient>
        )}
        
        {/* ✅ Add indicator that this is a neglected task */}
        <View style={styles.neglectedFooter}>
          <MaterialCommunityIcons name="timer-off" size={12} color={theme.error} />
          <Text style={[styles.neglectedFooterText, { color: theme.error }]}>
            Task was missed - No points awarded
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderHeader = () => {
    if (!stats) return null;

    const totalCount = stats.total || stats.summary?.total || 0;
    const totalPointsLost = stats.summary?.totalPointsLost ||
      (Object.values(stats.pointsByUser || {}) as number[]).reduce((a, b) => a + b, 0) || 0;

    return (
      <LinearGradient
        colors={[theme.errorBg ?? '#fff5f5', theme.errorBg ?? '#ffe3e3']}
        style={[styles.statsHeader, { borderColor: theme.errorBorder ?? '#ffc9c9' }]}
      >
        <View style={styles.statsRow}>
          <MaterialCommunityIcons name="timer-off" size={24} color={theme.error} />
          <Text style={[styles.statsTitle, { color: theme.error }]}>
            {totalCount} Neglected Task{totalCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {totalPointsLost > 0 && (
          <View style={[styles.pointsBreakdown, { borderTopColor: theme.errorBorder ?? '#ffc9c9' }]}>
            <Text style={[styles.pointsBreakdownTitle, { color: theme.textSecondary }]}>
              Total Points Lost: {totalPointsLost}
            </Text>
          </View>
        )}

        {isAdmin && stats.pointsByUser && Object.keys(stats.pointsByUser).length > 0 && (
          <View style={[styles.pointsBreakdown, { borderTopColor: theme.errorBorder ?? '#ffc9c9' }]}>
            <Text style={[styles.pointsBreakdownTitle, { color: theme.textSecondary }]}>
              Points Lost by User:
            </Text>
            {Object.entries(stats.pointsByUser).map(([userId, points]) => {
              const user = neglectedTasks.find(t => t.user?.id === userId)?.user;
              if (!user) return null;
              return (
                <Text key={userId} style={[styles.pointsBreakdownText, { color: theme.textMuted }]}>
                  • {user.fullName}: {String(points)} pts
                </Text>
              );
            })}
          </View>
        )}
        
        <View style={[styles.infoRow, { marginTop: 8 }]}>
          <MaterialCommunityIcons name="information" size={14} color={theme.error} />
          <Text style={[styles.infoText, { color: theme.error }]}>
            Tap on any task to view full details
          </Text>
        </View>
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Neglected Tasks</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading neglected tasks...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Neglected Tasks</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadNeglectedTasks()}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {groupName} - Neglected Tasks
        </Text>
        <TouchableOpacity
          onPress={() => loadNeglectedTasks(true)}
          style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="refresh" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={neglectedTasks}
        renderItem={renderTaskItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNeglectedTasks(true)}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              style={[styles.emptyIconContainer, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="check-circle" size={40} color={theme.primary} />
            </LinearGradient>
            <Text style={[styles.emptyText, { color: theme.text }]}>No neglected tasks</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              {isAdmin
                ? 'All members are on track with their tasks'
                : 'Great job! You have no neglected tasks'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenWrapper>
  );
};

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
    flex: 1,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
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
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  statsHeader: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pointsBreakdown: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  pointsBreakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  pointsBreakdownText: {
    fontSize: 12,
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
  },
  taskCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  taskCardGradient: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  pointsLost: {
    fontSize: 14,
    fontWeight: '700',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  userName: {
    fontSize: 13,
  },
  taskDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    fontStyle: 'italic',
  },
  neglectedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  neglectedFooterText: {
    fontSize: 11,
    fontWeight: '500',
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
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
}); 