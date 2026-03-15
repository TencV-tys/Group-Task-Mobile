// src/screens/MemberContributionsScreen.tsx - FIXED with better error handling
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GroupActivityService } from '../services/GroupActivityService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';

export default function MemberContributionsScreen({ navigation, route }: any) {
  const { groupId, groupName, memberId, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [authError, setAuthError] = useState(false);

  // Debug: Log the params
  useEffect(() => {
    console.log('📥 MemberContributionsScreen params:', { groupId, groupName, memberId, userRole });
  }, [groupId, groupName, memberId, userRole]);

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
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  useEffect(() => {
    if (!memberId) {
      console.error('❌ No memberId provided');
      setError('No member ID provided');
      setLoading(false);
      return;
    }
    fetchData();
  }, [groupId, memberId]);

  const fetchData = async (isRefreshing = false) => {
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
      console.log(`📥 Fetching contributions for member ${memberId} in group ${groupId}`);
      
      const result = await GroupActivityService.getMemberContributions(groupId, memberId);
      
      console.log('📦 API Response:', result);
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to load member data');
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }
    } catch (err: any) {
      console.error('❌ Error fetching member data:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function for status badge gradient
  const getStatusGradient = (assignment: any): [string, string] => {
    if (!assignment.completed) return ['#f1f3f5', '#e9ecef']; // Light gray
    if (assignment.verified === true) return ['#d3f9d8', '#b2f2bb']; // Light green
    if (assignment.verified === false) return ['#fff5f5', '#ffe3e3']; // Light red
    return ['#fff3bf', '#ffec99']; // Light orange for pending
  };

  // Helper function for status icon color
  const getStatusIconColor = (assignment: any): string => {
    if (!assignment.completed) return '#868e96';
    if (assignment.verified === true) return '#2b8a3e';
    if (assignment.verified === false) return '#fa5252';
    return '#e67700';
  };
 
  // Helper function for status icon name
  const getStatusIcon = (assignment: any): string => {
    if (!assignment.completed) return 'clock-outline';
    if (assignment.verified === true) return 'check-circle';
    if (assignment.verified === false) return 'close-circle';
    return 'clock-check';
  };

  // Helper function for status text
  const getStatusText = (assignment: any): string => {
    if (!assignment.completed) return 'Not Completed';
    if (assignment.verified === true) return 'Verified';
    if (assignment.verified === false) return 'Rejected';
    return 'Pending';
  };

  // Helper function for status text color
  const getStatusTextColor = (assignment: any): string => {
    if (!assignment.completed) return '#868e96';
    if (assignment.verified === true) return '#2b8a3e';
    if (assignment.verified === false) return '#fa5252';
    return '#e67700';
  };

  const renderSummary = () => {
    if (!data?.summary) return null;

    const summary = data.summary;

    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryTitle}>Overall Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCircle}
            >
              <Text style={styles.statValue}>{summary.totalAssignments}</Text>
            </LinearGradient>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          
          <View style={styles.statItem}>
            <LinearGradient
              colors={['#d3f9d8', '#b2f2bb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCircle}
            >
              <Text style={styles.statValue}>{summary.completedAssignments}</Text>
            </LinearGradient>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          
          <View style={styles.statItem}>
            <LinearGradient
              colors={['#fff3bf', '#ffec99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCircle}
            >
              <Text style={styles.statValue}>{Math.round(summary.completionRate)}%</Text>
            </LinearGradient>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          
          <View style={styles.statItem}>
            <LinearGradient
              colors={['#ffec99', '#ffe066']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCircle}
            >
              <Text style={styles.statValue}>{summary.earnedPoints}</Text>
            </LinearGradient>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderWeekDetails = (week: any) => {
    const isExpanded = selectedWeek === week.week;

    return (
      <LinearGradient
        key={week.week}
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.weekCard}
      >
        <TouchableOpacity
          style={styles.weekHeader}
          onPress={() => setSelectedWeek(isExpanded ? null : week.week)}
        >
          <View style={styles.weekTitleContainer}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.weekIcon}
            >
              <MaterialCommunityIcons name="calendar-week" size={16} color="#495057" />
            </LinearGradient>
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
              color="#868e96" 
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
                    <LinearGradient
                      colors={getStatusGradient(assignment)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.statusBadge}
                    >
                      <MaterialCommunityIcons 
                        name={getStatusIcon(assignment) as any}
                        size={12} 
                        color={getStatusIconColor(assignment)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusTextColor(assignment) }]}>
                        {getStatusText(assignment)}
                      </Text>
                    </LinearGradient>

                    <LinearGradient
                      colors={['#fff3bf', '#ffec99']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pointsBadge}
                    >
                      <Text style={styles.pointsText}>+{assignment.points} pts</Text>
                    </LinearGradient>
                    
                    {assignment.isLate && (
                      <LinearGradient
                        colors={['#fff3bf', '#ffec99']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.lateBadge}
                      >
                        <MaterialCommunityIcons name="timer-alert" size={10} color="#e67700" />
                        <Text style={styles.lateText}>Late</Text>
                      </LinearGradient>
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
      </LinearGradient>
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
          {data?.summary?.memberName || 'Member'} Contributions
        </Text>
        {data?.summary?.memberName && (
          <Text style={styles.subtitle}>Viewing detailed history</Text>
        )}
      </View>
      <TouchableOpacity 
        onPress={() => fetchData(true)} 
        style={styles.refreshButton}
        disabled={refreshing}
      >
        <MaterialCommunityIcons 
          name="refresh" 
          size={24} 
          color="#495057" 
          style={refreshing && styles.rotating} 
        />
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#495057" />
          <Text style={styles.loadingText}>Loading member data...</Text>
        </View>
      </ScreenWrapper>
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

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchData(true)}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubtext}>
              {error.includes('member') ? 'The member might not exist or have no data' : 'Please try again'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.retryButtonGradient}
              >
                <Text style={[styles.retryButtonText, { color: '#fff' }]}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : !data ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="account-question" size={48} color="#868e96" />
            <Text style={styles.errorText}>No Data Found</Text>
            <Text style={styles.errorSubtext}>
              This member hasn't completed any tasks yet
            </Text>
          </View>
        ) : (
          <>
            {renderSummary()}
            <View style={styles.weeksContainer}>
              <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
              {data?.weeks?.length > 0 ? (
                data.weeks.map((week: any) => renderWeekDetails(week))
              ) : (
                <Text style={styles.noWeeksText}>No weekly data available</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
    borderBottomColor: '#e9ecef'
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
    color: '#868e96'
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 40
  },
  errorText: {
    color: '#fa5252',
    textAlign: 'center',
    marginVertical: 12,
    fontSize: 16,
    fontWeight: '600'
  },
  errorSubtext: {
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  retryButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#fff'
  },
  content: {
    flex: 1,
    padding: 16
  },
  summaryCard: {
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
  statCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
  },
  statLabel: {
    fontSize: 12,
    color: '#868e96'
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
  noWeeksText: {
    textAlign: 'center',
    color: '#868e96',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic'
  },
  weekCard: {
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
    backgroundColor: 'rgba(255,255,255,0.5)'
  },
  weekTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  weekIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
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
    color: '#868e96'
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
    color: '#868e96',
    marginBottom: 8
  },
  assignmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap'
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
    fontSize: 11,
    fontWeight: '600'
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  pointsText: {
    fontSize: 11,
    color: '#e67700',
    fontWeight: '600'
  },
  lateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#868e96',
    fontStyle: 'italic',
    marginTop: 4
  }
});