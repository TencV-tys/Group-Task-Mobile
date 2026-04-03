// src/screens/MemberContributionsScreen.tsx - Fixed Weekly Breakdown Card Colors
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Alert,
  Image,
  LayoutAnimation,
  UIManager, 
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GroupActivityService } from '../services/GroupActivityService';
import { TokenUtils } from '../utils/tokenUtils'; 
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

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

  // Debug: Log the params
  useEffect(() => {
    console.log('📥 MemberContributionsScreen params:', { groupId, groupName, memberId, userRole });
  }, [groupId, groupName, memberId, userRole]);

  // ===== Use TokenUtils.checkToken() =====
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
    if (!assignment.completed) return [theme.bgSecondary, theme.bgTertiary];
    if (assignment.verified === true) return [theme.primaryLight, theme.primaryLight];
    if (assignment.verified === false) return [theme.errorBg, theme.errorBg];
    return [theme.primaryLight, theme.primaryLight];
  };

  // Helper function for status icon color
  const getStatusIconColor = (assignment: any): string => {
    if (!assignment.completed) return theme.textMuted;
    if (assignment.verified === true) return theme.primary;
    if (assignment.verified === false) return theme.error;
    return theme.primary;
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
    if (!assignment.completed) return theme.textMuted;
    if (assignment.verified === true) return theme.primary;
    if (assignment.verified === false) return theme.error;
    return theme.primary;
  };

  // Handle week press with animation
  const handleWeekPress = (weekNumber: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedWeek(selectedWeek === weekNumber ? null : weekNumber);
  };

  // ===== Profile Card (centered like Profile Screen) =====
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
        {/* Centered Avatar */}
        <View style={styles.avatarContainer}>
          {member.avatarUrl ? (
            <Image 
              source={{ uri: member.avatarUrl }} 
              style={[styles.avatarImage, { borderColor: theme.card, shadowColor: theme.shadow }]}
              onError={(e) => {
                console.log('Avatar load error:', e.nativeEvent.error);
              }}
            />
          ) : (
            <LinearGradient
              colors={isAdmin ? [theme.primary, theme.primaryDark] : [theme.textSecondary, theme.textMuted]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatarPlaceholder, { borderColor: theme.card, shadowColor: theme.shadow }]}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
          )}
        </View>
        
        {/* Centered Name */}
        <Text style={[styles.userName, { color: theme.text }]}>{member.fullName || 'User'}</Text>
        <Text style={[styles.userEmail, { color: theme.textMuted }]}>{member.email || ''}</Text>
        
        {/* User Stats Row */}
        <View style={styles.userStats}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="shield-account" size={14} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{member.role || 'Member'}</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-group" size={14} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{groupName}</Text>
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

        {/* Admin Note if applicable */}
        {isAdmin && data.roleInfo && (
          <View style={[styles.adminNote, { backgroundColor: theme.primaryLight }]}>
            <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
            <Text style={[styles.adminNoteText, { color: theme.primary }]}>{data.roleInfo.message}</Text>
          </View>
        )}
      </LinearGradient>
    );
  };

  // ===== Overall Statistics (separate card) =====
  const renderOverallStats = () => {
    if (!data?.summary) return null;

    const summary = data.summary;

    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statsCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
      >
        <Text style={[styles.statsTitle, { color: theme.text }]}>Overall Statistics</Text>
        
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => {}}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCircle}
            >
              <Text style={[styles.statNumber, { color: theme.text }]}>{summary.totalAssignments || 0}</Text>
            </LinearGradient>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Tasks</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => {}}>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCircle}
            >
              <Text style={[styles.statNumber, { color: theme.primary }]}>{summary.completedAssignments || 0}</Text>
            </LinearGradient>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Completed</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => {}}>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCircle}
            >
              <Text style={[styles.statNumber, { color: theme.primary }]}>{Math.round(summary.completionRate || 0)}%</Text>
            </LinearGradient>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Completion</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => {}}>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCircle}
            >
              <Text style={[styles.statNumber, { color: theme.primary }]}>{summary.earnedPoints || 0}</Text>
            </LinearGradient>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Points</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  const renderWeekDetails = (week: any) => {
    const isExpanded = selectedWeek === week.week;

    return (
      <LinearGradient
        key={week.week}
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.weekCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
      >
        <TouchableOpacity
          style={[styles.weekHeader, { backgroundColor: theme.bgSecondary }]}
          onPress={() => handleWeekPress(week.week)}
          activeOpacity={0.7}
        >
          <View style={styles.weekTitleContainer}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.weekIcon}
            >
              <MaterialCommunityIcons name="calendar-week" size={16} color={theme.textSecondary} />
            </LinearGradient>
            <Text style={[styles.weekTitle, { color: theme.text }]}>Week {week.week}</Text>
          </View>
          
          <View style={styles.weekStats}>
            <View style={styles.weekStat}>
              <Text style={[styles.weekStatValue, { color: theme.text }]}>{week.completedAssignments}/{week.totalAssignments}</Text>
              <Text style={[styles.weekStatLabel, { color: theme.textMuted }]}>Tasks</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={[styles.weekStatValue, { color: theme.primary }]}>{week.earnedPoints}</Text>
              <Text style={[styles.weekStatLabel, { color: theme.textMuted }]}>Points</Text>
            </View>
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.textMuted} 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.weekDetails, { borderTopColor: theme.border }]}>
            {week.assignments.map((assignment: any, index: number) => (
              <TouchableOpacity
                key={assignment.id}
                style={[
                  styles.assignmentItem,
                  index === week.assignments.length - 1 && styles.lastItem,
                  { borderBottomColor: theme.border }
                ]}
                onPress={() => {
                  console.log('👆 Navigating to AssignmentDetails:', assignment.id);
                  navigation.navigate('AssignmentDetails', {
                    assignmentId: assignment.id,
                    isAdmin: userRole === 'ADMIN'
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.assignmentInfo}>
                  <Text style={[styles.assignmentTitle, { color: theme.text }]}>{assignment.taskTitle}</Text>
                  <Text style={[styles.assignmentDate, { color: theme.textMuted }]}>
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
                      colors={[theme.primaryLight, theme.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pointsBadge}
                    >
                      <Text style={[styles.pointsText, { color: theme.primary }]}>+{assignment.points} pts</Text>
                    </LinearGradient>
                    
                    {assignment.isLate && (
                      <LinearGradient
                        colors={[theme.primaryLight, theme.primaryLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.lateBadge}
                      >
                        <MaterialCommunityIcons name="timer-alert" size={10} color={theme.primary} />
                        <Text style={[styles.lateText, { color: theme.primary }]}>Late</Text>
                      </LinearGradient>
                    )}
                  </View>

                  {assignment.notes && (
                    <Text style={[styles.assignmentNotes, { color: theme.textMuted }]} numberOfLines={1}>
                      📝 {assignment.notes}
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
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
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          Member Profile
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
          color={theme.textMuted} 
          style={refreshing && styles.rotating} 
        />
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
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={[theme.error, theme.error]}
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
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      {renderHeader()}

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchData(true)}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <Text style={[styles.errorSubtext, { color: theme.textMuted }]}>
              {error.includes('member') ? 'The member might not exist or have no data' : 'Please try again'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
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
            <MaterialCommunityIcons name="account-question" size={48} color={theme.textMuted} />
            <Text style={[styles.errorText, { color: theme.text }]}>No Data Found</Text>
            <Text style={[styles.errorSubtext, { color: theme.textMuted }]}>
              This member hasn't completed any tasks yet
            </Text>
          </View>
        ) : (
          <>
            {/* Profile Card */}
            {renderProfileCard()}
            
            {/* Overall Statistics */}
            {renderOverallStats()}
            
            {/* Weekly Breakdown */}
            <View style={styles.weeksContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Breakdown</Text>
              {data?.weeks?.length > 0 ? (
                data.weeks.map((week: any) => renderWeekDetails(week))
              ) : (
                <Text style={[styles.noWeeksText, { color: theme.textMuted }]}>No weekly data available</Text>
              )}
            </View>
            
            {/* Extra padding at bottom for better scrolling */}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
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
    padding: 20,
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
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  // Profile Card Styles
  profileCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  adminNoteText: {
    flex: 1,
    fontSize: 12,
  },
  // Statistics Card
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  weeksContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  noWeeksText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
  weekCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    gap: 8,
    flex: 1,
  },
  weekIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  weekStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekStat: {
    alignItems: 'center',
  },
  weekStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekStatLabel: {
    fontSize: 10,
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
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  assignmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  assignmentDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  assignmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  lateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  lateText: {
    fontSize: 9,
    fontWeight: '600',
  },
  assignmentNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  bottomPadding: {
    height: 20,
  },
});