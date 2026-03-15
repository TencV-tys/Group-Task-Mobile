// src/screens/GroupActivityScreen.tsx - UPDATED with TokenUtils
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
import { TokenUtils } from '../utils/tokenUtils'; // 👈 ADD THIS IMPORT
import { ScreenWrapper } from '../components/ScreenWrapper';

export default function GroupActivityScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activityData, setActivityData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  // ✅ UPDATED: Use TokenUtils.checkToken()
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  useEffect(() => {
    fetchActivityData();
  }, [groupId]);

  // ✅ Auth error handler
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

  const fetchActivityData = async (isRefreshing = false) => {
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
      const result = await GroupActivityService.getGroupActivitySummary(groupId);
      
      if (result.success) {
        setActivityData(result.data);
      } else {
        setError(result.message || 'Failed to load activity data');
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }
    } catch (err: any) {
      console.error('Error fetching activity data:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewMemberDetails = (memberId: string) => {
    navigation.navigate('MemberContributions', {
      groupId,
      groupName,
      memberId,
      userRole
    });
  };

  const handleViewTaskHistory = () => {
    navigation.navigate('TaskCompletionHistory', {
      groupId,
      groupName,
      userRole
    });
  };

  const handleViewFullLeaderboard = () => {
    navigation.navigate('FullLeaderboard', { groupId, groupName });
  };

  const renderSummaryCards = () => {
    const summary = activityData?.summary;
    if (!summary) return null;

    const cards = [
      {
        title: 'Members',
        value: summary.totalMembers,
        icon: 'account-group',
        gradient: ['#f8f9fa', '#e9ecef'] as [string, string],
        iconColor: '#495057'
      },
      {
        title: 'Tasks',
        value: summary.totalTasks,
        icon: 'format-list-checks',
        gradient: ['#d3f9d8', '#b2f2bb'] as [string, string],
        iconColor: '#2b8a3e'
      },
      {
        title: 'Completion',
        value: `${Math.round(summary.points?.completionRate || 0)}%`,
        icon: 'percent',
        gradient: ['#fff3bf', '#ffec99'] as [string, string],
        iconColor: '#e67700'
      },
      {
        title: 'Points',
        value: summary.points?.earned || 0,
        icon: 'star',
        gradient: ['#ffec99', '#ffe066'] as [string, string],
        iconColor: '#e67700'
      }
    ];

    return (
      <View style={styles.cardsGrid}>
        {cards.map((card, index) => (
          <LinearGradient
            key={index}
            colors={card.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
              <MaterialCommunityIcons name={card.icon as any} size={24} color={card.iconColor} />
            </View>
            <Text style={styles.cardValue}>{card.value}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
          </LinearGradient>
        ))}
      </View>
    );
  };

  const renderAssignmentStats = () => {
    const assignments = activityData?.summary?.assignments;
    if (!assignments) return null;

    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Current Week Progress</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#34c759', '#2b8a3e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.progressFill, 
                { width: `${(assignments.completed / assignments.total) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {assignments.completed}/{assignments.total} completed
          </Text>
        </View>

        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#d3f9d8', '#b2f2bb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statBox}
          >
            <Text style={[styles.statBoxValue, { color: '#2b8a3e' }]}>{assignments.verified}</Text>
            <Text style={styles.statBoxLabel}>Verified</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#fff3bf', '#ffec99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statBox}
          >
            <Text style={[styles.statBoxValue, { color: '#e67700' }]}>{assignments.pendingVerification}</Text>
            <Text style={styles.statBoxLabel}>Pending</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#fff5f5', '#ffe3e3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statBox}
          >
            <Text style={[styles.statBoxValue, { color: '#fa5252' }]}>{assignments.rejected}</Text>
            <Text style={styles.statBoxLabel}>Rejected</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#ffc9c9', '#ffb3b3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statBox}
          >
            <Text style={[styles.statBoxValue, { color: '#dc3545' }]}>{assignments.neglected}</Text>
            <Text style={styles.statBoxLabel}>Neglected</Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    );
  };

  const renderMemberContributions = () => {
    const members = activityData?.memberContributions || [];
    if (members.length === 0) return null;

    const getMemberGradient = (index: number): [string, string] => {
      if (index === 0) return ['#fff3bf', '#ffec99'];
      if (index === 1) return ['#f1f3f5', '#e9ecef'];
      if (index === 2) return ['#f8f9fa', '#dee2e6'];
      return ['#ffffff', '#f8f9fa'];
    };

    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Contributors</Text>
          <TouchableOpacity onPress={handleViewFullLeaderboard}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {members.slice(0, 5).map((member: any, index: number) => {
          const getRankStyle = () => {
            if (index === 0) return styles.firstPlace;
            if (index === 1) return styles.secondPlace;
            if (index === 2) return styles.thirdPlace;
            return null;
          };

          return (
            <TouchableOpacity
              key={member.id}
              onPress={() => handleViewMemberDetails(member.id)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={getMemberGradient(index)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.memberCard,
                  getRankStyle()
                ].filter(Boolean)}
              >
                <View style={styles.memberRank}>
                  {index === 0 ? (
                    <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
                  ) : index === 1 ? (
                    <MaterialCommunityIcons name="trophy" size={18} color="#C0C0C0" />
                  ) : index === 2 ? (
                    <MaterialCommunityIcons name="trophy" size={16} color="#CD7F32" />
                  ) : (
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                  )}
                </View>

                <View style={styles.memberInfo}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.memberAvatar}
                  >
                    <Text style={styles.memberInitial}>
                      {member.fullName?.charAt(0) || '?'}
                    </Text>
                  </LinearGradient>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <Text style={styles.memberStats}>
                      {member.completedAssignments || 0}/{member.totalAssignments || 0} • {member.earnedPoints || 0} pts
                    </Text>
                  </View>
                </View>

                <LinearGradient
                  colors={['#d3f9d8', '#b2f2bb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.memberBadge}
                >
                  <Text style={styles.memberPercentage}>
                    {member.totalAssignments ? 
                      Math.round((member.completedAssignments / member.totalAssignments) * 100) : 0}%
                  </Text>
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
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
          {groupName} Activity
        </Text>
      </View>
      <TouchableOpacity onPress={handleViewTaskHistory} style={styles.historyButton}>
        <MaterialCommunityIcons name="history" size={24} color="#2b8a3e" />
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#495057" />
          <Text style={styles.loadingText}>Loading activity data...</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchActivityData(true)} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchActivityData()}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.retryButtonGradient}
              >
                <Text style={[styles.retryButtonText, { color: '#495057' }]}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderSummaryCards()}
            {renderAssignmentStats()}
            {renderMemberContributions()}
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
  historyButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
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
  content: {
    flex: 1,
    padding: 16
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
    fontSize: 16
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  cardTitle: {
    fontSize: 14,
    color: '#868e96'
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529'
  },
  viewAllText: {
    color: '#495057',
    fontWeight: '500'
  },
  progressContainer: {
    marginBottom: 16
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  progressText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'right'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#868e96'
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  firstPlace: {
    borderColor: '#ffd43b',
    borderWidth: 2
  },
  secondPlace: {
    borderColor: '#ced4da',
    borderWidth: 2
  },
  thirdPlace: {
    borderColor: '#e9ecef',
    borderWidth: 2
  },
  memberRank: {
    width: 30,
    alignItems: 'center'
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#868e96'
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  memberInitial: {
    color: '#212529',
    fontSize: 16,
    fontWeight: 'bold'
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4
  },
  memberStats: {
    fontSize: 12,
    color: '#868e96'
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  memberPercentage: {
    fontSize: 12,
    color: '#2b8a3e',
    fontWeight: '600'
  }
});