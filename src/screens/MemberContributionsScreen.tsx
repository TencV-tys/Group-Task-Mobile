import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GroupActivityService } from '../services/GroupActivityService';

export default function MemberContributionsScreen({ navigation, route }: any) {
  const { groupId, groupName, memberId, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [groupId, memberId]);

  const fetchData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await GroupActivityService.getMemberContributions(groupId, memberId);
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to load member data');
      }
    } catch (err: any) {
      console.error('Error fetching member data:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderSummary = () => {
    if (!data?.summary) return null;

    const summary = data.summary;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Overall Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.totalAssignments}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.completedAssignments}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(summary.completionRate)}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.earnedPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWeekDetails = (week: any) => {
    const isExpanded = selectedWeek === week.week;

    return (
      <View key={week.week} style={styles.weekCard}>
        <TouchableOpacity
          style={styles.weekHeader}
          onPress={() => setSelectedWeek(isExpanded ? null : week.week)}
        >
          <View style={styles.weekTitleContainer}>
            <MaterialCommunityIcons name="calendar-week" size={20} color="#007AFF" />
            <Text style={styles.weekTitle}>Week {week.week}</Text>
          </View>
          
          <View style={styles.weekStats}>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{week.completedAssignments}/{week.totalAssignments}</Text>
              <Text style={styles.weekStatLabel}>Tasks</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{week.earnedPoints}</Text>
              <Text style={styles.weekStatLabel}>Points</Text>
            </View>
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#6c757d" 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.weekDetails}>
            {week.assignments.map((assignment: any, index: number) => (
              <TouchableOpacity
                key={assignment.id}
                style={[
                  styles.assignmentItem,
                  index === week.assignments.length - 1 && styles.lastItem
                ]}
                onPress={() => navigation.navigate('AssignmentDetails', {
                  assignmentId: assignment.id,
                  isAdmin: userRole === 'ADMIN'
                })}
              >
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentTitle}>{assignment.taskTitle}</Text>
                  <Text style={styles.assignmentDate}>
                    Due: {formatDate(assignment.dueDate)}
                    {assignment.completed && assignment.completedAt && 
                      ` • Completed: ${formatDate(assignment.completedAt)}`}
                  </Text>
                  
                  <View style={styles.assignmentMeta}>
                    <View style={[
                      styles.statusBadge,
                      assignment.completed 
                        ? assignment.verified 
                          ? styles.verifiedBadge
                          : assignment.verified === false
                            ? styles.rejectedBadge
                            : styles.pendingBadge
                        : styles.notCompletedBadge
                    ]}>
                      <MaterialCommunityIcons 
                        name={
                          assignment.completed 
                            ? assignment.verified 
                              ? "check-circle"
                              : assignment.verified === false
                                ? "close-circle"
                                : "clock-check"
                            : "clock-outline"
                        } 
                        size={12} 
                        color={
                          assignment.completed 
                            ? assignment.verified 
                              ? "#2b8a3e"
                              : assignment.verified === false
                                ? "#fa5252"
                                : "#e67700"
                            : "#6c757d"
                        } 
                      />
                      <Text style={[
                        styles.statusText,
                        assignment.completed 
                          ? assignment.verified 
                            ? styles.verifiedText
                            : assignment.verified === false
                              ? styles.rejectedText
                              : styles.pendingText
                          : styles.notCompletedText
                      ]}>
                        {assignment.completed 
                          ? assignment.verified 
                            ? 'Verified'
                            : assignment.verified === false
                              ? 'Rejected'
                              : 'Pending'
                          : 'Not Completed'}
                      </Text>
                    </View>

                    <Text style={styles.assignmentPoints}>+{assignment.points} pts</Text>
                    
                    {assignment.isLate && (
                      <View style={styles.lateBadge}>
                        <MaterialCommunityIcons name="timer-alert" size={10} color="#e67700" />
                        <Text style={styles.lateText}>Late</Text>
                      </View>
                    )}
                  </View>

                  {assignment.notes && (
                    <Text style={styles.assignmentNotes} numberOfLines={1}>
                      📝 {assignment.notes}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {data?.summary?.memberName || 'Member'} Contributions
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => fetchData(true)} 
        style={styles.refreshButton}
        disabled={refreshing}
      >
        <MaterialCommunityIcons 
          name="refresh" 
          size={24} 
          color="#007AFF" 
          style={refreshing && styles.rotating} 
        />
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading member data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderSummary()}
            <View style={styles.weeksContainer}>
              <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
              {data?.weeks?.map((week: any) => renderWeekDetails(week))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF'
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
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rotating: {
    transform: [{ rotate: '45deg' }]
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d'
  },
  content: {
    flex: 1,
    padding: 16
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 12
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d'
  },
  weeksContainer: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  weekCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa'
  },
  weekTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529'
  },
  weekStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  weekStat: {
    alignItems: 'center'
  },
  weekStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529'
  },
  weekStatLabel: {
    fontSize: 10,
    color: '#6c757d'
  },
  weekDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  assignmentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  lastItem: {
    borderBottomWidth: 0
  },
  assignmentInfo: {
    flex: 1
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4
  },
  assignmentDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8
  },
  assignmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  verifiedBadge: {
    backgroundColor: '#d3f9d8'
  },
  pendingBadge: {
    backgroundColor: '#fff3bf'
  },
  rejectedBadge: {
    backgroundColor: '#ffc9c9'
  },
  notCompletedBadge: {
    backgroundColor: '#f1f3f5'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  verifiedText: {
    color: '#2b8a3e'
  },
  pendingText: {
    color: '#e67700'
  },
  rejectedText: {
    color: '#fa5252'
  },
  notCompletedText: {
    color: '#6c757d'
  },
  assignmentPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e67700'
  },
  lateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3
  },
  lateText: {
    fontSize: 9,
    color: '#e67700',
    fontWeight: '600'
  },
  assignmentNotes: {
    fontSize: 11,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4
  }
});