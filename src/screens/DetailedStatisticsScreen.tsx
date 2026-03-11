// src/screens/DetailedStatisticsScreen.tsx - UPDATED with token checking
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TaskService } from '../services/TaskService';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';
const { width } = Dimensions.get('window');

export const DetailedStatisticsScreen = ({ navigation, route }: any) => {
  const { groupId, groupName } = route.params;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [authError, setAuthError] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 DetailedStatisticsScreen: No auth token available');
        setAuthError(true);
        return false;
      }
      console.log('✅ DetailedStatisticsScreen: Auth token found');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ DetailedStatisticsScreen: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [groupId]);

  const loadStatistics = async () => {
    // Check token first
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(false);
    
    try {
      const result = await TaskService.getTaskStatistics(groupId);
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

  // Show auth error if needed
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

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return '#2b8a3e';
    if (rate >= 50) return '#e67700';
    return '#fa5252';
  };

  if (loading) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const currentWeek = stats?.currentWeek || {};
  const userStats = stats?.userStats || {};

  return (
    <ScreenWrapper style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistics</Text>
        <TouchableOpacity 
          onPress={loadStatistics} 
          style={styles.refreshButton}
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons name="format-list-checks" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.summaryNumber}>{stats?.totalTasks || 0}</Text>
            <Text style={styles.summaryLabel}>Total Tasks</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#d3f9d8' }]}>
              <MaterialCommunityIcons name="check-circle" size={22} color="#2b8a3e" />
            </View>
            <Text style={styles.summaryNumber}>{currentWeek?.completedAssignments || 0}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#fff3bf' }]}>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#e67700" />
            </View>
            <Text style={styles.summaryNumber}>{currentWeek?.pendingAssignments || 0}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#fff5f5' }]}>
              <MaterialCommunityIcons name="alert-circle" size={22} color="#fa5252" />
            </View>
            <Text style={styles.summaryNumber}>{stats?.overdueTasks || 0}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </LinearGradient>
        </View>

        {/* Points Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points Overview</Text>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsCard}
          >
            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Total Points Earned:</Text>
              <Text style={styles.pointsValue}>{currentWeek?.completedPoints || 0}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Pending Points:</Text>
              <Text style={[styles.pointsValue, styles.pendingPoints]}>
                {currentWeek?.pendingPoints || 0}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[getCompletionRateColor(currentWeek?.completionRate || 0), getCompletionRateColor(currentWeek?.completionRate || 0) + 'dd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill, 
                  { width: `${currentWeek?.completionRate || 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.completionRate}>
              {currentWeek?.completionRate || 0}% Completion Rate
            </Text>
          </LinearGradient>
        </View>

        {/* Task Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Distribution</Text>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.distributionCard}
          >
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: '#4F46E5' }]} />
                <Text style={styles.distributionLabelText}>Daily Tasks</Text>
              </View>
              <Text style={styles.distributionNumber}>{stats?.dailyTasks || 0}</Text>
            </View>
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: '#2b8a3e' }]} />
                <Text style={styles.distributionLabelText}>Weekly Tasks</Text>
              </View>
              <Text style={styles.distributionNumber}>{stats?.weeklyTasks || 0}</Text>
            </View>
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: '#e67700' }]} />
                <Text style={styles.distributionLabelText}>Recurring Tasks</Text>
              </View>
              <Text style={styles.distributionNumber}>{stats?.recurringTasks || 0}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* User Performance */}
        {userStats && Object.keys(userStats).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Performance</Text>
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.performanceCard}
            >
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Your Assignments:</Text>
                <Text style={styles.performanceNumber}>{userStats.totalAssignments || 0}</Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Completed:</Text>
                <Text style={[styles.performanceNumber, { color: '#2b8a3e' }]}>
                  {userStats.completed || 0}
                </Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Pending:</Text>
                <Text style={[styles.performanceNumber, { color: '#e67700' }]}>
                  {userStats.pending || 0}
                </Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Your Points:</Text>
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
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
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
    borderColor: '#e9ecef',
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
    color: '#212529',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#868e96',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    paddingLeft: 4,
  },
  pointsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#495057',
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b8a3e',
  },
  pendingPoints: {
    color: '#e67700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
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
    color: '#868e96',
    textAlign: 'center',
  },
  distributionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    color: '#495057',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distributionNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  performanceCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#495057',
  },
  performanceNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
});