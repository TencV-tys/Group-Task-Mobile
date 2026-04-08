// src/screens/DetailedStatisticsScreen.tsx - UPDATED to show correct pending and neglected

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
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext'; 

const { width } = Dimensions.get('window');

export const DetailedStatisticsScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
  const { groupId, groupName, userRole } = route.params;
  const isAdmin = userRole === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
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

  const loadStatistics = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(false);
    
    try {
      const result = await TaskService.getTaskStatistics(groupId);
      console.log('statistics:', result);
      if (result.success) {
        setStats(result.statistics);
      } else {
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
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

  const currentWeek = stats?.currentWeek || {};
  const userStats = stats?.userStats || {};
  
  // Calculate completion rate based on active tasks (excluding neglected)
  const activeTotal = (currentWeek?.totalAssignments || 0) - (currentWeek?.neglectedAssignments || 0);
  const completionRate = activeTotal > 0 
    ? ((currentWeek?.completedAssignments || 0) / activeTotal) * 100 
    : 0;

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Statistics</Text>
        <TouchableOpacity 
          onPress={loadStatistics} 
          style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

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
              <MaterialCommunityIcons name="format-list-checks" size={22} color="#4F46E5" />
            </View>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>{stats?.totalTasks || 0}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Total Tasks</Text>
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
            <Text style={[styles.summaryNumber, { color: theme.text }]}>{currentWeek?.completedAssignments || 0}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Completed</Text>
          </LinearGradient>

          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { borderColor: theme.border }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>{currentWeek?.pendingAssignments || 0}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Pending</Text>
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
            <Text style={[styles.summaryNumber, { color: theme.text }]}>{currentWeek?.neglectedAssignments || 0}</Text>
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
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>Total Points:</Text>
              <Text style={[styles.pointsValue, { color: theme.text }]}>{currentWeek?.totalPoints || 0}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>Points Earned:</Text>
              <Text style={[styles.pointsValue, { color: theme.primary }]}>{currentWeek?.completedPoints || 0}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>Pending Points:</Text>
              <Text style={[styles.pointsValue, { color: theme.primary }]}>
                {currentWeek?.pendingPoints || 0}
              </Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>Neglected Points:</Text>
              <Text style={[styles.pointsValue, { color: theme.error }]}>
                {currentWeek?.neglectedPoints || 0}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.bgTertiary }]}>
              <LinearGradient
                colors={[
                  getCompletionRateColor(completionRate),
                  getCompletionRateColor(completionRate) + 'dd'
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${completionRate}%` }]} 
              />
            </View>
            <Text style={[styles.completionRate, { color: theme.textMuted }]}>
              {completionRate.toFixed(0)}% Completion Rate (based on active tasks)
            </Text>
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
          </LinearGradient>
        </View>

        {/* Your Performance - Members only */}
        {!isAdmin && userStats && Object.keys(userStats).length > 0 && (
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
                <Text style={[styles.performanceNumber, { color: theme.text }]}>{userStats.totalAssignments || 0}</Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Completed:</Text>
                <Text style={[styles.performanceNumber, { color: theme.primary }]}>
                  {userStats.completed || 0}
                </Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Pending:</Text>
                <Text style={[styles.performanceNumber, { color: theme.primary }]}>
                  {userStats.pending || 0}
                </Text>
              </View>
              {(userStats.neglected || 0) > 0 && (
                <View style={styles.performanceRow}>
                  <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Neglected:</Text>
                  <Text style={[styles.performanceNumber, { color: theme.error }]}>
                    {userStats.neglected || 0}
                  </Text>
                </View>
              )}
              <View style={styles.performanceRow}>
                <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Your Points:</Text>
                <Text style={[styles.performanceNumber, { color: '#4F46E5' }]}>
                  {userStats.userPoints || 0}
                </Text>
              </View>
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
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
});