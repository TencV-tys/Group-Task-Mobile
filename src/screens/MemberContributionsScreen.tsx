// src/screens/MemberContributionsScreen.tsx - Complete Fixed Version
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Image,
  LayoutAnimation,
  UIManager, 
  Platform,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GroupActivityService } from '../services/GroupActivityService';
import { TokenUtils } from '../utils/tokenUtils'; 
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MemberContributionsScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const { groupId, groupName, memberId, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [authError, setAuthError] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    console.log('📥 MemberContributionsScreen params:', { groupId, groupName, memberId, userRole });
  }, [groupId, groupName, memberId, userRole]);

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
        [{ text: 'OK', onPress: () => { setAuthError(false); navigation.navigate('Login'); } }]
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
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    
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
        if (result.message?.toLowerCase().includes('token') || result.message?.toLowerCase().includes('auth')) {
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
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleWeekPress = (weekNumber: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedWeek(selectedWeek === weekNumber ? null : weekNumber);
  };

  const renderProfileCard = () => {
    if (!data?.member) return null;

    const member = data.member;
    const initial = member.fullName?.charAt(0).toUpperCase() || '?';
    const isAdmin = member.role === 'ADMIN';

    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.profileCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
      >
        <View style={styles.avatarContainer}>
          {member.avatarUrl ? (
            <Image source={{ uri: member.avatarUrl }} style={[styles.avatarImage, { borderColor: theme.card }]} />
          ) : (
            <LinearGradient
              colors={isAdmin ? [theme.primary, theme.primaryDark] : [theme.textSecondary, theme.textMuted]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
          )}
        </View>
        
        <Text style={[styles.userName, { color: theme.text }]}>{member.fullName || 'User'}</Text>
        <Text style={[styles.userEmail, { color: theme.textMuted }]}>{member.email || ''}</Text>
        
        <View style={styles.userStats}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="shield-account" size={14} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{member.role || 'Member'}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-group" size={14} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textSecondary }]} numberOfLines={1}>{groupName}</Text>
          </View>
          {member.joinedAt && (
            <>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="calendar" size={14} color={theme.textMuted} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </>
          )}
        </View>

        {isAdmin && data.roleInfo && (
          <View style={[styles.adminNote, { backgroundColor: theme.primaryLight }]}>
            <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
            <Text style={[styles.adminNoteText, { color: theme.primary }]}>{data.roleInfo.message}</Text>
          </View>
        )}
      </LinearGradient>
    );
  };

    const renderOverallStats = () => {
    if (!data?.summary) return null;

    const summary = data.summary;
    const weeks = data?.weeks || [];
    
    let activeAssignmentsCount = 0;
    let verifiedSlotsCount = 0;
    let expiredSlotsCount = 0;
    let pendingSlotsCount = 0;
    let rejectedSlotsCount = 0;
    
    weeks.forEach((week: any) => {
      week.assignments.forEach((assignment: any) => {
        if (assignment.verified === true) verifiedSlotsCount++;
        else if (assignment.verified === false) rejectedSlotsCount++;
        else if (assignment.completed === true && assignment.verified === null) pendingSlotsCount++;
        
       const isExpired = assignment.isMissed === true || assignment.expired === true;
if (isExpired && !assignment.verified) {  // Use !assignment.verified instead
  expiredSlotsCount++;
} else {
  activeAssignmentsCount++;
}
      });
    });
    
    const completionRate = activeAssignmentsCount > 0 
      ? Math.round((verifiedSlotsCount / activeAssignmentsCount) * 100) : 0;

    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statsCard, { borderColor: theme.border }]}
      >
        <Text style={[styles.statsTitle, { color: theme.text }]}>Performance Overview</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.statCircle}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{verifiedSlotsCount}</Text>
            </LinearGradient>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Verified</Text>
          </View>
          
          <View style={styles.statBox}>
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.statCircle}>
              <Text style={[styles.statNumber, { color: theme.textSecondary }]}>{pendingSlotsCount}</Text>
            </LinearGradient>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Pending</Text>
          </View>
          
          <View style={styles.statBox}>
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.statCircle}>
              <Text style={[styles.statNumber, { color: theme.error }]}>{rejectedSlotsCount}</Text>
            </LinearGradient>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Rejected</Text>
          </View>
          
          <View style={styles.statBox}>
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.statCircle}>
              <Text style={[styles.statNumber, { color: theme.textMuted }]}>{expiredSlotsCount}</Text>
            </LinearGradient>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Missed</Text>
          </View>
        </View>

        <View style={styles.statsDivider} />

        <View style={styles.statsRow}>
          <View style={styles.statsRowItem}>
            <Text style={[styles.statsRowValue, { color: theme.text }]}>{summary.earnedPoints || 0}</Text>
            <Text style={[styles.statsRowLabel, { color: theme.textMuted }]}>Total Points</Text>
          </View>
          <View style={[styles.statsDividerVertical, { backgroundColor: theme.border }]} />
          <View style={styles.statsRowItem}>
            <Text style={[styles.statsRowValue, { color: theme.text }]}>{completionRate}%</Text>
            <Text style={[styles.statsRowLabel, { color: theme.textMuted }]}>Completion Rate</Text>
          </View>
          <View style={[styles.statsDividerVertical, { backgroundColor: theme.border }]} />
          <View style={styles.statsRowItem}>
            <Text style={[styles.statsRowValue, { color: theme.text }]}>{activeAssignmentsCount}</Text>
            <Text style={[styles.statsRowLabel, { color: theme.textMuted }]}>Active Slots</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };
 
  const renderWeekDetails = (week: any) => {
    const isExpanded = selectedWeek === week.week;
    
    const verifiedCount = week.assignments.filter((a: any) => a.verified === true).length;
    const pendingCount = week.assignments.filter((a: any) => a.completed === true && a.verified === null).length;
    const rejectedCount = week.assignments.filter((a: any) => a.verified === false).length;
   
    const expiredCount = week.assignments.filter((a: any) => 
  (a.isMissed === true || a.expired === true) && !a.verified  // !a.verified works for both null, false, and 0
).length;
    const notStartedCount = week.assignments.filter((a: any) => !a.completed && !a.isMissed && !a.expired).length;

    return (
      <LinearGradient
        key={week.week}
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.weekCard, { borderColor: theme.border }]}
      >
        <TouchableOpacity onPress={() => handleWeekPress(week.week)} activeOpacity={0.7}>
          <View style={[styles.weekHeader, { backgroundColor: theme.bgSecondary }]}>
            <View style={styles.weekTitleContainer}>
              <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.weekIcon}>
                <MaterialCommunityIcons name="calendar-week" size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.weekTitle, { color: theme.text }]}>Week {week.week}</Text>
            </View>
            <MaterialCommunityIcons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={theme.textMuted} />
          </View>

          <View style={styles.statusChipsContainer}>
            <View style={[styles.statusChip, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="check-circle" size={12} color={theme.primary} />
              <Text style={[styles.statusChipText, { color: theme.primary }]}>{verifiedCount}</Text>
            </View>
            {pendingCount > 0 && (
              <View style={[styles.statusChip, { backgroundColor: theme.primaryLight }]}>
                <MaterialCommunityIcons name="clock-check" size={12} color={theme.textSecondary} />
                <Text style={[styles.statusChipText, { color: theme.textSecondary }]}>{pendingCount}</Text>
              </View>
            )}
            {rejectedCount > 0 && (
              <View style={[styles.statusChip, { backgroundColor: theme.errorBg }]}>
                <MaterialCommunityIcons name="close-circle" size={12} color={theme.error} />
                <Text style={[styles.statusChipText, { color: theme.error }]}>{rejectedCount}</Text>
              </View>
            )}
            {expiredCount > 0 && (
              <View style={[styles.statusChip, { backgroundColor: theme.bgTertiary }]}>
                <MaterialCommunityIcons name="clock-alert" size={12} color={theme.textMuted} />
                <Text style={[styles.statusChipText, { color: theme.textMuted }]}>{expiredCount}</Text>
              </View>
            )}
            {notStartedCount > 0 && (
              <View style={[styles.statusChip, { backgroundColor: theme.bgTertiary }]}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={theme.textMuted} />
                <Text style={[styles.statusChipText, { color: theme.textMuted }]}>{notStartedCount}</Text>
              </View>
            )}
            <View style={[styles.statusChip, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
              <Text style={[styles.statusChipText, { color: theme.primary }]}>{week.earnedPoints}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.weekDetails, { borderTopColor: theme.border }]}>
            {week.assignments.map((assignment: any, index: number) => {
  const isExpired = (assignment.isMissed === true || assignment.expired === true) && !assignment.verified;
  const isVerified = assignment.verified === true;
  const isRejected = assignment.verified === false;
  const isPending = assignment.completed === true && assignment.verified === null;
  
  let statusGradient: [string, string];
  let statusIcon: string;
  let statusText: string;
  let statusColor: string;
  
  if (isExpired) {
    statusGradient = [theme.bgTertiary, theme.bgTertiary];
    statusIcon = 'clock-alert';
    statusText = 'Missed';
    statusColor = theme.textMuted;
  } else if (isVerified) {
    statusGradient = [theme.primaryLight, theme.primaryLight];
    statusIcon = 'check-circle';
    statusText = 'Verified';
    statusColor = theme.primary;
  } else if (isRejected) {
    statusGradient = [theme.errorBg, theme.errorBg];
    statusIcon = 'close-circle';
    statusText = 'Rejected';
    statusColor = theme.error;
  } else if (isPending) {
    statusGradient = [theme.primaryLight, theme.primaryLight];
    statusIcon = 'clock-check';
    statusText = 'Pending';
    statusColor = theme.textSecondary;
  } else {
    statusGradient = [theme.bgSecondary, theme.bgTertiary];
    statusIcon = 'clock-outline';
    statusText = 'Not Started';
    statusColor = theme.textMuted;
  }
              
              return (
                <TouchableOpacity
                  key={assignment.id}
                  style={[
                    styles.assignmentItem,
                    index === week.assignments.length - 1 && styles.lastItem,
                    { borderBottomColor: theme.border }
                  ]}
                  onPress={() => navigation.navigate('AssignmentDetails', {
                    assignmentId: assignment.id,
                    isAdmin: userRole === 'ADMIN'
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.assignmentContent}>
                    <View style={styles.assignmentHeader}>
                      <Text style={[styles.assignmentTitle, { color: isExpired ? theme.textMuted : theme.text }]}>
                        {assignment.taskTitle}
                      </Text>
                      <LinearGradient colors={statusGradient} style={styles.statusBadge}>
                        <MaterialCommunityIcons name={statusIcon as any} size={10} color={statusColor} />
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
                      </LinearGradient>
                    </View>
                    
                    <Text style={[styles.assignmentDate, { color: theme.textMuted }]}>
                      Due: {formatDate(assignment.dueDate)}
                    </Text>
                    
                    <View style={styles.assignmentFooter}>
                      {!isExpired && !isRejected && assignment.points > 0 && (
                        <View style={styles.pointsContainer}>
                          <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
                          <Text style={[styles.pointsText, { color: theme.primary }]}>
                            {isVerified ? '+' : ''}{assignment.points} pts
                          </Text>
                        </View>
                      )}
                      {assignment.isLate && !isExpired && !isVerified && (
                        <View style={styles.lateContainer}>
                          <MaterialCommunityIcons name="timer-alert" size={10} color={theme.textSecondary} />
                          <Text style={[styles.lateText, { color: theme.textSecondary }]}>Late</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View> 
        )}
      </LinearGradient>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[theme.card, theme.bgSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { borderBottomColor: theme.border }]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Member Profile</Text>
      <TouchableOpacity onPress={() => fetchData(true)} style={styles.refreshButton} disabled={refreshing}>
        <MaterialCommunityIcons name="refresh" size={22} color={theme.text} style={refreshing && styles.rotating} />
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading member data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (authError) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="lock-alert" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>Authentication Error</Text>
          <Text style={[styles.errorSubtext, { color: theme.textMuted }]}>Please log in again</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.navigate('Login')}>
            <LinearGradient colors={[theme.error, theme.error]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      {renderHeader()}

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[theme.primary]} tintColor={theme.primary} />}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
              <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.retryButtonGradient}>
                <Text style={[styles.retryButtonText, { color: '#fff' }]}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : !data ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="account-question" size={48} color={theme.textMuted} />
            <Text style={[styles.errorText, { color: theme.text }]}>No Data Found</Text>
            <Text style={[styles.errorSubtext, { color: theme.textMuted }]}>This member hasn't completed any tasks yet</Text>
          </View>
        ) : (
          <>
            {renderProfileCard()}
            {renderOverallStats()}
            
            <View style={styles.weeksContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Breakdown</Text>
              {data?.weeks?.length > 0 ? (
                data.weeks.map((week: any) => renderWeekDetails(week))
              ) : (
                <Text style={[styles.noWeeksText, { color: theme.textMuted }]}>No weekly data available</Text>
              )}
            </View>
            
            <View style={styles.bottomPadding} />
          </>
        )}
      </ScrollView>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotating: {
    transform: [{ rotate: '45deg' }],
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  errorText: {
    textAlign: 'center',
    marginVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  errorSubtext: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  retryButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  // Profile Card
  profileCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  statDivider: {
    width: 1,
    height: 12,
    marginHorizontal: 12,
  },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  adminNoteText: {
    flex: 1,
    fontSize: 12,
  },
  // Statistics Card
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    width: '23%',
    alignItems: 'center',
  },
  statCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  statsDivider: {
    height: 1,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statsRowItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsRowValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsRowLabel: {
    fontSize: 11,
  },
  statsDividerVertical: {
    width: 1,
    height: 30,
  },
  // Weeks Section
  weeksContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  noWeeksText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
  weekCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  weekTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weekIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekDetails: {
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  assignmentContent: {
    flex: 1,
    marginRight: 12,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  assignmentDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  assignmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  lateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});