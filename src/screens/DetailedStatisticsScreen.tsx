import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TaskService } from '../taskServices/TaskService';

const { width } = Dimensions.get('window');

export const DetailedStatisticsScreen = ({ navigation, route }: any) => {
  const { groupId, groupName } = route.params;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadStatistics();
  }, [groupId, selectedPeriod]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const result = await TaskService.getTaskStatistics(groupId);
      if (result.success) {
        setStats(result.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return '#10B981';
    if (rate >= 50) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'all' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('all')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'all' && styles.periodTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="checkbox" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.summaryNumber}>{stats?.totalTasks || 0}</Text>
            <Text style={styles.summaryLabel}>Total Tasks</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.summaryNumber}>{stats?.currentWeek?.completedAssignments || 0}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.summaryNumber}>{stats?.currentWeek?.pendingAssignments || 0}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
            </View>
            <Text style={styles.summaryNumber}>{stats?.overdueTasks || 0}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </View>
        </View>

        {/* Points Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points Overview</Text>
          <View style={styles.pointsCard}>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Total Points Earned:</Text>
              <Text style={styles.pointsValue}>{stats?.currentWeek?.completedPoints || 0}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Pending Points:</Text>
              <Text style={[styles.pointsValue, styles.pendingPoints]}>
                {stats?.currentWeek?.pendingPoints || 0}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${stats?.currentWeek?.completionRate || 0}%`,
                    backgroundColor: getCompletionRateColor(stats?.currentWeek?.completionRate || 0)
                  }
                ]} 
              />
            </View>
            <Text style={styles.completionRate}>
              {stats?.currentWeek?.completionRate || 0}% Completion Rate
            </Text>
          </View>
        </View>

        {/* Task Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Distribution</Text>
          <View style={styles.distributionCard}>
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: '#4F46E5' }]} />
                <Text>Daily Tasks</Text>
              </View>
              <Text style={styles.distributionNumber}>{stats?.dailyTasks || 0}</Text>
            </View>
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <Text>Weekly Tasks</Text>
              </View>
              <Text style={styles.distributionNumber}>{stats?.weeklyTasks || 0}</Text>
            </View>
            <View style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                <Text>Recurring Tasks</Text>
              </View>
              <Text style={styles.distributionNumber}>{stats?.recurringTasks || 0}</Text>
            </View>
          </View>
        </View>

        {/* User Performance */}
        {stats?.userStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Performance</Text>
            <View style={styles.performanceCard}>
              <View style={styles.performanceRow}>
                <Text>Your Assignments:</Text>
                <Text style={styles.performanceNumber}>{stats.userStats.totalAssignments || 0}</Text>
              </View>
              <View style={styles.performanceRow}>
                <Text>Completed:</Text>
                <Text style={[styles.performanceNumber, { color: '#10B981' }]}>
                  {stats.userStats.completed || 0}
                </Text>
              </View>
              <View style={styles.performanceRow}>
                <Text>Pending:</Text>
                <Text style={[styles.performanceNumber, { color: '#F59E0B' }]}>
                  {stats.userStats.pending || 0}
                </Text>
              </View>
              <View style={styles.performanceRow}>
                <Text>Your Points:</Text>
                <Text style={[styles.performanceNumber, { color: '#4F46E5' }]}>
                  {stats.userStats.userPoints || 0}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4F46E5',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  pointsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pointsLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  pendingPoints: {
    color: '#F59E0B',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completionRate: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  distributionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  distributionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});