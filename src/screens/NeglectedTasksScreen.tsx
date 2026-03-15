// src/screens/NeglectedTasksScreen.tsx - UPDATED with TokenUtils
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
import { TokenUtils } from '../utils/tokenUtils'; // 👈 ADD THIS IMPORT
import { ScreenWrapper } from '../components/ScreenWrapper';

export const NeglectedTasksScreen = ({ navigation, route }: any) => {
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

  // ===== UPDATED: Use TokenUtils.checkToken() =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // ===== AUTH ERROR HANDLER =====
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
              // @ts-ignore - navigation type issue
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

    if (refresh) setRefreshing(true);
    else setLoading(true);
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
          setNeglectedTasks(result.data.tasks || []);
          setStats({ total: result.data.total || 0 });
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

  const renderTaskItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetails', { taskId: item.taskId })}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.taskCardGradient}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <MaterialCommunityIcons name="timer-off" size={20} color="#fa5252" />
            <Text style={styles.taskTitle} numberOfLines={1}>
              {item.taskTitle}
            </Text>
          </View>
          <Text style={styles.pointsLost}>-{item.points} pts</Text>
        </View>

        {isAdmin && item.user && (
          <View style={styles.userInfo}>
            <LinearGradient colors={['#2b8a3e', '#1e6b2c']} style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {item.user.fullName?.charAt(0) || 'U'}
              </Text>
            </LinearGradient>
            <Text style={styles.userName}>{item.user.fullName}</Text>
          </View>
        )}

        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={14} color="#868e96" />
            <Text style={styles.detailText}>
              Due: {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-alert" size={14} color="#fa5252" />
            <Text style={styles.detailText}>
              Missed: {item.expiredAt ? new Date(item.expiredAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          {item.timeSlot && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#868e96" />
              <Text style={styles.detailText}>
                {item.timeSlot.startTime} - {item.timeSlot.endTime}
                {item.timeSlot.label && ` (${item.timeSlot.label})`}
              </Text>
            </View>
          )}
        </View>

        {item.notes && item.notes.includes('[NEGLECTED]') && (
          <LinearGradient
            colors={['#fff5f5', '#ffe3e3']}
            style={styles.notesContainer}
          >
            <MaterialCommunityIcons name="alert-circle" size={14} color="#fa5252" />
            <Text style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </Text>
          </LinearGradient>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderHeader = () => {
    if (!stats) return null;

    return (
      <LinearGradient
        colors={['#fff5f5', '#ffe3e3']}
        style={styles.statsHeader}
      >
        <View style={styles.statsRow}>
          <MaterialCommunityIcons name="timer-off" size={24} color="#fa5252" />
          <Text style={styles.statsTitle}>
            {stats.total} Neglected Task{stats.total !== 1 ? 's' : ''}
          </Text>
        </View>
        
        {isAdmin && stats.pointsByUser && Object.keys(stats.pointsByUser).length > 0 && (
          <View style={styles.pointsBreakdown}>
            <Text style={styles.pointsBreakdownTitle}>Points Lost:</Text>
            {Object.entries(stats.pointsByUser).map(([userId, points]) => {
              const user = neglectedTasks.find(t => t.user?.id === userId)?.user;
              if (!user) return null;
              return (
                <Text key={userId} style={styles.pointsBreakdownText}>
                  • {user.fullName}: {String(points)} pts
                </Text>
              );
            })}
          </View>
        )}
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Neglected Tasks</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading neglected tasks...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Neglected Tasks</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadNeglectedTasks()}>
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
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
    <ScreenWrapper style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupName} - Neglected Tasks</Text>
        <TouchableOpacity onPress={() => loadNeglectedTasks(true)} style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={22} color="#2b8a3e" />
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
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons name="check-circle" size={40} color="#2b8a3e" />
            </LinearGradient>
            <Text style={styles.emptyText}>No neglected tasks</Text>
            <Text style={styles.emptySubtext}>
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

// Styles remain exactly the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
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
    color: '#868e96',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fa5252',
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
    borderColor: '#ffc9c9',
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
    color: '#fa5252',
  },
  pointsBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#ffc9c9',
    paddingTop: 8,
  },
  pointsBreakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  pointsBreakdownText: {
    fontSize: 12,
    color: '#868e96',
    marginLeft: 4,
  },
  taskCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffc9c9',
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
    color: '#212529',
    flex: 1,
  },
  pointsLost: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fa5252',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
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
    color: '#495057',
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
    color: '#495057',
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
    color: '#fa5252',
    fontStyle: 'italic',
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
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});